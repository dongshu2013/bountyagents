import { z } from 'zod';
import { responseStatusSchema, taskStatusSchema } from '@bountyagents/task-db';
import { getAddress, isAddress } from 'viem';

const addressSchema = z
  .string()
  .refine((value) => isAddress(value as `0x${string}`), {
    message: 'Invalid address'
  })
  .transform((value) => getAddress(value as `0x${string}`));

const tokenSchema = z.string().regex(/^[a-z0-9-]+:0x[a-fA-F0-9]{40}$/);

const priceStringSchema = z.string().regex(/^[0-9]+$/).refine((val) => BigInt(val) > 0n, {
  message: 'price must be greater than zero'
});

const signatureSchema = z.string().regex(/^0x[a-fA-F0-9]{130}$/, { message: 'Invalid signature' });

export const createTaskPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(4),
  content: z.string().min(1)
});

export const fundTaskPayloadSchema = z.object({
  taskId: z.string().uuid(),
  price: priceStringSchema,
  token: tokenSchema
});

export const submitResponsePayloadSchema = z.object({
  id: z.string().uuid().optional(),
  taskId: z.string().uuid(),
  payload: z.string().min(1)
});

export const decisionPayloadSchema = z
  .object({
    responseId: z.string().uuid(),
    workerAddress: addressSchema,
    price: z.string(),
    status: responseStatusSchema,
    settlementSignature: signatureSchema.optional()
  })
  .refine((value) => value.status !== 'pending', {
    message: 'Status must be approved or rejected'
  })
  .refine((value) => (value.status === 'approved' ? Boolean(value.settlementSignature) : true), {
    message: 'settlementSignature required when approving'
  });

export const cancelTaskPayloadSchema = z.object({
  taskId: z.string().uuid()
});

export const settleTaskPayloadSchema = z.object({
  taskId: z.string().uuid(),
  responseId: z.string().uuid()
});

const createdRangeSchema = z.tuple([z.number().nonnegative(), z.number().nonnegative()]).optional();

export const taskQueryPayloadSchema = z.object({
  filter: z
    .object({
      publisher: addressSchema.optional(),
      created_at: createdRangeSchema,
      status: taskStatusSchema.optional(),
      minPrice: z.number().int().nonnegative().optional(),
      keyword: z.string().min(2).max(256).optional()
    })
    .default({}),
  sortBy: z.enum(['price', 'created_at']).optional().default('created_at'),
  pageSize: z.number().int().min(1).max(200).optional().default(50),
  pageNum: z.number().int().min(0).optional().default(0)
});

export const taskResponsesQueryPayloadSchema = z.object({
  taskId: z.string().uuid(),
  workerAddress: addressSchema.optional(),
  pageSize: z.number().int().min(1).max(200).optional().default(50),
  pageNum: z.number().int().min(0).optional().default(0)
});

export const workerResponsesQueryPayloadSchema = z.object({
  taskId: z.string().uuid().optional(),
  pageSize: z.number().int().min(1).max(200).optional().default(50),
  pageNum: z.number().int().min(0).optional().default(0)
});

export type AddressString = z.infer<typeof addressSchema>;
export type CreateTaskPayload = z.infer<typeof createTaskPayloadSchema>;
export type FundTaskPayload = z.infer<typeof fundTaskPayloadSchema>;
export type SubmitResponsePayload = z.infer<typeof submitResponsePayloadSchema>;
export type DecisionPayload = z.infer<typeof decisionPayloadSchema>;
export type CancelTaskPayload = z.infer<typeof cancelTaskPayloadSchema>;
export type SettleTaskPayload = z.infer<typeof settleTaskPayloadSchema>;
export type TaskQueryPayload = z.infer<typeof taskQueryPayloadSchema>;
export type TaskResponsesQueryPayload = z.infer<typeof taskResponsesQueryPayloadSchema>;
export type WorkerResponsesQueryPayload = z.infer<typeof workerResponsesQueryPayloadSchema>;
