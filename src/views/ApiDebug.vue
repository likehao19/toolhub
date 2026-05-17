<template>
  <div class="api-debug-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Briefcase /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('apiDebug.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-select v-model="currentEnvId" size="small" style="width: 140px" :placeholder="t('apiDebug.noEnv')" clearable @change="onEnvChange">
          <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
        </el-select>
        <el-button size="small" @click="showEnvDialog = true">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="content-area">
      <div class="debug-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="sidebar-area" :class="{ collapsed: sidebarCollapsed }">
          <div class="left-sidebar" :class="{ collapsed: sidebarCollapsed }">
            <div v-if="!sidebarCollapsed" class="sidebar-content">
              <div class="sidebar-tabs">
                <div class="sidebar-tab" :class="{ active: sidebarTab === 'collections' }" @click="sidebarTab = 'collections'">
                  {{ t('apiDebug.collections') }}
                </div>
                <div class="sidebar-tab" :class="{ active: sidebarTab === 'history' }" @click="sidebarTab = 'history'">
                  {{ t('apiDebug.history') }}
                </div>
              </div>

              <div v-if="sidebarTab === 'collections'" class="sidebar-list">
                <!-- 顶部新建栏（对齐 ApiDocs 风格） -->
                <div class="list-toolbar">
                  <el-button size="small" type="primary" class="toolbar-btn" @click="onCreateCollection">
                    <el-icon><CollectionTag /></el-icon>
                    <span>{{ t('apiDebug.newCollection') }}</span>
                  </el-button>
                  <el-button size="small" class="toolbar-btn" @click="onImportPostman" :title="t('apiDebug.importPostman')">
                    <el-icon><Upload /></el-icon>
                    <span>Postman</span>
                  </el-button>
                </div>
                <el-tree
                  v-if="collectionTree.length"
                  ref="collectionTreeRef"
                  :data="collectionTree"
                  node-key="id"
                  :props="treeProps"
                  :default-expanded-keys="expandedKeys"
                  :expand-on-click-node="false"
                  :highlight-current="true"
                  @node-click="handleCollectionNodeClick"
                  @node-expand="onTreeExpand"
                  @node-collapse="onTreeCollapse"
                >
                  <template #default="{ node, data }">
                    <div class="tree-row" :class="{ active: activeTreeNodeId === data.id, 'is-folder': data.type === 'folder' || data.type === 'collection' }">
                      <div class="tree-row-main">
                        <!-- 自绘展开/折叠 chevron：folder/collection 显示，api 同尺寸占位保持对齐 -->
                        <el-icon v-if="data.type === 'folder' || data.type === 'collection'" class="row-chevron" :class="{ expanded: node.expanded }">
                          <CaretRight />
                        </el-icon>
                        <span v-else class="row-chevron-spacer"></span>
                        <el-icon v-if="data.type === 'collection'" class="row-icon collection-icon"><CollectionTag /></el-icon>
                        <el-icon v-else-if="data.type === 'folder'" class="row-icon folder-icon">
                          <FolderOpened v-if="node.expanded" />
                          <Folder v-else />
                        </el-icon>
                        <span v-else class="method-tag" :style="{ color: METHOD_COLORS[data.method] }">{{ data.method }}</span>
                        <span class="item-name" :title="nodeTitle(data)">{{ nodeTitle(data) }}</span>
                        <span v-if="(data.type === 'folder' || data.type === 'collection') && data.children?.length" class="folder-count">{{ data.children.length }}</span>
                      </div>
                      <el-dropdown trigger="click" size="small" @command="cmd => onTreeNodeCmd(cmd, data)">
                        <el-icon class="row-more" @click.stop><MoreFilled /></el-icon>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item v-if="data.type !== 'api'" command="newFolder">
                              <el-icon><FolderAdd /></el-icon>{{ t('apiDebug.newFolder') }}
                            </el-dropdown-item>
                            <el-dropdown-item v-if="data.type !== 'api'" command="newInterface">
                              <el-icon><DocumentAdd /></el-icon>{{ t('apiDebug.newInterface') }}
                            </el-dropdown-item>
                            <el-dropdown-item v-if="data.type === 'collection'" command="exportPostman" divided>
                              <el-icon><Download /></el-icon>{{ t('apiDebug.exportPostman') }}
                            </el-dropdown-item>
                            <el-dropdown-item command="rename" :divided="data.type !== 'api' && data.type !== 'collection'">
                              <el-icon><Edit /></el-icon>{{ t('common.edit') }}
                            </el-dropdown-item>
                            <el-dropdown-item command="delete" divided>
                              <el-icon><Delete /></el-icon>{{ t('common.delete') }}
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </template>
                </el-tree>
                <div v-else class="empty-hint">{{ t('apiDebug.noCollections') }}</div>
              </div>

              <div v-if="sidebarTab === 'history'" class="sidebar-list">
                <div class="sidebar-toolbar history-toolbar">
                  <el-input v-model="historySearch" size="small" clearable :placeholder="t('apiDebug.searchHistory')" class="history-search">
                    <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
                  <el-button size="small" text type="danger" @click="onClearHistory" :title="t('apiDebug.clearHistory')">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <div v-for="group in groupedHistory" :key="group.label" class="history-group">
                  <div class="history-group-label">{{ group.label }}</div>
                  <div v-for="item in group.items" :key="item.id" class="history-item" @click="loadHistoryItem(item)">
                    <span class="method-tag" :style="{ color: METHOD_COLORS[item.method] }">{{ item.method }}</span>
                    <span class="item-name" :title="item.url">{{ shortenUrl(item.url) }}</span>
                    <span class="history-status" :class="item.status < 400 ? 'ok' : 'err'">{{ item.status || '' }}</span>
                    <el-icon class="item-delete" @click.stop="onDeleteHistoryItem(item.id)"><Close /></el-icon>
                  </div>
                </div>
                <div v-if="!history.length" class="empty-hint">{{ t('apiDebug.noHistory') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 折叠/展开按钮：浮动在 debug-layout 内，按钮中心始终落在 panel 右边缘 -->
        <div class="sidebar-toggle" :class="{ collapsed: sidebarCollapsed }"
          @click="sidebarCollapsed = !sidebarCollapsed"
          :title="sidebarCollapsed ? t('common.showSidebar') : t('common.hideSidebar')">
          <el-icon>
            <ArrowLeft v-if="!sidebarCollapsed" />
            <ArrowRight v-else />
          </el-icon>
        </div>

        <div class="main-panel">
          <div class="url-bar">
            <el-select v-model="reqMethod" class="method-select" size="default">
              <el-option v-for="m in methods" :key="m" :label="m" :value="m">
                <span :style="{ color: METHOD_COLORS[m], fontWeight: 600 }">{{ m }}</span>
              </el-option>
            </el-select>
            <el-input v-model="reqUrl" class="url-input" :placeholder="'https://api.example.com/users'" @keydown.ctrl.enter="doSend" clearable />
            <div class="url-actions">
              <el-button type="primary" :loading="sending" @click="doSend" :disabled="!reqUrl.trim()">
                <el-icon style="margin-right: 6px;"><Promotion /></el-icon>{{ sending ? t('apiDebug.sending') : t('apiDebug.send') }}
              </el-button>
              <el-button v-if="sending" @click="doCancel" type="danger" plain>
                <el-icon style="margin-right: 6px;"><Close /></el-icon>{{ t('apiDebug.cancel') }}
              </el-button>
              <el-dropdown trigger="click" @command="onUrlMenuCmd">
                <el-button class="url-more-btn"><el-icon><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="save">{{ t('apiDebug.saveToCollection') }}</el-dropdown-item>
                    <el-dropdown-item command="curl">{{ t('apiDebug.copyCurl') }}</el-dropdown-item>
                    <el-dropdown-item command="importCurl">{{ t('apiDebug.importCurl') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="split-panels">
            <div class="request-panel">
              <el-tabs v-model="reqTab" class="compact-tabs">
                <el-tab-pane :label="`Params${activeParamsCount ? ' (' + activeParamsCount + ')' : ''}`" name="params">
                  <div class="kv-toolbar">
                    <el-button size="small" text @click="paramsBulkMode = !paramsBulkMode">
                      {{ paramsBulkMode ? t('apiDebug.tableEdit') : t('apiDebug.bulkEdit') }}
                    </el-button>
                  </div>
                  <div v-if="!paramsBulkMode" class="kv-editor">
                    <div v-for="(p, i) in reqParams" :key="i" class="kv-row">
                      <el-checkbox v-model="p.enabled" size="small" />
                      <el-input v-model="p.key" size="small" placeholder="Key" />
                      <el-input v-model="p.value" size="small" placeholder="Value" />
                      <el-icon class="kv-delete" @click="reqParams.splice(i, 1)"><Close /></el-icon>
                    </div>
                    <el-button size="small" text type="primary" @click="reqParams.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addParam') }}</el-button>
                  </div>
                  <textarea v-else v-model="paramsBulkText" class="bulk-textarea"
                    :placeholder="t('apiDebug.bulkPlaceholder')" spellcheck="false" />
                  <div v-if="reqPathVars.length" class="path-vars-section">
                    <div class="path-vars-title">{{ t('apiDebug.pathVariables') }}</div>
                    <div class="kv-editor">
                      <div v-for="pv in reqPathVars" :key="pv.key" class="kv-row">
                        <span class="path-var-key">:{{ pv.key }}</span>
                        <el-input v-model="pv.value" size="small" :placeholder="t('apiDebug.pathVarValue')" />
                      </div>
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane :label="`Headers${activeHeadersCount ? ' (' + activeHeadersCount + ')' : ''}`" name="headers">
                  <div class="kv-toolbar">
                    <el-button size="small" text @click="headersBulkMode = !headersBulkMode">
                      {{ headersBulkMode ? t('apiDebug.tableEdit') : t('apiDebug.bulkEdit') }}
                    </el-button>
                  </div>
                  <div v-if="!headersBulkMode" class="kv-editor">
                    <div v-for="(h, i) in reqHeaders" :key="i" class="kv-row">
                      <el-checkbox v-model="h.enabled" size="small" />
                      <el-autocomplete v-model="h.key" size="small" placeholder="Key" :fetch-suggestions="queryHeaders" />
                      <el-input v-model="h.value" size="small" placeholder="Value" />
                      <el-icon class="kv-delete" @click="reqHeaders.splice(i, 1)"><Close /></el-icon>
                    </div>
                    <el-button size="small" text type="primary" @click="reqHeaders.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addHeader') }}</el-button>
                  </div>
                  <textarea v-else v-model="headersBulkText" class="bulk-textarea"
                    :placeholder="t('apiDebug.bulkPlaceholder')" spellcheck="false" />
                </el-tab-pane>

                <el-tab-pane label="Body" name="body">
                  <div class="body-editor">
                    <div class="body-type-bar">
                      <el-radio-group v-model="reqBody.type" size="small">
                        <el-radio-button value="none">none</el-radio-button>
                        <el-radio-button value="json">JSON</el-radio-button>
                        <el-radio-button value="form">x-www-form</el-radio-button>
                        <el-radio-button value="multipart">multipart</el-radio-button>
                        <el-radio-button value="raw">raw</el-radio-button>
                        <el-radio-button value="binary">binary</el-radio-button>
                      </el-radio-group>
                      <el-button v-if="reqBody.type === 'json'" size="small" text @click="formatBodyJson">
                        <el-icon style="margin-right: 4px;"><Brush /></el-icon>{{ t('apiDebug.formatJson') }}
                      </el-button>
                    </div>
                    <textarea v-if="reqBody.type === 'json' || reqBody.type === 'raw'" v-model="reqBody.content" class="body-textarea" :placeholder="reqBody.type === 'json' ? '{ }' : 'raw text...'" spellcheck="false" />
                    <div v-if="reqBody.type === 'form' || reqBody.type === 'multipart'" class="kv-editor">
                      <div v-for="(f, i) in reqBody.formData" :key="i" class="kv-row">
                        <el-checkbox v-model="f.enabled" size="small" />
                        <el-input v-model="f.key" size="small" placeholder="Key" />
                        <el-input v-model="f.value" size="small" :placeholder="reqBody.type === 'multipart' ? 'Value or @C:/path/to/file' : 'Value'" />
                        <el-icon class="kv-delete" @click="reqBody.formData.splice(i, 1)"><Close /></el-icon>
                      </div>
                      <el-button size="small" text type="primary" @click="reqBody.formData.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addParam') }}</el-button>
                    </div>
                    <div v-if="reqBody.type === 'none'" class="empty-hint" style="padding:20px">{{ t('apiDebug.noBody') }}</div>
                    <div v-if="reqBody.type === 'binary'" class="binary-body">
                      <el-button size="small" @click="onPickBinaryFile">
                        <el-icon style="margin-right:4px"><Upload /></el-icon>{{ t('apiDebug.chooseFile') }}
                      </el-button>
                      <span class="binary-path" :title="reqBody.binaryPath">
                        {{ reqBody.binaryPath || t('apiDebug.noFileChosen') }}
                      </span>
                      <el-icon v-if="reqBody.binaryPath" class="binary-clear" @click="reqBody.binaryPath = ''"><Close /></el-icon>
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="Auth" name="auth">
                  <div class="auth-editor">
                    <el-select v-model="reqAuth.type" size="small" style="width:180px;margin-bottom:12px">
                      <el-option label="No Auth" value="none" />
                      <el-option label="Bearer Token" value="bearer" />
                      <el-option label="Basic Auth" value="basic" />
                      <el-option label="API Key" value="apikey" />
                    </el-select>
                    <div v-if="reqAuth.type === 'bearer'" class="auth-fields">
                      <el-input v-model="reqAuth.token" size="small" :placeholder="t('apiDebug.tokenPlaceholder')" />
                    </div>
                    <div v-if="reqAuth.type === 'basic'" class="auth-fields">
                      <el-input v-model="reqAuth.username" size="small" placeholder="Username" />
                      <el-input v-model="reqAuth.password" size="small" placeholder="Password" type="password" show-password />
                    </div>
                    <div v-if="reqAuth.type === 'apikey'" class="auth-fields">
                      <el-input v-model="reqAuth.key" size="small" placeholder="Header Name (e.g. X-Api-Key)" />
                      <el-input v-model="reqAuth.value" size="small" placeholder="Value" />
                      <el-radio-group v-model="reqAuth.position" size="small">
                        <el-radio value="header">Header</el-radio>
                        <el-radio value="query">Query Param</el-radio>
                      </el-radio-group>
                    </div>
                    <div v-if="reqAuth.type === 'none'" class="empty-hint" style="padding:12px">No authentication</div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="Pre-Script" name="prescript">
                  <div class="prescript-editor">
                    <div class="prescript-hint">
                      {{ t('apiDebug.preScriptHint') }}
                    </div>
                    <textarea v-model="reqPreScript" class="body-textarea" style="min-height:180px"
                      placeholder="// pm.environment.set('token', 'xxx')&#10;// const sig = await crypto.subtle.digest(...)&#10;// pm.variables.set('signature', sig)"
                      spellcheck="false" />
                  </div>
                </el-tab-pane>

                <el-tab-pane label="Settings" name="settings">
                  <div class="settings-editor">
                    <div class="setting-row">
                      <span class="setting-label">{{ t('apiDebug.settingTimeout') }}</span>
                      <el-input-number v-model="reqSettings.timeout" :min="1000" :max="600000" :step="1000" size="small" controls-position="right" />
                      <span class="setting-suffix">ms</span>
                    </div>
                    <div class="setting-row">
                      <span class="setting-label">{{ t('apiDebug.settingSslVerify') }}</span>
                      <el-switch v-model="reqSettings.sslVerify" />
                    </div>
                    <div class="setting-row">
                      <span class="setting-label">{{ t('apiDebug.settingFollowRedirects') }}</span>
                      <el-switch v-model="reqSettings.followRedirects" />
                    </div>
                    <div class="setting-row" v-if="reqSettings.followRedirects">
                      <span class="setting-label">{{ t('apiDebug.settingMaxRedirects') }}</span>
                      <el-input-number v-model="reqSettings.maxRedirects" :min="0" :max="50" size="small" controls-position="right" />
                    </div>
                    <div class="setting-row">
                      <span class="setting-label">{{ t('apiDebug.cookieJarEnabled') }}</span>
                      <el-switch v-model="cookieJarEnabled" @change="onToggleCookieJar" />
                      <el-button size="small" text type="primary" @click="openCookieJar">{{ t('apiDebug.cookieJarManage') }}</el-button>
                    </div>
                    <el-button size="small" text type="primary" @click="resetSettings">{{ t('apiDebug.resetSettings') }}</el-button>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>

            <div class="response-panel">
              <div v-if="!response && !sending" class="response-empty">
                <div class="response-empty-icon">🔗</div>
                <div>{{ t('apiDebug.clickSend') }}</div>
                <div class="response-empty-hint">Ctrl+Enter {{ t('apiDebug.send') }}</div>
              </div>

              <template v-if="response || responseError">
                <div class="response-status-bar">
                  <template v-if="response">
                    <span class="status-badge" :class="response.ok ? 'ok' : 'err'">{{ response.status }} {{ response.statusText }}</span>
                    <span class="status-meta">{{ response.time }}ms</span>
                    <span class="status-meta">{{ formatSize(response.size) }}</span>
                  </template>
                  <span v-if="responseError" class="status-badge err">{{ responseError }}</span>
                </div>

                <el-tabs v-if="response" v-model="resTab" class="compact-tabs response-tabs">
                  <el-tab-pane label="Body" name="body">
                    <div class="response-toolbar">
                      <el-radio-group v-model="resBodyMode" size="small">
                        <el-radio-button value="pretty">Pretty</el-radio-button>
                        <el-radio-button value="raw">Raw</el-radio-button>
                      </el-radio-group>
                      <div class="response-toolbar-actions">
                        <el-button size="small" text @click="onSaveResponse" :title="t('apiDebug.saveResponse')">
                          <el-icon><Download /></el-icon>
                        </el-button>
                        <el-button size="small" text @click="copyResponse" :title="t('common.copy')">
                          <el-icon><CopyDocument /></el-icon>
                        </el-button>
                      </div>
                    </div>
                    <pre class="response-body" :class="resBodyMode">{{ resBodyMode === 'pretty' ? prettyBody : response?.body }}</pre>
                  </el-tab-pane>
                  <el-tab-pane :label="`${t('apiDebug.cookies')} (${parsedCookies.length})`" name="cookies">
                    <div v-if="!parsedCookies.length" class="empty-hint" style="padding:20px">No cookies</div>
                    <div v-else class="cookies-table">
                      <div class="cookie-row cookie-row-header">
                        <span>{{ t('apiDebug.cookieName') }}</span>
                        <span>{{ t('apiDebug.cookieValue') }}</span>
                        <span>{{ t('apiDebug.cookieDomain') }}</span>
                        <span>{{ t('apiDebug.cookiePath') }}</span>
                        <span>{{ t('apiDebug.cookieExpires') }}</span>
                        <span>Flags</span>
                      </div>
                      <div v-for="(c, i) in parsedCookies" :key="i" class="cookie-row">
                        <span class="ck-name">{{ c.name }}</span>
                        <span class="ck-val" :title="c.value">{{ c.value }}</span>
                        <span>{{ c.domain || '-' }}</span>
                        <span>{{ c.path || '-' }}</span>
                        <span>{{ c.expires || c['max-age'] || '-' }}</span>
                        <span class="ck-flags">
                          <span v-if="c.httpOnly" class="ck-flag">HttpOnly</span>
                          <span v-if="c.secure" class="ck-flag">Secure</span>
                          <span v-if="c.samesite" class="ck-flag">SameSite={{ c.samesite }}</span>
                        </span>
                      </div>
                    </div>
                  </el-tab-pane>
                  <el-tab-pane :label="`Headers (${Object.keys(response?.headers || {}).length})`" name="headers">
                    <div class="response-headers-table">
                      <div v-for="(val, key) in (response?.headers || {})" :key="key" class="res-header-row">
                        <span class="res-header-key">{{ key }}</span>
                        <span class="res-header-val">{{ val }}</span>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </template>

              <div v-if="sending" class="response-loading">
                <el-icon class="is-loading" :size="24"><Loading /></el-icon>
                <span>{{ t('apiDebug.sending') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <span>{{ collections.length }} {{ t('apiDebug.collections') }}</span>
      <span>{{ history.length }} {{ t('apiDebug.history') }}</span>
      <span v-if="currentEnvName">{{ t('apiDebug.env') }}: {{ currentEnvName }}</span>
      <span v-else>{{ t('apiDebug.noEnv') }}</span>
    </div>

    <el-dialog v-model="showSaveDialog" :title="t('apiDebug.saveToCollection')" width="420px" append-to-body>
      <el-form label-width="80px" size="small">
        <el-form-item :label="t('apiDebug.reqName')">
          <el-input v-model="saveName" :placeholder="`${reqMethod} ${reqUrl}`" />
        </el-form-item>
        <el-form-item :label="t('apiDebug.collection')">
          <el-select v-model="saveCollectionId" style="width:100%" :placeholder="t('apiDebug.selectCollection')">
            <el-option v-for="col in collections" :key="col.id" :label="col.name" :value="col.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('apiDebug.selectSaveTarget')">
          <el-select v-model="saveParentNodeId" style="width:100%" clearable :placeholder="t('apiDebug.collectionRoot')">
            <el-option :label="t('apiDebug.collectionRoot')" :value="null" />
            <el-option v-for="folder in saveTargetFolders" :key="folder.id" :label="folder.label" :value="folder.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showSaveDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doSaveToCollection">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCurlDialog" :title="t('apiDebug.importCurl')" width="540px" append-to-body>
      <el-input v-model="curlInput" type="textarea" :rows="8" placeholder="curl -X GET https://api.example.com/users -H 'Authorization: Bearer xxx'" />
      <template #footer>
        <el-button size="small" @click="showCurlDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doImportCurl">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEnvDialog" :title="t('apiDebug.envManage')" width="640px" append-to-body>
      <div class="env-manager">
        <div class="env-list-bar">
          <el-select v-model="editEnvId" size="small" style="flex:1" :placeholder="t('apiDebug.selectEnv')">
            <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
          <el-button size="small" type="primary" text @click="onCreateEnv" :title="t('common.add')">
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button size="small" type="danger" text :disabled="!editEnvId" @click="onDeleteEnv" :title="t('common.delete')">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <template v-if="editingEnv">
          <el-input v-model="editingEnv.name" size="small" style="margin: 12px 0" :placeholder="t('apiDebug.envName')" />
          <div class="kv-editor">
            <div class="kv-row kv-header-row">
              <span style="width:28px"></span>
              <span style="flex:1;font-weight:600;font-size:12px">Key</span>
              <span style="flex:1;font-weight:600;font-size:12px">Value</span>
              <span style="width:20px"></span>
            </div>
            <div v-for="(v, i) in editingEnv.variables" :key="i" class="kv-row">
              <el-checkbox v-model="v.enabled" size="small" />
              <el-input v-model="v.key" size="small" placeholder="key" />
              <el-input v-model="v.value" size="small" placeholder="value" />
              <el-icon class="kv-delete" @click="editingEnv.variables.splice(i, 1)"><Close /></el-icon>
            </div>
            <el-button size="small" text type="primary" @click="editingEnv.variables.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addVariable') }}</el-button>
          </div>
        </template>
        <div v-else class="empty-hint" style="padding:30px">{{ t('apiDebug.selectOrCreateEnv') }}</div>
      </div>
      <template #footer>
        <el-button size="small" @click="showEnvDialog = false">{{ t('common.close') }}</el-button>
        <el-button size="small" type="primary" :disabled="!editingEnv" @click="doSaveEnv">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="showCookieJar" :title="t('apiDebug.cookieJar')" width="720px" append-to-body>
      <div v-if="!cookieList.length" class="empty-hint" style="padding:30px">{{ t('apiDebug.cookieJarEmpty') }}</div>
      <div v-else class="cookies-table">
        <div class="cookie-row cookie-row-header">
          <span>{{ t('apiDebug.cookieJarHost') }}</span>
          <span>{{ t('apiDebug.cookieName') }}</span>
          <span>{{ t('apiDebug.cookieValue') }}</span>
          <span>{{ t('apiDebug.cookiePath') }}</span>
          <span>{{ t('apiDebug.cookieExpires') }}</span>
          <span></span>
        </div>
        <div v-for="(c, i) in cookieList" :key="i" class="cookie-row">
          <span class="ck-name">{{ c.host }}</span>
          <span>{{ c.name }}</span>
          <span class="ck-val" :title="c.value">{{ c.value }}</span>
          <span>{{ c.path }}</span>
          <span>{{ c.expires ? new Date(c.expires * 1000).toLocaleString() : 'session' }}</span>
          <el-icon class="kv-delete" @click="onDeleteCookie(c)"><Close /></el-icon>
        </div>
      </div>
      <template #footer>
        <el-button size="small" type="danger" plain :disabled="!cookieList.length" @click="onClearCookieJar">
          {{ t('apiDebug.cookieJarClear') }}
        </el-button>
        <el-button size="small" @click="showCookieJar = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Briefcase, Setting, Close, MoreFilled, ArrowLeft, ArrowRight, ArrowDown, Loading, CollectionTag, Folder, FolderOpened, FolderAdd, DocumentAdd, Edit, Delete, Document, CaretRight, CopyDocument, Plus, Promotion, Brush, Download, Upload, Search } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { sendRequest, cancelRequest, buildMultipartBody } from '@/utils/apiWorkbench/httpEngine'
import { formatSize, METHOD_COLORS, COMMON_HEADERS, tryFormatJson, isJson, tryFormatXml, detectBodyFormat, buildUrl, buildAuthHeader } from '@/utils/apiWorkbench/shared'
import { resolveVariables, getActiveVariables, loadEnvironments, getCurrentEnvId, setCurrentEnvId, createEnvironment, deleteEnvironment, updateEnvironment } from '@/utils/apiWorkbench/environment'
import { isCookieJarEnabled, setCookieJarEnabled, buildCookieHeader, ingestSetCookies, listCookies, clearJar, deleteCookie } from '@/utils/apiWorkbench/cookieJar'
import { runPreRequestScript } from '@/utils/apiWorkbench/preRequestRunner'
import {
  loadCollections,
  createCollection,
  importCollection,
  deleteCollection,
  renameCollection,
  saveRequestToCollection,
  createFolder,
  deleteCollectionItem,
  renameCollectionNode,
  loadHistory,
  saveToHistory,
  clearHistory as doClearHistory,
  deleteHistoryItem,
  buildCollectionTree,
  getCollectionNodeById,
} from '@/utils/apiWorkbench/collections'
import { parseCurl, generateCode } from '@/utils/apiWorkbench/curlParser'
import { parsePostmanCollection, countCollectionApis } from '@/utils/apiWorkbench/postmanImport'
import { buildPostmanCollection } from '@/utils/apiWorkbench/postmanExport'

const router = useRouter()
const collectionTreeRef = ref(null)
const treeProps = { children: 'children', label: 'name' }

const sidebarCollapsed = ref(false)
const sidebarTab = ref('collections')
const collections = ref([])
const history = ref([])
const activeItemId = ref(null)
const activeTreeNodeId = ref(null)
const selectedCollectionId = ref(null)
const selectedFolderId = ref(null)
const expandedKeys = ref([])

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const reqMethod = ref('GET')
const reqUrl = ref('')
const reqTab = ref('params')
const reqParams = ref([{ key: '', value: '', enabled: true }])
const reqHeaders = ref([{ key: '', value: '', enabled: true }])
const reqBody = ref({ type: 'none', content: '', formData: [{ key: '', value: '', enabled: true }], binaryPath: '' })
const reqAuth = ref({ type: 'none', token: '', username: '', password: '', key: '', value: '', position: 'header' })
const reqPathVars = ref([])  // [{ key, value }] —— 由 URL 中 :name 自动同步
const reqSettings = ref({ timeout: 30000, sslVerify: true, followRedirects: true, maxRedirects: 10 })
const reqPreScript = ref('')
const cookieJarEnabled = ref(false)
const showCookieJar = ref(false)
const cookieList = ref([])
const historySearch = ref('')
const paramsBulkMode = ref(false)
const headersBulkMode = ref(false)

const activeParamsCount = computed(() => reqParams.value.filter(p => p.enabled && p.key).length)
const activeHeadersCount = computed(() => reqHeaders.value.filter(h => h.enabled && h.key).length)

/* Bulk Edit 文本格式：
   key: value              启用
   # key: value            禁用（行首 # 或 //）
   行内 # 不当注释看，只看行首 */
function kvListToBulkText(list) {
  return (list || [])
    .filter(kv => kv && (kv.key || kv.value))
    .map(kv => `${kv.enabled === false ? '# ' : ''}${kv.key || ''}: ${kv.value || ''}`)
    .join('\n')
}
function bulkTextToKvList(text) {
  const out = []
  for (const raw of String(text).split('\n')) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) continue
    let enabled = true
    let body = trimmed
    if (body.startsWith('//')) { enabled = false; body = body.slice(2).trim() }
    else if (body.startsWith('#')) { enabled = false; body = body.replace(/^#+\s*/, '') }
    const idx = body.indexOf(':')
    if (idx === -1) out.push({ key: body, value: '', enabled })
    else out.push({ key: body.slice(0, idx).trim(), value: body.slice(idx + 1).trim(), enabled })
  }
  return out.length ? out : [{ key: '', value: '', enabled: true }]
}

const paramsBulkText = computed({
  get: () => kvListToBulkText(reqParams.value),
  set: (val) => { reqParams.value = bulkTextToKvList(val) },
})
const headersBulkText = computed({
  get: () => kvListToBulkText(reqHeaders.value),
  set: (val) => { reqHeaders.value = bulkTextToKvList(val) },
})

const sending = ref(false)
const response = ref(null)
const responseError = ref(null)
const requestCanceled = ref(false)
const resTab = ref('body')
const resBodyMode = ref('pretty')

const prettyBody = computed(() => {
  if (!response.value?.body) return ''
  const ct = response.value.headers?.['content-type'] || response.value.headers?.['Content-Type']
  const fmt = detectBodyFormat(ct, response.value.body)
  if (fmt === 'json') return tryFormatJson(response.value.body)
  if (fmt === 'xml') return tryFormatXml(response.value.body)
  return response.value.body
})

const parsedCookies = computed(() => {
  if (!response.value?.setCookies?.length) return []
  return response.value.setCookies.map(parseSetCookie)
})

/* URL 路径变量解析与同步：扫描 :name，保留已填值，新增空值，删除已不存在的。
   用 flush:'sync' 让 loadHistoryItem / loadCollectionItem 可以在设置 reqUrl 后立刻覆盖 path 值。
   只扫 path/query 段，避开 scheme(:) 和 userinfo(user:pass@) */
watch(reqUrl, (val) => {
  let scanTarget = String(val || '')
  // 剥掉 scheme 部分：`https://` 之后再开始扫
  const schemeIdx = scanTarget.indexOf('://')
  if (schemeIdx > -1) scanTarget = scanTarget.slice(schemeIdx + 3)
  // 剥掉 userinfo（host 前的 user:pass@）
  const atIdx = scanTarget.indexOf('@')
  const slashIdx = scanTarget.indexOf('/')
  if (atIdx > -1 && (slashIdx === -1 || atIdx < slashIdx)) {
    scanTarget = scanTarget.slice(atIdx + 1)
  }
  const matches = scanTarget.match(/:([A-Za-z_][\w-]*)/g) || []
  const names = Array.from(new Set(matches.map(m => m.slice(1))))
  const existing = Object.fromEntries(reqPathVars.value.map(v => [v.key, v.value]))
  reqPathVars.value = names.map(n => ({ key: n, value: existing[n] || '' }))
}, { immediate: false, flush: 'sync' })

function applyPathVars(url, vars) {
  if (!vars.length) return url
  // 同样的 scope 限制：只替换 scheme + userinfo 之后的部分
  const schemeIdx = url.indexOf('://')
  let prefix = ''
  let rest = url
  if (schemeIdx > -1) {
    prefix = url.slice(0, schemeIdx + 3)
    rest = url.slice(schemeIdx + 3)
    const atIdx = rest.indexOf('@')
    const slashIdx = rest.indexOf('/')
    if (atIdx > -1 && (slashIdx === -1 || atIdx < slashIdx)) {
      prefix += rest.slice(0, atIdx + 1)
      rest = rest.slice(atIdx + 1)
    }
  }
  const replaced = rest.replace(/:([A-Za-z_][\w-]*)/g, (_, name) => {
    const v = vars.find(x => x.key === name)
    return v && v.value !== '' ? encodeURIComponent(v.value) : `:${name}`
  })
  return prefix + replaced
}

function parseSetCookie(str) {
  const parts = String(str).split(';').map(s => s.trim()).filter(Boolean)
  const head = parts[0] || ''
  const eq = head.indexOf('=')
  const cookie = {
    name: eq > -1 ? head.slice(0, eq) : head,
    value: eq > -1 ? head.slice(eq + 1) : '',
    httpOnly: false,
    secure: false,
  }
  for (let i = 1; i < parts.length; i++) {
    const a = parts[i]
    const k = a.indexOf('=')
    const name = (k > -1 ? a.slice(0, k) : a).toLowerCase()
    const val = k > -1 ? a.slice(k + 1) : ''
    if (name === 'httponly') cookie.httpOnly = true
    else if (name === 'secure') cookie.secure = true
    else cookie[name] = val
  }
  return cookie
}

const environments = ref([])
const currentEnvId = ref(null)
const showEnvDialog = ref(false)
const editEnvId = ref(null)

const currentEnvName = computed(() => environments.value.find(e => e.id === currentEnvId.value)?.name || '')
const editingEnv = computed(() => environments.value.find(e => e.id === editEnvId.value) || null)
const collectionTree = computed(() => buildCollectionTree(collections.value))
const saveTargetFolders = computed(() => {
  const collectionId = saveCollectionId.value
  if (!collectionId) return []
  const tree = buildCollectionTree(collections.value).find(item => item.rawId === collectionId)
  if (!tree) return []
  return flattenFolderOptions(tree.children)
})

const showSaveDialog = ref(false)
const saveName = ref('')
const saveCollectionId = ref(null)
const saveParentNodeId = ref(null)
const showCurlDialog = ref(false)
const curlInput = ref('')

const queryHeaders = (queryString, cb) => {
  const results = queryString
    ? COMMON_HEADERS.filter(h => h.toLowerCase().includes(queryString.toLowerCase())).map(h => ({ value: h }))
    : COMMON_HEADERS.map(h => ({ value: h }))
  cb(results)
}

const groupedHistory = computed(() => {
  const q = historySearch.value.trim().toLowerCase()
  const source = q
    ? history.value.filter(item =>
        (item.url || '').toLowerCase().includes(q) ||
        (item.method || '').toLowerCase().includes(q))
    : history.value
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const groups = { today: [], yesterday: [], earlier: [] }
  source.forEach(item => {
    if (item.timestamp >= today) groups.today.push(item)
    else if (item.timestamp >= yesterday) groups.yesterday.push(item)
    else groups.earlier.push(item)
  })
  const result = []
  if (groups.today.length) result.push({ label: t('apiDebug.today'), items: groups.today })
  if (groups.yesterday.length) result.push({ label: t('apiDebug.yesterday'), items: groups.yesterday })
  if (groups.earlier.length) result.push({ label: t('apiDebug.earlier'), items: groups.earlier })
  return result
})

async function doSend() {
  if (!reqUrl.value.trim() || sending.value) return
  let vars = getActiveVariables()

  // Pre-request Script：把变量产出合并到 vars，所有后续 resolveVariables 都吃这份新的
  if (reqPreScript.value.trim()) {
    const scriptCtx = {
      variables: vars,
      environment: vars,  // 简化：vars 就是当前生效的环境变量集
      request: {
        method: reqMethod.value,
        url: reqUrl.value,
        headers: reqHeaders.value,
        body: reqBody.value,
      },
    }
    const result = await runPreRequestScript(reqPreScript.value, scriptCtx)
    if (result.error) {
      ElMessage.error(`${t('apiDebug.preScriptError')}: ${result.error}`)
      return
    }
    vars = result.variables
  }

  let finalUrl = resolveVariables(reqUrl.value, vars)
  finalUrl = applyPathVars(finalUrl, reqPathVars.value)
  finalUrl = normalizeRequestUrl(finalUrl)
  finalUrl = buildUrl(finalUrl, reqParams.value)

  const headerMap = {}
  reqHeaders.value.filter(h => h.enabled && h.key).forEach(h => {
    headerMap[resolveVariables(h.key, vars)] = resolveVariables(h.value, vars)
  })

  const authResolved = { ...reqAuth.value }
  ;['token', 'username', 'password', 'key', 'value'].forEach(f => {
    if (authResolved[f]) authResolved[f] = resolveVariables(authResolved[f], vars)
  })
  const authHeader = buildAuthHeader(authResolved)
  if (authHeader) headerMap[authHeader.key] = authHeader.value

  if (reqAuth.value.type === 'apikey' && reqAuth.value.position === 'query' && reqAuth.value.key) {
    const resolvedKey = resolveVariables(reqAuth.value.key, vars)
    const resolvedVal = resolveVariables(reqAuth.value.value, vars)
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedVal)}`
  }

  let bodyPayload = null
  if (reqBody.value.type === 'json' && reqBody.value.content) {
    const jsonContent = resolveVariables(reqBody.value.content, vars)
    try { JSON.parse(jsonContent) } catch {
      ElMessage.warning('JSON Body format is invalid')
      return
    }
    headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/json'
    bodyPayload = jsonContent
  } else if (reqBody.value.type === 'raw' && reqBody.value.content) {
    bodyPayload = resolveVariables(reqBody.value.content, vars)
  } else if (reqBody.value.type === 'form') {
    const formPairs = reqBody.value.formData.filter(f => f.enabled && f.key)
      .map(f => `${encodeURIComponent(resolveVariables(f.key, vars))}=${encodeURIComponent(resolveVariables(f.value, vars))}`)
    if (formPairs.length) {
      headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/x-www-form-urlencoded'
      bodyPayload = formPairs.join('&')
    }
  } else if (reqBody.value.type === 'multipart') {
    const resolvedFields = reqBody.value.formData
      .filter(f => f.enabled && f.key)
      .map(f => ({
        key: resolveVariables(f.key, vars),
        value: resolveVariables(f.value, vars),
      }))
    if (resolvedFields.length) {
      try {
        const built = await buildMultipartBody(resolvedFields)
        // 必须用 buildMultipartBody 返回的 boundary，用户手填的 Content-Type 会失效
        headerMap['Content-Type'] = built.contentType
        bodyPayload = built.body
      } catch (err) {
        ElMessage.error(err?.message || 'multipart build failed')
        return
      }
    }
  } else if (reqBody.value.type === 'binary') {
    const filePath = (reqBody.value.binaryPath || '').trim()
    if (filePath) {
      try {
        const { readFile } = await import('@tauri-apps/plugin-fs')
        const bytes = await readFile(filePath)
        bodyPayload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
        if (!headerMap['Content-Type']) {
          headerMap['Content-Type'] = guessBinaryContentType(filePath)
        }
      } catch (err) {
        ElMessage.error(`${t('apiDebug.saveResponseFailed')}: ${err?.message || err}`)
        return
      }
    }
  }

  sending.value = true
  response.value = null
  responseError.value = null
  requestCanceled.value = false
  resTab.value = 'body'

  // Cookie Jar 注入：合并已有 Cookie header（用户手填的优先级低于 jar，便于 override）
  if (cookieJarEnabled.value) {
    const jarCookie = buildCookieHeader(finalUrl)
    if (jarCookie) {
      headerMap['Cookie'] = headerMap['Cookie']
        ? `${headerMap['Cookie']}; ${jarCookie}`
        : jarCookie
    }
  }

  try {
    const res = await sendRequest({
      method: reqMethod.value,
      url: finalUrl,
      headers: headerMap,
      body: bodyPayload,
      timeout: reqSettings.value.timeout,
      sslVerify: reqSettings.value.sslVerify,
      followRedirects: reqSettings.value.followRedirects,
      maxRedirects: reqSettings.value.maxRedirects,
    })
    response.value = res
    // Cookie Jar 摄入：把响应的 Set-Cookie 写入 jar
    if (cookieJarEnabled.value && res.setCookies?.length) {
      ingestSetCookies(res.setCookies, finalUrl)
    }
    saveToHistory({
      method: reqMethod.value,
      url: reqUrl.value,
      status: res.status,
      time: res.time,
      params: reqParams.value,
      headers: reqHeaders.value,
      pathVars: reqPathVars.value,
      body: { ...reqBody.value },
      auth: { ...reqAuth.value },
    })
    history.value = loadHistory()
  } catch (err) {
    if (err.message === 'REQUEST_CANCELED') {
      responseError.value = t('apiDebug.cancel')
    } else if (err.message === 'REQUEST_TIMEOUT') {
      responseError.value = t('apiDebug.timeoutError')
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('network')) {
      responseError.value = t('apiDebug.networkError')
    } else {
      responseError.value = err.message
    }
  } finally {
    sending.value = false
    requestCanceled.value = false
  }
}

function doCancel() {
  requestCanceled.value = true
  cancelRequest()
}

onBeforeUnmount(() => {
  cancelRequest()
})

function refreshCollectionsState() {
  collections.value = loadCollections()
  // 不再 mutate expandedKeys ——
  // 1) :default-expanded-keys 是 reactive 绑定，每次变化会被 EP 重新应用，
  //    会破坏用户手动折叠的状态；
  // 2) EP 内部 store 在数据更新时按 ID 保留 nodesMap，已展开节点的状态不会丢；
  // 3) 新建节点时通过 expandNodeById 显式展开父节点。
}

function onCreateCollection() {
  ElMessageBox.prompt(t('apiDebug.collectionName'), t('apiDebug.newCollection'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const collection = createCollection(value.trim())
      refreshCollectionsState()
      activeTreeNodeId.value = `collection:${collection.id}`
      selectedCollectionId.value = collection.id
      // 自动展开新创建的 collection
      expandNodeById(`collection:${collection.id}`)
      ElMessage.success(t('apiDebug.saved'))
    }
  }).catch(() => {})
}

function onCreateFolderAtSelection() {
  const target = resolveTreeTarget()
  if (!target.collectionId) {
    ElMessage.warning(t('apiDebug.selectCollection'))
    return
  }
  ElMessageBox.prompt(t('apiDebug.folderName'), t('apiDebug.newFolder'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const folder = createFolder(target.collectionId, target.parentId, value.trim())
      refreshCollectionsState()
      if (folder) {
        activeTreeNodeId.value = `folder:${folder.id}`
        selectedCollectionId.value = target.collectionId
        selectedFolderId.value = folder.id
        // 自动展开父节点（folder 在 folder 下，或 folder 在 collection 下）
        const parentTreeId = target.parentId
          ? `folder:${target.parentId}`
          : `collection:${target.collectionId}`
        expandNodeById(parentTreeId)
      }
    }
  }).catch(() => {})
}

function onCreateInterfaceAtSelection() {
  const target = resolveTreeTarget()
  if (!target.collectionId) {
    ElMessage.warning(t('apiDebug.selectCollection'))
    return
  }
  saveName.value = ''
  saveCollectionId.value = target.collectionId
  saveParentNodeId.value = target.parentId
  showSaveDialog.value = true
}

function onTreeNodeCmd(cmd, data) {
  if (cmd === 'newFolder') {
    selectedCollectionId.value = data.type === 'collection' ? data.rawId : data.collectionId
    selectedFolderId.value = data.type === 'folder' ? data.rawId : null
    onCreateFolderAtSelection()
    return
  }
  if (cmd === 'newInterface') {
    selectedCollectionId.value = data.type === 'collection' ? data.rawId : data.collectionId
    selectedFolderId.value = data.type === 'folder' ? data.rawId : null
    onCreateInterfaceAtSelection()
    return
  }
  if (cmd === 'exportPostman') {
    onExportPostman(data.rawId)
    return
  }
  if (cmd === 'rename') {
    const currentName = data.name
    const title = data.type === 'collection' ? t('apiDebug.collectionName') : (data.type === 'folder' ? t('apiDebug.folderName') : t('apiDebug.reqName'))
    ElMessageBox.prompt(title, t('common.edit'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      inputValue: currentName,
    }).then(({ value }) => {
      if (!value?.trim()) return
      if (data.type === 'collection') {
        renameCollection(data.rawId, value.trim())
      } else {
        renameCollectionNode(data.collectionId, data.rawId, value.trim())
      }
      refreshCollectionsState()
    }).catch(() => {})
    return
  }
  if (cmd === 'delete') {
    ElMessageBox.confirm(
      data.type === 'collection' ? t('apiDebug.confirmDeleteCollection') : t('apiDebug.confirmDeleteNode'),
      t('common.confirmDelete'),
      { type: 'warning' }
    ).then(() => {
      if (data.type === 'collection') {
        deleteCollection(data.rawId)
      } else {
        deleteCollectionItem(data.collectionId, data.rawId)
      }
      if (data.type === 'api' && activeItemId.value === data.rawId) {
        activeItemId.value = null
      }
      refreshCollectionsState()
    }).catch(() => {})
  }
}

/* ========= 文件夹/集合展开/折叠：no-op =========
   注意：不要在这里 mutate expandedKeys —— :default-expanded-keys
   是 reactive 绑定，每次变化会被 EP 重新应用，导致刚刚折叠的节点
   被强制重新展开，子节点"折叠不住"。 */
function onTreeExpand() { /* no-op */ }
function onTreeCollapse() { /* no-op */ }

function handleCollectionNodeClick(data) {
  activeTreeNodeId.value = data.id
  if (data.type === 'collection') {
    selectedCollectionId.value = data.rawId
    selectedFolderId.value = null
    toggleTreeNode(data.id)
    return
  }
  selectedCollectionId.value = data.collectionId
  if (data.type === 'folder') {
    selectedFolderId.value = data.rawId
    toggleTreeNode(data.id)
    return
  }
  activeItemId.value = data.rawId
  selectedFolderId.value = null
  const item = getCollectionNodeById(collections.value, data.collectionId, data.rawId)
  if (item) {
    loadCollectionItem(item)
  }
}

/* 手动 toggle：非 lazy 模式下空 folder 被 EP 视为 leaf，
   expand-on-click-node 不生效，所以这里主动调用 node API。 */
function toggleTreeNode(treeNodeId) {
  if (!collectionTreeRef.value) return
  const treeNode = collectionTreeRef.value.getNode(treeNodeId)
  if (!treeNode) return
  if (treeNode.expanded) treeNode.collapse()
  else treeNode.expand()
}

/* 工具：通过 tree 实例展开某节点（异步，等 DOM 更新） */
async function expandNodeById(treeNodeId) {
  await nextTick()
  if (!collectionTreeRef.value) return
  const treeNode = collectionTreeRef.value.getNode(treeNodeId)
  if (treeNode) treeNode.expand()
}

function loadCollectionItem(item) {
  activeItemId.value = item.id
  reqMethod.value = item.method
  reqUrl.value = item.url  // sync watcher 立刻重建 reqPathVars，下面再覆盖填值
  if (Array.isArray(item.pathVars) && item.pathVars.length) {
    const saved = Object.fromEntries(item.pathVars.map(v => [v.key, v.value]))
    reqPathVars.value.forEach(pv => { if (saved[pv.key] != null) pv.value = saved[pv.key] })
  }
  reqParams.value = item.params?.length ? JSON.parse(JSON.stringify(item.params)) : [{ key: '', value: '', enabled: true }]
  reqHeaders.value = item.headers?.length ? JSON.parse(JSON.stringify(item.headers)) : [{ key: '', value: '', enabled: true }]
  reqBody.value = item.body ? JSON.parse(JSON.stringify(item.body)) : { type: 'none', content: '', formData: [] }
  if (!reqBody.value.formData) reqBody.value.formData = [{ key: '', value: '', enabled: true }]
  reqAuth.value = item.auth ? JSON.parse(JSON.stringify(item.auth)) : { type: 'none' }
  reqSettings.value = item.settings
    ? { timeout: 30000, sslVerify: true, followRedirects: true, maxRedirects: 10, ...item.settings }
    : { timeout: 30000, sslVerify: true, followRedirects: true, maxRedirects: 10 }
  reqPreScript.value = item.preScript || ''
  response.value = null
  responseError.value = null
}

function doSaveToCollection() {
  if (!saveCollectionId.value) {
    ElMessage.warning(t('apiDebug.selectCollection'))
    return
  }
  saveRequestToCollection(saveCollectionId.value, {
    name: saveName.value || `${reqMethod.value} ${reqUrl.value}`,
    method: reqMethod.value,
    url: reqUrl.value,
    params: reqParams.value,
    headers: reqHeaders.value,
    pathVars: reqPathVars.value,
    body: reqBody.value,
    auth: reqAuth.value,
    settings: reqSettings.value,
    preScript: reqPreScript.value,
  }, saveParentNodeId.value)
  refreshCollectionsState()
  // 自动展开保存目标父节点（folder 或 collection 根）
  const parentTreeId = saveParentNodeId.value
    ? `folder:${saveParentNodeId.value}`
    : `collection:${saveCollectionId.value}`
  expandNodeById(parentTreeId)
  showSaveDialog.value = false
  ElMessage.success(t('apiDebug.saved'))
}

function loadHistoryItem(item) {
  reqMethod.value = item.method
  reqUrl.value = item.url
  if (Array.isArray(item.pathVars) && item.pathVars.length) {
    const saved = Object.fromEntries(item.pathVars.map(v => [v.key, v.value]))
    reqPathVars.value.forEach(pv => { if (saved[pv.key] != null) pv.value = saved[pv.key] })
  }
  reqParams.value = item.params?.length ? JSON.parse(JSON.stringify(item.params)) : [{ key: '', value: '', enabled: true }]
  reqHeaders.value = item.headers?.length ? JSON.parse(JSON.stringify(item.headers)) : [{ key: '', value: '', enabled: true }]
  reqBody.value = item.body ? JSON.parse(JSON.stringify(item.body)) : { type: 'none', content: '', formData: [] }
  if (!reqBody.value.formData) reqBody.value.formData = [{ key: '', value: '', enabled: true }]
  reqAuth.value = item.auth ? JSON.parse(JSON.stringify(item.auth)) : { type: 'none' }
  activeItemId.value = null
  response.value = null
  responseError.value = null
}

function onClearHistory() {
  ElMessageBox.confirm(t('apiDebug.confirmClearHistory'), t('common.confirmDelete'), { type: 'warning' })
    .then(() => { doClearHistory(); history.value = [] }).catch(() => {})
}

function onDeleteHistoryItem(id) {
  deleteHistoryItem(id)
  history.value = loadHistory()
}

function onUrlMenuCmd(cmd) {
  if (cmd === 'save') {
    saveName.value = ''
    saveCollectionId.value = selectedCollectionId.value || collections.value[0]?.id || null
    saveParentNodeId.value = selectedFolderId.value || null
    showSaveDialog.value = true
  } else if (cmd === 'curl') {
    const curl = generateCode({
      method: reqMethod.value,
      url: reqUrl.value,
      params: reqParams.value,
      headers: reqHeaders.value,
      body: reqBody.value,
      auth: reqAuth.value,
    }, 'curl')
    navigator.clipboard.writeText(curl)
    ElMessage.success(t('apiDebug.copied'))
  } else if (cmd === 'importCurl') {
    curlInput.value = ''
    showCurlDialog.value = true
  }
}

function doImportCurl() {
  const parsed = parseCurl(curlInput.value)
  if (!parsed || !parsed.url) {
    ElMessage.error(t('apiDebug.curlParseError'))
    return
  }
  reqMethod.value = parsed.method
  reqUrl.value = parsed.url
  reqHeaders.value = parsed.headers.length ? parsed.headers : [{ key: '', value: '', enabled: true }]
  const importedFormData = parsed.body.formData && parsed.body.formData.length
    ? parsed.body.formData
    : [{ key: '', value: '', enabled: true }]
  reqBody.value = { type: parsed.body.type, content: parsed.body.content, formData: importedFormData }
  reqAuth.value = parsed.auth
  showCurlDialog.value = false
  ElMessage.success(t('apiDebug.importSuccess'))
}

function resetSettings() {
  reqSettings.value = { timeout: 30000, sslVerify: true, followRedirects: true, maxRedirects: 10 }
}

function onToggleCookieJar(v) {
  setCookieJarEnabled(v)
}
function openCookieJar() {
  cookieList.value = listCookies()
  showCookieJar.value = true
}
function onDeleteCookie(c) {
  deleteCookie(c.host, c.name, c.path)
  cookieList.value = listCookies()
}
function onClearCookieJar() {
  clearJar()
  cookieList.value = []
}

async function onPickBinaryFile() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const filePath = await open({ multiple: false })
    if (!filePath) return
    reqBody.value.binaryPath = filePath
  } catch (err) {
    ElMessage.error(err?.message || String(err))
  }
}

function guessBinaryContentType(filePath) {
  const ext = (filePath.match(/\.([A-Za-z0-9]+)$/) || [])[1]?.toLowerCase() || ''
  const map = {
    json: 'application/json', xml: 'application/xml', txt: 'text/plain', csv: 'text/csv',
    html: 'text/html', pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav',
  }
  return map[ext] || 'application/octet-stream'
}

async function onExportPostman(collectionId) {
  try {
    const col = collections.value.find(c => c.id === collectionId)
    if (!col) return
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const defaultName = sanitizeFilename(`${col.name || 'collection'}.postman_collection.json`)
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Postman Collection', extensions: ['json'] }],
    })
    if (!filePath) return
    const payload = buildPostmanCollection(col)
    await writeTextFile(filePath, JSON.stringify(payload, null, 2))
    ElMessage.success(t('apiDebug.exportSuccess'))
  } catch (err) {
    ElMessage.error(`${t('apiDebug.saveResponseFailed')}: ${err?.message || err}`)
  }
}

async function onSaveResponse() {
  if (!response.value) return
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs')

    const defaultName = suggestResponseFilename(response.value)
    const filePath = await save({ defaultPath: defaultName })
    if (!filePath) return

    if (response.value.bytes && response.value.bytes.byteLength > 0) {
      await writeFile(filePath, response.value.bytes)
    } else {
      await writeTextFile(filePath, response.value.body || '')
    }
    ElMessage.success(t('apiDebug.saveResponseSuccess'))
  } catch (err) {
    ElMessage.error(`${t('apiDebug.saveResponseFailed')}: ${err?.message || err}`)
  }
}

function suggestResponseFilename(res) {
  // 优先 Content-Disposition: attachment; filename="xxx"
  const cd = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition']
  if (cd) {
    const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
    if (m && m[1]) return sanitizeFilename(decodeURIComponent(m[1]))
  }
  // 退化：URL 路径末段 + 推断扩展名
  let base = 'response'
  try {
    const u = new URL(reqUrl.value)
    const seg = u.pathname.split('/').filter(Boolean).pop()
    if (seg) base = seg.replace(/\?.*$/, '')
  } catch { /* ignore */ }
  if (/\.[A-Za-z0-9]{1,8}$/.test(base)) return sanitizeFilename(base)
  const ct = (res.headers?.['content-type'] || res.headers?.['Content-Type'] || '').split(';')[0].trim().toLowerCase()
  const extMap = {
    'application/json': '.json', 'application/xml': '.xml', 'text/xml': '.xml',
    'text/html': '.html', 'text/plain': '.txt', 'text/csv': '.csv',
    'application/pdf': '.pdf', 'application/zip': '.zip',
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/svg+xml': '.svg',
    'application/octet-stream': '.bin',
  }
  return sanitizeFilename(base + (extMap[ct] || '.txt'))
}

/* 跨平台文件名清理：去掉 Windows 非法字符 + 控制字符；截断时保留扩展名；空字符串回退 */
function sanitizeFilename(name) {
  let cleaned = String(name || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
  cleaned = cleaned.replace(/^\.+/, '').replace(/[. ]+$/, '')
  if (!cleaned) return 'response'
  // Windows 保留名（CON / PRN / AUX / NUL / COM1-9 / LPT1-9）
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(cleaned)) cleaned = '_' + cleaned
  if (cleaned.length > 200) {
    const dotIdx = cleaned.lastIndexOf('.')
    if (dotIdx > 0 && cleaned.length - dotIdx <= 10) {
      const ext = cleaned.slice(dotIdx)
      cleaned = cleaned.slice(0, 200 - ext.length) + ext
    } else {
      cleaned = cleaned.slice(0, 200)
    }
  }
  return cleaned
}

async function onImportPostman() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const filePath = await open({
      multiple: false,
      filters: [{ name: 'Postman Collection', extensions: ['json'] }],
    })
    if (!filePath) return
    const text = await readTextFile(filePath)
    let parsed
    try {
      parsed = parsePostmanCollection(text)
    } catch (err) {
      ElMessage.error(t('apiDebug.importPostmanInvalid'))
      return
    }
    const created = importCollection(parsed)
    refreshCollectionsState()
    expandNodeById(`collection:${created.id}`)
    ElMessage.success(t('apiDebug.importPostmanSuccess', { count: countCollectionApis(parsed) }))
  } catch (err) {
    ElMessage.error(t('apiDebug.importPostmanFailed', { msg: err?.message || err }))
  }
}

function normalizeRequestUrl(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return trimmed
  if (/^[a-zA-Z][\w+.-]*:\/\//.test(trimmed)) return trimmed
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?([/?#]|$)/.test(trimmed)) return 'http://' + trimmed
  if (/^[\w.-]+\.[a-zA-Z]{2,}(:\d+)?([/?#]|$)/.test(trimmed)) return 'https://' + trimmed
  return trimmed
}

function formatBodyJson() {
  if (reqBody.value.content) reqBody.value.content = tryFormatJson(reqBody.value.content)
}

function copyResponse() {
  if (response.value?.body) {
    navigator.clipboard.writeText(resBodyMode.value === 'pretty' ? prettyBody.value : response.value.body)
    ElMessage.success(t('apiDebug.copied'))
  }
}

function onEnvChange(val) { setCurrentEnvId(val) }

function onCreateEnv() {
  ElMessageBox.prompt(t('apiDebug.envName'), t('apiDebug.newEnv'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const env = createEnvironment(value.trim())
      environments.value = loadEnvironments()
      editEnvId.value = env.id
    }
  }).catch(() => {})
}

function onDeleteEnv() {
  if (!editEnvId.value) return
  ElMessageBox.confirm(t('apiDebug.confirmDeleteEnv'), t('common.confirmDelete'), { type: 'warning' })
    .then(() => {
      deleteEnvironment(editEnvId.value)
      environments.value = loadEnvironments()
      editEnvId.value = environments.value[0]?.id || null
      if (currentEnvId.value && !environments.value.find(e => e.id === currentEnvId.value)) {
        currentEnvId.value = null
        setCurrentEnvId(null)
      }
    }).catch(() => {})
}

function doSaveEnv() {
  if (!editingEnv.value) return
  if (!editingEnv.value.name?.trim()) {
    ElMessage.warning(t('apiDebug.envName'))
    return
  }
  updateEnvironment(editingEnv.value.id, { name: editingEnv.value.name.trim(), variables: editingEnv.value.variables })
  environments.value = loadEnvironments()
  ElMessage.success(t('apiDebug.envSaved'))
}

function flattenFolderOptions(nodes = [], prefix = '') {
  const result = []
  nodes.forEach(node => {
    if (node.type !== 'folder') return
    const label = prefix ? `${prefix} / ${node.name}` : node.name
    result.push({ id: node.rawId, label })
    result.push(...flattenFolderOptions(node.children || [], label))
  })
  return result
}

function resolveTreeTarget() {
  if (selectedFolderId.value && selectedCollectionId.value) {
    return { collectionId: selectedCollectionId.value, parentId: selectedFolderId.value }
  }
  if (selectedCollectionId.value) {
    return { collectionId: selectedCollectionId.value, parentId: null }
  }
  if (collections.value[0]?.id) {
    return { collectionId: collections.value[0].id, parentId: null }
  }
  return { collectionId: null, parentId: null }
}

function collectExpandKeys(node, target) {
  if (node.type !== 'api') target.push(node.id)
  ;(node.children || []).forEach(child => collectExpandKeys(child, target))
}

function iconForNode(node) {
  if (node.type === 'collection') return '🗂️'
  if (node.type === 'folder') return '📁'
  return '🔗'
}

function nodeTitle(node) {
  if (node.type === 'api') {
    return node.name || node.url
  }
  return node.name
}

function shortenUrl(url) {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url?.length > 40 ? `${url.slice(0, 40)}...` : url
  }
}

onMounted(() => {
  refreshCollectionsState()
  // 初始展开所有 collection / folder 节点（一次性，后续不再 mutate）
  const initial = []
  buildCollectionTree(collections.value).forEach(root => collectExpandKeys(root, initial))
  expandedKeys.value = Array.from(new Set(initial))
  history.value = loadHistory()
  environments.value = loadEnvironments()
  currentEnvId.value = getCurrentEnvId()
  cookieJarEnabled.value = isCookieJarEnabled()
})
</script>

<style scoped>
.api-debug-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-soft));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600;
  color: var(--text-primary); white-space: nowrap;
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 1px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.header-actions :deep(.el-button),
.url-bar :deep(.el-button),
.sidebar-toolbar :deep(.el-button),
.response-toolbar :deep(.el-button) {
  --el-button-border-radius: 10px;
}
.api-debug-wrapper :deep(.el-button) {
  font-weight: 650;
  letter-spacing: 0;
}
.api-debug-wrapper :deep(.el-button--primary) {
  color: var(--el-color-white);
  background: linear-gradient(180deg, var(--accent-blue) 0%, var(--accent-blue) 100%);
  border-color: rgba(49, 107, 208, 0.85);
  box-shadow: 0 6px 14px rgba(49, 107, 208, 0.18), inset 0 1px 0 rgba(255,255,255,0.26);
}
.api-debug-wrapper :deep(.el-button--primary:hover) {
  color: var(--el-color-white);
  background: linear-gradient(180deg, var(--accent-blue-hover) 0%, var(--accent-blue) 100%);
  border-color: rgba(58, 114, 214, 0.9);
}
.api-debug-wrapper :deep(.el-button--default) {
  color: #314155;
  background: var(--surface-panel-soft);
  border-color: rgba(100, 116, 139, 0.16);
}
.api-debug-wrapper :deep(.el-button--default:hover) {
  color: var(--accent-blue);
  background: var(--surface-panel);
  border-color: rgba(74, 120, 217, 0.32);
}
.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.debug-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  flex: 1;
  min-height: 0;
  padding: 0;
  gap: 0;
  position: relative;
  transition: grid-template-columns 0.22s ease;
}
.debug-layout.sidebar-collapsed {
  grid-template-columns: 0 minmax(0, 1fr) !important;
}
.sidebar-area.collapsed {
  width: 0;
  overflow: hidden;
}
.sidebar-area {
  position: relative;
  display: flex;
  min-height: 0;
  transition: width 0.22s ease;
}
.left-sidebar {
  width: 260px; min-width: 260px;
  background: transparent;
  display: flex; flex-direction: column; position: relative;
  transition: width 0.2s, min-width 0.2s;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}
.left-sidebar.collapsed { width: 0; min-width: 0; overflow: hidden; border-width: 0; }
.sidebar-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.sidebar-toggle {
  position: absolute;
  left: 260px;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 22px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--el-bg-color-overlay);
  border: 1px solid rgba(60, 40, 20, 0.14);
  border-radius: 11px;
  z-index: 20;
  color: var(--text-tertiary);
  font-size: 12px;
  box-shadow: 0 2px 6px rgba(60, 40, 20, 0.06);
  transition: left 0.22s ease, color 0.15s, background 0.15s, box-shadow 0.15s;
}
.sidebar-toggle.collapsed { left: 0; }
.sidebar-toggle:hover {
  color: var(--accent-blue);
  background: var(--el-bg-color-overlay);
  box-shadow: 0 3px 10px rgba(47, 111, 228, 0.18);
}
.sidebar-tabs { display: flex; padding: 10px 10px 8px; gap: 6px; }
.sidebar-tab {
  flex: 1; text-align: center; padding: 8px 0; font-size: 12px; color: var(--text-secondary);
  cursor: pointer; user-select: none; border: 1px solid transparent; border-radius: 10px; transition: all 0.15s;
}
.sidebar-tab:hover { color: var(--text-primary); background: var(--surface-muted); }
.sidebar-tab.active {
  color: var(--accent-blue); font-weight: 600;
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-soft));
  border-color: rgba(194, 65, 12,0.15);
  box-shadow: 0 1px 0 var(--surface-panel-soft), 0 6px 14px rgba(60, 40, 20,0.05);
}
.sidebar-list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 8px 8px; }
.sidebar-toolbar {
  padding: 6px 4px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* 顶部新建栏（对齐 ApiDocs 视觉） */
.list-toolbar {
  display: flex;
  gap: 6px;
  /* sidebar-list 自带 4px/8px padding —— negative margin 抵消，让 toolbar 顶到面板边缘 */
  margin: -4px -8px 6px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
}
.toolbar-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.toolbar-btn :deep(.el-icon) { font-size: 13px; }
/* el-tree 节点行 — 对齐 ApiDocs 视觉 */
.tree-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding-right: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.15s;
}
.tree-row.active {
  color: var(--accent-blue);
  font-weight: 600;
}
.tree-row.active .item-name { color: var(--accent-blue); }
.tree-row.active .method-tag { color: var(--accent-blue) !important; }

.tree-row-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.row-icon { font-size: 14px; flex-shrink: 0; color: #d2a55a; }
.folder-icon { color: #d2a55a; }
.collection-icon { color: var(--el-text-color-regular); }
.tree-row.active .folder-icon,
.tree-row.active .collection-icon { color: var(--accent-blue); }

.folder-count {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-quaternary);
  padding: 1px 6px;
  background: rgba(60, 40, 20, 0.06);
  border-radius: 8px;
  margin-left: 2px;
}
.tree-row.active .folder-count {
  color: var(--accent-blue);
  background: rgba(47, 111, 228, 0.12);
}

.row-more {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}
.tree-row:hover .row-more { opacity: 1; }
.row-more:hover { background: rgba(60, 40, 20, 0.06); color: var(--text-primary); }

:deep(.el-tree) {
  --el-tree-node-hover-bg-color: rgba(60, 40, 20, 0.04);
  background: transparent;
  /* 防止深层缩进的节点撑出横向滚动 */
  overflow: hidden;
}
:deep(.el-tree-node) {
  /* 缩进会累加 padding-left，子节点过宽时会逼出横向滚动；这里截断 */
  white-space: nowrap;
  overflow: hidden;
}
/* 彻底隐藏 EP 默认展开箭头，由 slot 内自绘 chevron 接管视觉 */
:deep(.el-tree-node__expand-icon) {
  display: none !important;
}
/* 自绘 chevron：folder/collection 行有箭头，api 行用 spacer 占位 */
.row-chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  font-size: 12px;
  color: var(--text-secondary, var(--el-text-color-regular));
  transition: transform 0.18s ease, color 0.15s;
}
.row-chevron.expanded { transform: rotate(90deg); }
.tree-row:hover .row-chevron { color: var(--accent-blue); }
.tree-row.active .row-chevron { color: var(--accent-blue); }
.row-chevron-spacer {
  flex-shrink: 0;
  display: inline-block;
  width: 14px;
  height: 14px;
}
:deep(.el-tree-node__content) {
  height: 32px;
  padding-right: 0 !important;
  border-left: 2px solid transparent;
  border-radius: 0;
  margin-bottom: 0;
  overflow: hidden;
  transition: background 0.15s, border-color 0.15s;
}
:deep(.el-tree-node__content:hover) {
  background: rgba(60, 40, 20, 0.04);
}
:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(47, 111, 228, 0.08);
  border-left-color: var(--accent-blue);
}
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  border: 0;
  border-left: 2px solid var(--accent-blue);
  box-shadow: none;
}
.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.item-delete { font-size: 12px; color: var(--text-quaternary); flex-shrink: 0; display: inline-flex; opacity: 0; pointer-events: none; transition: opacity 0.15s, color 0.15s; }
.history-group { margin-bottom: 8px; }
.history-group-label { padding: 8px 10px 4px; font-size: 11px; color: var(--text-tertiary); font-weight: 600; }
.history-item {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px; cursor: pointer; font-size: 12px;
  border-radius: 10px; border: 1px solid transparent; margin-bottom: 2px;
}
.history-item:hover { background: var(--surface-muted); }
.history-item:hover .item-delete,
.history-item:focus-within .item-delete {
  opacity: 1;
  pointer-events: auto;
}
.history-status { font-size: 10px; font-weight: 600; flex-shrink: 0; }
.history-status.ok { color: var(--el-color-success); }
.history-status.err { color: var(--el-color-danger); }
.empty-hint {
  text-align: center;
  color: var(--text-quaternary);
  font-size: 12px;
  padding: 24px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: var(--surface-muted);
}
.main-panel {
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.url-bar {
  display: flex; align-items: center; gap: 10px; padding: 12px 18px;
  background: transparent; border-bottom: 1px solid rgba(60, 40, 20, 0.08); flex-shrink: 0;
}
.url-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 4px;
  border: 1px solid rgba(100, 116, 139, 0.12);
  border-radius: 12px;
  background: var(--surface-muted);
}
.url-actions :deep(.el-button) {
  min-width: 74px;
  height: 32px;
  padding: 0 13px;
}
.url-actions :deep(.el-button--primary) {
  min-width: 86px;
}
.url-more-btn {
  min-width: 32px !important;
  padding: 0 8px !important;
  color: #526174 !important;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
.method-select { width: 110px; flex-shrink: 0; }
.method-select :deep(.el-select__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
  padding: 0 10px;
}
.method-select :deep(.el-select__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.method-select :deep(.el-select__wrapper.is-focused) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.method-select :deep(.el-input__inner) { font-weight: 700; }

.url-input { flex: 1; }
.url-input :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
  padding: 0 12px;
}
.url-input :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.url-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.url-input :deep(.el-input__inner) {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12.5px;
  color: var(--text-primary);
}
.split-panels {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.request-panel {
  flex: 0 0 45%;
  width: 100%;
  min-width: 0;
  min-height: 180px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(100, 116, 139, 0.12);
  background: transparent;
}
.panel-resizer { display: none; }
.response-panel {
  flex: 1 1 55%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ============ tabs：nav sticky 不滚动，content 独立滚 ============ */
.compact-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  --el-color-primary: var(--accent-blue);
}
.compact-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
  flex-shrink: 0;
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.compact-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}
.compact-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
.compact-tabs :deep(.el-tabs__item) {
  height: 36px;
  line-height: 36px;
  font-size: 12px;
  font-weight: 500;
  padding: 0 14px;
  color: var(--text-tertiary);
  transition: color 0.15s;
  border-bottom: 2px solid transparent;
}
.compact-tabs :deep(.el-tabs__item):hover {
  color: var(--text-primary);
}
.compact-tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent-blue);
  font-weight: 600;
}
.compact-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  background: var(--accent-blue);
  border-radius: 2px;
}
.compact-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
}
.compact-tabs :deep(.el-tabs__content)::-webkit-scrollbar { width: 5px; }
.compact-tabs :deep(.el-tabs__content)::-webkit-scrollbar-thumb { background: rgba(60, 40, 20, 0.18); border-radius: 3px; }
.compact-tabs :deep(.el-tab-pane) {
  padding: 12px 14px;
  min-height: 100%;
  box-sizing: border-box;
}
/* KV 编辑器 — 对齐 ApiDocs 卡片风 */
.kv-editor {
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  padding: 0;
}
.kv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  min-height: 36px;
  margin: 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  transition: background 0.12s;
}
.kv-row:last-of-type { border-bottom: 0; }
.kv-row:not(.kv-header-row):hover { background: rgba(47, 111, 228, 0.025); }
.kv-header-row {
  min-height: 30px;
  background: rgba(60, 40, 20, 0.03);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  margin-bottom: 0 !important;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kv-editor :deep(.el-input__wrapper),
.kv-editor :deep(.el-select__wrapper),
.kv-editor :deep(.el-autocomplete .el-input__wrapper) {
  height: 30px;
  background: transparent;
  box-shadow: none;
  padding: 0 8px;
  border-radius: 6px;
  transition: box-shadow 0.12s, background 0.12s;
}
.kv-editor :deep(.el-input__inner) {
  font-size: 12px;
  height: 30px;
  line-height: 30px;
}
.kv-editor :deep(.el-input__wrapper:hover),
.kv-editor :deep(.el-select__wrapper:hover),
.kv-editor :deep(.el-autocomplete .el-input__wrapper:hover) {
  background: rgba(60, 40, 20, 0.03);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.kv-editor :deep(.el-input__wrapper.is-focus),
.kv-editor :deep(.el-select__wrapper.is-focused),
.kv-editor :deep(.el-autocomplete .el-input__wrapper.is-focus) {
  background: var(--el-bg-color-overlay) !important;
  box-shadow: inset 0 0 0 1.5px var(--accent-blue) !important;
}
.kv-editor > .el-button {
  display: block;
  width: calc(100% - 12px);
  margin: 6px;
  height: 28px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  text-align: center;
}
.kv-editor > .el-button:hover {
  background: rgba(47, 111, 228, 0.06) !important;
}
.kv-delete {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
  transition: color 0.12s, background 0.12s, opacity 0.12s;
}
.kv-delete:hover { color: var(--el-color-danger); background: rgba(229, 57, 53, 0.08); }
.kv-row:not(.kv-header-row) .kv-delete { opacity: 0; }
.kv-row:not(.kv-header-row):hover .kv-delete { opacity: 1; }
.body-type-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.body-textarea {
  width: 100%; min-height: 120px; max-height: 200px; padding: 10px 12px;
  border: 1px solid rgba(60, 40, 20, 0.08); border-radius: 12px;
  background: var(--surface-panel); color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  resize: vertical; outline: none; box-sizing: border-box;
}
.body-textarea:focus { border-color: var(--accent-blue); }
.binary-body {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px dashed rgba(60, 40, 20, 0.18);
  border-radius: 10px;
  background: var(--surface-muted);
}
.binary-path {
  flex: 1;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.binary-clear {
  cursor: pointer;
  color: var(--text-quaternary);
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.binary-clear:hover {
  color: var(--el-color-danger);
  background: rgba(229, 57, 53, 0.08);
}
.auth-editor { padding: 6px 0; }
.auth-fields { display: flex; flex-direction: column; gap: 8px; }
.settings-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}
.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}
.setting-label {
  flex: 0 0 160px;
  color: var(--text-secondary);
  font-weight: 500;
}
.setting-suffix {
  color: var(--text-tertiary);
  font-size: 11px;
}
.prescript-editor { display: flex; flex-direction: column; gap: 8px; }
.prescript-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.5;
}
.response-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--text-quaternary); gap: 8px;
  margin: 20px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: var(--surface-muted);
}
.response-empty-icon { font-size: 48px; }
.response-empty-hint { font-size: 11px; }
.response-loading { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-tertiary); }
.response-status-bar {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08); flex-shrink: 0;
}
.status-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
.status-badge.ok { color: var(--el-color-success); background: rgba(103,194,58,0.12); }
.status-badge.err { color: var(--el-color-danger); background: rgba(245,108,108,0.12); }
.status-meta { font-size: 11px; color: var(--text-tertiary); }
.response-tabs { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.response-tabs :deep(.el-tabs__content) { flex: 1; overflow: auto; }
.response-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.response-body {
  margin: 0; padding: 0 0 10px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-break: break-all;
  flex: 1; overflow-y: auto;
}
.response-headers-table { padding: 4px 0; }
.res-header-row { display: flex; gap: 12px; padding: 6px 0; font-size: 12px; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.res-header-key { min-width: 120px; max-width: 32%; flex: 0 1 220px; font-weight: 600; color: var(--text-primary); }
.res-header-val { flex: 1; color: var(--text-secondary); word-break: break-all; }
.env-list-bar { display: flex; gap: 8px; }
.status-bar {
  height: 30px; display: flex; align-items: center; gap: 16px; padding: 0 16px;
  margin: 0;
  background: var(--surface-panel-soft); border: 1px solid rgba(60, 40, 20, 0.08); border-top: none;
  border-radius: 0;
  font-size: 11px; color: var(--text-tertiary); flex-shrink: 0;
}
.path-vars-section {
  margin-top: 14px;
  border-top: 1px dashed rgba(60, 40, 20, 0.12);
  padding-top: 10px;
}
.kv-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}
.bulk-textarea {
  width: 100%;
  min-height: 160px;
  max-height: 320px;
  padding: 10px 12px;
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  color: var(--text-primary);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}
.bulk-textarea:focus { border-color: var(--accent-blue); }
.path-vars-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}
.path-var-key {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
  min-width: 80px;
  flex-shrink: 0;
  padding-left: 4px;
}
.history-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px 10px;
}
.history-search {
  flex: 1;
}
.history-search :deep(.el-input__wrapper) {
  height: 28px;
  border-radius: 8px;
}
.response-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.cookies-table {
  font-size: 12px;
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 8px;
  overflow: hidden;
}
.cookie-row {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1.2fr 0.8fr 1fr 1.2fr;
  gap: 8px;
  padding: 7px 10px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  align-items: center;
  word-break: break-all;
}
.cookie-row:last-child { border-bottom: 0; }
.cookie-row-header {
  background: rgba(60, 40, 20, 0.03);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
}
.ck-name { font-weight: 600; color: var(--text-primary); }
.ck-val { color: var(--text-secondary); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ck-flags { display: flex; flex-wrap: wrap; gap: 4px; }
.ck-flag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(47, 111, 228, 0.1);
  color: var(--accent-blue);
}
.sidebar-list::-webkit-scrollbar, .response-body::-webkit-scrollbar,
.request-panel::-webkit-scrollbar, .response-panel::-webkit-scrollbar { width: 5px; }
.sidebar-list::-webkit-scrollbar-track, .response-body::-webkit-scrollbar-track,
.request-panel::-webkit-scrollbar-track, .response-panel::-webkit-scrollbar-track { background: transparent; }
.sidebar-list::-webkit-scrollbar-thumb, .response-body::-webkit-scrollbar-thumb,
.request-panel::-webkit-scrollbar-thumb, .response-panel::-webkit-scrollbar-thumb {
  background: var(--text-quaternary); border-radius: 3px;
}
@media (max-width: 1100px) {
  .left-sidebar { width: 240px; min-width: 240px; }
  .header-actions { gap: 6px; }
}
@media (max-width: 860px) {
  .header { padding: 0 14px; }
  .breadcrumb { font-size: 14px; }
  .left-sidebar { width: 220px; min-width: 220px; }
}
</style>



