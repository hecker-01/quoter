const { quoteFromMessage } = require("./quoteBuilder");
const { deliverQuote } = require("./quoteDelivery");
const { normalizeSceneTheme } = require("./quoteThemes");
const { normalizeCustomization } = require("./quoteCustomizationOptions");
const { cacheQuoteSource } = require("./quoteSourceCache");

function getQuotePlan(guildId, channelId, silent = false) {
  return { forward: false, ephemeral: silent };
}

function prepareQuote({
  guildId,
  channelId,
  requesterId,
  silent = false,
  theme,
}) {
  const customization = normalizeCustomization({ theme });
  customization.theme = normalizeSceneTheme(customization.theme);
  return {
    guildId,
    channelId,
    requesterId,
    plan: getQuotePlan(guildId, channelId, silent),
    customization,
  };
}

async function renderAndDeliverQuote(client, message, job) {
  cacheQuoteSource(message);
  const file = await quoteFromMessage(message, job.customization);
  const payload = await deliverQuote(client, file, job.plan, {
    sourceUrl: message.url,
    requesterId: job.requesterId,
    customization: job.customization,
  });
  return payload;
}

module.exports = {
  getQuotePlan,
  prepareQuote,
  renderAndDeliverQuote,
};
