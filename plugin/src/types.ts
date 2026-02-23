import { z } from 'zod';
import { responseStatusSchema } from '@bountyagents/task-db';
import { getAddress, isAddress } from 'viem';

const addressSchema = z
  .string()
  .refine((value) => isAddress(value as `0x${string}`), {
    message: 'Invalid address'
  })
  .transform((value) => getAddress(value as `0x${string}`));

const tokenSchema = z
  .string()
  .regex(/^[a-z0-9-]+:0x[a-fA-F0-9]{40}$/);

export const createTaskPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(4),
  content: z.string().min(1),
  price: z.string().regex(/^[0-9]+$/).refine((val) => BigInt(val) > 0n, {
    message: 'price must be greater than zero'
  }),
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
    encryptedSettlement: z.string().optional()
  })
  .refine((value) => value.status !== 'pending', {
    message: 'Status must be approved or rejected'
  });

export type AddressString = z.infer<typeof addressSchema>;
export type CreateTaskPayload = z.infer<typeof createTaskPayloadSchema>;
export type SubmitResponsePayload = z.infer<typeof submitResponsePayloadSchema>;
export type DecisionPayload = z.infer<typeof decisionPayloadSchema>;
