const { Message, Client } = require("discord.js");
const { buildHelpEmbed } = require("../../Functions/helpEmbed");
const {
  prepareQuote,
  renderAndDeliverQuote,
} = require("../../Functions/quoteWorkflow");

module.exports = {
  name: "messageCreate",
  /**
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    if (message.author.bot) return;

    // Only react to a direct @mention of the bot - not @everyone, role pings,
    // or the automatic mention added when replying to one of our messages.
    const pinged = message.mentions.has(client.user, {
      ignoreEveryone: true,
      ignoreRoles: true,
      ignoreRepliedUser: true,
    });
    if (!pinged) return;

    // Ping + reply → quote the message that was replied to.
    if (message.reference?.messageId) {
      try {
        const target = await message.fetchReference();
        // Regular messages can't be ephemeral, so the link reply here is public.
        const job = prepareQuote({
          guildId: message.guildId,
          channelId: message.channelId,
          requesterId: message.author.id,
        });
        const payload = await renderAndDeliverQuote(client, target, job);
        await message.reply(payload);
      } catch (error) {
        console.error("Ping-to-quote failed:", error);
        try {
          await message.reply({ content: "I couldn't quote that message." });
        } catch {}
      }
      return;
    }

    // Plain ping → show the help embed.
    try {
      await message.reply({ embeds: [buildHelpEmbed()] });
    } catch (error) {
      console.error("Ping help reply failed:", error);
    }
  },
};
