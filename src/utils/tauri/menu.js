/**
 * Menu API 封装
 */

import { Menu, MenuItem, Submenu, PredefinedMenuItem, CheckMenuItem, IconMenuItem } from '@tauri-apps/api/menu'
import { Image } from '@tauri-apps/api/image'
import { ElMessage } from 'element-plus'

/**
 * 创建基础菜单
 */
export async function createBasicMenu() {
  try {
    const menu = await Menu.new({
      items: [
        {
          id: 'quit',
          text: '退出',
          action: () => {
            ElMessage.info('退出按钮被点击')
          },
        },
      ],
    })
    return menu
  } catch (error) {
    ElMessage.error('创建基础菜单失败: ' + error.message)
    throw error
  }
}

/**
 * 创建多级菜单
 */
export async function createMultiLevelMenu() {
  try {
    const fileSubmenu = await Submenu.new({
      text: '文件',
      items: [
        await MenuItem.new({
          id: 'new',
          text: '新建',
          action: () => {
            ElMessage.success('新建被点击')
          },
        }),
        await MenuItem.new({
          id: 'open',
          text: '打开',
          action: () => {
            ElMessage.success('打开被点击')
          },
        }),
        await MenuItem.new({
          id: 'save_as',
          text: '另存为...',
          action: () => {
            ElMessage.success('另存为被点击')
          },
        }),
      ],
    })

    const editSubmenu = await Submenu.new({
      text: '编辑',
      items: [
        await MenuItem.new({
          id: 'undo',
          text: '撤销',
          action: () => {
            ElMessage.success('撤销被点击')
          },
        }),
        await MenuItem.new({
          id: 'redo',
          text: '重做',
          action: () => {
            ElMessage.success('重做被点击')
          },
        }),
      ],
    })

    const menu = await Menu.new({
      items: [
        fileSubmenu,
        editSubmenu,
        await MenuItem.new({
          id: 'quit',
          text: '退出',
          action: () => {
            ElMessage.info('退出被点击')
          },
        }),
      ],
    })

    return menu
  } catch (error) {
    ElMessage.error('创建多级菜单失败: ' + error.message)
    throw error
  }
}

/**
 * 创建预定义菜单
 */
export async function createPredefinedMenu() {
  try {
    const copy = await PredefinedMenuItem.new({
      text: 'copy-text',
      item: 'Copy',
    })

    const separator = await PredefinedMenuItem.new({
      text: 'separator-text',
      item: 'Separator',
    })

    const undo = await PredefinedMenuItem.new({
      text: 'undo-text',
      item: 'Undo',
    })

    const redo = await PredefinedMenuItem.new({
      text: 'redo-text',
      item: 'Redo',
    })

    const cut = await PredefinedMenuItem.new({
      text: 'cut-text',
      item: 'Cut',
    })

    const paste = await PredefinedMenuItem.new({
      text: 'paste-text',
      item: 'Paste',
    })

    const selectAll = await PredefinedMenuItem.new({
      text: 'select_all-text',
      item: 'SelectAll',
    })

    const menu = await Menu.new({
      items: [copy, separator, undo, redo, cut, paste, selectAll],
    })

    return menu
  } catch (error) {
    ElMessage.error('创建预定义菜单失败: ' + error.message)
    throw error
  }
}

/**
 * 创建动态菜单（支持状态更改）
 */
export async function createDynamicMenu() {
  try {
    let currentLanguage = 'en'

    const checkSubItemEn = await CheckMenuItem.new({
      id: 'en',
      text: 'English',
      checked: currentLanguage === 'en',
      action: () => {
        currentLanguage = 'en'
        checkSubItemEn.setChecked(currentLanguage === 'en')
        checkSubItemZh.setChecked(currentLanguage === 'zh')
        ElMessage.success('语言已切换为 English')
      },
    })

    const checkSubItemZh = await CheckMenuItem.new({
      id: 'zh',
      text: '中文',
      checked: currentLanguage === 'zh',
      action: () => {
        currentLanguage = 'zh'
        checkSubItemEn.setChecked(currentLanguage === 'en')
        checkSubItemZh.setChecked(currentLanguage === 'zh')
        ElMessage.success('语言已切换为 中文')
      },
    })

    const textItem = await MenuItem.new({
      id: 'text_item',
      text: '文本项',
      action: () => {
        textItem.setText('文本项已更改')
        ElMessage.success('菜单文本已更改')
      },
    })

    const menu = await Menu.new({
      items: [
        {
          id: 'change_menu',
          text: '更改菜单',
          items: [textItem, checkSubItemEn, checkSubItemZh],
        },
      ],
    })

    return { menu, checkSubItemEn, checkSubItemZh, textItem }
  } catch (error) {
    ElMessage.error('创建动态菜单失败: ' + error.message)
    throw error
  }
}

/**
 * 设置应用菜单
 */
export async function setAppMenu(menu) {
  try {
    // 尝试设置为应用菜单
    await menu.setAsAppMenu()
    ElMessage.success('菜单已设置为应用菜单，请查看应用顶部菜单栏（Windows 上可能需要按 Alt 键或右键窗口标题栏）')
  } catch (error) {
    // 如果 setAsAppMenu 失败，尝试设置为窗口菜单
    try {
      await menu.setAsWindowMenu()
      ElMessage.success('菜单已设置为窗口菜单')
    } catch (windowMenuError) {
      ElMessage.error('设置菜单失败: ' + error.message)
      throw error
    }
  }
}

/**
 * 创建默认的上下文菜单（右键菜单）
 * 最简单的实现：直接在创建时设置 action，不做任何包装
 */
