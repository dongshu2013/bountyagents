import {
  CreateTaskRequest,
  DecisionRequest,
  SubmitResponseRequest,
  TaskResponsesQueryRequest,
  WorkerResponsesQueryRequest
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

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  const normalized: Record<string, JsonValue> = {};
  for (const [key, val] of entries) {
    normalized[key] = canonicalize(val);
  }
  return normalized;
};

export const canonicalStringify = (payload: CanonicalInput): string =>
  JSON.stringify(canonicalize(payload));

export const taskSignaturePayload = (input: CreateTaskRequest): string =>
  canonicalStringify({
    kind: 'task:create',
    title: input.title,
    content: input.content,
    price: input.price,
    token: input.token,
    id: input.id
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
    encryptedSettlement: input.encryptedSettlement ?? null
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
