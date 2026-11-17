// Cross-platform demo launcher for Krishi Sarthi.
// Usage: npm run demo
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const port = '3001';

console.log('Krishi Sarthi Development Demo');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('Demo Mode: ENABLED');
console.log(`Port: ${port}`);
console.log('');

const child = spawn(process.execPath, [path.join(root, 'backend', 'src', 'server.js')], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    DEMO_MODE: 'true',
    PORT: port,
    // Demo launcher must not depend on the user's real JWT_SECRET being present
    // or strong enough. Use a per-run random secret when the existing one is
    // missing/too short; never write it back to .env.
    JWT_SECRET: process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
      ? process.env.JWT_SECRET
      : crypto.randomBytes(32).toString('hex'),
  },
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code || 0));
