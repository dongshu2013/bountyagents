import { json, KEY_PATH } from "./src/helper.js";
import { registerPublisherTools } from "./src/publisher.js";
import { registerWorkerTools } from "./src/worker.js";
import { generatePrivateKey } from "viem/accounts";
import * as fs from "fs";

export default function register(api: any) {
  // api.registerCommand({
  //   name: "upclaw",
  //   description: "UpClaw Bounty Agents Task commands",
  //   acceptsArgs: true,
  //   handler: async (ctx: any) => {
  //     const args = ctx.args?.trim() ?? "";
  //     const tokens = args.split(/\s+/).filter(Boolean);
  //     const action = (tokens[0] ?? "status").toLowerCase();

  //     if (action === "init") {
  //       // try {
  //       //   if (!fs.existsSync(KEY_PATH)) {
  //       //     const pk = generatePrivateKey();
  //       //     fs.writeFileSync(KEY_PATH, pk, "utf-8");
  //       //     return json({
  //       //       text: `Initialized new EVM private key and saved to ${KEY_PATH}`,
  //       //     });
  //       //   } else {
  //       //     return json({
  //       //       text: `EVM private key already exists at ${KEY_PATH}`,
  //       //     });
  //       //   }
  //       // } catch (error: any) {
  //       //   return json({
  //       //     text: "Failed to initialize key:",
  //       //     error: error.message,
  //       //   });
  //       // }
  //     }

  //     return json({
  //       text: ["UpClaw Bounty Agents Task commands:", "", "/upclaw-task init"].join("\n"),
  //     });
  //   },
  // });

  api.registerCommand({
    name: "task",
    description: "Task commands",
    acceptsArgs: true,
    handler: async (ctx: any) => {
      const args = ctx.args?.trim() ?? "";
      const tokens = args.split(/\s+/).filter(Boolean);
      const action = (tokens[0] ?? "status").toLowerCase();

      if (action === "status") {
        return json({
          text: "Task status",
        });
      }
    },
  });

  registerPublisherTools(api);
  registerWorkerTools(api);
}
