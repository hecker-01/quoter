const { createQuoteImage } = require("./createQuote");

// Expected, user-facing failures (bad input, missing message, etc.).
// Callers can show err.message to the user without logging it as a crash.
class QuoteError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuoteError";
  }
}

// Matches a Discord message link, capturing channelId and messageId.
// e.g. https://discord.com/channels/<guildId|@me>/<channelId>/<messageId>
const MESSAGE_LINK_RE = /channels\/(?:\d+|@me)\/(\d+)\/(\d+)/;
const SNOWFLAKE_RE = /^\d{17,20}$/;

// Resolve raw mention syntax to readable text. Users render as @username
// (not display name); roles as @role, channels as #channel. Custom-emoji
// syntax is left untouched so the image renderer can turn it into an image.
function resolveMentions(message) {
  let text = message.content ?? "";

  text = text.replace(/<@!?(\d+)>/g, (raw, id) => {
    const user = message.mentions?.users?.get(id);
    return user ? `@${user.username}` : raw;
  });
  text = text.replace(/<@&(\d+)>/g, (raw, id) => {
    const role = message.mentions?.roles?.get(id);
    return role ? `@${role.name}` : raw;
  });
  text = text.replace(/<#(\d+)>/g, (raw, id) => {
    const channel = message.mentions?.channels?.get(id);
    return channel ? `#${channel.name}` : raw;
  });

  return text;
}

function attachmentLabel(attachment) {
  const type = attachment.contentType ?? "";
  const name = attachment.name || "attachment";
  if (type.startsWith("image/")) return `📷 Image: ${name}`;
  if (type.startsWith("video/")) return `🎬 Video: ${name}`;
  if (type.startsWith("audio/")) return `🎵 Audio: ${name}`;
  return `📎 File: ${name}`;
}

function extractQuoteContent(message) {
  const sections = [];
  const content = resolveMentions(message).trim();
  if (content) sections.push(content);

  const attachments = Array.from(message.attachments?.values?.() ?? []);
  if (attachments.length) {
    sections.push(attachments.slice(0, 3).map(attachmentLabel).join("\n"));
  }

  const stickers = Array.from(message.stickers?.values?.() ?? []);
  if (stickers.length) {
    sections.push(
      stickers
        .slice(0, 3)
        .map((sticker) => `🏷️ Sticker: ${sticker.name || "sticker"}`)
        .join("\n"),
    );
  }

  const embed = message.embeds?.find(
    (item) => item.title || item.description || item.author?.name,
  );
  if (embed) {
    const embedText = [embed.author?.name, embed.title, embed.description]
      .filter(Boolean)
      .join(" — ")
      .trim();
    if (embedText) sections.push(`🔗 ${embedText}`);
  }

  return sections.join("\n\n") || "No text or supported media";
}

// Build a quote image attachment from a Discord message.
async function quoteFromMessage(message, options = {}) {
  if (message.partial) {
    await message.fetch();
  }

  const author = message.author;
  const pfpUrl = author.displayAvatarURL({ extension: "png", size: 4096 });
  const displayname =
    author.displayName || author.globalName || author.username || "Unknown";
  const username = author.username || "unknown";
  const content = extractQuoteContent(message);
  const timestamp = message.createdAt || message.createdTimestamp;

  const buffer = await createQuoteImage(
    pfpUrl,
    displayname,
    username,
    content,
    timestamp,
    options,
  );
  const extension = options.effects?.includes("gif") ? "gif" : "png";
  return { attachment: buffer, name: `quoter.${extension}` };
}

// Resolve a user-supplied message link or ID to an actual Message.
// `fallbackChannelId` is used when only a bare message ID is given.
async function resolveMessage(client, input, fallbackChannelId) {
  const text = String(input).trim();

  let channelId;
  let messageId;
  const link = text.match(MESSAGE_LINK_RE);
  if (link) {
    channelId = link[1];
    messageId = link[2];
  } else if (SNOWFLAKE_RE.test(text)) {
    channelId = fallbackChannelId;
    messageId = text;
  } else {
    throw new QuoteError("That isn't a valid message link or message ID.");
  }

  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch {
    throw new QuoteError("I can't access that channel - am I in that server?");
  }
  if (!channel || typeof channel.messages?.fetch !== "function") {
    throw new QuoteError("That isn't a text channel I can read messages from.");
  }

  try {
    return await channel.messages.fetch(messageId);
  } catch {
    throw new QuoteError("I couldn't find that message in that channel.");
  }
}

module.exports = {
  quoteFromMessage,
  resolveMessage,
  resolveMentions,
  extractQuoteContent,
  QuoteError,
};
