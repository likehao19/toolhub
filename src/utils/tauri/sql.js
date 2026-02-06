/**
 * SQL API 封装
 */

import Database from '@tauri-apps/plugin-sql'
import { ElMessage } from 'element-plus'

let dbInstance = null

/**
 * 获取数据库实例
 * @param {string} path - 数据库路径
 * @returns {Promise<import('@tauri-apps/plugin-sql').default>}
 */
export async function getDatabase(path = 'sqlite:app.db') {
  if (!dbInstance) {
    try {
      dbInstance = await Database.load(path)
      ElMessage.success('数据库连接成功')
    } catch (error) {
      ElMessage.error('数据库连接失败')
      throw error
    }
  }
  return dbInstance
}

/**
 * 执行 SQL 查询
 * @param {string} sql - SQL 语句
 * @param {Array} bindValues - 绑定值
 * @returns {Promise<any>}
 */
export async function query(sql, bindValues = []) {
  try {
    const db = await getDatabase()
    return await db.select(sql, bindValues)
  } catch (error) {
    // 不在这里显示错误消息，让调用者处理
    throw error
  }
}

/**
 * 执行 SQL 更新
 * @param {string} sql - SQL 语句
 * @param {Array} bindValues - 绑定值
 * @returns {Promise<any>}
 */
export async function execute(sql, bindValues = []) {
  try {
    const db = await getDatabase()
    return await db.execute(sql, bindValues)
  } catch (error) {
    // 不在这里显示错误消息，让调用者处理
    throw error
  }
}

