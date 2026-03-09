import { z } from 'zod';

export const taskStatusSchema = z.enum(["finished", "draft", "active", "closed", "pending_review"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const responseStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ResponseStatus = z.infer<typeof responseStatusSchema>;

export const taskRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  owner: z.string(),
  created_at: z.number(),
  status: taskStatusSchema,
  price: z.string(),
  token: z.string().nullable(),
  withdraw_signature: z.string().nullable()
});
export type TaskRecord = z.infer<typeof taskRecordSchema>;

export const responseRecordSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  payload: z.string(),
  worker: z.string(),
  status: responseStatusSchema,
  created_at: z.number(),
  settlement: z.string().nullable(),
  settlement_signature: z.string().nullable()
});
export type ResponseRecord = z.infer<typeof responseRecordSchema>;

export type NewTaskInput = Omit<TaskRecord, 'created_at' | 'status'> & {
  status?: TaskStatus;
  created_at?: number;
};

export type NewResponseInput = Omit<ResponseRecord, 'created_at' | 'status' | 'settlement'> & {
  status?: ResponseStatus;
  created_at?: number;
  settlement?: string | null;
  settlement_signature?: string | null;
};

export type TaskSortKey = 'price' | 'created_at';

export interface TaskQueryFilters {
  publisher?: string | null;
  createdAfter?: number | null;
  createdBefore?: number | null;
  status?: TaskStatus | null;
  keyword?: string | null;
  minPrice?: number;
  sortBy?: TaskSortKey;
  pageSize?: number;
  pageNum?: number;
}

export interface TaskResponsesPageOptions {
  worker?: string;
  pageSize?: number;
  pageNum?: number;
}

export interface WorkerResponsesPageOptions {
  taskId?: string;
  pageSize?: number;
  pageNum?: number;
}
