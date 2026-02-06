/**
 * CLI API 封装
 */

import { getMatches } from '@tauri-apps/plugin-cli'

/**
 * 获取命令行参数
 * @returns {Promise<import('@tauri-apps/plugin-cli').Matches>}
 */
export async function getCliMatches() {
  try {
    return await getMatches()
  } catch (error) {
    throw error
  }
}

