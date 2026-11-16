const { EmbedBuilder } = require("discord.js");

// Single source of truth for the help embed, shared by the /help command and
// the "ping the bot" message handler.
function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0xfae1ff)
    .setTitle("📜 Quoter: How to use")
    .setDescription(
      "Quoter turns any message into a clean, shareable quote image.",
    )
    .addFields(
      {
        name: "Make a quote",
        value:
          "• Right-click (or long-press) a message → **Apps** → **Quote Message**\n" +
          "• Choose **Quote Message Silently** to make a private quote\n" +
          "• **Reply** to a message and **@mention me** to quote it\n" +
          "• **/quote** with a message link or ID and an optional starting theme\n" +
          "• Use the controls underneath any quote to restyle it",
      },
      {
        name: "Commands",
        value:
          "• **Quote Message**: message right-click → Apps → Quote Message\n" +
          "• **Quote Message Silently**: make a private quote from the message menu\n" +
          "• **/quote** `message:` `silent:` `theme:`: quote by link or ID\n" +
          "• **/help** or **@mention me**: show this message",
      },
      {
        name: "Notes",
        value:
          "• I need the **Attach Files** permission in the channel to send images.\n" +
          "• Quotes support message text, attachments, stickers, and embeds.\n" +
          "• Customize each quote's theme, font, size, color, and image effects.\n" +
          "• Works in servers, group DMs, and my DMs.\n" +
          "• Context-menu and /help replies are only visible to you.",
      },
    );
}

module.exports = { buildHelpEmbed };
