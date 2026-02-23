import { z } from 'zod';
import { AppContext } from './context.js';
import {
  createTaskRequestSchema,
  decisionSchema,
  submitResponseSchema,
  taskQuerySchema,
  taskResponsesQuerySchema,
  workerResponsesQuerySchema,
  taskCancelSchema,
  taskSettleSchema,
  taskFundingSchema
} from './schemas.js';
import {
  createTask,
  decideOnResponse,
  submitTaskResponse,
  queryTasksList,
  queryTaskResponses,
  queryWorkerResponses,
  cancelTask,
  settleTask,
  fundTask
} from './services/tasks.js';

const makeJsonResult = (data: unknown) => ({
  content: [
    {
      type: 'application/json',
      data
    }
  ]
});

type GenericMcpServer = {
  tool: (name: string, definition: Record<string, unknown>, handler: (args: any) => Promise<any>) => void;
  start: () => Promise<void>;
};

const createJsonSchema = (_schema: z.ZodTypeAny): Record<string, unknown> => ({ type: 'object' });

export const createTaskMcpServer = async (ctx: AppContext): Promise<GenericMcpServer> => {
  const module: any = await import('@modelcontextprotocol/sdk/server');
  const ServerCtor = module.Server ?? module.default;
  if (!ServerCtor) {
    throw new Error('MCP SDK server constructor not found');
  }
  const server: GenericMcpServer = new ServerCtor({
    name: 'bountyagents-task-service',
    version: '0.1.0',
    description: 'Provides tools to post tasks and handle responses for bounty agents.'
  });

  const wrap = async (schema: z.ZodTypeAny, handler: (payload: any) => Promise<unknown>, raw: any) => {
    const payload = schema.parse(raw?.arguments ?? raw);
    const result = await handler(payload);
    return makeJsonResult(result);
  };

  server.tool(
    'task.create',
    {
      description: 'Post a new bounty task. Requires signed payload + pre-funded escrow deposit.',
      inputSchema: createJsonSchema(createTaskRequestSchema)
    },
    async (raw: any) =>
      wrap(createTaskRequestSchema, async (payload) => ({ task: await createTask(ctx, payload) }), raw)
  );

  server.tool(
    'task.fund',
    {
      description: 'Attach funding info to a draft task after the escrow deposit is live.',
      inputSchema: createJsonSchema(taskFundingSchema)
    },
    async (raw: any) => wrap(taskFundingSchema, async (payload) => ({ task: await fundTask(ctx, payload) }), raw)
  );

  server.tool(
    'task.respond',
    {
      description: 'Submit a response for a task.',
      inputSchema: createJsonSchema(submitResponseSchema)
    },
    async (raw: any) =>
      wrap(submitResponseSchema, async (payload) => ({ response: await submitTaskResponse(ctx, payload) }), raw)
  );

  server.tool(
    'task.decision',
    {
      description: 'Approve or reject a response as the task owner.',
      inputSchema: createJsonSchema(decisionSchema)
    },
    async (raw: any) =>
      wrap(decisionSchema, async (payload) => ({ response: await decideOnResponse(ctx, payload) }), raw)
  );

  server.tool(
    'task.query',
    {
      description: 'Query tasks with filters (publisher, keyword, price, time).',
      inputSchema: createJsonSchema(taskQuerySchema)
    },
    async (raw: any) => wrap(taskQuerySchema, async (payload) => ({ tasks: await queryTasksList(ctx, payload) }), raw)
  );

  server.tool(
    'task.response.query',
    {
      description: 'List responses for a task (owner only, signature required).',
      inputSchema: createJsonSchema(taskResponsesQuerySchema)
    },
    async (raw: any) =>
      wrap(
        taskResponsesQuerySchema,
        async (payload) => ({ responses: await queryTaskResponses(ctx, payload) }),
        raw
      )
  );

  server.tool(
    'worker.response.query',
    {
      description: 'List responses submitted by a worker (worker signature required).',
      inputSchema: createJsonSchema(workerResponsesQuerySchema)
    },
    async (raw: any) =>
      wrap(
        workerResponsesQuerySchema,
        async (payload) => ({ responses: await queryWorkerResponses(ctx, payload) }),
        raw
      )
  );

  server.tool(
    'task.cancel',
    {
      description: 'Cancel a task (owner signature required).',
      inputSchema: createJsonSchema(taskCancelSchema)
    },
    async (raw: any) => wrap(taskCancelSchema, async (payload) => ({ task: await cancelTask(ctx, payload) }), raw)
  );

  server.tool(
    'task.settle',
    {
      description: 'Fetch the owner settlement signature for an approved response.',
      inputSchema: createJsonSchema(taskSettleSchema)
    },
    async (raw: any) => wrap(taskSettleSchema, async (payload) => await settleTask(ctx, payload), raw)
  );

  if (typeof (server as any).start !== 'function') {
    if (typeof (server as any).listen === 'function') {
      (server as any).start = () => (server as any).listen();
    } else {
      (server as any).start = async () => undefined;
    }
  }

  return server;
};
