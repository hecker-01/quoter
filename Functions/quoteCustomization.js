const {
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { randomBytes } = require("node:crypto");
const { quoteFromMessage } = require("./quoteBuilder");
const { buildQuoteComponents } = require("./quoteDelivery");
const { normalizeSceneTheme } = require("./quoteThemes");
const {
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
} = require("./quoteCustomizationOptions");
const {
  cacheQuoteSource,
  getCachedQuoteSource,
} = require("./quoteSourceCache");

const CUSTOM_ID_RE =
  /^quote-custom:(theme|font|size|color|highlight|effects):(\d+):(\d+):(\d+)$/;
const MODAL_ID_RE = /^quote-modal:([a-f0-9]{16})$/;
const liveCustomizations = new Map();
const pendingModals = new Map();

// Bound the in-memory state; a dismissed modal or old quote never cleans up.
function setCapped(map, key, value, max = 500) {
  map.set(key, value);
  if (map.size > max) map.delete(map.keys().next().value);
}

function parseCustomizationId(customId) {
  const match = customId.match(CUSTOM_ID_RE);
  if (!match) return null;
  return {
    control: match[1],
    requesterId: match[2],
    channelId: match[3],
    messageId: match[4],
  };
}

function readCustomization(message) {
  const settings = {
    ...DEFAULT_CUSTOMIZATION,
    effects: [...DEFAULT_CUSTOMIZATION.effects],
  };

  for (const row of message.components ?? []) {
    for (const component of row.components ?? []) {
      const parsed = parseCustomizationId(component.customId);
      if (!parsed) continue;
      const selected = (component.options ?? [])
        .filter((option) => option.default)
        .map((option) => option.value);
      if (parsed.control === "effects") settings.effects = selected;
      else if (selected[0]) settings[parsed.control] = selected[0];
    }
  }

  return normalizeCustomization(settings);
}

function stateKey(target, destinationMessageId) {
  return `${target.requesterId}:${target.channelId}:${target.messageId}:${destinationMessageId}`;
}

function currentCustomization(interaction, target) {
  const fromMessage = readCustomization(interaction.message);
  const saved = liveCustomizations.get(stateKey(target, interaction.message.id));
  return normalizeCustomization(saved ? { ...fromMessage, ...saved } : fromMessage);
}

async function regenerateQuote(
  interaction,
  client,
  target,
  customization,
  destinationMessageId = interaction.message?.id,
) {
  let sourceMessage = getCachedQuoteSource(target.channelId, target.messageId);
  if (!sourceMessage) {
    const channel = await client.channels.fetch(target.channelId);
    if (!channel || typeof channel.messages?.fetch !== "function") {
      throw new Error("The original channel is no longer available.");
    }
    sourceMessage = await channel.messages.fetch(target.messageId);
    cacheQuoteSource(sourceMessage);
  }
  customization.theme = normalizeSceneTheme(customization.theme);
  const normalized = normalizeCustomization(customization);
  normalized.theme = customization.theme;
  const file = await quoteFromMessage(sourceMessage, normalized);
  const components = buildQuoteComponents(sourceMessage.url, {
    requesterId: target.requesterId,
    customization: normalized,
  });

  setCapped(liveCustomizations, stateKey(target, destinationMessageId), normalized);
  await interaction.editReply({ attachments: [], files: [file], components });
}

async function showValueModal(interaction, target, customization, kind) {
  const token = randomBytes(8).toString("hex");
  const isSize = kind === "size";
  setCapped(pendingModals, token, {
    target,
    customization,
    kind,
    destinationMessageId: interaction.message.id,
  });

  const input = new TextInputBuilder()
    .setCustomId("value")
    .setLabel(isSize ? "Font size (10–72)" : "Hex color (#RRGGBB)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(isSize ? "36" : "#ffadc6")
    .setRequired(true)
    .setMaxLength(isSize ? 2 : 7);
  const modal = new ModalBuilder()
    .setCustomId(`quote-modal:${token}`)
    .setTitle(
      isSize
        ? "Custom font size"
        : kind === "primary"
          ? "Set primary color"
          : "Set secondary color",
    )
    .addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

async function handleQuoteCustomizationSelect(interaction, client) {
  const target = parseCustomizationId(interaction.customId);
  if (!target) return false;

  if (interaction.user.id !== target.requesterId) {
    await interaction.reply({
      content: "Only the person who created this quote can customize it.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const customization = currentCustomization(interaction, target);
  const selected = interaction.values[0];
  if (target.control === "size" && selected === "custom") {
    customization.size = "custom";
    await showValueModal(interaction, target, customization, "size");
    return true;
  }
  if (
    target.control === "color" &&
    (selected === "set_primary" || selected === "set_secondary")
  ) {
    customization.color = selected;
    await showValueModal(
      interaction,
      target,
      customization,
      selected === "set_primary" ? "primary" : "secondary",
    );
    return true;
  }

  await interaction.deferUpdate();
  try {
    if (target.control === "effects") {
      customization.effects = interaction.values;
    } else {
      customization[target.control] = interaction.values[0];
    }
    await regenerateQuote(interaction, client, target, customization);
  } catch (error) {
    console.error("Failed to customize quote:", error);
    await interaction.followUp({
      content: "I couldn't regenerate that quote. If it was created before my latest restart, make a fresh quote and customize that one.",
      flags: MessageFlags.Ephemeral,
    });
  }
  return true;
}

async function handleQuoteCustomizationModal(interaction, client) {
  const match = interaction.customId.match(MODAL_ID_RE);
  if (!match) return false;
  const pending = pendingModals.get(match[1]);
  pendingModals.delete(match[1]);
  if (!pending || interaction.user.id !== pending.target.requesterId) {
    await interaction.reply({
      content: "That customization form expired. Please open it again.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const value = interaction.fields.getTextInputValue("value").trim();
  if (pending.kind === "size") {
    const size = Number(value);
    if (!Number.isInteger(size) || size < 10 || size > 72) {
      await interaction.reply({
        content: "Enter a whole-number font size from 10 to 72.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    pending.customization.customSize = size;
  } else {
    const color = value.startsWith("#") ? value : `#${value}`;
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      await interaction.reply({
        content: "Enter a six-digit hex color such as `#ffadc6`.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    pending.customization[
      pending.kind === "primary" ? "primaryColor" : "secondaryColor"
    ] = color;
  }

  await interaction.deferUpdate();
  try {
    await regenerateQuote(
      interaction,
      client,
      pending.target,
      pending.customization,
      pending.destinationMessageId,
    );
  } catch (error) {
    console.error("Failed to apply quote customization modal:", error);
    await interaction.followUp({
      content: "I couldn't apply that customization.",
      flags: MessageFlags.Ephemeral,
    });
  }
  return true;
}

module.exports = {
  parseCustomizationId,
  readCustomization,
  handleQuoteCustomizationSelect,
  handleQuoteCustomizationModal,
  liveCustomizations,
};
