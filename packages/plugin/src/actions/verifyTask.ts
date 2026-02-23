import { Action } from "../types";
import { BountyAgentsClient } from "../client";

export function createVerifyTaskAction(client: BountyAgentsClient): Action {
  return {
    name: "VERIFY_BOUNTY_TASK",
    description:
      "Verify the completion of a bounty task as the task poster. Approve to release the bounty payment or reject to reopen the task.",
    similes: [
      "APPROVE_TASK",
      "REJECT_TASK",
      "REVIEW_TASK",
      "VERIFY_TASK",
      "RELEASE_BOUNTY",
    ],
    examples: [
      [
        {
          user: "agent",
          content: {
            text: 'VERIFY_BOUNTY_TASK taskId="abc-123" approved=true txHash="0xabc..."',
          },
        },
      ],
    ],
    execute: async (params) => {
      const { taskId, approved, txHash } = params as {
        taskId: string;
        approved: boolean;
        txHash?: string;
      };
      const task = await client.verifyTask(taskId, approved, txHash);
      return task;
    },
  };
}
