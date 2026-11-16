// Registers all slash & context-menu commands with Discord.
// Run this manually whenever commands are added/changed/removed:
//   node deploy-commands.js
//
// The bot itself (index.js) no longer registers commands on startup - it only
// loads them into memory. This keeps startups fast and avoids hammering the
// command-registration endpoint every time the bot restarts.

const { REST, Routes } = require("discord.js");
require("dotenv").config({ quiet: true });
const { collectCommands } = require("./Handlers/commandHandler");

(async () => {
  const token = process.env.TOKEN;
  if (!token) {
    console.error("Missing TOKEN in environment (.env).");
    process.exit(1);
  }

  try {
    const { slash, context } = await collectCommands();
    const body = [...slash, ...context].map((command) => command.data.toJSON());

    const rest = new REST().setToken(token);

    // Application id is needed for the global command route.
    const app = await rest.get(Routes.oauth2CurrentApplication());

    console.log(`Registering ${body.length} command(s)...`);
    const data = await rest.put(Routes.applicationCommands(app.id), { body });
    console.log(`Successfully registered ${data.length} command(s).`);
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
})();
