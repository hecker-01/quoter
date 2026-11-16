const sourceMessages = new Map();

function sourceKey(channelId, messageId) {
  return `${channelId}:${messageId}`;
}

function cacheQuoteSource(message) {
  if (!message?.channelId || !message?.id) return;
  sourceMessages.set(sourceKey(message.channelId, message.id), message);

  // Keep the cache bounded without persisting quoted message contents.
  if (sourceMessages.size > 500) {
    const oldest = sourceMessages.keys().next().value;
    sourceMessages.delete(oldest);
  }
}

function getCachedQuoteSource(channelId, messageId) {
  return sourceMessages.get(sourceKey(channelId, messageId)) ?? null;
}

module.exports = {
  sourceMessages,
  cacheQuoteSource,
  getCachedQuoteSource,
};
