"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.responses = exports.tasks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    owner: (0, pg_core_1.varchar)('owner', { length: 255 }).notNull(),
    created_at: (0, pg_core_1.bigint)('created_at', { mode: 'number' }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('draft'),
    price: (0, pg_core_1.varchar)('price', { length: 255 }).notNull().default('0'),
    token: (0, pg_core_1.varchar)('token', { length: 255 }),
    withdraw_signature: (0, pg_core_1.text)('withdraw_signature')
});
exports.responses = (0, pg_core_1.pgTable)('responses', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    task_id: (0, pg_core_1.uuid)('task_id')
        .notNull()
        .references(() => exports.tasks.id, { onDelete: 'cascade' }),
    payload: (0, pg_core_1.text)('payload').notNull(),
    worker: (0, pg_core_1.varchar)('worker', { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('pending'),
    created_at: (0, pg_core_1.bigint)('created_at', { mode: 'number' }).notNull(),
    settlement: (0, pg_core_1.text)('settlement'),
    settlement_signature: (0, pg_core_1.text)('settlement_signature')
}, (table) => ({
    taskIdx: (0, pg_core_1.index)('responses_task_id_idx').on(table.task_id)
}));
exports.schema = {
    tasks: exports.tasks,
    responses: exports.responses
};
//# sourceMappingURL=schema.js.map