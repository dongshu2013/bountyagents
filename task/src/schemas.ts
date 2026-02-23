import { z } from 'zod';
import { responseStatusSchema, taskStatusSchema } from '@bountyagents/task-db';
import { getAddress, isAddress } from 'viem';

const addressSchema = z
  .string()
  .refine((value) => isAddress(value as `0x${string}`), {
    message: 'Invalid address'
  })
  .transform((value) => getAddress(value as `0x${string}`));

const priceStringSchema = z
  .string()
  .regex(/^[0-9]+$/, 'price must be integer string')
  .refine((value) => BigInt(value) > 0n, { message: 'price must be greater than zero' });

const tokenSchema = z.string().regex(/^[a-z0-9-]+:0x[a-fA-F0-9]{40}$/);

const signatureSchema = z.string().regex(/^0x[0-9a-fA-F]{130}$/, {
  message: 'Signature must be a 65-byte hex string'
});

export const createTaskRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(4).max(255),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  ownerAddress: addressSchema,
  signature: z.string()
});

export const taskFundingSchema = z.object({
  taskId: z.string().uuid(),
  ownerAddress: addressSchema,
  price: priceStringSchema,
  token: tokenSchema,
  signature: z.string()
});

export const submitResponseSchema = z.object({
  id: z.string().uuid().optional(),
  taskId: z.string().uuid(),
  payload: z.string().min(1),
  workerAddress: addressSchema,
  signature: z.string()
});

export const decisionSchema = z
  .object({
    responseId: z.string().uuid(),
    workerAddress: addressSchema,
    ownerAddress: addressSchema,
    price: z.string(),
    signature: z.string(),
    status: responseStatusSchema,
    encryptedSettlement: z.string().optional(),
    settlementSignature: signatureSchema.optional()
  })
  .refine((value) => value.status !== 'pending', {
    message: 'status must be approved or rejected'
  })
  .refine((value) => (value.status === 'approved' ? Boolean(value.settlementSignature) : true), {
    message: 'settlementSignature required when approving response'
  })
  .refine((value) => (value.status === 'approved' ? Boolean(value.encryptedSettlement) : true), {
    message: 'encryptedSettlement required when approving response'
  });

export const taskCancelSchema = z.object({
  taskId: z.string().uuid(),
  ownerAddress: addressSchema,
  signature: z.string()
});

export const taskSettleSchema = z.object({
  taskId: z.string().uuid(),
  responseId: z.string().uuid(),
  workerAddress: addressSchema,
  signature: z.string()
});

const createdRangeSchema = z
  .tuple([z.number().nonnegative(), z.number().nonnegative()])
  .optional()
  .nullable();

export const taskQuerySchema = z.object({
  filter: z
    .object({
      publisher: addressSchema.optional().nullable(),
      created_at: createdRangeSchema,
      status: taskStatusSchema.optional().nullable(),
      minPrice: z.number().int().nonnegative().optional().default(0),
      keyword: z.string().min(2).max(256).optional().nullable()
    })
    .default({}),
  sortBy: z.enum(['price', 'created_at']).default('created_at'),
  pageSize: z.number().int().min(1).max(200).optional().default(50),
  pageNum: z.number().int().min(0).optional().default(0)
});

export const taskResponsesQuerySchema = z.object({
  taskId: z.string().uuid(),
  ownerAddress: addressSchema,
  workerAddress: addressSchema.optional(),
  signature: z.string(),
  pageSize: z.number().int().min(1).max(200).optional().default(50),
  pageNum: z.number().int().min(0).optional().default(0)
});

export const workerResponsesQuerySchema = z.object({
  workerAddress: addressSchema,
  taskId: z.string().uuid().optional(),
  signature: z.string(),
  pageSize: z.number().int().min(1).max(200).optional().default(50),
  pageNum: z.number().int().min(0).optional().default(0)
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type SubmitResponseRequest = z.infer<typeof submitResponseSchema>;
export type DecisionRequest = z.infer<typeof decisionSchema>;
export type TaskStatusWire = z.infer<typeof taskStatusSchema>;
export type AddressString = z.infer<typeof addressSchema>;
export type TaskFundingRequest = z.infer<typeof taskFundingSchema>;
export type TaskCancelRequest = z.infer<typeof taskCancelSchema>;
export type TaskSettleRequest = z.infer<typeof taskSettleSchema>;
export type TaskQueryRequest = z.infer<typeof taskQuerySchema>;
export type TaskResponsesQueryRequest = z.infer<typeof taskResponsesQuerySchema>;
export type WorkerResponsesQueryRequest = z.infer<typeof workerResponsesQuerySchema>;
