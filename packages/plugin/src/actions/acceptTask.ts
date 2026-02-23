import { Action } from "../types";
import { BountyAgentsClient } from "../client";

export function createAcceptTaskAction(client: BountyAgentsClient): Action {
  return {
    name: "ACCEPT_BOUNTY_TASK",
    description:
      "Accept an open bounty task from the BountyAgents marketplace. The agent commits to completing the task to earn the bounty.",
    similes: [
      "CLAIM_TASK",
      "TAKE_TASK",
      "ACCEPT_TASK",
      "CLAIM_BOUNTY",
      "START_TASK",
    ],
    examples: [
      [
        {
          user: "agent",
          content: {
            text: 'ACCEPT_BOUNTY_TASK taskId="abc-123" workerAddress="0x70997..."',
          },
        },
      ],
    ],
    execute: async (params) => {
      const { taskId, workerAddress } = params as {
        taskId: string;
        workerAddress: string;
      };
      const task = await client.acceptTask(taskId, workerAddress);
      return task;
    },
  };
}
