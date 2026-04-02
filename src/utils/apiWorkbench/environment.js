/**
 * API Workbench — environment management + variable resolver
 */
import { load, save, STORAGE_KEYS, uuid } from './shared'

export function resolveVariables(text, variables = {}) {
  if (!text || typeof text !== 'string') return text
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

export function getActiveVariables() {
  const envId = load(STORAGE_KEYS.currentEnv)
  if (!envId) return {}
  const envs = load(STORAGE_KEYS.environments, [])
  const env = envs.find(e => e.id === envId)
  if (!env) return {}
  const vars = {}
  env.variables.filter(v => v.enabled).forEach(v => { vars[v.key] = v.value })
  return vars
}

export function loadEnvironments() {
  return load(STORAGE_KEYS.environments, [])
}

export function saveEnvironments(envs) {
  save(STORAGE_KEYS.environments, envs)
}

export function getCurrentEnvId() {
  return load(STORAGE_KEYS.currentEnv, null)
}

export function setCurrentEnvId(id) {
  save(STORAGE_KEYS.currentEnv, id)
}

export function createEnvironment(name) {
  const envs = loadEnvironments()
  const env = { id: uuid(), name, variables: [] }
  envs.push(env)
  saveEnvironments(envs)
  return env
}

export function deleteEnvironment(id) {
  const envs = loadEnvironments().filter(e => e.id !== id)
  saveEnvironments(envs)
  if (getCurrentEnvId() === id) setCurrentEnvId(null)
}

export function updateEnvironment(id, updates) {
  const envs = loadEnvironments()
  const idx = envs.findIndex(e => e.id === id)
  if (idx !== -1) {
    envs[idx] = { ...envs[idx], ...updates }
    saveEnvironments(envs)
  }
}
