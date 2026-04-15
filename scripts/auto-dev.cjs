/**
 * 动态端口启动脚本
 *
 * 从默认端口 1420 开始探测可用端口，找到后通过 tauri dev --config 动态覆盖
 * devUrl 和 beforeDevCommand，实现端口被占用时自动切换。
 *
 * 用法：node scripts/auto-dev.cjs
 *       npm run dev:auto
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_PORT = 1420;
const MAX_TRIES = 20;
const CONFIG_FILE = path.join(__dirname, '..', '.tauri-dev-config.json');

/**
 * 检测端口是否可用
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * 从 startPort 开始查找可用端口
 */
async function findAvailablePort(startPort) {
  for (let i = 0; i < MAX_TRIES; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `在 ${startPort}-${startPort + MAX_TRIES - 1} 范围内未找到可用端口`
  );
}

/**
 * 清理临时配置文件
 */
function cleanup() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (_) {
    // ignore
  }
}

async function main() {
  const port = await findAvailablePort(DEFAULT_PORT);

  if (port !== DEFAULT_PORT) {
    console.log(
      `\x1b[33m⚡ 端口 ${DEFAULT_PORT} 已被占用，自动切换到端口 ${port}\x1b[0m`
    );
  } else {
    console.log(`\x1b[32m✓ 使用默认端口 ${port}\x1b[0m`);
  }

  // 写入临时配置文件（避免 Windows cmd JSON 转义问题）
  const configOverride = {
    build: {
      devUrl: `http://localhost:${port}`,
      beforeDevCommand: `npx vite --port ${port} --strictPort`,
    },
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configOverride, null, 2));

  // 启动 tauri dev，传入覆盖配置
  const child = spawn('npx', ['tauri', 'dev', '--config', CONFIG_FILE], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      TOOLHUB_DEV_PORT: String(port),
    },
  });

  // 子进程退出时清理
  child.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 1);
  });

  // 主进程收到信号时转发给子进程并清理
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      child.kill(sig);
      cleanup();
    });
  }
}

main().catch((err) => {
  console.error(`\x1b[31m✗ ${err.message}\x1b[0m`);
  cleanup();
  process.exit(1);
});
