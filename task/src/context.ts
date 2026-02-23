import { TaskDb } from '@bountyagents/task-db';
import { ServiceConfig } from './config.js';

export interface AppContext {
  config: ServiceConfig;
  db: TaskDb;
}
