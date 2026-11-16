const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  InteractionContextType,
} = require("discord.js");
const { executeQuote } = require("./quote.js");

module.exports = {
  developer: true,
  data: new ContextMenuCommandBuilder()
    .setName("Quote Message Silently")
    .setType(ApplicationCommandType.Message)
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  execute: (interaction, client) => executeQuote(interaction, client, true),
};
