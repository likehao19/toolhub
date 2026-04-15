import { invoke } from '@tauri-apps/api/core'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

function normalizeTarget(input) {
  return input.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

const DEFAULT_SPEED_ENDPOINTS = {
  latencyUrl: 'https://speed.cloudflare.com/cdn-cgi/trace',
  downloadUrl: 'https://speed.cloudflare.com/__down?bytes=25000000',
  uploadUrl: 'https://speed.cloudflare.com/__up',
}

export async function dnsLookup(domain, recordType = 'A') {
  const target = normalizeTarget(domain)
  if (!target) {
    throw new Error('请输入域名')
  }
  return await invoke('network_dns_lookup', { domain: target, recordType })
}

export async function lookupIp(input = '') {
  return await invoke('network_ip_lookup', { input: input.trim() })
}

export async function runLatencyTest(url = DEFAULT_SPEED_ENDPOINTS.latencyUrl, count = 5, signal) {
  const target = url.trim()
  if (!target) {
    throw new Error('请输入测速地址')
  }

  const samples = []
  for (let i = 0; i < count; i++) {
    const started = performance.now()
    const response = await fetch(`${target}${target.includes('?') ? '&' : '?'}_t=${Date.now()}_${i}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
    })
    await response.blob()
    samples.push(Math.round(performance.now() - started))
  }

  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const avg = Math.round(samples.reduce((sum, item) => sum + item, 0) / samples.length)
  return { samples, min, max, avg }
}

export async function runBandwidthTest({
  downloadUrl = DEFAULT_SPEED_ENDPOINTS.downloadUrl,
  uploadUrl = DEFAULT_SPEED_ENDPOINTS.uploadUrl,
  uploadSizeMb = 5,
  onProgress,
  signal,
}) {
  const result = {
    downloadMbps: null,
    uploadMbps: null,
    downloadBytes: 0,
    uploadBytes: 0,
    downloadMs: 0,
    uploadMs: 0,
  }

  if (downloadUrl?.trim()) {
    const started = performance.now()
    const response = await fetch(downloadUrl, { method: 'GET', cache: 'no-store', signal })
    const reader = response.body?.getReader()
    let received = 0

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        received += value.byteLength
        onProgress?.({ phase: 'download', bytes: received })
      }
    } else {
      const buffer = await response.arrayBuffer()
      received = buffer.byteLength
      onProgress?.({ phase: 'download', bytes: received })
    }

    result.downloadMs = Math.max(1, Math.round(performance.now() - started))
    result.downloadBytes = received
    result.downloadMbps = Number(((received * 8) / (result.downloadMs / 1000) / 1024 / 1024).toFixed(2))
  }

  if (uploadUrl?.trim()) {
    const sizeBytes = Math.max(1, Math.round(uploadSizeMb * 1024 * 1024))
    const payload = new Uint8Array(sizeBytes)
    crypto.getRandomValues(payload.subarray(0, Math.min(payload.length, 65536)))
    const started = performance.now()
    await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: payload,
      signal,
    })
    result.uploadMs = Math.max(1, Math.round(performance.now() - started))
    result.uploadBytes = sizeBytes
    result.uploadMbps = Number(((sizeBytes * 8) / (result.uploadMs / 1000) / 1024 / 1024).toFixed(2))
    onProgress?.({ phase: 'upload', bytes: sizeBytes })
  }

  return result
}
