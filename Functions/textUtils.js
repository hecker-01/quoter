const emojiRegex = require("emoji-regex");
const twemoji = require("twemoji");
const { loadEmojiImage, loadCustomEmojiImage } = require("./emojiLoader");

// Discord custom emoji syntax: <:name:id> or <a:name:id> (animated)
const CUSTOM_EMOJI_RE = /<a?:\w+:(\d+)>/g;

// Split text into a flat list of tokens: plain text, unicode emoji, custom emoji.
function tokenize(text) {
  const marks = [];

  let m;
  const customRe = new RegExp(CUSTOM_EMOJI_RE);
  while ((m = customRe.exec(text)) !== null) {
    marks.push({
      start: m.index,
      end: m.index + m[0].length,
      kind: "custom",
      id: m[1],
    });
  }

  const uniRe = emojiRegex();
  while ((m = uniRe.exec(text)) !== null) {
    marks.push({
      start: m.index,
      end: m.index + m[0].length,
      kind: "emoji",
      raw: m[0],
    });
  }

  // Order by position; on overlap, prefer the earlier/longer match.
  marks.sort((a, b) => a.start - b.start || b.end - a.end);

  const tokens = [];
  let idx = 0;
  for (const mk of marks) {
    if (mk.start < idx) continue; // skip overlapping match
    if (mk.start > idx) {
      tokens.push({ type: "text", content: text.slice(idx, mk.start) });
    }
    if (mk.kind === "custom") {
      tokens.push({ type: "custom", id: mk.id });
    } else {
      tokens.push({ type: "emoji", content: mk.raw });
    }
    idx = mk.end;
  }
  if (idx < text.length) {
    tokens.push({ type: "text", content: text.slice(idx) });
  }
  return tokens;
}

// Parse text and resolve all emoji images. Font-independent, so it runs once
// up front; layout (which needs the font) can then run cheaply per fit attempt.
async function prepareRichText(text) {
  const tokens = tokenize(text);
  await Promise.all(
    tokens.map(async (token) => {
      if (token.type === "emoji") {
        const codepoint = twemoji.convert.toCodePoint(token.content);
        token.img = await loadEmojiImage(codepoint);
      } else if (token.type === "custom") {
        token.img = await loadCustomEmojiImage(token.id);
      }
    }),
  );
  return tokens;
}

// Turn tokens into atomic layout items (words, spaces, newlines, emoji images).
function toItems(ctx, tokens, emojiSize) {
  const items = [];
  for (const token of tokens) {
    if (token.type === "text") {
      const segments = token.content.split(/(\n)/);
      for (const seg of segments) {
        if (seg === "\n") {
          items.push({ type: "newline" });
          continue;
        }
        for (const part of seg.split(/(\s+)/)) {
          if (!part) continue;
          const isSpace = /^\s+$/.test(part);
          items.push({
            type: isSpace ? "space" : "word",
            text: part,
            width: ctx.measureText(part).width,
          });
        }
      }
    } else if (token.img) {
      // small trailing gap so adjacent emojis/words breathe
      items.push({ type: "image", img: token.img, width: emojiSize + 2 });
    } else if (token.type === "emoji") {
      // image missing: fall back to drawing the raw glyph
      items.push({
        type: "word",
        text: token.content,
        width: ctx.measureText(token.content).width,
      });
    }
    // custom emoji with no image: drop it (nothing sensible to render)
  }
  return items;
}

// Break items into wrapped lines that never exceed maxWidth.
function layoutItems(ctx, items, maxWidth, lineHeight) {
  const lines = [];
  let line = [];
  let width = 0;

  const flush = () => {
    lines.push(line);
    line = [];
    width = 0;
  };

  for (const item of items) {
    if (item.type === "newline") {
      flush();
      continue;
    }

    if (item.type === "space") {
      if (width === 0) continue; // drop leading spaces
      if (width + item.width > maxWidth) flush();
      else {
        line.push(item);
        width += item.width;
      }
      continue;
    }

    if (item.type === "image" || item.width <= maxWidth) {
      if (width + item.width > maxWidth && width > 0) flush();
      line.push(item);
      width += item.width;
      continue;
    }

    // Word too wide for a line: break it character by character.
    let buf = "";
    let bufWidth = 0;
    const pushBuf = () => {
      if (!buf) return;
      line.push({ type: "word", text: buf, width: bufWidth });
      width += bufWidth;
      buf = "";
      bufWidth = 0;
    };
    for (const ch of item.text) {
      const cw = ctx.measureText(ch).width;
      if (width + bufWidth + cw > maxWidth && width + bufWidth > 0) {
        pushBuf();
        flush();
      }
      buf += ch;
      bufWidth += cw;
    }
    pushBuf();
  }
  flush();

  return { lines, height: lines.length * lineHeight, lineCount: lines.length };
}

// Render a previously computed layout. Caller sets ctx.font / fillStyle first.
function drawLayout(
  ctx,
  layout,
  x,
  yTop,
  lineHeight,
  fontPx,
  emojiSize,
  maxLines,
) {
  const prevBaseline = ctx.textBaseline;
  ctx.textBaseline = "alphabetic";

  let renderLines = layout.lines;
  let clamped = false;
  if (maxLines && renderLines.length > maxLines) {
    renderLines = renderLines.slice(0, Math.max(1, maxLines));
    clamped = true;
  }

  renderLines.forEach((segments, i) => {
    let cx = x;
    const baseline = yTop + fontPx + i * lineHeight;
    const isLast = clamped && i === renderLines.length - 1;

    segments.forEach((seg, j) => {
      if (seg.type === "image") {
        ctx.drawImage(
          seg.img,
          cx,
          baseline - emojiSize * 0.82,
          emojiSize,
          emojiSize,
        );
        cx += seg.width;
      } else {
        let text = seg.text;
        if (isLast && j === segments.length - 1) text += "…";
        ctx.fillText(text, cx, baseline);
        cx += seg.width;
      }
    });
  });

  ctx.textBaseline = prevBaseline;
}

// Truncate a single line of text with an ellipsis so it fits maxWidth.
function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (
    truncated.length > 0 &&
    ctx.measureText(truncated + "…").width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

module.exports = {
  prepareRichText,
  toItems,
  layoutItems,
  drawLayout,
  truncateToWidth,
};
