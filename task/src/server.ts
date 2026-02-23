import { TaskDb } from '@bountyagents/task-db';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const main = async () => {
  const config = loadConfig();
  const db = TaskDb.fromPoolConfig({ connectionString: config.databaseUrl });
  await db.migrate();

  const app = buildApp({ config, db });
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`HTTP server listening on ${config.host}:${config.port}`);

};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
