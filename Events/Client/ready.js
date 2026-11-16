const { loadCommands } = require("../../Handlers/commandHandler");
const { ActivityType } = require("discord.js");
module.exports = {
  name: "clientReady",
  once: true,
  /**
   * @param {Client} client
   */
  async execute(client) {
    // client.user.setPresence({
    //   activities: [
    //     {
    //       name: "Hecker_01's new commands",
    //       type: ActivityType.Listening,
    //     },
    //   ],
    //   status: "idle",
    // });

    client.user.setPresence({
      activities: [
        {
          name: "Custom Status",
          type: ActivityType.Custom,
          state: "/help",
        },
      ],
      status: "online",
    });

    console.log(`Logged in as ${client.user.tag}!`);

    await loadCommands(client);
  },
};
