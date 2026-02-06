/**
 * 生产力工具箱 Store
 * 统一管理各模块的状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Database from '@tauri-apps/plugin-sql'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

export const useProductivityStore = defineStore('productivity', {
  state: () => ({
    // 待办数据
    todos: [],
    todosLoading: false,
    
    // 日程数据
    events: [],
    eventsLoading: false,
    
    // 密码数据
    passwords: [],
    passwordsLoading: false,
    
    // 书签数据
    bookmarks: [],
    bookmarksLoading: false,
    
    // 最后更新时间
    lastSyncTime: null
  }),

  getters: {
    // 今日待办
    todayTodos: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.todos.filter(t => 
        !t.parent_id && 
        t.due_date === today && 
        t.status !== 2
      ).sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority || 0) - (a.priority || 0)
        }
        return new Date(a.created_at) - new Date(b.created_at)
      })
    },

    // 今日日程
    todayEvents: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.events.filter(e => {
        const eventDate = new Date(e.start_time).toISOString().split('T')[0]
        return eventDate === today
      }).sort((a, b) => {
        return new Date(a.start_time) - new Date(b.start_time)
      })
    },

    // 最近密码
    recentPasswords: (state) => {
      return state.passwords
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5)
    },

    // 常用书签
    favoriteBookmarks: (state) => {
      return state.bookmarks
        .sort((a, b) => (b.access_count || 0) - (a.access_count || 0))
        .slice(0, 5)
    }
  },

  actions: {
    // 加载待办
    async loadTodos() {
      this.todosLoading = true
      try {
        const db = await getDatabase()
        const result = await db.select(
          'SELECT * FROM todos ORDER BY priority DESC, due_date ASC, created_at DESC'
        )
        this.todos = result || []
        this.lastSyncTime = new Date()
      } catch (error) {
        throw error
      } finally {
        this.todosLoading = false
      }
    },

    // 加载日程
    async loadEvents() {
      this.eventsLoading = true
      try {
        const db = await getDatabase()
        const result = await db.select(
          'SELECT * FROM calendar_events ORDER BY start_time ASC'
        )
        this.events = result || []
        this.lastSyncTime = new Date()
      } catch (error) {
        throw error
      } finally {
        this.eventsLoading = false
      }
    },

    // 加载密码
    async loadPasswords() {
      this.passwordsLoading = true
      try {
        const db = await getDatabase()
        const result = await db.select(
          'SELECT * FROM passwords ORDER BY updated_at DESC'
        )
        this.passwords = result || []
        this.lastSyncTime = new Date()
      } catch (error) {
        throw error
      } finally {
        this.passwordsLoading = false
      }
    },

    // 加载书签
    async loadBookmarks() {
      this.bookmarksLoading = true
      try {
        const db = await getDatabase()
        const result = await db.select(
          'SELECT * FROM bookmarks ORDER BY access_count DESC, updated_at DESC'
        )
        this.bookmarks = result || []
        this.lastSyncTime = new Date()
      } catch (error) {
        throw error
      } finally {
        this.bookmarksLoading = false
      }
    },

    // 加载所有数据
    async loadAll() {
      await Promise.all([
        this.loadTodos(),
        this.loadEvents(),
        this.loadPasswords(),
        this.loadBookmarks()
      ])
    },

    // 更新待办
    updateTodo(todo) {
      const index = this.todos.findIndex(t => t.id === todo.id)
      if (index > -1) {
        this.todos[index] = todo
      } else {
        this.todos.push(todo)
      }
    },

    // 删除待办
    removeTodo(todoId) {
      this.todos = this.todos.filter(t => t.id !== todoId && t.parent_id !== todoId)
    },

    // 更新日程
    updateEvent(event) {
      const index = this.events.findIndex(e => e.id === event.id)
      if (index > -1) {
        this.events[index] = event
      } else {
        this.events.push(event)
      }
    },

    // 删除日程
    removeEvent(eventId) {
      this.events = this.events.filter(e => e.id !== eventId)
    },

    // 更新密码
    updatePassword(password) {
      const index = this.passwords.findIndex(p => p.id === password.id)
      if (index > -1) {
        this.passwords[index] = password
      } else {
        this.passwords.push(password)
      }
    },

    // 删除密码
    removePassword(passwordId) {
      this.passwords = this.passwords.filter(p => p.id !== passwordId)
    },

    // 更新书签
    updateBookmark(bookmark) {
      const index = this.bookmarks.findIndex(b => b.id === bookmark.id)
      if (index > -1) {
        this.bookmarks[index] = bookmark
      } else {
        this.bookmarks.push(bookmark)
      }
    },

    // 删除书签
    removeBookmark(bookmarkId) {
      this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId)
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'productivity-store',
        storage: localStorage,
        paths: ['lastSyncTime']
      }
    ]
  }
})

