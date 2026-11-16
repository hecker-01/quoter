const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { SCENE_OPTIONS, normalizeSceneTheme } = require("./quoteThemes");
const {
  FONT_OPTIONS,
  SIZE_OPTIONS,
  COLOR_OPTIONS,
  HIGHLIGHT_OPTIONS,
  EFFECT_OPTIONS,
  normalizeCustomization,
} = require("./quoteCustomizationOptions");
const { applicationEmoji } = require("./applicationEmojis");

const SOURCE_URL_RE = /channels\/(?:\d+|@me)\/(\d+)\/(\d+)/;

function buildSourceComponents(sourceUrl) {
  if (!sourceUrl) return [];

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("View original")
        .setStyle(ButtonStyle.Link)
        .setURL(sourceUrl),
    ),
  ];
}

function buildQuoteComponents(
  sourceUrl,
  { requesterId, customization, theme, customizable = true } = {},
) {
  const rows = buildSourceComponents(sourceUrl);
  const source = sourceUrl?.match(SOURCE_URL_RE);
  if (!customizable || !requesterId || !source) return rows;

  const settings = normalizeCustomization({
    ...customization,
    theme: customization?.theme ?? theme,
  });
  settings.theme = normalizeSceneTheme(settings.theme);
  const customId = (control) =>
    `quote-custom:${control}:${requesterId}:${source[1]}:${source[2]}`;

  const themeRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId("theme"))
        .setPlaceholder("Scene theme")
        .addOptions(
          SCENE_OPTIONS.map((item) => ({
            label: item.name,
            value: item.value,
            description: item.description,
            default: item.value === settings.theme,
            emoji: applicationEmoji(`scene_${item.value}`),
          })),
        ),
    );
  const fontRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId("font"))
        .setPlaceholder("Select a font...")
        .addOptions(
          Object.entries(FONT_OPTIONS).map(([value, item]) => ({
            label: item.name,
            value,
            default: value === settings.font,
            emoji: applicationEmoji(`font_${value}`),
          })),
        ),
    );
  const sizeRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId("size"))
        .setPlaceholder("Select font size...")
        .addOptions(
          Object.entries(SIZE_OPTIONS).map(([value, item]) => ({
            label: value === "custom" ? item.name : `Font Size: ${item.name}`,
            value,
            default: value === settings.size,
            emoji: applicationEmoji(`size_${value}`),
          })),
        ),
    );
  const colorRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId("color"))
        .setPlaceholder("Text Color: Default")
        .addOptions(
          Object.entries(COLOR_OPTIONS).map(([value, item]) => ({
            label: item.name,
            value,
            default: value === settings.color,
            emoji: applicationEmoji(
              value === "randomize" ? "color_random" : "colorpalette",
            ),
          })),
        ),
    );
  const highlightRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId("highlight"))
        .setPlaceholder("Highlight: White")
        .addOptions(
          Object.entries(HIGHLIGHT_OPTIONS).map(([value, item]) => ({
            label: item.name,
            value,
            default: value === settings.highlight,
            emoji: applicationEmoji("colorpalette"),
          })),
        ),
    );
  const effectsRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId("effects"))
        .setPlaceholder("Image Effects")
        .setMinValues(0)
        .setMaxValues(Object.keys(EFFECT_OPTIONS).length)
        .addOptions(
          Object.entries(EFFECT_OPTIONS).map(([value, item]) => ({
            label: item.name,
            value,
            description: item.description,
            default: settings.effects.includes(value),
            emoji: applicationEmoji(
              value === "hide_name" ? "effect_hide" : `effect_${value}`,
            ),
          })),
        ),
    );

  if (settings.effects.includes("lyric")) {
    return [fontRow, highlightRow, colorRow, effectsRow];
  }
  return [themeRow, fontRow, sizeRow, colorRow, effectsRow];
}

function localQuotePayload(file, options = {}) {
  const payload = { files: [file] };
  const components = buildQuoteComponents(options.sourceUrl, options);
  if (components.length) payload.components = components;
  return payload;
}

async function deliverQuote(client, file, plan, options = {}) {
  return localQuotePayload(file, options);
}

module.exports = {
  deliverQuote,
  buildSourceComponents,
  buildQuoteComponents,
};
