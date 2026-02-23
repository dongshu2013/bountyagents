import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import {
  createTaskRequestSchema,
  decisionSchema,
  submitResponseSchema,
  taskQuerySchema,
  taskResponsesQuerySchema,
  workerResponsesQuerySchema
} from './schemas.js';
import { AppContext } from './context.js';
import {
  ServiceError,
  createTask as createTaskAction,
  decideOnResponse,
  submitTaskResponse,
  queryTasksList,
  queryTaskResponses,
  queryWorkerResponses
} from './services/tasks.js';
import { fetchDepositInfo, taskDepositKey } from './onchain.js';
import { normalizeAddress } from './crypto.js';

const idParamSchema = z.object({ id: z.string().uuid() });
const taskIdParamSchema = z.object({ taskId: z.string().uuid() });
const responseIdParamSchema = z.object({ responseId: z.string().uuid() });

const handleServiceError = (reply: any, error: unknown): error is ServiceError => {
  if (error instanceof ServiceError) {
    reply.code(error.statusCode).send({ error: error.code, message: error.message });
    return true;
  }
  return false;
};

export const buildApp = ({ config, db }: AppContext): FastifyInstance => {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true
  });

  const zeroAddress = '0x0000000000000000000000000000000000000000';

  const formatTask = async (task: any) => {
    const depositKey = taskDepositKey(task.id);
    try {
      const onChain = await fetchDepositInfo(config, depositKey);
      if (onChain.owner === zeroAddress) {
        return { ...task, deposit: null };
      }
      return {
        ...task,
        deposit: {
          owner: normalizeAddress(onChain.owner),
          tokenAddress: normalizeAddress(onChain.token),
          amount: onChain.amountLocked.toString(),
          released: onChain.released
        }
      };
    } catch (error) {
      app.log.error({ err: error, taskId: task.id }, 'Unable to fetch deposit info');
      return { ...task, deposit: null };
    }
  };

  app.get('/health', async () => ({
    status: 'ok',
    contractAddress: config.contractAddress,
    chainId: config.chainId,
    depositNetwork: config.depositNetwork
  }));

  app.get('/tasks', async (request, reply) => {
    const owner = typeof request.query === 'object' ? (request.query as any).owner : undefined;
    const tasks = await db.listTasks(owner);
    const hydrated = await Promise.all(tasks.map((task) => formatTask(task)));
    reply.send({ tasks: hydrated });
  });

  app.get('/tasks/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const task = await db.getTaskById(id);
    if (!task) {
      return reply.code(404).send({ error: 'not_found', message: 'Task not found' });
    }
    return reply.send({ task: await formatTask(task) });
  });

  app.post('/tasks', async (request, reply) => {
    const payload = createTaskRequestSchema.parse(request.body);
    try {
      const task = await createTaskAction({ config, db }, payload);
      return reply.code(201).send({ task: await formatTask(task) });
    } catch (error) {
      if (handleServiceError(reply, error)) return;
      throw error;
    }
  });

  app.post('/tasks/query', async (request, reply) => {
    const payload = taskQuerySchema.parse(request.body ?? {});
    try {
      const tasks = await queryTasksList({ config, db }, payload);
      const hydrated = await Promise.all(tasks.map((task) => formatTask(task)));
      return reply.send({ tasks: hydrated });
    } catch (error) {
      if (handleServiceError(reply, error)) return;
      throw error;
    }
  });

  app.post('/tasks/:taskId/responses', async (request, reply) => {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const body = submitResponseSchema.parse({ ...(request.body as object), taskId });
    try {
      const response = await submitTaskResponse({ config, db }, body);
      return reply.code(201).send({ response });
    } catch (error) {
      if (handleServiceError(reply, error)) return;
      throw error;
    }
  });

  app.get('/tasks/:taskId/responses', async (request, reply) => {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const task = await db.getTaskById(taskId);
    if (!task) {
      return reply.code(404).send({ error: 'not_found', message: 'Task not found' });
    }
    const responses = await db.listResponsesForTask(taskId);
    return reply.send({ responses });
  });

  app.get('/responses/:responseId', async (request, reply) => {
    const { responseId } = responseIdParamSchema.parse(request.params);
    const response = await db.getResponseById(responseId);
    if (!response) {
      return reply.code(404).send({ error: 'not_found', message: 'Response not found' });
    }
    return reply.send({ response });
  });

  app.post('/responses/:responseId/decision', async (request, reply) => {
    const { responseId } = responseIdParamSchema.parse(request.params);
    const body = decisionSchema.parse({ ...(request.body as object), responseId });
    try {
      const response = await decideOnResponse({ config, db }, body);
      return reply.send({ response });
    } catch (error) {
      if (handleServiceError(reply, error)) return;
      throw error;
    }
  });

  app.post('/tasks/responses/query', async (request, reply) => {
    const payload = taskResponsesQuerySchema.parse(request.body);
    try {
      const responses = await queryTaskResponses({ config, db }, payload);
      return reply.send({ responses });
    } catch (error) {
      if (handleServiceError(reply, error)) return;
      throw error;
    }
  });

  app.post('/workers/responses/query', async (request, reply) => {
    const payload = workerResponsesQuerySchema.parse(request.body);
    try {
      const responses = await queryWorkerResponses({ config, db }, payload);
      return reply.send({ responses });
    } catch (error) {
      if (handleServiceError(reply, error)) return;
      throw error;
    }
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if ('issues' in error) {
      reply.code(400).send({ error: 'invalid_request', details: (error as any).issues });
    } else {
      reply.code(500).send({ error: 'internal_error', message: 'Unexpected error' });
    }
  });

  return app;
};
