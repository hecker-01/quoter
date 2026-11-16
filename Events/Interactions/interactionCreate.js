const { MessageFlags } = require("discord.js");

async function reportCommandError(interaction, error) {
  console.error(
    `Command ${interaction.commandName ?? "unknown"} failed:`,
    error,
  );

  const payload = {
    content: "Something went wrong while running that command. Please try again.",
    flags: MessageFlags.Ephemeral,
  };

  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch (replyError) {
    console.error("Could not send the command error response:", replyError);
  }
}

module.exports = {
  name: "interactionCreate",
  /**
   *
   * @param {ContextMenuCommandInteraction} interaction
   */
  async execute(interaction, client) {
    if (interaction.isModalSubmit()) {
      const { handleQuoteCustomizationModal } = require("../../Functions/quoteCustomization");
      await handleQuoteCustomizationModal(interaction, client);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const { handleQuoteCustomizationSelect } = require("../../Functions/quoteCustomization");
      await handleQuoteCustomizationSelect(interaction, client);
      return;
    }

    let command;
    if (interaction.isContextMenuCommand()) {
      command = client.contextCommands.get(interaction.commandName);
    } else if (interaction.isChatInputCommand()) {
      command = client.commands.get(interaction.commandName);
    } else {
      return;
    }

    if (!command) {
      console.warn(`Received unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      await reportCommandError(interaction, error);
    }
  },
};

module.exports.reportCommandError = reportCommandError;
