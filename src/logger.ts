import pino from 'pino';

// In production Kubernetes / Docker environments logs are JSON (structured).
// Set LOG_LEVEL env var to control verbosity (trace | debug | info | warn | error).
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
