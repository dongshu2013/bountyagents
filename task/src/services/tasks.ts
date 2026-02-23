import { v4 as uuidv4 } from 'uuid';
import {
  ResponseRecord,
  TaskRecord,
  responseStatusSchema
} from '@bountyagents/task-db';
import { AppContext } from '../context.js';
import {
  CreateTaskRequest,
  DecisionRequest,
  SubmitResponseRequest,
  TaskQueryRequest,
  TaskResponsesQueryRequest,
  WorkerResponsesQueryRequest
} from '../schemas.js';
import {
  decisionSignaturePayload,
  responseSignaturePayload,
  taskSignaturePayload,
  taskResponsesQuerySignaturePayload,
  workerResponsesQuerySignaturePayload
} from '../signature.js';
import { normalizeAddress, verifyDetachedSignature } from '../crypto.js';
import { fetchDepositInfo, taskDepositKey } from '../onchain.js';
import { parseTokenIdentifier } from '../token.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const assertSignature = (condition: boolean) => {
  if (!condition) {
    throw new ServiceError(401, 'unauthorized', 'Signature validation failed');
  }
};

export const createTask = async (ctx: AppContext, payload: CreateTaskRequest): Promise<TaskRecord> => {
  const canonicalPayload = taskSignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.ownerAddress, canonicalPayload, payload.signature);
  assertSignature(verified);

  const depositKey = taskDepositKey(payload.id);
  const onChain = await fetchDepositInfo(ctx.config, depositKey);
  if (onChain.owner === ZERO_ADDRESS) {
    throw new ServiceError(400, 'invalid_request', 'Deposit not found on chain');
  }
  if (onChain.released) {
    throw new ServiceError(409, 'conflict', 'Deposit already released');
  }

  const ownerAddress = normalizeAddress(payload.ownerAddress);
  const onChainOwner = normalizeAddress(onChain.owner);
  if (ownerAddress !== onChainOwner) {
    throw new ServiceError(400, 'invalid_request', 'On-chain owner mismatch');
  }

  const tokenInfo = parseTokenIdentifier(payload.token);
  if (tokenInfo.network !== ctx.config.depositNetwork) {
    throw new ServiceError(400, 'invalid_request', 'Unsupported token network');
  }
  if (normalizeAddress(onChain.token) !== tokenInfo.address) {
    throw new ServiceError(400, 'invalid_request', 'On-chain token mismatch');
  }

  const expectedAmount = BigInt(payload.price);
  if (expectedAmount === 0n) {
    throw new ServiceError(400, 'invalid_request', 'Price must be greater than zero');
  }
  if (onChain.amountLocked !== expectedAmount) {
    throw new ServiceError(400, 'invalid_request', 'On-chain amount mismatch');
  }

  const id = payload.id;
  return ctx.db.createTask({
    id,
    title: payload.title,
    content: payload.content,
    owner: ownerAddress,
    status: 'active',
    price: payload.price,
    token: payload.token
  });
};

export const submitTaskResponse = async (
  ctx: AppContext,
  payload: SubmitResponseRequest
): Promise<ResponseRecord> => {
  const task = await ctx.db.getTaskById(payload.taskId);
  if (!task) {
    throw new ServiceError(404, 'not_found', 'Task not found');
  }
  if (task.status !== 'active') {
    throw new ServiceError(409, 'conflict', 'Task is not accepting responses');
  }

  const canonicalPayload = responseSignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.workerAddress, canonicalPayload, payload.signature);
  assertSignature(verified);

  const workerAddress = normalizeAddress(payload.workerAddress);
  return ctx.db.createResponse({
    id: payload.id ?? uuidv4(),
    task_id: payload.taskId,
    payload: payload.payload,
    worker: workerAddress
  });
};

