import app from './app';
import { connectDb } from './shared/config/db';
import { env } from './shared/config/env';
import { logger } from './shared/logging/logger';

async function main() {
  await connectDb();
  app.listen(env.PORT, () => {
    logger.info('server_started', {
      port: env.PORT,
      docs: `http://localhost:${env.PORT}/api/docs`,
    });
  });
}

main().catch((err) => {
  logger.error('server_start_failed', {
    err: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
