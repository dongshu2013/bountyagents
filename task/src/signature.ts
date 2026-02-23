import {
  CreateTaskRequest,
  DecisionRequest,
  SubmitResponseRequest,
  TaskResponsesQueryRequest,
  WorkerResponsesQueryRequest,
  TaskCancelRequest,
  TaskSettleRequest,
  TaskFundingRequest
} from './schemas.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type CanonicalInput = JsonValue | Record<string, unknown> | undefined;

const canonicalize = (value: CanonicalInput): JsonValue => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item)) as JsonValue;
  }

  const entries = Object.entries(value as Record<string, CanonicalInput>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  const normalized: Record<string, JsonValue> = {};
  for (const [key, val] of entries) {
    normalized[key] = canonicalize(val);
  }
  return normalized as JsonValue;
};

export const canonicalStringify = (payload: CanonicalInput): string =>
  JSON.stringify(canonicalize(payload));

export const taskSignaturePayload = (input: CreateTaskRequest): string =>
  canonicalStringify({
    kind: 'task:create',
    title: input.title,
    content: input.content,
    id: input.id
  });

export const taskFundingSignaturePayload = (input: TaskFundingRequest): string =>
  canonicalStringify({
    kind: 'task:fund',
    taskId: input.taskId,
    price: input.price,
    token: input.token
  });

export const responseSignaturePayload = (input: SubmitResponseRequest): string =>
  canonicalStringify({
    kind: 'task:response',
    taskId: input.taskId,
    payload: input.payload,
    id: input.id ?? null
  });

export const decisionSignaturePayload = (input: DecisionRequest): string =>
  canonicalStringify({
    kind: 'task:decision',
    responseId: input.responseId,
    workerAddress: input.workerAddress,
    price: input.price,
    status: input.status,
    encryptedSettlement: input.encryptedSettlement ?? null,
    settlementSignature: input.settlementSignature ?? null
  });

export const taskResponsesQuerySignaturePayload = (input: TaskResponsesQueryRequest): string =>
  canonicalStringify({
    kind: 'task:response:query',
    taskId: input.taskId,
    ownerAddress: input.ownerAddress,
    workerAddress: input.workerAddress ?? null,
    pageSize: input.pageSize ?? 50,
    pageNum: input.pageNum ?? 0
  });

export const workerResponsesQuerySignaturePayload = (
  input: WorkerResponsesQueryRequest
): string =>
  canonicalStringify({
    kind: 'worker:response:query',
    workerAddress: input.workerAddress,
    taskId: input.taskId ?? null,
    pageSize: input.pageSize ?? 50,
    pageNum: input.pageNum ?? 0
  });

export const taskCancelSignaturePayload = (input: TaskCancelRequest): string =>
  canonicalStringify({
    kind: 'task:cancel',
    taskId: input.taskId
  });

export const taskSettleSignaturePayload = (input: TaskSettleRequest): string =>
  canonicalStringify({
    kind: 'task:settle',
    taskId: input.taskId,
    responseId: input.responseId,
    workerAddress: input.workerAddress
  });