export const decideOnResponse = async (
  ctx: AppContext,
  payload: DecisionRequest
): Promise<ResponseRecord> => {
  if (!responseStatusSchema.safeParse(payload.status).success || payload.status === 'pending') {
    throw new ServiceError(400, 'invalid_request', 'Status must be approved or rejected');
  }

  const response = await ctx.db.getResponseById(payload.responseId);
  if (!response) {
    throw new ServiceError(404, 'not_found', 'Response not found');
  }
  if (response.status !== 'pending') {
    throw new ServiceError(409, 'conflict', 'Response already processed');
  }

  const task = await ctx.db.getTaskById(response.task_id);
  if (!task) {
    throw new ServiceError(404, 'not_found', 'Task missing for response');
  }

  const ownerAddress = normalizeAddress(payload.ownerAddress);
  if (ownerAddress !== task.owner) {
    throw new ServiceError(403, 'forbidden', 'Owner mismatch');
  }

  const workerAddress = normalizeAddress(payload.workerAddress);
  if (workerAddress !== response.worker) {
    throw new ServiceError(403, 'forbidden', 'Worker mismatch');
  }

  if (payload.price !== task.price) {
    throw new ServiceError(400, 'invalid_request', 'Price mismatch');
  }

  if (payload.status === 'approved' && !payload.encryptedSettlement) {
    throw new ServiceError(400, 'invalid_request', 'encryptedSettlement required when approving response');
  }

  const canonicalPayload = decisionSignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.ownerAddress, canonicalPayload, payload.signature);
  assertSignature(verified);

  const settlement = payload.status === 'approved' ? payload.encryptedSettlement ?? null : null;
  const updated = await ctx.db.updateResponseStatus(payload.responseId, payload.status, settlement);
  if (!updated) {
    throw new ServiceError(500, 'internal_error', 'Failed to update response');
  }
  return updated;
};

export const queryTasksList = async (
  ctx: AppContext,
  payload: TaskQueryRequest
): Promise<TaskRecord[]> => {
  const filter = payload.filter ?? {};
  const createdRange = filter.created_at ?? null;
  const keyword = filter.keyword ? filter.keyword.trim() : null;
  return ctx.db.queryTasks({
    publisher: filter.publisher ?? null,
    createdBefore: createdRange && createdRange[0] > 0 ? createdRange[0] : null,
    createdAfter: createdRange && createdRange[1] > 0 ? createdRange[1] : null,
    status: filter.status ?? null,
    keyword: keyword && keyword.length > 0 ? keyword : null,
    minPrice: filter.minPrice ?? 0,
    sortBy: payload.sortBy,
    pageSize: payload.pageSize,
    pageNum: payload.pageNum
  });
};

export const queryTaskResponses = async (
  ctx: AppContext,
  payload: TaskResponsesQueryRequest
): Promise<ResponseRecord[]> => {
  const canonical = taskResponsesQuerySignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.ownerAddress, canonical, payload.signature);
  assertSignature(verified);

  const task = await ctx.db.getTaskById(payload.taskId);
  if (!task) {
    throw new ServiceError(404, 'not_found', 'Task not found');
  }

  const ownerAddress = normalizeAddress(payload.ownerAddress);
  if (ownerAddress !== task.owner) {
    throw new ServiceError(403, 'forbidden', 'Owner mismatch');
  }

  const workerAddress = payload.workerAddress ? normalizeAddress(payload.workerAddress) : undefined;
  return ctx.db.listResponsesForTaskPaginated(payload.taskId, {
    worker: workerAddress,
    pageSize: payload.pageSize,
    pageNum: payload.pageNum
  });
};

export const queryWorkerResponses = async (
  ctx: AppContext,
  payload: WorkerResponsesQueryRequest
): Promise<ResponseRecord[]> => {
  const canonical = workerResponsesQuerySignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.workerAddress, canonical, payload.signature);
  assertSignature(verified);

  const workerAddress = normalizeAddress(payload.workerAddress);
  const taskId = payload.taskId ?? undefined;
  return ctx.db.listResponsesByWorker(workerAddress, {
    taskId,
    pageSize: payload.pageSize,
    pageNum: payload.pageNum
  });
};
