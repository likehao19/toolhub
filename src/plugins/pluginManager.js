/**
 * 插件管理器
 * 负责插件的注册、加载和生命周期管理
 */

class PluginManager {
  constructor() {
    this.plugins = new Map()
    this.events = new Map()
  }

  /**
   * 注册插件
   */
  registerPlugin(plugin) {
    if (!plugin.id) {
      throw new Error('插件必须包含 id 属性')
    }

    if (this.plugins.has(plugin.id)) {
    }

    // 验证插件接口
    this.validatePlugin(plugin)

    // 存储插件
    this.plugins.set(plugin.id, {
      ...plugin,
      status: 'registered',
      registeredAt: new Date()
    })
  }

  /**
   * 验证插件接口
   */
  validatePlugin(plugin) {
    const required = ['id', 'name', 'version']
    for (const field of required) {
      if (!plugin[field]) {
        throw new Error(`插件缺少必需字段: ${field}`)
      }
    }
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    if (plugin.status === 'loaded') {
      return
    }

    try {
      // 调用插件的 onLoad 生命周期
      if (plugin.onLoad && typeof plugin.onLoad === 'function') {
        await plugin.onLoad()
      }

      plugin.status = 'loaded'
      plugin.loadedAt = new Date()
    } catch (error) {
      plugin.status = 'error'
      plugin.error = error.message
      throw error
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    if (plugin.status !== 'loaded') {
      return
    }

    try {
      // 调用插件的 onUnload 生命周期
      if (plugin.onUnload && typeof plugin.onUnload === 'function') {
        await plugin.onUnload()
      }

      plugin.status = 'unloaded'
    } catch (error) {
      throw error
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId)
  }

  /**
   * 获取所有插件
   */
  getAllPlugins() {
    return Array.from(this.plugins.values())
  }

  /**
   * 获取已加载的插件
   */
  getLoadedPlugins() {
    return Array.from(this.plugins.values()).filter(p => p.status === 'loaded')
  }

  /**
   * 注册事件监听器
   */
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event).push(handler)
  }

  /**
   * 移除事件监听器
   */
  off(event, handler) {
    if (!this.events.has(event)) return
    
    const handlers = this.events.get(event)
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (!this.events.has(event)) return

    const handlers = this.events.get(event)
    for (const handler of handlers) {
      try {
        handler(data)
      } catch (e) { /* ignore */ }
    }
  }
}

// 创建单例
const pluginManager = new PluginManager()

export default pluginManager

