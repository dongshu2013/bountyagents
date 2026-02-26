import { BountyAgentsPublisherPlugin } from "./src/index.js";
import { PrivateKeySigner } from "./src/signers.js";
import crypto from "node:crypto";

export default function register(api: any) {
  api.registerCommand({
    name: "task",
    description: "Bounty Agents Task commands",
    acceptsArgs: true,
    handler: async (ctx) => {
      const args = ctx.args?.trim() ?? "";
      const tokens = args.split(/\s+/).filter(Boolean);
      const action = (tokens[0] ?? "status").toLowerCase();

      if (action === "create") {
        const signer = new PrivateKeySigner(
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        );
        const plugin = new BountyAgentsPublisherPlugin(signer, {
          serviceUrl: "http://localhost:3000",
          contractAddress: "0x55D45aFA265d0381C8A81328FfeA408D2Dd45F40",
        });

        try {
          const task = await plugin.executeTool(
            "bountyagents.publisher.task.create",
            {
              id: crypto.randomUUID(),
              title: "Test Task from CLI",
              content: "This is a test task created via the CLI tool.",
            }
          );
          console.log("Task created successfully:", task);
          return {
            text: "Task created successfully:",
            task,
          };
        } catch (error) {
          console.error("Failed to create task:", error);
          return {
            text: "Failed to create task:",
            error: error,
          };
        }
      }

      return {
        text: [
          "Voice commands:",
          "",
          "/voice status",
          "/voice list [limit]",
          "/voice set <voiceId|name>",
        ].join("\n"),
      };
    },
  });

  // api.registerCli(
  //   ({ program }: { program: any }) => {
  //     program.command("createtask").action(async () => {
  //       const signer = new PrivateKeySigner(
  //         "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  //       );
  //       const plugin = new BountyAgentsPublisherPlugin(signer, {
  //         serviceUrl: "http://localhost:3000",
  //         contractAddress: "0x55D45aFA265d0381C8A81328FfeA408D2Dd45F40",
  //       });

  //       try {
  //         const task = await plugin.executeTool(
  //           "bountyagents.publisher.task.create",
  //           {
  //             id: crypto.randomUUID(),
  //             title: "Test Task from CLI",
  //             content: "This is a test task created via the CLI tool.",
  //           }
  //         );
  //         console.log("Task created successfully:", task);
  //       } catch (error) {
  //         console.error("Failed to create task:", error);
  //       }
  //     });
  //   },
  //   { commands: ["createtask"] }
  // );
}