export async function createContextMenu() {
  try {
    // 复制
    const copyItem = await MenuItem.new({
      id: 'copy',
      text: '复制',
      action: () => {
        try {
          const s = window.getSelection().toString()
          if (s) navigator.clipboard.writeText(s).catch(() => document.execCommand('copy'))
          else document.execCommand('copy')
        } catch (e) {
          document.execCommand('copy')
        }
      },
    })

    // 粘贴
    const pasteItem = await MenuItem.new({
      id: 'paste',
      text: '粘贴',
      action: () => {
        navigator.clipboard.readText().then(t => document.execCommand('insertText', false, t)).catch(() => document.execCommand('paste'))
      },
    })

    // 剪切
    const cutItem = await MenuItem.new({
      id: 'cut',
      text: '剪切',
      action: () => document.execCommand('cut'),
    })

    const separator1 = await PredefinedMenuItem.new({ item: 'Separator' })

    // 全选
    const selectAllItem = await MenuItem.new({
      id: 'selectAll',
      text: '全选',
      action: () => document.execCommand('selectAll'),
    })

    const separator2 = await PredefinedMenuItem.new({ item: 'Separator' })

    // 撤销
    const undoItem = await MenuItem.new({
      id: 'undo',
      text: '撤销',
      action: () => document.execCommand('undo'),
    })

    // 重做
    const redoItem = await MenuItem.new({
      id: 'redo',
      text: '重做',
      action: () => document.execCommand('redo'),
    })

    const separator3 = await PredefinedMenuItem.new({ item: 'Separator' })

    // 刷新 - 使用完全异步的方式，确保不阻塞菜单
    const refreshItem = await MenuItem.new({
      id: 'refresh',
      text: '刷新',
      action: () => {
        // 标记正在刷新
        window.__TAURI_RELOADING__ = true
        // 使用 MessageChannel 确保完全异步，不阻塞菜单
        const channel = new MessageChannel()
        channel.port1.onmessage = () => {
          // 在下一个事件循环中执行刷新
          setTimeout(() => {
            window.location.reload()
          }, 100)
        }
        channel.port2.postMessage(null)
      },
    })

    const separator4 = await PredefinedMenuItem.new({ item: 'Separator' })

    // 只在开发模式下显示"检查元素"选项
    const inspectItem = import.meta.env.DEV ? await MenuItem.new({
      id: 'inspect',
      text: '检查元素',
      action: () => {
        if (window.__TAURI_RELOADING__) return
        import('@tauri-apps/api/core').then(({ invoke }) => invoke('toggle_devtools').catch(() => {}))
      },
    }) : null

    // 构建菜单项数组
    const menuItems = [copyItem, pasteItem, cutItem, separator1, selectAllItem, separator2, undoItem, redoItem, separator3, refreshItem]
    if (inspectItem) menuItems.push(separator4, inspectItem)

    return await Menu.new({ items: menuItems })
  } catch (error) {
    throw error
  }
}

/**
 * 创建自定义上下文菜单
 * @param {Array} items - 菜单项配置数组
 * @param {Object} options - 选项配置
 * @returns {Promise<Menu>} 菜单对象
 */
export async function createCustomContextMenu(items = [], options = {}) {
  try {
    const menuItems = []

    for (const item of items) {
      if (item.type === 'predefined') {
        // 预定义菜单项
        const predefinedItem = await PredefinedMenuItem.new({
          item: item.item,
        })
        menuItems.push(predefinedItem)
      } else if (item.type === 'separator') {
        // 分隔符
        const separator = await PredefinedMenuItem.new({
          item: 'Separator',
        })
        menuItems.push(separator)
      } else if (item.type === 'submenu') {
        // 子菜单
        const submenuItems = []
        for (const subItem of item.items || []) {
          if (subItem.type === 'predefined') {
            submenuItems.push(await PredefinedMenuItem.new({ item: subItem.item }))
          } else {
            submenuItems.push(await MenuItem.new({
              id: subItem.id,
              text: subItem.text,
              action: subItem.action,
            }))
          }
        }
        const submenu = await Submenu.new({
          text: item.text,
          items: submenuItems,
        })
        menuItems.push(submenu)
      } else {
        // 普通菜单项
        const menuItem = await MenuItem.new({
          id: item.id,
          text: item.text,
          action: item.action,
        })
        menuItems.push(menuItem)
      }
    }

    const menu = await Menu.new({
      items: menuItems,
    })

    return menu
  } catch (error) {
    throw error
  }
}

// 预加载窗口 API
import { LogicalPosition } from '@tauri-apps/api/window'

// 最简单的实现：直接调用，不做任何复杂处理
let menuInstance = null

/**
 * 显示上下文菜单
 */
export function showContextMenu(menu, x, y) {
  if (!menu || window.__TAURI_RELOADING__) return
  
  try {
    const position = new LogicalPosition(Math.round(x || 0), Math.round(y || 0))
    menu.popup(position).catch(() => {})
  } catch (error) {
    // 忽略错误
  }
}

/**
 * 设置全局上下文菜单监听器
 */
export function setupContextMenu(menu, selector = null) {
  menuInstance = menu
  
  const handleContextMenu = (event) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (window.__TAURI_RELOADING__) return
    
    const x = event.clientX
    const y = event.clientY
    
    // 直接调用，不做任何延迟
    showContextMenu(menu, x, y)
  }

  if (selector) {
    // 如果提供了选择器，只监听指定元素
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector
    if (element) {
      element.addEventListener('contextmenu', handleContextMenu)
      return () => {
        element.removeEventListener('contextmenu', handleContextMenu)
      }
    }
  } else {
    // 监听整个文档
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }
}

export default {
  createBasicMenu,
  createMultiLevelMenu,
  createPredefinedMenu,
  createDynamicMenu,
  setAppMenu,
  createContextMenu,
  createCustomContextMenu,
  showContextMenu,
  setupContextMenu,
}

