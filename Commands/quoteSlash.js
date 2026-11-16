const {
  SlashCommandBuilder,
  InteractionContextType,
  MessageFlags,
} = require("discord.js");
const { THEME_CHOICES } = require("../Functions/quoteThemes");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Quote a message by its link or ID.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("A message link or message ID to quote")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("silent")
        .setDescription("Only show the quote to you")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("theme")
        .setDescription("Choose the quote image style")
        .setRequired(false)
        .addChoices(...THEME_CHOICES),
    )
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
    // Runtime-only dependencies stay lazy so command deployment does not need
    // to initialize Canvas or the quote renderer.
    const { resolveMessage, QuoteError } = require("../Functions/quoteBuilder");
    const {
      prepareQuote,
      renderAndDeliverQuote,
    } = require("../Functions/quoteWorkflow");
    const input = interaction.options.getString("message", true);
    const silent = interaction.options.getBoolean("silent") ?? false;
    const theme = interaction.options.getString("theme");

    // Resolve the message first (fast). If it can't be found/accessed, reply
    // with an ephemeral error and never defer - keeps failures fully private.
    let target;
    try {
      target = await resolveMessage(client, input, interaction.channelId);
    } catch (error) {
      if (!(error instanceof QuoteError)) {
        console.error("/quote failed:", error);
      }
      return interaction.reply({
        content:
          error instanceof QuoteError
            ? error.message
            : "Failed to quote that message.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Message exists. Decide delivery up front so we can defer ephemerally for
    // "link" mode (the link reply stays private to the person who quoted).
    const job = prepareQuote({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      requesterId: interaction.user.id,
      silent,
      theme,
    });
    await interaction.deferReply(
      job.plan.ephemeral ? { flags: MessageFlags.Ephemeral } : {},
    );
    try {
      const payload = await renderAndDeliverQuote(client, target, job);
      return interaction.editReply(payload);
    } catch (error) {
      console.error("/quote render failed:", error);
      await interaction.deleteReply().catch(() => {});
      return interaction.followUp({
        content: "Failed to create the quote image.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
