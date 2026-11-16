const { createCanvas, loadImage } = require("@napi-rs/canvas");

function transparentColor(hex) {
  const value = hex.replace("#", "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((part) => part + part)
          .join("")
      : value;
  const number = Number.parseInt(expanded, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, 0)`;
}

async function loadAndProcessPfp(
  ctx,
  pfpUrl,
  height,
  scale = 1,
  {
    fadeColor = "#000000",
    grayscale = true,
    effects = [],
    canvasWidth = height,
    side = "left",
    blend = "linear",
    fullBleed = false,
    dim = 0,
    panelWidth = height,
  } = {},
) {
  try {

    const response = await fetch(pfpUrl);
    const pfpBuffer = Buffer.from(await response.arrayBuffer());

    // @napi-rs/canvas decodes PNG/JPEG/WebP buffers directly.
    const pfpImage = await loadImage(pfpBuffer);

    // Offscreen canvas for grayscale pfp, at full output resolution
    const res = Math.round(height * scale);
    const offCanvas = createCanvas(res, res);
    const offCtx = offCanvas.getContext("2d");
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";

    offCtx.drawImage(pfpImage, 0, 0, res, res);
    const effectSet = new Set(effects);
    if (grayscale || effectSet.has("brightness")) {
      const imageData = offCtx.getImageData(0, 0, res, res);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (grayscale) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        if (effectSet.has("brightness")) {
          data[i] = Math.min(255, data[i] * 1.28);
          data[i + 1] = Math.min(255, data[i + 1] * 1.28);
          data[i + 2] = Math.min(255, data[i + 2] * 1.28);
        }
      }

      offCtx.putImageData(imageData, 0, 0);
    }

    let avatarCanvas = offCanvas;
    if (effectSet.has("blur")) {
      const blurred = createCanvas(res, res);
      const blurredCtx = blurred.getContext("2d");
      blurredCtx.filter = `blur(${Math.max(2, Math.round(4 * scale))}px)`;
      blurredCtx.drawImage(avatarCanvas, 0, 0, res, res);
      avatarCanvas = blurred;
    }
    if (effectSet.has("pixelate")) {
      const pixels = Math.max(24, Math.round(60 * scale));
      const tiny = createCanvas(pixels, pixels);
      tiny.getContext("2d").drawImage(avatarCanvas, 0, 0, pixels, pixels);
      const pixelated = createCanvas(res, res);
      const pixelCtx = pixelated.getContext("2d");
      pixelCtx.imageSmoothingEnabled = false;
      pixelCtx.drawImage(tiny, 0, 0, res, res);
      avatarCanvas = pixelated;
    }
    if (effectSet.has("magik")) {
      const distorted = createCanvas(res, res);
      const distortedCtx = distorted.getContext("2d");
      const stripHeight = Math.max(2, Math.round(5 * scale));
      const overscan = 10 * scale;
      for (let y = 0; y < res; y += stripHeight) {
        const offset = Math.sin(y / (18 * scale)) * 10 * scale;
        distortedCtx.drawImage(
          avatarCanvas,
          0,
          y,
          res,
          stripHeight,
          offset - overscan,
          y,
          res + overscan * 2,
          stripHeight,
        );
      }
      avatarCanvas = distorted;
    }

    // Lyric mode uses the avatar as a full-card background with a centered
    // cover crop, matching the compact caption-card layout.
    if (fullBleed) {
      const sourceHeight = Math.min(res, Math.round((res * height) / canvasWidth));
      // Bias the crop upward: faces sit in the upper half of most avatars.
      const sourceY = Math.round((res - sourceHeight) * 0.4);
      ctx.save();
      if (effectSet.has("flip")) {
        ctx.translate(canvasWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(
        avatarCanvas,
        0,
        sourceY,
        res,
        sourceHeight,
        0,
        0,
        canvasWidth,
        height,
      );
      ctx.restore();
      if (dim > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.85, dim)})`;
        ctx.fillRect(0, 0, canvasWidth, height);
      }
      return true;
    }

    // Flip Image swaps the image and copy columns instead of merely mirroring
    // the pixels in place.
    const imageWidth = Math.max(height, Math.min(canvasWidth, panelWidth));
    const imageX = side === "right" ? canvasWidth - imageWidth : 0;
    ctx.save();
    ctx.drawImage(avatarCanvas, imageX, 0, imageWidth, height);
    ctx.restore();

    if (blend === "curve") {
      // A wide, feathered elliptical boundary: narrow at the top/bottom and
      // broadest at the center, like the reference Curved Blend treatment.
      for (let y = 0; y < height; y += 2) {
        const distance = Math.abs((y - height / 2) / (height / 2));
        const inset = 175 * Math.pow(distance, 1.7);
        if (side === "right") {
          const edge = imageX + Math.max(50, imageWidth - height + 50) + inset;
          const gradient = ctx.createLinearGradient(edge - 65, 0, edge + 65, 0);
          gradient.addColorStop(0, fadeColor);
          gradient.addColorStop(1, transparentColor(fadeColor));
          ctx.fillStyle = gradient;
          ctx.fillRect(0, y, edge + 65, 2);
        } else {
          const edge = imageWidth - 50 - inset;
          const gradient = ctx.createLinearGradient(edge - 65, 0, edge + 65, 0);
          gradient.addColorStop(0, transparentColor(fadeColor));
          gradient.addColorStop(1, fadeColor);
          ctx.fillStyle = gradient;
          ctx.fillRect(edge - 65, y, canvasWidth - edge + 65, 2);
        }
      }
    } else if (side === "right") {
      const fadeWidth = imageWidth > height ? 230 : 150;
      const gradient = ctx.createLinearGradient(imageX - 20, 0, imageX + fadeWidth - 20, 0);
      gradient.addColorStop(0, fadeColor);
      gradient.addColorStop(1, transparentColor(fadeColor));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, imageX + fadeWidth, height);
    } else {
      const fadeWidth = imageWidth > height ? 230 : 150;
      const gradient = ctx.createLinearGradient(imageWidth - fadeWidth, 0, imageWidth + 20, 0);
      gradient.addColorStop(0, transparentColor(fadeColor));
      gradient.addColorStop(1, fadeColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(imageWidth - fadeWidth, 0, canvasWidth - imageWidth + fadeWidth + 20, height);
    }
    return true;
  } catch (error) {
    console.error("Error loading profile picture:", error);
    return false;
  }
}

module.exports = { loadAndProcessPfp };
