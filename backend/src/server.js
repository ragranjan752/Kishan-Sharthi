// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Server Entrypoint
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config();

const { assertEnv } = require('./config/env');
const logger = require('./config/logger');

// Validate environment before launching
assertEnv();

const app = require('./app');
const REQUESTED_PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
if (REQUESTED_PORT !== 3001) {
  console.error(`\n❌ Only port 3001 is supported for Krishi Sarthi. Received PORT=${process.env.PORT}.`);
  console.error('   Use PORT=3001 or unset PORT. No alternate port will be used.\n');
  process.exit(1);
}
const PORT = 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    env: NODE_ENV,
    url: `http://localhost:${PORT}`
  }, '🌾 Krishi Sarthi — Bihar Edition Production Server Started');
  console.log(`\n🌾 Krishi Sarthi — Server running at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api/v1\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, 'Port already in use');
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error('   Stop the existing Krishi Sarthi process, then run again:');
    console.error('   PowerShell: npm run demo');
    console.error('   CMD:        npm run demo\n');
  } else {
    logger.error({ err }, 'HTTP server failed to start');
    console.error(err);
  }
  process.exit(1);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info({ signal }, 'Termination signal received — closing HTTP server gracefully');
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
