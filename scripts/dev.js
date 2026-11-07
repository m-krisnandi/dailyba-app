const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '  🚀 Starting Dailyba App & Cloud Sync REST API Server... ');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

// 1. Start Dailyba REST API Server on Port 4000
const serverPath = path.join(__dirname, '..', 'server', 'index.js');
const apiProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '4000' }
});

// 2. Start Next.js Frontend on Port 3001
const nextProcess = spawn('npx', ['next', 'dev', '-p', '3001'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:4000' }
});

const cleanup = () => {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down Dailyba servers...');
  apiProcess.kill();
  nextProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
