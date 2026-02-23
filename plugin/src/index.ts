import { fetch } from 'undici';
import { z } from 'zod';
import { TaskRecord, ResponseRecord, taskRecordSchema, responseRecordSchema } from '@bountyagents/task-db';
import { getAddress, Hex } from 'viem';
import { Signer } from './signers.js';
import {
  CancelTaskPayload,
  CreateTaskPayload,
  DecisionPayload,
  FundTaskPayload,
  SettleTaskPayload,
  SubmitResponsePayload,
  TaskQueryPayload,
  TaskResponsesQueryPayload,
  WorkerResponsesQueryPayload,
  cancelTaskPayloadSchema,
  createTaskPayloadSchema,
  decisionPayloadSchema,
  fundTaskPayloadSchema,
  settleTaskPayloadSchema,
  submitResponsePayloadSchema,
  taskQueryPayloadSchema,
  taskResponsesQueryPayloadSchema,
  workerResponsesQueryPayloadSchema
} from './types.js';
import {
  cancelTaskSignaturePayload,
  decisionSignaturePayload,
  responseSignaturePayload,
  taskFundSignaturePayload,
  taskResponsesQuerySignaturePayload,
  taskSettleSignaturePayload,
  taskSignaturePayload,
  workerResponsesQuerySignaturePayload
} from './signing.js';
import { parseTokenIdentifier } from './token.js';
import { buildSettleDataHash, taskDepositKey } from './escrow.js';

export interface BountyAgentsPluginOptions {
  serviceUrl: string;
  contractAddress: string;
}

export interface PluginTool {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  execute: (input: unknown) => Promise<unknown>;
}

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const taskResponseSchema = z.object({ task: taskRecordSchema });
const submissionResponseSchema = z.object({ response: responseRecordSchema });
const tasksListSchema = z.object({ tasks: z.array(taskRecordSchema) });
const responsesListSchema = z.object({ responses: z.array(responseRecordSchema) });
const settleResponseSchema = z.object({
  task: taskRecordSchema,
  settlementSignature: z.string()
});

abstract class BaseBountyPlugin {
  protected readonly baseUrl: string;
  protected readonly contractAddress: `0x${string}`;
  private readonly tools: PluginTool[] = [];

  constructor(protected readonly signer: Signer, options: BountyAgentsPluginOptions) {
    this.baseUrl = normalizeUrl(options.serviceUrl);
    this.contractAddress = getAddress(options.contractAddress as `0x${string}`);
  }

  getTools(): PluginTool[] {
    return this.tools;
  }

  async executeTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return tool.execute(input);
  }

  protected registerTool<TSchema extends z.ZodTypeAny>(
    name: string,
    description: string,
    schema: TSchema,
    executor: (input: z.infer<TSchema>) => Promise<unknown>
  ) {
    this.tools.push({
      name,
      description,
      inputSchema: schema,
      execute: (rawInput: unknown) => executor(schema.parse(rawInput))
    });
  }

  protected async request(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.text();
    const data = payload ? JSON.parse(payload) : {};
    if (!response.ok) {
      const errorMessage = typeof data.message === 'string' ? data.message : response.statusText;
      throw new Error(`Service error: ${errorMessage}`);
    }
    return data;
  }

  protected signPayload(payload: string): Promise<Hex> {
    return this.signer.signMessage(payload);
  }

  protected signDigest(digest: Hex): Promise<Hex> {
    return this.signer.signDigest(digest);
  }

  protected async fetchTask(taskId: string): Promise<TaskRecord> {
    const response = await this.request(`/tasks/${taskId}`, undefined, 'GET');
    return taskResponseSchema.parse(response).task;
  }

  protected async fetchResponse(responseId: string): Promise<ResponseRecord> {
    const response = await this.request(`/responses/${responseId}`, undefined, 'GET');
    return submissionResponseSchema.parse(response).response;
  }
}

export class BountyAgentsPublisherPlugin extends BaseBountyPlugin {
  constructor(signer: Signer, options: BountyAgentsPluginOptions) {
    super(signer, options);
    this.registerTool(
      'bountyagents.publisher.task.create',
      'Create a draft bounty task on the remote service',
      createTaskPayloadSchema,
      (input) => this.createTask(input)
    );
    this.registerTool(
      'bountyagents.publisher.task.fund',
      'Attach price/token metadata after depositing escrow funds',
      fundTaskPayloadSchema,
      (input) => this.fundTask(input)
    );
    this.registerTool(
      'bountyagents.publisher.task.decision',
      'Approve or reject a response and cache the settlement signature',
      decisionPayloadSchema,
      (input) => this.decideOnResponse(input)
    );
    this.registerTool(
      'bountyagents.publisher.task.cancel',
      'Cancel an active task and retrieve the admin withdraw signature',
      cancelTaskPayloadSchema,
      (input) => this.cancelTask(input)
    );
    this.registerTool(
      'bountyagents.publisher.task.query',
      'Search tasks with keyword, publisher and price filters',
      taskQueryPayloadSchema,
      (input) => this.queryTasks(input)
    );
    this.registerTool(
      'bountyagents.publisher.task.response.query',
      'List responses for a task (owner signature required)',
      taskResponsesQueryPayloadSchema,
      (input) => this.queryTaskResponses(input)
    );
  }

  private async createTask(payload: CreateTaskPayload): Promise<TaskRecord> {
    const body = {
      ...payload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(taskSignaturePayload(payload))
    };
    const response = await this.request('/tasks', body);
    return taskResponseSchema.parse(response).task;
  }

