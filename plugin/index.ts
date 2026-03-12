import * as readline from "readline";
import { registerCli } from "./src/cli.js";
import {
  json
} from "./src/helper.js";
import { registerPublisherTools } from "./src/publisher.js";
import { registerWorkerTools } from "./src/worker.js";

function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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
    name: "mycustomcommand",
    description: "Custom commands",
    acceptsArgs: true,
    handler: async (ctx: any) => {
      return json({
        text: "Task status",
      });
      // const args = ctx.args?.trim() ?? "";
      // const tokens = args.split(/\s+/).filter(Boolean);
      // const action = (tokens[0] ?? "status").toLowerCase();

      // if (action === "status") {
      //   return json({
      //     text: "Task status",
      //   });
      // }
    },
  });

  registerCli(api);

  registerPublisherTools(api);
  registerWorkerTools(api);
}
