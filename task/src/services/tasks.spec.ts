import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskDb, TaskRecord, ResponseRecord } from '@bountyagents/task-db';
import type { AppContext } from '../context.js';
import type { ServiceConfig } from '../config.js';
import {
  ServiceError,
  createTask,
  fundTask,
  submitTaskResponse,
  decideOnResponse,
  cancelTask,
  queryTasksList,
  queryTaskResponses,
  queryWorkerResponses
} from './tasks.js';

const verifyDetachedSignatureMock = vi.fn<[], Promise<boolean>>();
const fetchDepositInfoMock = vi.fn();
const signWithdrawAuthorizationMock = vi.fn();

vi.mock('../crypto.js', () => ({
  normalizeAddress: (value: string) => value.toLowerCase() as `0x${string}`,
  verifyDetachedSignature: (...args: unknown[]) => verifyDetachedSignatureMock(...args)
}));

vi.mock('../onchain.js', () => ({
  fetchDepositInfo: (...args: unknown[]) => fetchDepositInfoMock(...args),
  taskDepositKey: (taskId: string) => `key-${taskId}`
}));

vi.mock('../withdraw.js', () => ({
  signWithdrawAuthorization: (...args: unknown[]) => signWithdrawAuthorizationMock(...args)
}));

const baseConfig: ServiceConfig = {
  port: 3000,
  host: '0.0.0.0',
  databaseUrl: 'postgres://localhost/test',
  contractAddress: '0x2222222222222222222222222222222222222222',
  signingAlgorithm: 'ethereum',
  chainId: 97,
  rpcUrl: 'https://example-rpc.test',
  adminPrivateKey: '0x5555',
  depositNetwork: 'bsc-testnet'
};

const sampleTask: TaskRecord = {
  id: '11111111-2222-3333-4444-555555555555',
  title: 'Test task',
  content: 'Solve a problem',
  owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  created_at: Date.now(),
  status: 'draft',
  price: '0',
  token: null,
  withdraw_signature: null
};

const sampleResponse: ResponseRecord = {
  id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  task_id: sampleTask.id,
  payload: 'encrypted',
  worker: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  status: 'pending',
  created_at: Date.now(),
  settlement: null,
  settlement_signature: null
};

const makeContext = () => {
  const db = {
    createTask: vi.fn(),
    markTaskFunded: vi.fn(),
    getTaskById: vi.fn(),
    createResponse: vi.fn(),
    getResponseById: vi.fn(),
    updateResponseStatus: vi.fn(),
    updateTaskStatus: vi.fn(),
    storeWithdrawSignature: vi.fn(),
    queryTasks: vi.fn(),
    listResponsesForTaskPaginated: vi.fn(),
    listResponsesByWorker: vi.fn()
  };
  const ctx: AppContext = {
    config: baseConfig,
    db: db as unknown as TaskDb
  };
  return { ctx, db };
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyDetachedSignatureMock.mockResolvedValue(true);
  fetchDepositInfoMock.mockReset();
  signWithdrawAuthorizationMock.mockReset();
});

describe('createTask', () => {
  it('creates a task when signature is valid', async () => {
    const { ctx, db } = makeContext();
    db.createTask.mockResolvedValue({ ...sampleTask });
    const payload = {
      id: sampleTask.id,
      title: sampleTask.title,
      content: sampleTask.content,
      ownerAddress: sampleTask.owner,
      signature: '0xsig'
    };

    const result = await createTask(ctx, payload);

    expect(result).toEqual(sampleTask);
    expect(db.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: sampleTask.owner
      })
    );
  });

  it('throws when signature verification fails', async () => {
    const { ctx } = makeContext();
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);
    const payload = {
      id: sampleTask.id,
      title: sampleTask.title,
      content: sampleTask.content,
      ownerAddress: sampleTask.owner,
      signature: '0xsig'
    };

    await expect(createTask(ctx, payload)).rejects.toBeInstanceOf(ServiceError);
  });
});

