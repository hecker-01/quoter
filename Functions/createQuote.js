const { createCanvas } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");
const {
  prepareRichText,
  toItems,
  layoutItems,
  drawLayout,
  truncateToWidth,
} = require("./textUtils");
const { loadAndProcessPfp } = require("./profilePicture");
const { getTheme } = require("./quoteThemes");
const { BASE_FONT_STACK, registerQuoteFonts } = require("./quoteFonts");
const {
  FONT_OPTIONS,
  SIZE_OPTIONS,
  HIGHLIGHT_OPTIONS,
  normalizeCustomization,
} = require("./quoteCustomizationOptions");

registerQuoteFonts();
const FONT = BASE_FONT_STACK;

// Format a date (in UTC) as a short date, e.g. "Jun 7, 2026".
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}

function finishCanvas(canvas, ctx, width, height, scale, effects) {
  if (effects.has("gif")) {
    const encoder = new GIFEncoder(width * scale, height * scale);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(0);
    encoder.setQuality(10);
    if (effects.has("bubble")) encoder.setTransparent(GIF_KEY_RGB);
    if (effects.has("bubble")) {
      // GIF transparency is on/off only. Snap half-transparent edge pixels to
      // either fully opaque or the key color, so no fringe of key color shows.
      const frame = ctx.getImageData(0, 0, width * scale, height * scale);
      const px = frame.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 128) {
          px[i] = 255;
          px[i + 1] = 0;
          px[i + 2] = 255;
          px[i + 3] = 0;
        } else {
          px[i + 3] = 255;
        }
      }
      encoder.addFrame(px);
    } else {
      encoder.addFrame(ctx);
    }
    encoder.finish();
    return encoder.out.getData();
  }
  return canvas.toBuffer("image/png");
}

const GIF_KEY_RGB = 0xff00ff;

const RANDOM_COLORS = [
  "#ffadc6", "#9fc5ff", "#ffd166", "#8de3c7", "#d4b5ff", // for dark themes
  "#b0104f", "#1a56c4", "#8a5a00", "#00695c", "#6a1b9a", // for light themes
];

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function readableTextColor(background) {
  const match = /^#([0-9a-f]{6})$/i.exec(background);
  if (!match) return "#111111";
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return red * 0.299 + green * 0.587 + blue * 0.114 > 150
    ? "#111111"
    : "#ffffff";
}

