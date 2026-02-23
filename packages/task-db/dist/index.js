"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDb = exports.responseRecordSchema = exports.taskRecordSchema = exports.responseStatusSchema = exports.taskStatusSchema = void 0;
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const schema_js_1 = require("./schema.js");
exports.taskStatusSchema = zod_1.z.enum(['finished', 'draft', 'active', 'closed']);
exports.responseStatusSchema = zod_1.z.enum(['pending', 'approved', 'rejected']);
exports.taskRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string().max(255),
    content: zod_1.z.string(),
    owner: zod_1.z.string(),
    created_at: zod_1.z.number(),
    status: exports.taskStatusSchema,
    price: zod_1.z.string(),
    token: zod_1.z.string().nullable(),
    withdraw_signature: zod_1.z.string().nullable()
});
exports.responseRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    task_id: zod_1.z.string().uuid(),
    payload: zod_1.z.string(),
    worker: zod_1.z.string(),
    status: exports.responseStatusSchema,
    created_at: zod_1.z.number(),
    settlement: zod_1.z.string().nullable(),
    settlement_signature: zod_1.z.string().nullable()
});
const nowEpoch = () => Date.now();
const parseTaskRow = (row) => exports.taskRecordSchema.parse({
    ...row,
    token: row.token ?? null,
    withdraw_signature: row.withdraw_signature ?? null
});
const parseResponseRow = (row) => exports.responseRecordSchema.parse({
    ...row,
    settlement: row.settlement ?? null,
    settlement_signature: row.settlement_signature ?? null
});
class TaskDb {
    constructor(pool) {
        this.pool = pool;
        this.db = (0, node_postgres_1.drizzle)(pool, { schema: schema_js_1.schema, logger: false });
    }
    static fromPoolConfig(config) {
        return new TaskDb(new pg_1.Pool(config));
    }
    async migrate() {
        await this.db.execute((0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        owner VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL,
        status VARCHAR(32) NOT NULL,
        price VARCHAR(255) NOT NULL DEFAULT '0',
        token VARCHAR(255),
        withdraw_signature TEXT
      );

      CREATE TABLE IF NOT EXISTS responses (
        id UUID PRIMARY KEY,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        payload TEXT NOT NULL,
        worker VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        settlement TEXT,
        settlement_signature TEXT
      );
      CREATE INDEX IF NOT EXISTS responses_task_id_idx ON responses(task_id);
      CREATE INDEX IF NOT EXISTS tasks_search_idx
        ON tasks USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
      ALTER TABLE tasks
        ALTER COLUMN price SET DEFAULT '0';
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS token VARCHAR(255);
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS withdraw_signature TEXT;
      ALTER TABLE responses
        ADD COLUMN IF NOT EXISTS settlement_signature TEXT;
    `);
    }
    static normalizePagination(pageSize = 50, pageNum = 0) {
        const limit = Math.max(1, Math.min(pageSize, 200));
        const safePage = pageNum < 0 ? 0 : pageNum;
        const offset = safePage * limit;
        return { limit, offset };
    }
    async createTask(input) {
        const created_at = input.created_at ?? nowEpoch();
        const status = input.status ?? 'draft';
        const [record] = await this.db
            .insert(schema_js_1.tasks)
            .values({
            id: input.id,
            title: input.title,
            content: input.content,
            owner: input.owner,
            created_at,
            status,
            price: input.price ?? '0',
            token: input.token ?? null,
            withdraw_signature: input.withdraw_signature ?? null
        })
            .returning();
        return parseTaskRow(record);
    }
    async getTaskById(id) {
        const [record] = await this.db.select().from(schema_js_1.tasks).where((0, drizzle_orm_1.eq)(schema_js_1.tasks.id, id));
        return record ? parseTaskRow(record) : null;
    }
    async listTasks(owner) {
        const rows = owner
            ? await this.db
                .select()
                .from(schema_js_1.tasks)
                .where((0, drizzle_orm_1.eq)(schema_js_1.tasks.owner, owner))
                .orderBy((0, drizzle_orm_1.desc)(schema_js_1.tasks.created_at))
            : await this.db.select().from(schema_js_1.tasks).orderBy((0, drizzle_orm_1.desc)(schema_js_1.tasks.created_at));
        return rows.map(parseTaskRow);
    }
    async updateTaskStatus(id, status) {
        const [record] = await this.db.update(schema_js_1.tasks).set({ status }).where((0, drizzle_orm_1.eq)(schema_js_1.tasks.id, id)).returning();
        return record ? parseTaskRow(record) : null;
    }
    async queryTasks(filters) {
        const { limit, offset } = TaskDb.normalizePagination(filters.pageSize, filters.pageNum);
        const whereClauses = [];
        if (filters.publisher) {
            whereClauses.push((0, drizzle_orm_1.sql) `owner = ${filters.publisher}`);
        }
        if (filters.status) {
            whereClauses.push((0, drizzle_orm_1.sql) `status = ${filters.status}`);
        }
        if (filters.createdAfter && filters.createdAfter > 0) {
            whereClauses.push((0, drizzle_orm_1.sql) `created_at >= ${filters.createdAfter}`);
        }
        if (filters.createdBefore && filters.createdBefore > 0) {
            whereClauses.push((0, drizzle_orm_1.sql) `created_at <= ${filters.createdBefore}`);
        }
        if (filters.keyword) {
            whereClauses.push((0, drizzle_orm_1.sql) `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', ${filters.keyword})`);
        }
        if (filters.minPrice && filters.minPrice > 0) {
            whereClauses.push((0, drizzle_orm_1.sql) `(COALESCE(NULLIF(price, ''), '0'))::numeric >= ${filters.minPrice}`);
        }
        const whereClause = whereClauses.length ? (0, drizzle_orm_1.sql) `WHERE ${drizzle_orm_1.sql.join(whereClauses, (0, drizzle_orm_1.sql) ` AND `)}` : (0, drizzle_orm_1.sql) ``;
        const sortKey = filters.sortBy ?? 'created_at';
        const orderClause = sortKey === 'price'
            ? (0, drizzle_orm_1.sql) `ORDER BY (COALESCE(NULLIF(price, ''), '0'))::numeric DESC`
            : (0, drizzle_orm_1.sql) `ORDER BY created_at DESC`;
        const query = (0, drizzle_orm_1.sql) `SELECT * FROM tasks ${whereClause} ${orderClause} LIMIT ${limit} OFFSET ${offset}`;
        const result = await this.db.execute(query);
        return result.rows.map(parseTaskRow);
    }
    async createResponse(input) {
        const created_at = input.created_at ?? nowEpoch();
        const status = input.status ?? 'pending';
        const [record] = await this.db
            .insert(schema_js_1.responses)
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
    async getResponseById(id) {
        const [record] = await this.db.select().from(schema_js_1.responses).where((0, drizzle_orm_1.eq)(schema_js_1.responses.id, id));
        return record ? parseResponseRow(record) : null;
    }
    async listResponsesForTask(taskId) {
        const rows = await this.db
            .select()
            .from(schema_js_1.responses)
            .where((0, drizzle_orm_1.eq)(schema_js_1.responses.task_id, taskId))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.responses.created_at));
        return rows.map(parseResponseRow);
    }
    async listResponsesForTaskPaginated(taskId, options) {
        const { limit, offset } = TaskDb.normalizePagination(options.pageSize, options.pageNum);
        let condition = (0, drizzle_orm_1.eq)(schema_js_1.responses.task_id, taskId);
        if (options.worker) {
            condition = (0, drizzle_orm_1.and)(condition, (0, drizzle_orm_1.eq)(schema_js_1.responses.worker, options.worker));
        }
        const rows = await this.db
            .select()
            .from(schema_js_1.responses)
            .where(condition)
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.responses.created_at))
            .limit(limit)
            .offset(offset);
        return rows.map(parseResponseRow);
    }
    async listResponsesByWorker(worker, options) {
        const { limit, offset } = TaskDb.normalizePagination(options.pageSize, options.pageNum);
        let condition = (0, drizzle_orm_1.eq)(schema_js_1.responses.worker, worker);
        if (options.taskId) {
            condition = (0, drizzle_orm_1.and)(condition, (0, drizzle_orm_1.eq)(schema_js_1.responses.task_id, options.taskId));
        }
        const rows = await this.db
            .select()
            .from(schema_js_1.responses)
            .where(condition)
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.responses.created_at))
            .limit(limit)
            .offset(offset);
        return rows.map(parseResponseRow);
    }
    async updateResponseStatus(responseId, status, settlement, settlementSignature) {
        const [record] = await this.db
            .update(schema_js_1.responses)
            .set({ status, settlement: settlement ?? null, settlement_signature: settlementSignature ?? null })
            .where((0, drizzle_orm_1.eq)(schema_js_1.responses.id, responseId))
            .returning();
        return record ? parseResponseRow(record) : null;
    }
    async markTaskFunded(taskId, price, token) {
        const [record] = await this.db
            .update(schema_js_1.tasks)
            .set({ price, token, status: 'active' })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tasks.id, taskId))
            .returning();
        return record ? parseTaskRow(record) : null;
    }
    async storeWithdrawSignature(taskId, signature) {
        const [record] = await this.db
            .update(schema_js_1.tasks)
            .set({ withdraw_signature: signature })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tasks.id, taskId))
            .returning();
        return record ? parseTaskRow(record) : null;
    }
}
exports.TaskDb = TaskDb;
__exportStar(require("./schema.js"), exports);
//# sourceMappingURL=index.js.map