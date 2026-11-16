const path = require("path");
const fs = require("fs");
const { loadImage } = require("@napi-rs/canvas");

const emojiImageCache = new Map();
const twemojiFolder = path.join(__dirname, "twemoji", "72x72");

async function loadEmojiImage(codepoint) {
  // Remove variation selector fe0f from codepoint (common in keycap emojis)
  const normalizedCodepoint = codepoint.toLowerCase().replace(/-fe0f/g, "");

  if (emojiImageCache.has(normalizedCodepoint)) {
    return emojiImageCache.get(normalizedCodepoint);
  }

  const filePath = path.join(twemojiFolder, `${normalizedCodepoint}.png`);
  try {
    await fs.promises.access(filePath);
  } catch {
    emojiImageCache.set(normalizedCodepoint, null);
    console.warn(`Emoji image file not found locally: ${filePath}`);
    return null;
  }

  try {
    const img = await loadImage(filePath);
    emojiImageCache.set(normalizedCodepoint, img);
    return img;
  } catch (err) {
    console.error(`Failed to load emoji image from file: ${filePath}`, err);
    emojiImageCache.set(normalizedCodepoint, null);
    return null;
  }
}

// Load a Discord custom emoji (<:name:id> / <a:name:id>) from the CDN.
// Animated emojis are flattened to their first frame via the .png endpoint.
async function loadCustomEmojiImage(id) {
  const cacheKey = `custom:${id}`;
  if (emojiImageCache.has(cacheKey)) {
    return emojiImageCache.get(cacheKey);
  }

  const url = `https://cdn.discordapp.com/emojis/${id}.png?size=96&quality=lossless`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // The .png CDN endpoint returns a static PNG (first frame for animated),
    // which @napi-rs/canvas decodes directly.
    const buffer = Buffer.from(await response.arrayBuffer());
    const img = await loadImage(buffer);
    emojiImageCache.set(cacheKey, img);
    return img;
  } catch (err) {
    console.warn(
      `Failed to load custom emoji ${id} from ${url}: ${err.message}`,
    );
    emojiImageCache.set(cacheKey, null);
    return null;
  }
}

module.exports = { loadEmojiImage, loadCustomEmojiImage, emojiImageCache };
