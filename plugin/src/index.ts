import { fetch } from 'undici';
import { z } from 'zod';
import {
  TaskRecord,
  ResponseRecord,
  taskRecordSchema,
  responseRecordSchema
} from '@bountyagents/task-db';
import { Signer } from './signers.js';
import {
  CreateTaskPayload,
  DecisionPayload,
  SubmitResponsePayload,
  createTaskPayloadSchema,
  decisionPayloadSchema,
  submitResponsePayloadSchema
} from './types.js';
import {
  decisionSignaturePayload,
  responseSignaturePayload,
  taskSignaturePayload
} from './signing.js';
export { Signer, PrivateKeySigner } from './signers.js';
export type { CreateTaskPayload, SubmitResponsePayload, DecisionPayload } from './types.js';

const taskResponseSchema = z.object({ task: taskRecordSchema });
const submissionResponseSchema = z.object({ response: responseRecordSchema });

export interface BountyAgentsPluginOptions {
  serviceUrl: string;
}

export interface PluginTool<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<unknown>;
}

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

export class BountyAgentsPlugin {
  private readonly baseUrl: string;
  private readonly tools: PluginTool[];

  constructor(private readonly signer: Signer, private readonly options: BountyAgentsPluginOptions) {
    this.baseUrl = normalizeUrl(options.serviceUrl);
    this.tools = [
      this.createTool(
        'bountyagents.task.create',
        'Create a bounty task on the task service',
        createTaskPayloadSchema,
        (input) => this.createTask(input)
      ),
      this.createTool(
        'bountyagents.task.respond',
        'Submit a response for a task',
        submitResponsePayloadSchema,
        (input) => this.submitResponse(input)
      ),
      this.createTool(
        'bountyagents.task.decision',
        'Approve or reject a task response as the owner',
        decisionPayloadSchema,
        (input) => this.decideOnResponse(input)
      )
    ];
  }

  getTools(): PluginTool[] {
    return this.tools;
  }

  async executeTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    const parsed = tool.inputSchema.parse(input);
    return tool.execute(parsed);
  }

  async createTask(input: CreateTaskPayload): Promise<TaskRecord> {
    const payload = createTaskPayloadSchema.parse(input);
    const taskPayload = {
      ...payload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(taskSignaturePayload(payload))
    };
    const response = await this.request('/tasks', taskPayload);
    return taskResponseSchema.parse(response).task;
  }

  async submitResponse(input: SubmitResponsePayload): Promise<ResponseRecord> {
    const payload = submitResponsePayloadSchema.parse(input);
    const body = {
      ...payload,
      workerAddress: this.signer.address,
      signature: await this.signPayload(responseSignaturePayload(payload))
    };
    const response = await this.request(`/tasks/${payload.taskId}/responses`, body);
    return submissionResponseSchema.parse(response).response;
  }

  async decideOnResponse(input: DecisionPayload): Promise<ResponseRecord> {
    const payload = decisionPayloadSchema.parse(input);
    const body = {
      ...payload,
      ownerAddress: this.signer.address,
      signature: await this.signPayload(decisionSignaturePayload(payload))
    };
    const response = await this.request(`/responses/${payload.responseId}/decision`, body);
    return submissionResponseSchema.parse(response).response;
  }

  private async request(path: string, body?: unknown, method = 'POST'): Promise<unknown> {
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

  private signPayload(payload: string): Promise<string> {
    return this.signer.signMessage(payload);
  }

  private createTool<TInput>(
    name: string,
    description: string,
    schema: z.ZodType<TInput>,
    executor: (input: TInput) => Promise<unknown>
  ): PluginTool<TInput> {
    return {
      name,
      description,
      inputSchema: schema,
      execute: executor
    };
  }
}