async function createQuoteImage(
  pfpUrl,
  displayname,
  username,
  messageContent,
  timestamp,
  options = {},
) {
  const customization = normalizeCustomization(options);
  const theme = getTheme(customization.theme);
  const fontFamily = `'${FONT_OPTIONS[customization.font].family}', ${FONT}`;
  const sizeRange =
    customization.size === "custom"
      ? {
          max: customization.customSize,
          min: Math.max(10, customization.customSize - 14),
        }
      : SIZE_OPTIONS[customization.size];
  const effects = new Set(customization.effects);
  let primaryColor = theme.text;
  let secondaryColor = theme.secondary;
  // Custom colors apply only once a valid hex was chosen; otherwise the theme's
  // own readable colors win (e.g. after a restart, when the hex is forgotten).
  if (customization.color === "set_primary" && customization.primaryColor) {
    primaryColor = customization.primaryColor;
  }
  if (customization.color === "set_secondary" && customization.secondaryColor) {
    secondaryColor = customization.secondaryColor;
  }
  if (customization.color === "randomize") {
    // Only colors that stay readable on this theme's background.
    const pool = RANDOM_COLORS.filter(
      (color) =>
        Math.min(...theme.background.map((bg) => contrastRatio(color, bg))) >= 4.5,
    );
    const pick = () => pool[Math.floor(Math.random() * pool.length)] ?? theme.text;
    primaryColor = pick();
    secondaryColor = pick();
  }
  const width = 857;
  const height = 450;
  const scale = 2; // supersample for crisper text & emojis

  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale); // work in logical coordinates
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, theme.background[0]);
  background.addColorStop(1, theme.background[1]);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const flipped = effects.has("flip");
  const lyric = effects.has("lyric");
  const magik = effects.has("magik");
  // Magik stretches the avatar wide; the rest of the card is the text column.
  const magikPanel = Math.round(width * 0.7);

  // Load and process the avatar, rendered at full resolution. Special effects
  // decide whether it becomes a side panel or a full-card background.
  await loadAndProcessPfp(ctx, pfpUrl, height, scale, {
    fadeColor: theme.background[0],
    grayscale: theme.grayscaleAvatar || effects.has("contrast"),
    effects: customization.effects,
    canvasWidth: width,
    side: flipped ? "right" : "left",
    blend: effects.has("curve") ? "curve" : "linear",
    fullBleed: lyric,
    dim: lyric ? 0.52 : 0,
    panelWidth: magik ? magikPanel : height,
  });

  // Speech bubble (shape from speechmeme's tail_right/tail_left): a full-width
  // band cut out of the top of the card. Its lower edge curves down, it tapers
  // to nothing at one corner, and a spike points down at the avatar. The spike
  // sits over the avatar: tail_left in the default layout, tail_right if flipped.
  const bubble = effects.has("bubble");
  const bubbleBody = bubble ? 44 : 0; // depth the text column must clear
  if (bubble) {
    const bubbleH = (width * 131) / 910; // reference strip is 910x131
    const px = (u) => (flipped ? u : 1 - u) * width; // u in tail_right coords
    const py = (v) => v * bubbleH;
    ctx.save();
    // Real transparent hole; GIFs are thresholded to on/off in finishCanvas.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(px(0), 0);
    ctx.lineTo(px(1), 0);
    ctx.lineTo(px(0.664), py(0.96)); // tail tip
    ctx.lineTo(px(0.78), py(0.265));
    ctx.quadraticCurveTo(px(0.35), py(0.55), px(0), 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (lyric) {
    const lyricFont = Math.min(48, Math.max(26, sizeRange.max));
    const lyricLine = Math.round(lyricFont * 1.22);
    const lyricEmoji = Math.round(lyricFont * 1.05);
    const lyricTokens = await prepareRichText(messageContent);
    ctx.font = `700 ${lyricFont}px ${fontFamily}`;
    const lyricLayout = layoutItems(
      ctx,
      toItems(ctx, lyricTokens, lyricEmoji),
      width - 145,
      lyricLine,
    );
    const maxLines = Math.min(3, lyricLayout.lineCount);
    const visibleLines = lyricLayout.lines.slice(0, maxLines);
    const blockHeight = maxLines * lyricLine;
    const messageY = Math.max(45, height - 88 - blockHeight);
    const messageX = 74;
    const highlightSetting = HIGHLIGHT_OPTIONS[customization.highlight];
    const highlight =
      highlightSetting.color === "theme"
        ? theme.text
        : highlightSetting.color;

    // Soft shadow keeps text readable on bright avatars (no highlight box there).
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 8;
    ctx.font = `700 62px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText("”", 15, messageY + lyricFont + 3);

    ctx.font = `700 ${lyricFont}px ${fontFamily}`;
    for (const [lineIndex, segments] of visibleLines.entries()) {
      const lineWidth = segments.reduce((sum, segment) => sum + segment.width, 0);
      const y = messageY + lineIndex * lyricLine;
      ctx.shadowBlur = 0;
      if (highlight) {
        ctx.fillStyle = highlight;
        ctx.fillRect(messageX - 7, y + 3, lineWidth + 14, lyricLine - 2);
      } else {
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = highlight ? readableTextColor(highlight) : primaryColor;
      drawLayout(
        ctx,
        { lines: [segments], height: lyricLine, lineCount: 1 },
        messageX,
        y,
        lyricLine,
        lyricFont,
        lyricEmoji,
        1,
      );
    }

    ctx.shadowBlur = 8;
    ctx.font = `700 ${Math.max(16, Math.round(lyricFont * 0.55))}px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      truncateToWidth(ctx, username.toUpperCase(), width - messageX - 40),
      messageX,
      messageY + blockHeight + 28,
    );

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.textAlign = "right";
    ctx.fillText("heckr.dev/quoter", width - 18, height - 18);
    return finishCanvas(canvas, ctx, width, height, scale, effects);
  }

  // Text column geometry
  const textX = magik ? (flipped ? 35 : magikPanel + 13) : flipped ? 45 : 470;
  const padding = 40;
  const contentWidth = magik
    ? flipped
      ? width - magikPanel - 35 - 13
      : width - magikPanel - 13 - 20
    : flipped
      ? width - height - 65
      : width - textX - padding;
  const maxBlockHeight = height - 100 - bubbleBody; // vertical breathing room top + bottom

  // Resolve emoji images once (font-independent), then fit the font to the box.
  const msgTokens = await prepareRichText(messageContent);
  const nameTokens = await prepareRichText(`- ${displayname}`);

  let fit = null;
  const showName = !effects.has("hide_name");
  const showUsername = !effects.has("hide_username");
  for (let msgFont = sizeRange.max; msgFont >= sizeRange.min; msgFont--) {
    const nameFont = Math.max(14, Math.round(msgFont * (magik ? 0.58 : 0.72)));
    const userFont = Math.max(11, Math.round(msgFont * (magik ? 0.38 : 0.55)));
    const msgLine = Math.round(msgFont * 1.34);
    const nameLine = Math.round(nameFont * 1.3);
    const msgEmoji = Math.round(msgFont * 1.15);
    const nameEmoji = Math.round(nameFont * 1.15);
    const gapMsgName = Math.round(msgFont * 0.95);
    const gapNameUser = Math.round(userFont * 0.65);

    ctx.font = `${msgFont}px ${fontFamily}`;
    const msgLayout = layoutItems(
      ctx,
      toItems(ctx, msgTokens, msgEmoji),
      contentWidth,
      msgLine,
    );

    ctx.font = `bold ${nameFont}px ${fontFamily}`;
    const nameLayout = layoutItems(
      ctx,
      toItems(ctx, nameTokens, nameEmoji),
      contentWidth,
      nameLine,
    );

    const attributionGap = showName || showUsername ? gapMsgName : 0;
    const renderedNameHeight = showName ? nameLayout.height : 0;
    const renderedUserGap = showName && showUsername ? gapNameUser : 0;
    const renderedUserHeight = showUsername ? userFont : 0;
    const total =
      msgLayout.height +
      attributionGap +
      renderedNameHeight +
      renderedUserGap +
      renderedUserHeight;

    fit = {
      msgFont,
      nameFont,
      userFont,
      msgLine,
      nameLine,
      msgEmoji,
      nameEmoji,
      gapMsgName,
      gapNameUser,
      attributionGap,
      renderedNameHeight,
      renderedUserGap,
      renderedUserHeight,
      msgLayout,
      nameLayout,
      total,
    };

    if (total <= maxBlockHeight) break;
  }

  // If even the smallest size overflows, clamp the message to the lines that fit.
  let msgMaxLines = fit.msgLayout.lineCount;
  let blockHeight = fit.total;
  if (fit.total > maxBlockHeight) {
    const reserved =
      fit.attributionGap +
      fit.renderedNameHeight +
      fit.renderedUserGap +
      fit.renderedUserHeight;
    msgMaxLines = Math.max(
      1,
      Math.floor((maxBlockHeight - reserved) / fit.msgLine),
    );
    blockHeight = msgMaxLines * fit.msgLine + reserved;
  }

  const startY = bubble
    ? bubbleBody + Math.max(10, (height - bubbleBody - blockHeight) / 2)
    : Math.max(45, (height - blockHeight) / 2);

  // Draw message
  ctx.font = `${fit.msgFont}px ${fontFamily}`;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = "left";
  drawLayout(
    ctx,
    fit.msgLayout,
    textX,
    startY,
    fit.msgLine,
    fit.msgFont,
    fit.msgEmoji,
    msgMaxLines,
  );

  // Draw display name
  const nameY =
    startY + msgMaxLines * fit.msgLine + fit.attributionGap;
  if (showName) {
    ctx.font = `bold ${fit.nameFont}px ${fontFamily}`;
    ctx.fillStyle = primaryColor;
    drawLayout(
      ctx,
      fit.nameLayout,
      textX,
      nameY,
      fit.nameLine,
      fit.nameFont,
      fit.nameEmoji,
    );
  }

  // Draw username
  if (showUsername) {
    const userBaseline =
      nameY + fit.renderedNameHeight + fit.renderedUserGap + fit.userFont;
    ctx.font = `${fit.userFont}px ${fontFamily}`;
    ctx.fillStyle = secondaryColor;
    ctx.fillText(
      truncateToWidth(ctx, `@${username}`, contentWidth),
      textX,
      userBaseline,
    );
  }

  // Footer: date bottom-left, watermark bottom-right
  ctx.fillStyle = theme.footer;

  const stamp = timestamp != null ? formatDate(timestamp) : null;
  if (stamp && !effects.has("hide_date") && !magik) {
    ctx.font = `11px ${fontFamily}`;
    ctx.textAlign = flipped ? "right" : "left";
    ctx.fillText(stamp, flipped ? width - height - 20 : textX, height - 20);
  }

  ctx.font = `14px ${fontFamily}`;
  ctx.textAlign = flipped ? "left" : "right";
  ctx.fillText("heckr.dev/quoter", flipped ? 20 : width - 20, height - 20);

  return finishCanvas(canvas, ctx, width, height, scale, effects);
}

module.exports = { createQuoteImage };
