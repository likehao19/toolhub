/**
 * 任务依赖关系工具
 * 支持依赖关系可视化和关键路径计算
 */

/**
 * 构建依赖图
 * @param {Array} todos - 所有任务
 * @returns {Object} 包含节点和边的图结构
 */
export function buildDependencyGraph(todos) {
  const nodes = []
  const edges = []
  const nodeMap = new Map()
  
  // 创建节点
  todos.forEach(todo => {
    if (!todo.parent_id) { // 只处理主任务
      const node = {
        id: `todo-${todo.id}`,
        label: todo.title || `任务 ${todo.id}`,
        todoId: todo.id,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        estimatedHours: todo.estimated_hours || 0
      }
      nodes.push(node)
      nodeMap.set(todo.id, node)
    }
  })
  
  // 创建边（依赖关系）
  todos.forEach(todo => {
    if (!todo.parent_id && todo.dependency_ids) {
      try {
        const dependencyIds = JSON.parse(todo.dependency_ids)
        if (Array.isArray(dependencyIds)) {
          dependencyIds.forEach(depId => {
            const sourceNode = nodeMap.get(depId)
            const targetNode = nodeMap.get(todo.id)
            if (sourceNode && targetNode) {
              edges.push({
                id: `edge-${depId}-${todo.id}`,
                source: sourceNode.id,
                target: targetNode.id,
                sourceId: depId,
                targetId: todo.id
              })
            }
          })
        }
      } catch (e) { /* ignore */ }
    }
  })
  
  return { nodes, edges }
}

/**
 * 计算关键路径（Critical Path Method）
 * @param {Array} todos - 所有任务
 * @returns {Object} 关键路径信息
 */
export function calculateCriticalPath(todos) {
  const graph = buildDependencyGraph(todos)
  const { nodes, edges } = graph
  
  if (nodes.length === 0) {
    return {
      criticalPath: [],
      totalDuration: 0,
      earliestStart: {},
      latestStart: {},
      slack: {}
    }
  }
  
  // 构建邻接表
  const adjacencyList = new Map()
  const inDegree = new Map()
  const outDegree = new Map()
  
  nodes.forEach(node => {
    adjacencyList.set(node.id, [])
    inDegree.set(node.id, 0)
    outDegree.set(node.id, 0)
  })
  
  edges.forEach(edge => {
    const neighbors = adjacencyList.get(edge.source) || []
    neighbors.push(edge.target)
    adjacencyList.set(edge.source, neighbors)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1)
  })
  
  // 找到所有起始节点（入度为0）
  const startNodes = nodes.filter(node => inDegree.get(node.id) === 0)
  
  // 计算最早开始时间（Forward Pass）
  const earliestStart = new Map()
  const earliestFinish = new Map()
  
  // 初始化
  nodes.forEach(node => {
    earliestStart.set(node.id, 0)
    earliestFinish.set(node.id, node.estimatedHours || 0)
  })
  
  // 拓扑排序并计算最早时间
  const queue = [...startNodes.map(n => n.id)]
  const visited = new Set()
  
  while (queue.length > 0) {
    const currentId = queue.shift()
    if (visited.has(currentId)) continue
    visited.add(currentId)
    
    const neighbors = adjacencyList.get(currentId) || []
    neighbors.forEach(neighborId => {
      const currentFinish = earliestFinish.get(currentId) || 0
      const neighborStart = earliestStart.get(neighborId) || 0
      
      if (currentFinish > neighborStart) {
        earliestStart.set(neighborId, currentFinish)
        const neighborNode = nodes.find(n => n.id === neighborId)
        if (neighborNode) {
          earliestFinish.set(neighborId, currentFinish + (neighborNode.estimatedHours || 0))
        }
      }
      
      inDegree.set(neighborId, inDegree.get(neighborId) - 1)
      if (inDegree.get(neighborId) === 0) {
        queue.push(neighborId)
      }
    })
  }
  
  // 找到所有结束节点（出度为0）
  const endNodes = nodes.filter(node => outDegree.get(node.id) === 0)
  
  // 计算项目总时长
  const totalDuration = Math.max(...endNodes.map(node => earliestFinish.get(node.id) || 0))
  
  // 计算最晚开始时间（Backward Pass）
  const latestStart = new Map()
  const latestFinish = new Map()
  
  // 初始化结束节点
  endNodes.forEach(node => {
    latestFinish.set(node.id, totalDuration)
    latestStart.set(node.id, totalDuration - (node.estimatedHours || 0))
  })
  
  // 反向拓扑排序
  const reverseAdjacencyList = new Map()
  nodes.forEach(node => {
    reverseAdjacencyList.set(node.id, [])
  })
  
  edges.forEach(edge => {
    const neighbors = reverseAdjacencyList.get(edge.target) || []
    neighbors.push(edge.source)
    reverseAdjacencyList.set(edge.target, neighbors)
  })
  
  const reverseQueue = [...endNodes.map(n => n.id)]
  const reverseVisited = new Set()
  const reverseInDegree = new Map()
  
  nodes.forEach(node => {
    reverseInDegree.set(node.id, outDegree.get(node.id))
  })
  
  while (reverseQueue.length > 0) {
    const currentId = reverseQueue.shift()
    if (reverseVisited.has(currentId)) continue
    reverseVisited.add(currentId)
    
    const neighbors = reverseAdjacencyList.get(currentId) || []
    neighbors.forEach(neighborId => {
      const currentStart = latestStart.get(currentId) || totalDuration
      const neighborFinish = latestFinish.get(neighborId)
      
      if (neighborFinish === undefined || currentStart < neighborFinish) {
        const neighborNode = nodes.find(n => n.id === neighborId)
        if (neighborNode) {
          latestFinish.set(neighborId, currentStart)
          latestStart.set(neighborId, currentStart - (neighborNode.estimatedHours || 0))
        }
      }
      
      reverseInDegree.set(neighborId, reverseInDegree.get(neighborId) - 1)
      if (reverseInDegree.get(neighborId) === 0) {
        reverseQueue.push(neighborId)
      }
    })
  }
  
  // 计算松弛时间（Slack）
  const slack = new Map()
  nodes.forEach(node => {
    const es = earliestStart.get(node.id) || 0
    const ls = latestStart.get(node.id) || 0
    slack.set(node.id, ls - es)
  })
  
  // 找到关键路径（松弛时间为0的节点）
  const criticalNodes = nodes.filter(node => slack.get(node.id) === 0)
  const criticalPath = []
  
  // 从起始节点开始，沿着关键路径构建路径
  startNodes.forEach(startNode => {
    if (slack.get(startNode.id) === 0) {
      const path = findCriticalPathFromNode(startNode.id, nodes, edges, slack)
      if (path.length > 0) {
        criticalPath.push(...path)
      }
    }
  })
  
  // 去重并排序
  const uniquePath = Array.from(new Set(criticalPath))
  
  return {
    criticalPath: uniquePath,
    totalDuration,
    earliestStart: Object.fromEntries(earliestStart),
    latestStart: Object.fromEntries(latestStart),
    slack: Object.fromEntries(slack)
  }
}