describe('fundTask', () => {
  it('marks task as funded when on-chain data matches', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue({ ...sampleTask });
    db.markTaskFunded.mockResolvedValue({ ...sampleTask, status: 'active', token: 'bsc-testnet:0x9999999999999999999999999999999999999999', price: '100' });
    fetchDepositInfoMock.mockResolvedValue({
      owner: sampleTask.owner,
      token: '0x9999999999999999999999999999999999999999',
      amountLocked: BigInt(100),
      released: false
    });

    const payload = {
      taskId: sampleTask.id,
      ownerAddress: sampleTask.owner,
      price: '100',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999',
      signature: '0xfund'
    };

    const result = await fundTask(ctx, payload);

    expect(result.status).toBe('active');
    expect(db.markTaskFunded).toHaveBeenCalledWith(sampleTask.id, '100', payload.token);
  });

  it('throws when owner does not match task owner', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue({ ...sampleTask });

    const mismatchedPayload = {
      taskId: sampleTask.id,
      ownerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      price: '100',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999',
      signature: '0xfund'
    };

    await expect(fundTask(ctx, mismatchedPayload)).rejects.toBeInstanceOf(ServiceError);
    expect(fetchDepositInfoMock).not.toHaveBeenCalled();
    expect(db.markTaskFunded).not.toHaveBeenCalled();
  });

  it('throws when on-chain amount mismatches payload', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue({ ...sampleTask });
    fetchDepositInfoMock.mockResolvedValue({
      owner: sampleTask.owner,
      token: '0x9999999999999999999999999999999999999999',
      amountLocked: BigInt(50),
      released: false
    });

    const payload = {
      taskId: sampleTask.id,
      ownerAddress: sampleTask.owner,
      price: '100',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999',
      signature: '0xfund'
    };

    await expect(fundTask(ctx, payload)).rejects.toBeInstanceOf(ServiceError);
    expect(db.markTaskFunded).not.toHaveBeenCalled();
  });

  it('throws when signature validation fails', async () => {
    const { ctx, db } = makeContext();
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);

    await expect(
      fundTask(ctx, {
        taskId: sampleTask.id,
        ownerAddress: sampleTask.owner,
        price: '100',
        token: 'bsc-testnet:0x9999999999999999999999999999999999999999',
        signature: '0xfund'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(db.getTaskById).not.toHaveBeenCalled();
    expect(fetchDepositInfoMock).not.toHaveBeenCalled();
  });
});

