const { loadFiles } = require("../Functions/fileLoader");

// Read every command file and return their builders, split by kind.
// Shared by the runtime loader and the standalone registration script.
async function collectCommands() {
  const slash = [];
  const context = [];
  const files = (await loadFiles("Commands")).sort();
  const seen = new Set();

  for (const file of files) {
    const command = require(file);
    if (!command.data || typeof command.data.toJSON !== "function") {
      throw new TypeError(`Command has no valid data builder: ${file}`);
    }
    if (typeof command.execute !== "function") {
      throw new TypeError(`Command has no execute function: ${file}`);
    }

    const definition = command.data.toJSON();
    const identity = `${definition.type}:${definition.name}`;
    if (seen.has(identity)) {
      throw new Error(`Duplicate command definition: ${definition.name}`);
    }
    seen.add(identity);

    if (definition.type === 3) {
      // Context menu command
      context.push(command);
    } else {
      slash.push(command);
    }
  }

  return { slash, context };
}

// Load commands into memory for the running bot. Does NOT register them with
// Discord - that happens separately via `node deploy-commands.js`.
async function loadCommands(client) {
  console.time("Commands Loaded");

  client.commands = new Map();
  client.contextCommands = new Map();
  const commands = new Array();

  const { slash, context } = await collectCommands();

  for (const command of slash) {
    client.commands.set(command.data.name, command);
    commands.push({ Command: command.data.name, Status: "✅" });
  }
  for (const command of context) {
    client.contextCommands.set(command.data.name, command);
    commands.push({ Command: command.data.name, Status: "✅" });
  }

  console.table(commands, ["Command", "Status"]);
  console.info("\n\x1b[36m%s\x1b[0m", "Loaded Commands.");
  console.timeEnd("Commands Loaded");
}

module.exports = { loadCommands, collectCommands };
