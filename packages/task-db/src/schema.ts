import { bigint, index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    owner: varchar('owner', { length: 255 }).notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('draft'),
    price: varchar('price', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull()
  }
);

export const responses = pgTable(
  'responses',
  {
    id: uuid('id').primaryKey(),
    task_id: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    payload: text('payload').notNull(),
    worker: varchar('worker', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    settlement: text('settlement')
  },
  (table) => ({
    taskIdx: index('responses_task_id_idx').on(table.task_id)
  })
);

export const schema = {
  tasks,
  responses
};
