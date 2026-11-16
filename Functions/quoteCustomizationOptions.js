const FONT_OPTIONS = Object.freeze({
  mplus: { name: "M PLUS Rounded 1c", family: "Quote MPlus" },
  dela: { name: "Dela Gothic One", family: "Quote Dela" },
  papyrus: { name: "Papyrus", family: "Papyrus" },
  dot: { name: "DotGothic16", family: "Quote Dot" },
  hachi: { name: "Hachi Maru Pop", family: "Quote Hachi" },
  rampart: { name: "Rampart One", family: "Quote Rampart" },
  reggae: { name: "Reggae One", family: "Quote Reggae" },
  rocknroll: { name: "RocknRoll One", family: "Quote RocknRoll" },
  zen: { name: "Zen Old Mincho", family: "Quote Zen" },
  yuji: { name: "Yuji Syuku", family: "Quote Yuji" },
  yusei: { name: "Yusei Magic", family: "Quote Yusei" },
  inconsolata: { name: "Inconsolata", family: "Quote Inconsolata" },
  exo2: { name: "Exo 2", family: "Quote Exo2" },
  bruno: { name: "Bruno Ace SC", family: "Quote Bruno" },
  castoro: { name: "Castoro Titling", family: "Quote Castoro" },
  poltawski: { name: "Poltawski Nowy", family: "Quote Poltawski" },
  vina: { name: "Vina Sans", family: "Quote Vina" },
  script: { name: "Dancing Script", family: "Quote Dancing" },
  cherry: { name: "Cherry Bomb One", family: "Quote Cherry" },
});

const SIZE_OPTIONS = Object.freeze({
  small: { name: "Small", max: 26, min: 11 },
  medium: { name: "Medium", max: 32, min: 13 },
  large: { name: "Large", max: 40, min: 15 },
  custom: { name: "Custom size...", max: 36, min: 14 },
});

const COLOR_OPTIONS = Object.freeze({
  none: { name: "Text Color: Default", color: null },
  set_primary: { name: "Set primary color", color: "#ffadc6" },
  set_secondary: { name: "Set secondary color", color: "#9fc5ff" },
  randomize: { name: "Randomise colors", color: "random" },
});

const HIGHLIGHT_OPTIONS = Object.freeze({
  white: { name: "Highlight: White", color: "#ffffff" },
  black: { name: "Highlight: Black", color: "#111111" },
  theme: { name: "Highlight: Theme", color: "theme" },
  none: { name: "Highlight: None", color: null },
});

const EFFECT_OPTIONS = Object.freeze({
  gif: { name: "Export as GIF", description: "Output as GIF" },
  curve: { name: "Curved Blend", description: "Use a smooth curved separator" },
  flip: { name: "Flip Image", description: "Swap the avatar and text sides" },
  lyric: { name: "Lyric Style", description: "Switch to lyric quote layout" },
  contrast: { name: "Grayscale", description: "Convert avatar to black & white" },
  blur: { name: "Blur", description: "Soften the avatar" },
  brightness: { name: "Brightness Boost", description: "Brighten the avatar" },
  pixelate: { name: "Pixelate", description: "Pixelate the avatar" },
  bubble: { name: "Speech Bubble", description: "Cut a speech bubble out of the image" },
  magik: { name: "Magik", description: "Liquid-rescale distort the final image" },
  hide_name: { name: "Hide Display Name", description: "Hide the user's display name" },
});

const DEFAULT_CUSTOMIZATION = Object.freeze({
  theme: "classic",
  font: "mplus",
  size: "large",
  color: "none",
  highlight: "white",
  effects: Object.freeze([]),
});

function normalizeCustomization(settings = {}) {
  const normalizeHex = (value) =>
    /^#[0-9a-f]{6}$/i.test(value ?? "") ? value.toLowerCase() : null;
  return {
    theme: settings.theme,
    font: Object.hasOwn(FONT_OPTIONS, settings.font) ? settings.font : "mplus",
    size: Object.hasOwn(SIZE_OPTIONS, settings.size) ? settings.size : "large",
    color: Object.hasOwn(COLOR_OPTIONS, settings.color)
      ? settings.color
      : "none",
    highlight: Object.hasOwn(HIGHLIGHT_OPTIONS, settings.highlight)
      ? settings.highlight
      : "white",
    effects: Array.isArray(settings.effects)
      ? settings.effects.filter((effect) => Object.hasOwn(EFFECT_OPTIONS, effect))
      : [],
    customSize: Math.max(10, Math.min(Number(settings.customSize) || 36, 72)),
    primaryColor: normalizeHex(settings.primaryColor),
    secondaryColor: normalizeHex(settings.secondaryColor),
  };
}

module.exports = {
  FONT_OPTIONS,
  SIZE_OPTIONS,
  COLOR_OPTIONS,
  HIGHLIGHT_OPTIONS,
  EFFECT_OPTIONS,
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
};
