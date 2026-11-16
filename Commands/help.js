const {
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
} = require("discord.js");
const { buildHelpEmbed } = require("../Functions/helpEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Learn how to use the Quoter bot.")
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  execute: async (interaction, client) => {
    return interaction.reply({
      embeds: [buildHelpEmbed()],
      flags: MessageFlags.Ephemeral,
    });
  },
};
