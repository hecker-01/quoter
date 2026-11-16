const { loadFiles } = require("../Functions/fileLoader");

async function loadEvents(client) {
  console.time("Events Loaded");

  client.events = new Map();
  const events = new Array();

  const files = await loadFiles("Events");

  for (const file of files) {
    try {
      const event = require(file);
      if (!event.name || typeof event.execute !== "function") {
        throw new TypeError(`Invalid event module: ${file}`);
      }
      const execute = (...args) => {
        Promise.resolve(event.execute(...args, client)).catch((error) => {
          console.error(`Event ${event.name} failed:`, error);
        });
      };
      const target = event.rest ? client.rest : client;

      target[event.once ? "once" : "on"](event.name, execute);
      client.events.set(event.name, execute);

      events.push({ Event: event.name, Status: "✅" });
    } catch (error) {
      events.push({ Event: file.split("/").pop().slice(0, -3), Status: "❌" });
      console.error(`Failed to load event ${file}:`, error);
    }
  }

  console.table(events, ["Event", "Status"]);
  console.info("\n\x1b[36m%s\x1b[0m", "Loaded Events.");
  console.timeEnd("Events Loaded");
}

module.exports = { loadEvents };
