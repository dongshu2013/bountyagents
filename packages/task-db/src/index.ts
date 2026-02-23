import { Pool, PoolConfig } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { responses, schema, tasks } from './schema.js';

export const taskStatusSchema = z.enum(['finished', 'draft', 'active', 'closed']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const responseStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type ResponseStatus = z.infer<typeof responseStatusSchema>;

export const taskRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(255),
  content: z.string(),
  owner: z.string(),
  created_at: z.number(),
  status: taskStatusSchema,
  price: z.string(),
  token: z.string()
});
export type TaskRecord = z.infer<typeof taskRecordSchema>;

export const responseRecordSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  payload: z.string(),
  worker: z.string(),
  status: responseStatusSchema,
  created_at: z.number(),
  settlement: z.string().nullable()
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

const nowEpoch = (): number => Date.now();

const parseTaskRow = (row: any): TaskRecord => taskRecordSchema.parse(row);
const parseResponseRow = (row: any): ResponseRecord =>
  responseRecordSchema.parse({
    ...row,
    settlement: row.settlement ?? null
  });

export class TaskDb {
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(private readonly pool: Pool) {
    this.db = drizzle(pool, { schema, logger: false });
  }

  static fromPoolConfig(config: PoolConfig): TaskDb {
    return new TaskDb(new Pool(config));
  }

  async migrate(): Promise<void> {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        owner VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL,
        status VARCHAR(32) NOT NULL,
        price VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS responses (
        id UUID PRIMARY KEY,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        payload TEXT NOT NULL,
        worker VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        settlement TEXT
      );
      CREATE INDEX IF NOT EXISTS responses_task_id_idx ON responses(task_id);
      CREATE INDEX IF NOT EXISTS tasks_search_idx
        ON tasks USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
    `);
  }

  private static normalizePagination(pageSize = 50, pageNum = 0): { limit: number; offset: number } {
    const limit = Math.max(1, Math.min(pageSize, 200));
    const safePage = pageNum < 0 ? 0 : pageNum;
    const offset = safePage * limit;
    return { limit, offset };
  }

  async createTask(input: NewTaskInput): Promise<TaskRecord> {
    const created_at = input.created_at ?? nowEpoch();
    const status = input.status ?? 'draft';
    const [record] = await this.db
      .insert(tasks)
      .values({
        id: input.id,
        title: input.title,
        content: input.content,
        owner: input.owner,
        created_at,
        status,
        price: input.price,
        token: input.token
      })
      .returning();
    return parseTaskRow(record);
  }

  async getTaskById(id: string): Promise<TaskRecord | null> {
    const [record] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return record ? parseTaskRow(record) : null;
  }

  async listTasks(owner?: string): Promise<TaskRecord[]> {
    const rows = owner
      ? await this.db
          .select()
          .from(tasks)
          .where(eq(tasks.owner, owner))
          .orderBy(desc(tasks.created_at))
      : await this.db.select().from(tasks).orderBy(desc(tasks.created_at));
    return rows.map(parseTaskRow);
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<TaskRecord | null> {
    const [record] = await this.db.update(tasks).set({ status }).where(eq(tasks.id, id)).returning();
    return record ? parseTaskRow(record) : null;
  }

  async queryTasks(filters: TaskQueryFilters): Promise<TaskRecord[]> {
    const { limit, offset } = TaskDb.normalizePagination(filters.pageSize, filters.pageNum);
    const whereClauses: any[] = [];
    if (filters.publisher) {
      whereClauses.push(sql`owner = ${filters.publisher}`);
    }
    if (filters.status) {
      whereClauses.push(sql`status = ${filters.status}`);
    }
    if (filters.createdAfter && filters.createdAfter > 0) {
      whereClauses.push(sql`created_at >= ${filters.createdAfter}`);
    }
    if (filters.createdBefore && filters.createdBefore > 0) {
      whereClauses.push(sql`created_at <= ${filters.createdBefore}`);
    }
    if (filters.keyword) {
      whereClauses.push(
        sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', ${filters.keyword})`
      );
    }
    if (filters.minPrice && filters.minPrice > 0) {
      whereClauses.push(sql`(COALESCE(NULLIF(price, ''), '0'))::numeric >= ${filters.minPrice}`);
    }
    const whereClause = whereClauses.length ? sql`WHERE ${sql.join(whereClauses, sql` AND `)}` : sql``;
    const sortKey = filters.sortBy ?? 'created_at';
    const orderClause =
      sortKey === 'price'
        ? sql`ORDER BY (COALESCE(NULLIF(price, ''), '0'))::numeric DESC`
        : sql`ORDER BY created_at DESC`;
    const query = sql`SELECT * FROM tasks ${whereClause} ${orderClause} LIMIT ${limit} OFFSET ${offset}`;
    const result = await this.db.execute(query);
    return result.rows.map(parseTaskRow);
  }

  async createResponse(input: NewResponseInput): Promise<ResponseRecord> {
    const created_at = input.created_at ?? nowEpoch();
    const status = input.status ?? 'pending';
    const [record] = await this.db
      .insert(responses)
      .values({
        id: input.id,
        task_id: input.task_id,
        payload: input.payload,
        worker: input.worker,
        status,
        created_at,
        settlement: input.settlement ?? null
      })
      .returning();
    return parseResponseRow(record);
  }

  async getResponseById(id: string): Promise<ResponseRecord | null> {
    const [record] = await this.db.select().from(responses).where(eq(responses.id, id));
    return record ? parseResponseRow(record) : null;
  }

  async listResponsesForTask(taskId: string): Promise<ResponseRecord[]> {
    const rows = await this.db
      .select()
      .from(responses)
      .where(eq(responses.task_id, taskId))
      .orderBy(desc(responses.created_at));
    return rows.map(parseResponseRow);
  }

  async listResponsesForTaskPaginated(
    taskId: string,
    options: TaskResponsesPageOptions
  ): Promise<ResponseRecord[]> {
    const { limit, offset } = TaskDb.normalizePagination(options.pageSize, options.pageNum);
    let condition = eq(responses.task_id, taskId);
    if (options.worker) {
      condition = and(condition, eq(responses.worker, options.worker));
    }
    const rows = await this.db
      .select()
      .from(responses)
      .where(condition)
      .orderBy(desc(responses.created_at))
      .limit(limit)
      .offset(offset);
    return rows.map(parseResponseRow);
  }

  async listResponsesByWorker(
    worker: string,
    options: WorkerResponsesPageOptions
  ): Promise<ResponseRecord[]> {
    const { limit, offset } = TaskDb.normalizePagination(options.pageSize, options.pageNum);
    let condition = eq(responses.worker, worker);
    if (options.taskId) {
      condition = and(condition, eq(responses.task_id, options.taskId));
    }
    const rows = await this.db
      .select()
      .from(responses)
      .where(condition)
      .orderBy(desc(responses.created_at))
      .limit(limit)
      .offset(offset);
    return rows.map(parseResponseRow);
  }

  async updateResponseStatus(
    responseId: string,
    status: ResponseStatus,
    settlement?: string | null
  ): Promise<ResponseRecord | null> {
    const [record] = await this.db
      .update(responses)
      .set({ status, settlement: settlement ?? null })
      .where(eq(responses.id, responseId))
      .returning();
    return record ? parseResponseRow(record) : null;
  }
}

export type TaskDbPool = Pool;
export * from './schema.js';
