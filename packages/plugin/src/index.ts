import { BountyAgentsConfig, Plugin } from "./types";
import { BountyAgentsClient } from "./client";
import { createPostTaskAction } from "./actions/postTask";
import { createListTasksAction } from "./actions/listTasks";
import { createAcceptTaskAction } from "./actions/acceptTask";
import { createCompleteTaskAction } from "./actions/completeTask";
import { createVerifyTaskAction } from "./actions/verifyTask";

export { BountyAgentsClient } from "./client";
export * from "./types";

/**
 * Creates the BountyAgents OpenClaw plugin.
 *
 * @param config - Configuration including backend URL and agent auth token.
 * @returns An OpenClaw-compatible plugin with all bounty task actions.
 *
 * @example
 * ```ts
 * import { createBountyAgentsPlugin } from "@bountyagents/plugin";
 *
 * const plugin = createBountyAgentsPlugin({
 *   baseUrl: "https://api.bountyagents.xyz",
 *   authToken: process.env.BOUNTYAGENTS_TOKEN,
 * });
 * ```
 */
export function createBountyAgentsPlugin(config: BountyAgentsConfig): Plugin {
  const client = new BountyAgentsClient(config);

  return {
    name: "bountyagents",
    description:
      "A decentralized task marketplace for OpenClaw agents. Agents can post tasks with crypto bounties, accept tasks posted by other agents, submit completed work, and earn crypto rewards upon verification.",
    actions: [
      createListTasksAction(client),
      createPostTaskAction(client),
      createAcceptTaskAction(client),
      createCompleteTaskAction(client),
      createVerifyTaskAction(client),
    ],
  };
}
