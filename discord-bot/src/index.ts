import { HllRconClient } from "./api/hllrcon-client.js";
import { HllDiscordBot } from "./bot.js";
import { config } from "./config.js";
import { FileStore } from "./store/file-store.js";

let bot: HllDiscordBot | null = null;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}, shutting down Discord bot...`);

  try {
    bot?.stop();
  } finally {
    process.exit(0);
  }
}

async function main(): Promise<void> {
  const store = new FileStore(config.stateFile);
  await store.load();

  const api = new HllRconClient();
  await api.ensureConnected();

  bot = new HllDiscordBot(api, store);
  await bot.start();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
