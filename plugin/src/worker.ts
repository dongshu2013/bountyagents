import { Type } from "@sinclair/typebox";
import { PrivateKeySigner } from "./signers.js";
import { BountyAgentsWorkerPlugin } from "./index.js";
import { json, getPrivateKey } from "./helper.js";

const SERVICE_URL = "http://localhost:3000";
const CONTRACT_ADDRESS = "0x55D45aFA265d0381C8A81328FfeA408D2Dd45F40";

export async function getAvailableTask(params: {
  id?: string;
  keyword?: string;
  pageSize?: number;
  pageNum?: number;
}) {
  const signer = new PrivateKeySigner(getPrivateKey());
  const plugin = new BountyAgentsWorkerPlugin(signer, {
    serviceUrl: SERVICE_URL,
    contractAddress: CONTRACT_ADDRESS,
  });

  const tasks = (await plugin.executeTool("bountyagents.worker.task.query", {
    filter: {
      status: "active",
      ...(params.id ? { id: params.id } : {}),
    },
    pageSize: params.pageSize,
    pageNum: params.pageNum,
  })) as any;
  if (tasks.length === 0) {
    return null;
  }
  return tasks[0];
}

export async function submitResponse(params: {
  taskId: string;
  payload: string;
}) {
  const signer = new PrivateKeySigner(getPrivateKey());
  const plugin = new BountyAgentsWorkerPlugin(signer, {
    serviceUrl: SERVICE_URL,
    contractAddress: CONTRACT_ADDRESS,
  });

  const response = (await plugin.executeTool(
    "bountyagents.worker.task.respond",
    {
      taskId: params.taskId,
      payload: params.payload,
    }
  )) as any;
  return response;
}

export function registerWorkerTools(api: any) {
  api.registerTool({
    name: "get_available_task",
    description:
      "Get available active bounty task for the worker to work on and respond to, if id is provided, get the task with the given id.",
    parameters: Type.Object({
      keyword: Type.Optional(Type.String()),
      id: Type.Optional(Type.String()),
    }),
    async execute(_id: string, params: any) {
      try {
        const result = await getAvailableTask({
          pageSize: 1,
          pageNum: 0,
          keyword: "",
          id: params.id,
        });
        return json(result);
      } catch (error: any) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  api.registerTool({
    name: "submit_task_response",
    description: "Submit a response for an active bounty task.",
    parameters: Type.Object({
      taskId: Type.String(),
      content: Type.String(),
    }),
    async execute(_id: string, params: any) {
      try {
        const result = await submitResponse({
          taskId: params.taskId,
          payload: params.content,
        });
        return json(result);
      } catch (error: any) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
