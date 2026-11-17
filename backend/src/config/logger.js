// ═══════════════════════════════════════════════
//  Krishi Sarthi — Centralized Logger (pino)
//  Structured JSON logging for production,
//  pretty-printed for development.
// ═══════════════════════════════════════════════

const pino = require('pino');

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  base: {
    service: 'krishi-sarthi',
    env: process.env.NODE_ENV || 'development',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.resetCode',
      '*.reset_code',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

module.exports = logger;

