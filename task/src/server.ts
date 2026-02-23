import { TaskDb } from '@bountyagents/task-db';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { createTaskMcpServer } from './mcp.js';

const main = async () => {
  const config = loadConfig();
  const db = TaskDb.fromPoolConfig({ connectionString: config.databaseUrl });
  await db.migrate();

  const app = buildApp({ config, db });
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`HTTP server listening on ${config.host}:${config.port}`);

  if (process.env.ENABLE_MCP !== 'false') {
    try {
      const mcpServer = await createTaskMcpServer({ config, db });
      await mcpServer.start();
      app.log.info('MCP server started');
    } catch (error) {
      app.log.error(error, 'Unable to start MCP server');
    }
  }
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
