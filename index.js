const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});
module.exports = { client };

const { loadEvents } = require("./Handlers/eventHandler");

require("dotenv").config({ quiet: true });

async function start() {
  if (!process.env.TOKEN) {
    throw new Error("Missing TOKEN in environment (.env).");
  }

  client.config = require("./config.json");
  client.events = new Collection();
  client.commands = new Collection();
  client.contextCommands = new Collection();

  await loadEvents(client);
  await client.login(process.env.TOKEN);
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down cleanly...`);

  try {
    client.destroy();
  } catch (error) {
    console.error("Shutdown error:", error);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exitCode = 1;
});

start().catch((error) => {
  console.error("Failed to start Quoter:", error);
  process.exitCode = 1;
});