describe('submitTaskResponse', () => {
  it('creates a response for active tasks', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue({ ...sampleTask, status: 'active', price: '10', token: 'bsc-testnet:0x9999999999999999999999999999999999999999' });
    db.createResponse.mockResolvedValue({ ...sampleResponse });

    const payload = {
      taskId: sampleTask.id,
      payload: 'ciphertext',
      workerAddress: sampleResponse.worker,
      signature: '0xresp'
    };

    const result = await submitTaskResponse(ctx, payload);

    expect(result).toEqual(sampleResponse);
    expect(db.createResponse).toHaveBeenCalled();
  });

  it('rejects when task is not active', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue({ ...sampleTask, status: 'draft' });

    await expect(
      submitTaskResponse(ctx, {
        taskId: sampleTask.id,
        payload: 'cipher',
        workerAddress: sampleResponse.worker,
        signature: '0xresp'
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('throws when worker signature is invalid', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue({ ...sampleTask, status: 'active', price: '10', token: 'bsc-testnet:0x9999999999999999999999999999999999999999' });
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);

    await expect(
      submitTaskResponse(ctx, {
        taskId: sampleTask.id,
        payload: 'cipher',
        workerAddress: sampleResponse.worker,
        signature: '0xresp'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(db.createResponse).not.toHaveBeenCalled();
  });
});

describe('decideOnResponse', () => {
  it('approves a response and stores settlement data', async () => {
    const { ctx, db } = makeContext();
    db.getResponseById.mockResolvedValue({ ...sampleResponse });
    db.getTaskById.mockResolvedValue({
      ...sampleTask,
      status: 'active',
      price: '50',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999'
    });
    const updatedResponse = { ...sampleResponse, status: 'approved', settlement: null, settlement_signature: '0xsettle' };
    db.updateResponseStatus.mockResolvedValue(updatedResponse);
    db.updateTaskStatus.mockResolvedValue({ ...sampleTask, status: 'finished' });

    const payload = {
      responseId: sampleResponse.id,
      workerAddress: sampleResponse.worker,
      ownerAddress: sampleTask.owner,
      price: '50',
      status: 'approved' as const,
      settlementSignature: '0xsettle',
      signature: '0xdecision'
    };

    const result = await decideOnResponse(ctx, payload);

    expect(result).toEqual(updatedResponse);
    expect(db.updateTaskStatus).toHaveBeenCalledWith(sampleTask.id, 'finished');
  });

  it('rejects approvals without settlement signature', async () => {
    const { ctx, db } = makeContext();
    db.getResponseById.mockResolvedValue({ ...sampleResponse });
    db.getTaskById.mockResolvedValue({ ...sampleTask, status: 'active', price: '10', token: 'bsc-testnet:0x9999999999999999999999999999999999999999' });

    await expect(
      decideOnResponse(ctx, {
        responseId: sampleResponse.id,
        workerAddress: sampleResponse.worker,
        ownerAddress: sampleTask.owner,
        price: '10',
        status: 'approved',
        signature: '0xdecision'
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('marks response rejected without finishing task', async () => {
    const { ctx, db } = makeContext();
    db.getResponseById.mockResolvedValue({ ...sampleResponse });
    db.getTaskById.mockResolvedValue({
      ...sampleTask,
      status: 'active',
      price: '50',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999'
    });

    const rejectedResponse = { ...sampleResponse, status: 'rejected', settlement: null };
    db.updateResponseStatus.mockResolvedValue(rejectedResponse);

    const payload = {
      responseId: sampleResponse.id,
      workerAddress: sampleResponse.worker,
      ownerAddress: sampleTask.owner,
      price: '50',
      status: 'rejected' as const,
      signature: '0xdecision'
    };

    const result = await decideOnResponse(ctx, payload);

    expect(result.status).toBe('rejected');
    expect(db.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('throws when decision signature is invalid', async () => {
    const { ctx, db } = makeContext();
    db.getResponseById.mockResolvedValue({ ...sampleResponse });
    db.getTaskById.mockResolvedValue({
      ...sampleTask,
      status: 'active',
      price: '50',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999'
    });
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);

    await expect(
      decideOnResponse(ctx, {
        responseId: sampleResponse.id,
        workerAddress: sampleResponse.worker,
        ownerAddress: sampleTask.owner,
        price: '50',
        status: 'approved',
        settlementSignature: '0xsettle',
        signature: '0xdecision'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(db.updateResponseStatus).not.toHaveBeenCalled();
  });
});

describe('cancelTask', () => {
  it('stores withdraw signature when canceling', async () => {
    const { ctx, db } = makeContext();
    const fundedTask = {
      ...sampleTask,
      status: 'active',
      price: '100',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999'
    };
    db.getTaskById.mockResolvedValue(fundedTask);
    db.updateTaskStatus.mockResolvedValue({ ...fundedTask, status: 'closed' });
    db.storeWithdrawSignature.mockResolvedValue({ ...fundedTask, status: 'closed', withdraw_signature: '0xwithdraw' });
    signWithdrawAuthorizationMock.mockResolvedValue('0xwithdraw');

    const result = await cancelTask(ctx, {
      taskId: fundedTask.id,
      ownerAddress: fundedTask.owner,
      signature: '0xcancel'
    });

    expect(signWithdrawAuthorizationMock).toHaveBeenCalled();
    expect(result.status).toBe('closed');
    expect(result.withdraw_signature).toBe('0xwithdraw');
  });

  it('throws when task already settled', async () => {
    const { ctx, db } = makeContext();
    const finishedTask = {
      ...sampleTask,
      status: 'finished',
      price: '100',
      token: 'bsc-testnet:0x9999999999999999999999999999999999999999'
    };
    db.getTaskById.mockResolvedValue(finishedTask);

    await expect(
      cancelTask(ctx, {
        taskId: finishedTask.id,
        ownerAddress: finishedTask.owner,
        signature: '0xcancel'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(signWithdrawAuthorizationMock).not.toHaveBeenCalled();
  });

  it('throws when cancel signature is invalid', async () => {
    const { ctx, db } = makeContext();
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);

    await expect(
      cancelTask(ctx, {
        taskId: sampleTask.id,
        ownerAddress: sampleTask.owner,
        signature: '0xcancel'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(db.getTaskById).not.toHaveBeenCalled();
  });
});

describe('query helpers', () => {
  it('returns tasks from db query', async () => {
    const { ctx, db } = makeContext();
    db.queryTasks.mockResolvedValue([sampleTask]);

    const result = await queryTasksList(ctx, { filter: {}, sortBy: 'created_at', pageNum: 0, pageSize: 10 });

    expect(result).toEqual([sampleTask]);
  });

  it('forwards filters and pagination to the db query', async () => {
    const { ctx, db } = makeContext();
    db.queryTasks.mockResolvedValue([sampleTask]);

    const filterPayload = {
      filter: {
        publisher: '0xabc',
        status: 'active',
        created_at: [2000, 1000] as [number, number],
        keyword: '  bounty ',
        minPrice: 50
      },
      sortBy: 'price' as const,
      pageSize: 25,
      pageNum: 2
    };

    const result = await queryTasksList(ctx, filterPayload);

    expect(db.queryTasks).toHaveBeenCalledWith({
      publisher: '0xabc',
      createdBefore: 2000,
      createdAfter: 1000,
      status: 'active',
      keyword: 'bounty',
      minPrice: 50,
      sortBy: 'price',
      pageSize: 25,
      pageNum: 2
    });
    expect(result).toEqual([sampleTask]);
  });

  it('lists responses for an owner', async () => {
    const { ctx, db } = makeContext();
    db.getTaskById.mockResolvedValue(sampleTask);
    db.listResponsesForTaskPaginated.mockResolvedValue([sampleResponse]);

    const result = await queryTaskResponses(ctx, {
      taskId: sampleTask.id,
      ownerAddress: sampleTask.owner,
      signature: '0xowner',
      pageNum: 0,
      pageSize: 10
    });

    expect(result).toEqual([sampleResponse]);
  });

  it('throws when owner signature is invalid for responses query', async () => {
    const { ctx, db } = makeContext();
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);

    await expect(
      queryTaskResponses(ctx, {
        taskId: sampleTask.id,
        ownerAddress: sampleTask.owner,
        signature: '0xowner',
        pageNum: 0,
        pageSize: 10
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(db.listResponsesForTaskPaginated).not.toHaveBeenCalled();
  });

  it('lists worker responses', async () => {
    const { ctx, db } = makeContext();
    db.listResponsesByWorker.mockResolvedValue([sampleResponse]);

    const result = await queryWorkerResponses(ctx, {
      workerAddress: sampleResponse.worker,
      signature: '0xworker',
      pageNum: 0,
      pageSize: 10
    });

    expect(result).toEqual([sampleResponse]);
  });

  it('throws when worker signature is invalid', async () => {
    const { ctx, db } = makeContext();
    verifyDetachedSignatureMock.mockResolvedValueOnce(false);

    await expect(
      queryWorkerResponses(ctx, {
        workerAddress: sampleResponse.worker,
        signature: '0xworker',
        pageNum: 0,
        pageSize: 10
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(db.listResponsesByWorker).not.toHaveBeenCalled();
  });
});
