import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export async function openLogAnalysisSession(options, callbacks = {}) {
  try {
    const sessionId = await invoke('open_log_analysis_session', {
      options: {
        path: options.path,
      },
    })

    const unlisteners = []

    const progressUnlisten = await listen(`log-analysis-progress-${sessionId}`, event => {
      callbacks.onProgress?.(event.payload)
    })
    unlisteners.push(progressUnlisten)

    const completeUnlisten = await listen(`log-analysis-complete-${sessionId}`, event => {
      unlisteners.forEach(unlisten => unlisten())
      const payload = event.payload
      if (payload?.error) {
        callbacks.onError?.(payload.error)
      } else {
        callbacks.onComplete?.(payload)
      }
    })
    unlisteners.push(completeUnlisten)

    return { sessionId, unlisteners }
  } catch (error) {
    callbacks.onError?.(error)
    throw new Error(`启动日志分析失败: ${error}`)
  }
}

export async function getLogAnalysisSummary(sessionId) {
  try {
    return await invoke('get_log_analysis_summary', { sessionId })
  } catch (error) {
    throw new Error(`获取日志摘要失败: ${error}`)
  }
}

export async function queryLogBlocks(sessionId, query = {}) {
  try {
    return await invoke('query_log_blocks', {
      sessionId,
      query: {
        mode: query.mode || 'issues',
        keyword: query.keyword || '',
        page: query.page || 1,
        pageSize: query.pageSize || 50,
      },
    })
  } catch (error) {
    throw new Error(`查询日志块失败: ${error}`)
  }
}

export async function getLogBlockDetail(sessionId, blockId) {
  try {
    return await invoke('get_log_block_detail', { sessionId, blockId })
  } catch (error) {
    throw new Error(`获取日志块详情失败: ${error}`)
  }
}

export async function cancelLogAnalysisSession(sessionId) {
  try {
    await invoke('cancel_log_analysis_session', { sessionId })
  } catch (error) {
    throw new Error(`取消日志分析失败: ${error}`)
  }
}

export async function closeLogAnalysisSession(sessionId) {
  try {
    await invoke('close_log_analysis_session', { sessionId })
  } catch (error) {
    throw new Error(`关闭日志分析会话失败: ${error}`)
  }
}
