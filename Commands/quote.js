const {
  ContextMenuCommandBuilder,
  MessageFlags,
  ApplicationCommandType,
  InteractionContextType,
  PermissionsBitField,
} = require("discord.js");
const {
  prepareQuote,
  renderAndDeliverQuote,
} = require("../Functions/quoteWorkflow.js");
/**
 * Execute a message quote from a context-menu interaction.
 *
 * @param {ContextMenuCommandInteraction} interaction
 * @param {Client} client
 * @param {boolean} silent Keep the result private and skip forwarding.
 */
async function executeQuote(interaction, client, silent = false) {
    const requiredPermissions = [PermissionsBitField.Flags.AttachFiles];
    const inGuild = !!interaction.guildId;
    let hasPermission = true;
    if (inGuild) {
      // Try to get permissions from member or memberPermissions
      if (
        interaction.member &&
        interaction.member.permissions &&
        typeof interaction.member.permissions.has === "function"
      ) {
        hasPermission = interaction.member.permissions.has(requiredPermissions);
      } else if (
        interaction.memberPermissions &&
        typeof interaction.memberPermissions.has === "function"
      ) {
        hasPermission = interaction.memberPermissions.has(requiredPermissions);
      } else {
        hasPermission = false;
      }
    }

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to attach files in this channel.",
        flags: MessageFlags.Ephemeral,
      });
    } else if (!interaction.targetMessage) {
      return interaction.reply({
        content: "No message found to quote.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Decide delivery up front. A successful quote is normally visible to
    // everyone, but in "link" mode we defer ephemerally so the link reply stays
    // private to the person who quoted. Errors are always an ephemeral follow-up
    // (ephemerality is fixed at defer).
    const job = prepareQuote({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      requesterId: interaction.user.id,
      silent,
    });
    await interaction.deferReply(
      job.plan.ephemeral ? { flags: MessageFlags.Ephemeral } : {},
    );

    const message = interaction.targetMessage;

    try {
      const payload = await renderAndDeliverQuote(client, message, job);

      return interaction.editReply({ content: "", ...payload });
    } catch (error) {
      console.error("Error creating quote image:", error);
      await interaction.deleteReply().catch(() => {});
      return interaction.followUp({
        content: `Failed to create the quote image; \`${error.message}\``,
        flags: MessageFlags.Ephemeral,
      });
    }
}

module.exports = {
  developer: true,
  data: new ContextMenuCommandBuilder()
    .setName("Quote Message")
    .setType(ApplicationCommandType.Message)
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  execute: (interaction, client) => executeQuote(interaction, client),
  executeQuote,
};
