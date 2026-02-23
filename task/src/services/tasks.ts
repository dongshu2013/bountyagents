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
  WorkerResponsesQueryRequest,
  TaskCancelRequest,
  TaskSettleRequest,
  TaskFundingRequest
} from '../schemas.js';
import {
  decisionSignaturePayload,
  responseSignaturePayload,
  taskSignaturePayload,
  taskResponsesQuerySignaturePayload,
  workerResponsesQuerySignaturePayload,
  taskCancelSignaturePayload,
  taskSettleSignaturePayload,
  taskFundingSignaturePayload
} from '../signature.js';
import { normalizeAddress, verifyDetachedSignature } from '../crypto.js';
import { fetchDepositInfo, taskDepositKey } from '../onchain.js';
import { parseTokenIdentifier } from '../token.js';
import { signWithdrawAuthorization } from '../withdraw.js';

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

  const ownerAddress = normalizeAddress(payload.ownerAddress);
  const id = payload.id;
  return ctx.db.createTask({
    id,
    title: payload.title,
    content: payload.content,
    owner: ownerAddress,
    status: 'draft',
    price: '0',
    token: null
  });
};

export const fundTask = async (ctx: AppContext, payload: TaskFundingRequest): Promise<TaskRecord> => {
  const canonicalPayload = taskFundingSignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.ownerAddress, canonicalPayload, payload.signature);
  assertSignature(verified);

  const task = await ctx.db.getTaskById(payload.taskId);
  if (!task) {
    throw new ServiceError(404, 'not_found', 'Task not found');
  }
  if (task.status === 'finished' || task.status === 'closed') {
    throw new ServiceError(409, 'conflict', 'Task can no longer be funded');
  }

  const ownerAddress = normalizeAddress(payload.ownerAddress);
  if (ownerAddress !== task.owner) {
    throw new ServiceError(403, 'forbidden', 'Owner mismatch');
  }

  const depositKey = taskDepositKey(payload.taskId);
  const onChain = await fetchDepositInfo(ctx.config, depositKey);
  if (onChain.owner === ZERO_ADDRESS) {
    throw new ServiceError(400, 'invalid_request', 'Deposit not found on chain');
  }
  if (onChain.released) {
    throw new ServiceError(409, 'conflict', 'Deposit already released on chain');
  }
  const onChainOwner = normalizeAddress(onChain.owner);
  if (onChainOwner !== ownerAddress) {
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
  if (expectedAmount <= 0n) {
    throw new ServiceError(400, 'invalid_request', 'Price must be greater than zero');
  }
  if (onChain.amountLocked !== expectedAmount) {
    throw new ServiceError(400, 'invalid_request', 'On-chain amount mismatch');
  }

  const updated = await ctx.db.markTaskFunded(payload.taskId, payload.price, payload.token);
  if (!updated) {
    throw new ServiceError(500, 'internal_error', 'Failed to update task funding info');
  }
  return updated;
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
  if (!task.token || task.price === '0') {
    throw new ServiceError(409, 'conflict', 'Task not funded');
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
  const settlementSignature = payload.status === 'approved' ? payload.settlementSignature ?? null : null;
  const updated = await ctx.db.updateResponseStatus(
    payload.responseId,
    payload.status,
    settlement,
    settlementSignature
  );
  if (!updated) {
    throw new ServiceError(500, 'internal_error', 'Failed to update response');
  }
  if (payload.status === 'approved') {
    await ctx.db.updateTaskStatus(task.id, 'finished');
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

export const cancelTask = async (ctx: AppContext, payload: TaskCancelRequest): Promise<TaskRecord> => {
  const canonical = taskCancelSignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.ownerAddress, canonical, payload.signature);
  assertSignature(verified);

  const task = await ctx.db.getTaskById(payload.taskId);
  if (!task) {
    throw new ServiceError(404, 'not_found', 'Task not found');
  }

  if (!task.token || task.price === '0') {
    throw new ServiceError(409, 'conflict', 'Task not funded');
  }

  const ownerAddress = normalizeAddress(payload.ownerAddress);
  if (ownerAddress !== task.owner) {
    throw new ServiceError(403, 'forbidden', 'Owner mismatch');
  }
  if (task.status === 'finished') {
    throw new ServiceError(409, 'conflict', 'Task already settled');
  }
  if (task.status === 'closed' && task.withdraw_signature) {
    return task;
  }
  if (task.status !== 'active') {
    throw new ServiceError(409, 'conflict', 'Task must be active to cancel');
  }

  const tokenInfo = parseTokenIdentifier(task.token);
  const amount = BigInt(task.price);
  if (amount <= 0n) {
    throw new ServiceError(409, 'conflict', 'Task funding amount invalid');
  }

  const depositKey = taskDepositKey(task.id);
  const withdrawSignature =
    task.withdraw_signature ??
    (await signWithdrawAuthorization(ctx.config, depositKey, ownerAddress, tokenInfo.address, amount));

  await ctx.db.updateTaskStatus(payload.taskId, 'closed');
  const signed = await ctx.db.storeWithdrawSignature(payload.taskId, withdrawSignature);
  if (!signed) {
    throw new ServiceError(500, 'internal_error', 'Failed to persist withdraw signature');
  }
  return signed;
};

export interface TaskSettlementPayload {
  task: TaskRecord;
  settlementSignature: string;
}

export const settleTask = async (ctx: AppContext, payload: TaskSettleRequest): Promise<TaskSettlementPayload> => {
  const canonical = taskSettleSignaturePayload(payload);
  const verified = await verifyDetachedSignature(payload.workerAddress, canonical, payload.signature);
  assertSignature(verified);

  const response = await ctx.db.getResponseById(payload.responseId);
  if (!response) {
    throw new ServiceError(404, 'not_found', 'Response not found');
  }
  if (response.task_id !== payload.taskId) {
    throw new ServiceError(400, 'invalid_request', 'Task mismatch');
  }

  const workerAddress = normalizeAddress(payload.workerAddress);
  if (workerAddress !== response.worker) {
    throw new ServiceError(403, 'forbidden', 'Worker mismatch');
  }
  if (response.status !== 'approved') {
    throw new ServiceError(409, 'conflict', 'Response not approved');
  }
  if (!response.settlement_signature) {
    throw new ServiceError(409, 'conflict', 'Settlement signature unavailable');
  }

  const task = await ctx.db.getTaskById(payload.taskId);
  if (!task) {
    throw new ServiceError(404, 'not_found', 'Task not found');
  }

  return { task, settlementSignature: response.settlement_signature };
};
