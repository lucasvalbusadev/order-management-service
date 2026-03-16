export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  rabbitMqUrl: string;
  logLevel: string;
  serviceName: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    mongoUri: requireEnv('MONGO_URI'),
    rabbitMqUrl: requireEnv('RABBITMQ_URL'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    serviceName: process.env.SERVICE_NAME ?? 'order-service',
  };
}
