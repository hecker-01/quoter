const path = require("node:path");
const { GlobalFonts } = require("@napi-rs/canvas");

const BASE_FONT_FAMILY = "Quoter Sans";
const EMOJI_FONT_FAMILY = "EmojiFont";
const CJK_FONT_FAMILY = "Quote JP";
const BASE_FONT_STACK = `'${BASE_FONT_FAMILY}', '${EMOJI_FONT_FAMILY}', '${CJK_FONT_FAMILY}'`;

const FONTS = Object.freeze([
  ["@fontsource/m-plus-rounded-1c", "m-plus-rounded-1c-latin-400-normal.woff", "Quote MPlus"],
  ["@fontsource/dela-gothic-one", "dela-gothic-one-latin-400-normal.woff", "Quote Dela"],
  ["@fontsource/dotgothic16", "dotgothic16-latin-400-normal.woff", "Quote Dot"],
  ["@fontsource/hachi-maru-pop", "hachi-maru-pop-latin-400-normal.woff", "Quote Hachi"],
  ["@fontsource/rampart-one", "rampart-one-latin-400-normal.woff", "Quote Rampart"],
  ["@fontsource/reggae-one", "reggae-one-latin-400-normal.woff", "Quote Reggae"],
  ["@fontsource/rocknroll-one", "rocknroll-one-latin-400-normal.woff", "Quote RocknRoll"],
  ["@fontsource/zen-old-mincho", "zen-old-mincho-latin-400-normal.woff", "Quote Zen"],
  ["@fontsource/yuji-syuku", "yuji-syuku-latin-400-normal.woff", "Quote Yuji"],
  ["@fontsource/yusei-magic", "yusei-magic-latin-400-normal.woff", "Quote Yusei"],
  ["@fontsource/inconsolata", "inconsolata-latin-400-normal.woff", "Quote Inconsolata"],
  ["@fontsource/exo-2", "exo-2-latin-400-normal.woff", "Quote Exo2"],
  ["@fontsource/bruno-ace-sc", "bruno-ace-sc-latin-400-normal.woff", "Quote Bruno"],
  ["@fontsource/castoro-titling", "castoro-titling-latin-400-normal.woff", "Quote Castoro"],
  ["@fontsource/poltawski-nowy", "poltawski-nowy-latin-400-normal.woff", "Quote Poltawski"],
  ["@fontsource/vina-sans", "vina-sans-latin-400-normal.woff", "Quote Vina"],
  ["@fontsource/dancing-script", "dancing-script-latin-400-normal.woff", "Quote Dancing"],
  ["@fontsource/cherry-bomb-one", "cherry-bomb-one-latin-400-normal.woff", "Quote Cherry"],
]);

const REQUIRED_FONT_FAMILIES = Object.freeze([
  BASE_FONT_FAMILY,
  EMOJI_FONT_FAMILY,
  "Papyrus",
  CJK_FONT_FAMILY,
  ...FONTS.map(([, , family]) => family),
]);

let registered = false;

function fontsourceFile(packageName, filename) {
  return require.resolve(`${packageName}/files/${filename}`);
}

function registerRequiredFont(file, family) {
  GlobalFonts.registerFromPath(file, family);
  if (!GlobalFonts.has(family)) {
    throw new Error(`Canvas could not register required font ${family} from ${file}`);
  }
}

function registerQuoteFonts() {
  if (registered) return REQUIRED_FONT_FAMILIES;

  const fontsDir = path.join(__dirname, "..", "Fonts");
  registerRequiredFont(
    path.join(fontsDir, "LiberationSans-Regular.ttf"),
    BASE_FONT_FAMILY,
  );
  registerRequiredFont(
    path.join(fontsDir, "LiberationSans-Bold.ttf"),
    BASE_FONT_FAMILY,
  );
  registerRequiredFont(
    path.join(__dirname, "Twemoji.Mozilla.ttf"),
    EMOJI_FONT_FAMILY,
  );
  registerRequiredFont(require("@canvas-fonts/papyrus"), "Papyrus");
  // Glyph fallback for Japanese text; the latin-only fonts above have none.
  registerRequiredFont(
    fontsourceFile("@fontsource/m-plus-rounded-1c", "m-plus-rounded-1c-japanese-400-normal.woff"),
    CJK_FONT_FAMILY,
  );

  for (const [packageName, filename, family] of FONTS) {
    registerRequiredFont(fontsourceFile(packageName, filename), family);
  }

  registered = true;
  return REQUIRED_FONT_FAMILIES;
}

module.exports = {
  BASE_FONT_FAMILY,
  EMOJI_FONT_FAMILY,
  BASE_FONT_STACK,
  REQUIRED_FONT_FAMILIES,
  registerQuoteFonts,
};