  private async fundTask(payload: FundTaskPayload): Promise<TaskRecord> {
    const body = {
      ...payload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(taskFundSignaturePayload(payload))
    };
    const response = await this.request(`/tasks/${payload.taskId}/fund`, body);
    return taskResponseSchema.parse(response).task;
  }

  private async decideOnResponse(payload: DecisionPayload): Promise<ResponseRecord> {
    const responseRecord = await this.fetchResponse(payload.responseId);
    const task = await this.fetchTask(responseRecord.task_id);
    if (!task.token || task.price === '0') {
      throw new Error('Task is not funded yet');
    }
    if (payload.price !== task.price) {
      throw new Error('Price does not match funded amount');
    }
    const workerAddress = getAddress(payload.workerAddress as `0x${string}`);
    if (workerAddress !== getAddress(responseRecord.worker as `0x${string}`)) {
      throw new Error('Worker address mismatch');
    }

    const settlementSignature =
      payload.status === 'approved'
        ? await this.createSettlementSignature(responseRecord.task_id, workerAddress, payload.price, task.token)
        : undefined;

    const canonicalPayload: DecisionPayload = {
      responseId: payload.responseId,
      workerAddress,
      price: payload.price,
      status: payload.status,
      settlementSignature
    };
    const body = {
      ...canonicalPayload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(decisionSignaturePayload(canonicalPayload))
    };
    const response = await this.request(`/responses/${payload.responseId}/decision`, body);
    return submissionResponseSchema.parse(response).response;
  }

  private async cancelTask(payload: CancelTaskPayload): Promise<TaskRecord> {
    const body = {
      ...payload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(cancelTaskSignaturePayload(payload))
    };
    const response = await this.request(`/tasks/${payload.taskId}/cancel`, body);
    return taskResponseSchema.parse(response).task;
  }

  private async queryTasks(payload: TaskQueryPayload): Promise<TaskRecord[]> {
    const canonicalFilter = (payload.filter ?? {}) as NonNullable<TaskQueryPayload['filter']>;
    const pageSize = payload.pageSize ?? 50;
    const pageNum = payload.pageNum ?? 0;
    const body = {
      filter: canonicalFilter,
      sortBy: payload.sortBy ?? 'created_at',
      pageSize,
      pageNum
    };
    const response = await this.request('/tasks/query', body);
    return tasksListSchema.parse(response).tasks;
  }

  private async queryTaskResponses(payload: TaskResponsesQueryPayload): Promise<ResponseRecord[]> {
    const pageSize = payload.pageSize ?? 50;
    const pageNum = payload.pageNum ?? 0;
    const canonicalPayload = {
      taskId: payload.taskId,
      workerAddress: payload.workerAddress,
      pageSize,
      pageNum
    };
    const body = {
      ...canonicalPayload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(
        taskResponsesQuerySignaturePayload({ ...canonicalPayload, ownerAddress: this.signer.address })
      )
    };
    const response = await this.request('/tasks/responses/query', body);
    return responsesListSchema.parse(response).responses;
  }

  private async createSettlementSignature(
    taskId: string,
    workerAddress: `0x${string}`,
    price: string,
    tokenIdentifier: string
  ): Promise<Hex> {
    const token = parseTokenIdentifier(tokenIdentifier);
    const depositKey = taskDepositKey(taskId);
    const digest = buildSettleDataHash(
      this.contractAddress,
      depositKey,
      this.signer.address,
      token.address,
      workerAddress,
      BigInt(price)
    );
    return this.signDigest(digest);
  }
}

export class BountyAgentsWorkerPlugin extends BaseBountyPlugin {
  constructor(signer: Signer, options: BountyAgentsPluginOptions) {
    super(signer, options);
    this.registerTool(
      'bountyagents.worker.task.respond',
      'Submit a response for an active task',
      submitResponsePayloadSchema,
      (input) => this.submitResponse(input)
    );
    this.registerTool(
      'bountyagents.worker.response.query',
      'List responses submitted by this worker',
      workerResponsesQueryPayloadSchema,
      (input) => this.queryWorkerResponses(input)
    );
    this.registerTool(
      'bountyagents.worker.task.settle',
      'Fetch settlement signature for an approved response',
      settleTaskPayloadSchema,
      (input) => this.settleTask(input)
    );
  }

  private async submitResponse(payload: SubmitResponsePayload): Promise<ResponseRecord> {
    const body = {
      ...payload,
      workerAddress: this.signer.address,
      signature: await this.signPayload(responseSignaturePayload(payload))
    };
    const response = await this.request(`/tasks/${payload.taskId}/responses`, body);
    return submissionResponseSchema.parse(response).response;
  }

  private async queryWorkerResponses(payload: WorkerResponsesQueryPayload): Promise<ResponseRecord[]> {
    const pageSize = payload.pageSize ?? 50;
    const pageNum = payload.pageNum ?? 0;
    const canonicalPayload = {
      taskId: payload.taskId,
      pageSize,
      pageNum
    };
    const body = {
      ...canonicalPayload,
      workerAddress: this.signer.address,
      signature: await this.signPayload(
        workerResponsesQuerySignaturePayload({ ...canonicalPayload, workerAddress: this.signer.address })
      )
    };
    const response = await this.request('/workers/responses/query', body);
    return responsesListSchema.parse(response).responses;
  }

  private async settleTask(payload: SettleTaskPayload): Promise<{ task: TaskRecord; settlementSignature: string }> {
    const canonicalPayload = { ...payload, workerAddress: this.signer.address };
    const body = {
      ...canonicalPayload,
      signature: await this.signPayload(taskSettleSignaturePayload(canonicalPayload))
    };
    const response = await this.request(`/tasks/${payload.taskId}/settle`, body);
    return settleResponseSchema.parse(response);
  }
}
