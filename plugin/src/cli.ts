import * as fs from "fs";
import { exec } from "child_process";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getDashboardUrl, getWalletAddress, KEY_PATH } from "./helper.js";
import * as readline from "readline";

const cli = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  dot: (color: "red" | "green") =>
    color === "red" ? cli.red("●") : cli.green("●"),
};

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

function openUrlInBrowser(url: string) {
  const escaped = url.replace(/"/g, '\\"');
  const command =
    process.platform === "darwin"
      ? `open "${escaped}"`
      : process.platform === "win32"
        ? `start "" "${escaped}"`
        : `xdg-open "${escaped}"`;
  exec(command, (err) => {
    if (err) console.error(cli.dim("   Could not open browser: " + (err as Error).message));
  });
}

async function openDashboard() {
  try {
    const result = await getDashboardUrl();
    console.log(` ${cli.dot("green")} ${cli.green("Dashboard URL ready")}`);
    console.log(cli.dim("   ") + result.url);
    console.log(cli.dim("   Opening in browser..."));
    openUrlInBrowser(result.url);
  } catch (error: any) {
    console.log(` ${cli.dot("red")} ${cli.red("Failed to get dashboard URL")}`);
    console.log(cli.dim("   " + (error?.message ?? String(error))));
  }
}

export function registerCli(api: any) {
  api.registerCli(
    ({ program }: any) => {
      program
        .command("upclaw")
        .description("UpClaw Bounty Agents CLI")
        .argument(
          "[action]",
          "action: status, init, reset, dashboard, etc.",
          "status"
        )
        .option("-v, --verbose", "verbose output")
        .action(
          async (
            action: string,
            options: { verbose?: boolean; dir?: string }
          ) => {
            if (options.verbose) console.log("Verbose mode");
            if (action === "status") {
              const address = getWalletAddress();
              if (!address) {
                console.log(
                  ` ${cli.dot("red")} ${cli.red("Wallet not initialized")}`
                );
                console.log(
                  cli.dim("   Run openclaw upclaw init to initialize")
                );
                return;
              }
              console.log(
                ` ${cli.dot("green")} ${cli.green("Wallet initialized")}`
              );
              console.log(cli.dim("   Address: ") + address);
              return;
            }

            if (action === "init") {
              try {
                if (fs.existsSync(KEY_PATH)) {
                  console.log(
                    ` ${cli.dot("red")} ${cli.red("Key already exists")}`
                  );
                  console.log(cli.dim(`   ${KEY_PATH}`));
                  console.log(
                    cli.dim(
                      "   Run openclaw upclaw reset first to use a different key."
                    )
                  );
                  return;
                }
                console.log("");
                console.log(cli.dim("  1) Generate a new random private key"));
                console.log(
                  cli.dim("  2) Enter an existing private key to store")
                );
                console.log("");
                const choice = await question("Choose 1 or 2: ");
                if (choice === "1") {
                  const pk = generatePrivateKey();
                  fs.writeFileSync(KEY_PATH, pk, "utf-8");
                  const address = privateKeyToAccount(pk).address;
                  console.log(
                    ` ${cli.dot("green")} ${cli.green(
                      "New key generated and saved"
                    )}`
                  );
                  console.log(cli.dim(`   Path: ${KEY_PATH}`));
                  console.log(cli.dim(`   Address: ${address}`));
                  return;
                }
                if (choice === "2") {
                  const raw = await question(
                    "Enter private key (hex, with or without 0x): "
                  );
                  const key = raw.startsWith("0x")
                    ? (raw as `0x${string}`)
                    : (`0x${raw}` as `0x${string}`);
                  privateKeyToAccount(key); // validate
                  fs.writeFileSync(KEY_PATH, key, "utf-8");
                  const address = privateKeyToAccount(key).address;
                  console.log(
                    ` ${cli.dot("green")} ${cli.green("Private key stored")}`
                  );
                  console.log(cli.dim(`   Path: ${KEY_PATH}`));
                  console.log(cli.dim(`   Address: ${address}`));
                  return;
                }
                console.log(
                  ` ${cli.dot("red")} ${cli.red(
                    "Invalid choice. Enter 1 or 2."
                  )}`
                );
              } catch (error: any) {
                console.log(
                  ` ${cli.dot("red")} ${cli.red(
                    "Failed to initialize key: " + error.message
                  )}`
                );
                return;
              }
            }

            if (action === "reset") {
              try {
                if (fs.existsSync(KEY_PATH)) {
                  fs.unlinkSync(KEY_PATH);
                  console.log(
                    ` ${cli.dot("green")} ${cli.green("Key removed")}`
                  );
                  console.log(cli.dim(`   Deleted ${KEY_PATH}`));
                  return;
                }
                console.log(
                  ` ${cli.dot("red")} ${cli.red("No key file found")}`
                );
                console.log(cli.dim(`   ${KEY_PATH}`));
              } catch (error: any) {
                console.log(
                  ` ${cli.dot("red")} ${cli.red(
                    "Failed to reset key: " + error.message
                  )}`
                );
                return;
              }
            }

            if (action === "dashboard") {
              await openDashboard();
              return;
            }
          }
        );
    },
    { commands: ["upclaw"] }
  );
}
