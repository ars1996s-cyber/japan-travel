// Collects every text the app can voice for a pack and writes packs/<id>-audio.js (text -> clip name).
// Usage: node tools/build-audio-list.js ja
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const id = process.argv[2] || "ja";
global.self = global;
require(path.join(__dirname, "../docs/packs", id + ".js"));
const P = self.GL_PACKS[id];
const clean = t => (P.fixSpeech ? P.fixSpeech(t) : t).replace(/[～…]/g, "").replace(/^[、。\s]+/, "").trim();
const texts = new Set();
P.SITS.forEach(s => {
  [...s.phrases, ...s.hear].forEach(p => texts.add(clean(p[0])));
  s.dialog.lines.forEach(l => texts.add(clean(l[1])));
});
P.CATS.forEach(c => c.d.trim().split("\n").forEach(l => {
  const [j, k] = l.split("|");
  texts.add(clean(k && !k.includes("/") ? k : j));
}));
P.TPL.forEach(t => t.items.forEach(x => texts.add(clean(x[0] + t.parts.join("")))));
texts.delete("");
const map = {};
[...texts].sort().forEach(t => { map[t] = crypto.createHash("sha1").update(t).digest("hex").slice(0, 10); });
fs.writeFileSync(path.join(__dirname, "../docs/packs", id + "-audio.js"),
  "self.GL_AUDIO=self.GL_AUDIO||{};\nself.GL_AUDIO." + id + "=" + JSON.stringify(map) + ";\n");
fs.writeFileSync(path.join(__dirname, id + "-texts.json"), JSON.stringify(map, null, 0));
console.log(id, Object.keys(map).length, "clips");
