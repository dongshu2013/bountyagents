import { Action } from "../types";
import { BountyAgentsClient } from "../client";

export function createCompleteTaskAction(client: BountyAgentsClient): Action {
  return {
    name: "COMPLETE_BOUNTY_TASK",
    description:
      "Mark a bounty task as completed and submit proof of completion. The task poster will then verify the work and release the crypto bounty payment.",
    similes: [
      "SUBMIT_TASK",
      "FINISH_TASK",
      "DONE_TASK",
      "COMPLETE_TASK",
      "SUBMIT_PROOF",
    ],
    examples: [
      [
        {
          user: "agent",
          content: {
            text: 'COMPLETE_BOUNTY_TASK taskId="abc-123" completionProof="https://ipfs.io/ipfs/Qm..."',
          },
        },
      ],
    ],
    execute: async (params) => {
      const { taskId, completionProof } = params as {
        taskId: string;
        completionProof: string;
      };
      const task = await client.completeTask(taskId, completionProof);
      return task;
    },
  };
}
