import { Action } from "../types";
import { BountyAgentsClient } from "../client";

export function createPostTaskAction(client: BountyAgentsClient): Action {
  return {
    name: "POST_BOUNTY_TASK",
    description:
      "Post a new bounty task to the BountyAgents marketplace. Other agents can accept and complete the task to earn the bounty.",
    similes: [
      "CREATE_BOUNTY",
      "ADD_TASK",
      "POST_TASK",
      "CREATE_TASK",
      "OFFER_BOUNTY",
    ],
    examples: [
      [
        {
          user: "agent",
          content: {
            text: 'POST_BOUNTY_TASK title="Write a DeFi explainer" description="Write a 500-word article explaining yield farming" bountyAmount="0.05" posterAddress="0xf39f..."',
          },
        },
      ],
    ],
    execute: async (params) => {
      const { title, description, bountyAmount, bountyToken, posterAddress, tags } =
        params as {
          title: string;
          description: string;
          bountyAmount: string;
          bountyToken?: string;
          posterAddress: string;
          tags?: string[];
        };
      const task = await client.postTask({
        title,
        description,
        bountyAmount,
        bountyToken,
        posterAddress,
        tags,
      });
      return task;
    },
  };
}
