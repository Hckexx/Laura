import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';

import { registerCowatchRealtime } from './realtime/index.js';
import { CowatchRoomsRepository } from './database/rooms-repository.js';
import { config } from './config.js';
import { cowatchConfig } from './realtime/config.js';
import { RoomStore } from './realtime/room-store.js';

const app = Fastify({
  logger: {
    level: 'info',

    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  },

  bodyLimit: 64 * 1024,
});

app.addHook('onRequest', requestLogger);
app.setErrorHandler(errorHandler);

app.addHook('onSend', async (_request, reply, payload) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');

  reply.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );

  reply.header(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );

  if (config.isProduction) {
    reply.header(
      'Strict-Transport-Security',
      'max-age=31536000',
    );
  }

  return payload;
});

app.register(cors, {
  origin: config.cors.origin,

  methods: [
    'GET',
    'HEAD',
    'OPTIONS',
  ],

  credentials: false,
});

app.register(rateLimit, {
  global: true,
  max: config.httpRateLimit.max,
  timeWindow: config.httpRateLimit.timeWindowMs,
  ipv6Subnet: 64,
});

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'lauratv-cowatch',
    version: '1.0.0',

    cowatch: {
      persistenceMode: cowatchConfig.persistenceMode,
    },
  };
});

const start = async () => {
  try {
    const repository = new CowatchRoomsRepository();

    await repository.assertReady();

    registerCowatchRealtime(
      app,
      new RoomStore(
        cowatchConfig.room,
        repository,
      ),
    );

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(
      `Server running on port ${config.port} (Cowatch persistence: ${cowatchConfig.persistenceMode})`,
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : 'Server startup failed',
    );

    process.exit(1);
  }
};

start();