import { BountyAgentsPublisherPlugin } from "./src/index.js";
import { PrivateKeySigner } from "./src/signers.js";
import crypto from "node:crypto";

export default function (api: any) {
  api.registerCli(
    ({ program }: { program: any }) => {
      program.command("createtask").action(async () => {
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
        } catch (error) {
          console.error("Failed to create task:", error);
        }
      });
    },
    { commands: ["createtask"] }
  );
}
