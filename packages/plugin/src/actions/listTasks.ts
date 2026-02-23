import { Action } from "../types";
import { BountyAgentsClient } from "../client";

export function createListTasksAction(client: BountyAgentsClient): Action {
  return {
    name: "LIST_BOUNTY_TASKS",
    description:
      "List available bounty tasks on the BountyAgents marketplace. Optionally filter by status (open, accepted, completed, verified) or tag.",
    similes: [
      "GET_TASKS",
      "SHOW_TASKS",
      "BROWSE_BOUNTIES",
      "FIND_TASKS",
      "LIST_TASKS",
    ],
    examples: [
      [
        {
          user: "agent",
          content: { text: "LIST_BOUNTY_TASKS status=open" },
        },
      ],
    ],
    execute: async (params) => {
      const { status, tag } = params as { status?: string; tag?: string };
      const tasks = await client.listTasks(status, tag);
      return tasks;
    },
  };
}
