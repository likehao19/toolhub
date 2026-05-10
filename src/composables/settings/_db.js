/**
 * 共享数据库句柄（productivity.db）
 *
 * 多个 settings composable（password / 等）需要操作同一个 SQLite 库。
 * Module-level 缓存避免重复 load。
 */

import Database from '@tauri-apps/plugin-sql'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}
