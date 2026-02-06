/**
 * Tauri API 统一导出
 * 提供简化的 Tauri 原生 API 调用接口
 */

import * as windowAPI from './window'
import * as dialogAPI from './dialog'
import * as notificationAPI from './notification'
import * as clipboardAPI from './clipboard'
import * as shellAPI from './shell'
import * as processAPI from './process'
import * as fsAPI from './fs'
import * as trayAPI from './tray'
import * as fileTreeAPI from './fileTree'
import * as fileManagerAPI from './fileManager'
import * as storeAPI from './store'
import * as httpAPI from './http'
import * as sqlAPI from './sql'
import * as websocketAPI from './websocket'
import * as uploadAPI from './upload'
import * as globalShortcutAPI from './globalShortcut'
import * as cliAPI from './cli'
import * as positionerAPI from './positioner'
import * as logAPI from './log'
import * as updaterAPI from './updater'
import * as menuAPI from './menu'
import * as autostartAPI from './autostart'
import * as customNotificationAPI from './customNotification'

// 统一导出
export const TauriWindow = windowAPI
export const TauriDialog = dialogAPI
export const TauriNotification = notificationAPI
export const TauriClipboard = clipboardAPI
export const TauriShell = shellAPI
export const TauriProcess = processAPI
export const TauriFS = fsAPI
export const TauriTray = trayAPI
export const TauriFileTree = fileTreeAPI
export const TauriFileManager = fileManagerAPI
export const TauriStore = storeAPI
export const TauriHttp = httpAPI
export const TauriSql = sqlAPI
export const TauriWebSocket = websocketAPI
export const TauriUpload = uploadAPI
export const TauriGlobalShortcut = globalShortcutAPI
export const TauriCli = cliAPI
export const TauriPositioner = positionerAPI
export const TauriLog = logAPI
export const TauriUpdater = updaterAPI
export const TauriMenu = menuAPI
export const TauriAutostart = autostartAPI
export const CustomNotification = customNotificationAPI

// 默认导出
export default {
  Window: windowAPI,
  Dialog: dialogAPI,
  Notification: notificationAPI,
  Clipboard: clipboardAPI,
  Shell: shellAPI,
  Process: processAPI,
  FS: fsAPI,
  Tray: trayAPI,
  FileTree: fileTreeAPI,
  FileManager: fileManagerAPI,
  Store: storeAPI,
  Http: httpAPI,
  Sql: sqlAPI,
  WebSocket: websocketAPI,
  Upload: uploadAPI,
  GlobalShortcut: globalShortcutAPI,
  Cli: cliAPI,
  Positioner: positionerAPI,
  Log: logAPI,
  Updater: updaterAPI,
  Menu: menuAPI,
  Autostart: autostartAPI,
  CustomNotification: customNotificationAPI
}
