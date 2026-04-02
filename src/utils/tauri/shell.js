/**
 * Shell API 封装
 */

import { openUrl } from '@tauri-apps/plugin-opener'
import { invoke } from '@tauri-apps/api/core'
import { Command } from '@tauri-apps/plugin-shell'
import { platform } from '@tauri-apps/plugin-os'
import { ElMessage } from 'element-plus'

/**
 * 在默认浏览器中打开 URL
 * @param {string} url - URL 地址
 */
export async function openURL(url) {
  // 优先使用 Rust 命令打开 URL
  try {
    await invoke('open_url_in_browser', { url })
    return
  } catch (rustError) {
    // 如果 Rust 命令失败，回退到插件 API
    await openUrl(url)
  }
}

/**
 * 执行系统命令
 * @param {string} program - 程序名称
 * @param {string[]} args - 参数数组
 * @returns {Promise<Object>} - 返回执行结果
 */
export async function executeCommand(program, args = []) {
  try {
    // Windows 内置命令需要通过 cmd.exe 执行
    const windowsBuiltinCommands = ['dir', 'cd', 'type', 'copy', 'del', 'move', 'ren', 'md', 'rd', 'cls', 'echo', 'set', 'if', 'for', 'goto', 'call', 'date', 'time', 'ver']
    
    let finalProgram = program
    let finalArgs = [...args]
    
    // 如果是 Windows 内置命令，通过 cmd.exe /c 执行
    try {
      const currentPlatform = await platform()
      if (currentPlatform === 'win32') {
        // 将 ls 转换为 dir（跨平台兼容）
        if (program.toLowerCase() === 'ls') {
          finalProgram = 'cmd.exe'
          finalArgs = ['/c', 'dir', ...args]
        } else if (windowsBuiltinCommands.includes(program.toLowerCase())) {
          finalProgram = 'cmd.exe'
          finalArgs = ['/c', program, ...args]
        }
      }
    } catch (e) {
      // 如果无法获取平台信息，继续使用原始命令
    }
    
    // 优先使用 Rust 命令，可以处理 Windows 编码问题
    try {
      const result = await invoke('execute_shell_command', {
        program: finalProgram,
        args: finalArgs
      })
      return result
    } catch (rustError) {
      // 如果 Rust 命令失败，回退到插件 API
      const command = Command.create(finalProgram, finalArgs)
      const output = await command.execute()
      return {
        code: output.code,
        stdout: output.stdout,
        stderr: output.stderr
      }
    }
  } catch (error) {
    const errorMsg = error.message || String(error)
    if (errorMsg.includes('not allowed') || errorMsg.includes('not found')) {
      ElMessage.error('命令执行失败: 权限不足或命令未找到。请检查权限配置。')
    } else {
      ElMessage.error('执行命令失败: ' + errorMsg)
    }
    return {
      code: -1,
      stdout: '',
      stderr: errorMsg
    }
  }
}

export default {
  openURL,
  executeCommand
}
