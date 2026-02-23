import { Pool, PoolConfig } from 'pg';
import { z } from 'zod';
export declare const taskStatusSchema: z.ZodEnum<["finished", "draft", "active", "closed"]>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export declare const responseStatusSchema: z.ZodEnum<["pending", "approved", "rejected"]>;
export type ResponseStatus = z.infer<typeof responseStatusSchema>;
export declare const taskRecordSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    content: z.ZodString;
    owner: z.ZodString;
    created_at: z.ZodNumber;
    status: z.ZodEnum<["finished", "draft", "active", "closed"]>;
    price: z.ZodString;
    token: z.ZodNullable<z.ZodString>;
    withdraw_signature: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    content: string;
    owner: string;
    created_at: number;
    status: "draft" | "finished" | "active" | "closed";
    price: string;
    token: string | null;
    withdraw_signature: string | null;
}, {
    id: string;
    title: string;
    content: string;
    owner: string;
    created_at: number;
    status: "draft" | "finished" | "active" | "closed";
    price: string;
    token: string | null;
    withdraw_signature: string | null;
}>;
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export declare const responseRecordSchema: z.ZodObject<{
    id: z.ZodString;
    task_id: z.ZodString;
    payload: z.ZodString;
    worker: z.ZodString;
    status: z.ZodEnum<["pending", "approved", "rejected"]>;
    created_at: z.ZodNumber;
    settlement: z.ZodNullable<z.ZodString>;
    settlement_signature: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: number;
    status: "pending" | "approved" | "rejected";
    task_id: string;
    payload: string;
    worker: string;
    settlement: string | null;
    settlement_signature: string | null;
}, {
    id: string;
    created_at: number;
    status: "pending" | "approved" | "rejected";
    task_id: string;
    payload: string;
    worker: string;
    settlement: string | null;
    settlement_signature: string | null;
}>;
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
export declare class TaskDb {
    private readonly pool;
    private readonly db;
    constructor(pool: Pool);
    static fromPoolConfig(config: PoolConfig): TaskDb;
    migrate(): Promise<void>;
    private static normalizePagination;
    createTask(input: NewTaskInput): Promise<TaskRecord>;
    getTaskById(id: string): Promise<TaskRecord | null>;
    listTasks(owner?: string): Promise<TaskRecord[]>;
    updateTaskStatus(id: string, status: TaskStatus): Promise<TaskRecord | null>;
    queryTasks(filters: TaskQueryFilters): Promise<TaskRecord[]>;
    createResponse(input: NewResponseInput): Promise<ResponseRecord>;
    getResponseById(id: string): Promise<ResponseRecord | null>;
    listResponsesForTask(taskId: string): Promise<ResponseRecord[]>;
    listResponsesForTaskPaginated(taskId: string, options: TaskResponsesPageOptions): Promise<ResponseRecord[]>;
    listResponsesByWorker(worker: string, options: WorkerResponsesPageOptions): Promise<ResponseRecord[]>;
    updateResponseStatus(responseId: string, status: ResponseStatus, settlement?: string | null, settlementSignature?: string | null): Promise<ResponseRecord | null>;
    markTaskFunded(taskId: string, price: string, token: string): Promise<TaskRecord | null>;
    storeWithdrawSignature(taskId: string, signature: string): Promise<TaskRecord | null>;
}
export type TaskDbPool = Pool;
export * from './schema.js';