/**
 * 从指定节点开始查找关键路径
 */
function findCriticalPathFromNode(nodeId, nodes, edges, slack) {
  const path = [nodeId]
  const visited = new Set([nodeId])
  
  let currentId = nodeId
  while (true) {
    const outgoingEdges = edges.filter(e => e.source === `todo-${currentId}`)
    const criticalNext = outgoingEdges.find(edge => {
      const targetId = edge.target.replace('todo-', '')
      return slack.get(`todo-${targetId}`) === 0
    })
    
    if (!criticalNext) break
    
    const nextId = criticalNext.target.replace('todo-', '')
    if (visited.has(`todo-${nextId}`)) break
    
    path.push(`todo-${nextId}`)
    visited.add(`todo-${nextId}`)
    currentId = nextId
  }
  
  return path
}

/**
 * 检测循环依赖
 * @param {Array} todos - 所有任务
 * @returns {Array} 循环依赖的路径
 */
export function detectCircularDependencies(todos) {
  const graph = buildDependencyGraph(todos)
  const { nodes, edges } = graph
  
  const cycles = []
  const visited = new Set()
  const recStack = new Set()
  
  function dfs(nodeId, path) {
    visited.add(nodeId)
    recStack.add(nodeId)
    path.push(nodeId)
    
    const outgoingEdges = edges.filter(e => e.source === nodeId)
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        const cycle = dfs(edge.target, [...path])
        if (cycle) {
          cycles.push(cycle)
        }
      } else if (recStack.has(edge.target)) {
        // 找到循环
        const cycleStart = path.indexOf(edge.target)
        cycles.push(path.slice(cycleStart).concat(edge.target))
      }
    }
    
    recStack.delete(nodeId)
    return null
  }
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, [])
    }
  })
  
  return cycles
}

