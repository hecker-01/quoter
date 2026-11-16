const THEMES = Object.freeze({
  classic: Object.freeze({
    name: "Classic",
    background: ["#000000", "#000000"],
    text: "#ffffff",
    secondary: "#aaaaaa",
    footer: "#7b7b7b",
    accent: "#ffffff",
    grayscaleAvatar: false,
  }),
  light: Object.freeze({
    name: "Light",
    background: ["#f8f9fb", "#e8ebf0"],
    text: "#1f2328",
    secondary: "#59636e",
    footer: "#606871",
    accent: "#5865f2",
    grayscaleAvatar: false,
  }),
  discord: Object.freeze({
    name: "Discord",
    background: ["#313338", "#232428"],
    text: "#f2f3f5",
    secondary: "#b5bac1",
    footer: "#9aa1a8",
    accent: "#5865f2",
    grayscaleAvatar: false,
  }),
  sunset: Object.freeze({
    name: "Sunset",
    background: ["#351c4d", "#101827"],
    text: "#fff4ed",
    secondary: "#efb8b2",
    footer: "#ba8ca5",
    accent: "#ff8a65",
    grayscaleAvatar: false,
  }),
  rose: Object.freeze({
    name: "Rose",
    background: ["#331923", "#120d14"],
    text: "#ffe9ef",
    secondary: "#e9a9ba",
    footer: "#bb7a8e",
    accent: "#ff759f",
    grayscaleAvatar: false,
  }),
  silver: Object.freeze({
    name: "Silver",
    background: ["#30343b", "#15171b"],
    text: "#f2f4f7",
    secondary: "#bbc1ca",
    footer: "#99a0aa",
    accent: "#cbd1d8",
    grayscaleAvatar: true,
  }),
  warm: Object.freeze({
    name: "Warm",
    background: ["#39271e", "#17100d"],
    text: "#fff2df",
    secondary: "#dbb893",
    footer: "#b08f74",
    accent: "#e9a15b",
    grayscaleAvatar: false,
  }),
  muted: Object.freeze({
    name: "Muted",
    background: ["#34383a", "#202325"],
    text: "#e3e5e5",
    secondary: "#a9afaf",
    footer: "#a1a6a6",
    accent: "#9da6a6",
    grayscaleAvatar: false,
  }),
  haze: Object.freeze({
    name: "Haze",
    background: ["#29203c", "#0f0c17"],
    text: "#f4eeff",
    secondary: "#c2aedf",
    footer: "#9a88b5",
    accent: "#a98bdf",
    grayscaleAvatar: false,
  }),
  gold: Object.freeze({
    name: "Gold",
    background: ["#33280e", "#151005"],
    text: "#fff5cf",
    secondary: "#dfc47d",
    footer: "#ae924d",
    accent: "#f2c14e",
    grayscaleAvatar: false,
  }),
});

function normalizeTheme(theme) {
  if (theme === "soft") return "classic";
  if (theme === "white") return "light";
  return Object.hasOwn(THEMES, theme) ? theme : "classic";
}

const SCENE_OPTIONS = Object.freeze([
  { name: "Black (Soft)", value: "soft", description: "Black panel · soft blend" },
  { name: "White", value: "white", description: "Pure white panel" },
  { name: "Rose", value: "rose", description: "Rose-black panel" },
  { name: "Silver", value: "silver", description: "Cool dark panel" },
  { name: "Warm", value: "warm", description: "Warm dark panel" },
  { name: "Muted", value: "muted", description: "Muted charcoal panel" },
  { name: "Haze", value: "haze", description: "Purple-black panel" },
  { name: "Gold", value: "gold", description: "Warm amber panel" },
]);

function normalizeSceneTheme(theme) {
  if (theme === "classic") return "soft";
  if (theme === "light") return "white";
  if (theme === "discord") return "silver";
  if (theme === "sunset") return "rose";
  return SCENE_OPTIONS.some((option) => option.value === theme) ? theme : "soft";
}

function getTheme(theme) {
  const id = normalizeTheme(theme);
  return { id, ...THEMES[id] };
}

const THEME_CHOICES = SCENE_OPTIONS.map(({ name, value }) => ({ name, value }));

module.exports = {
  THEMES,
  SCENE_OPTIONS,
  THEME_CHOICES,
  normalizeTheme,
  normalizeSceneTheme,
  getTheme,
};
