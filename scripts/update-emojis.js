// Replaces Functions/twemoji/72x72 with the latest jdecked/twemoji PNGs.
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dest = path.join(__dirname, "..", "Functions", "twemoji", "72x72");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "twemoji-"));
try {
  execFileSync("git", ["clone", "--depth", "1", "https://github.com/jdecked/twemoji.git", tmp], { stdio: "inherit" });
  const src = path.join(tmp, "assets", "72x72");
  if (!fs.existsSync(src)) throw new Error("assets/72x72 missing in clone");
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true }); // overwrites, keeps old files
  console.log(`Emojis updated: ${fs.readdirSync(dest).length} files in ${dest}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
