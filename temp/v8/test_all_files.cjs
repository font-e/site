const fs = require('fs');
const hashMap = require('./test_hashes.cjs');

const files = [
  "EVENTOS_CONSOLIDADO.json",
  "public/EVENTOS_CONSOLIDADO.json",
  "PESSOAS_CONSOLIDADO.json",
  "public/PESSOAS_CONSOLIDADO.json",
  "programacao.json",
  "public/programacao.json",
  "dist/programacao.json",
  "residencia.json",
  "public/residencia.json",
  "atelies.json",
  "public/atelies.json",
  "src/css/program.css",
  "src/css/arq.css",
  "src/css/atelies.css",
  "src/css/residencia.css",
  "REMIX/atelies.html",
  "REMIX/github.html"
];

const mediaRegex = /https:\/\/firebrick-mallard-266745\.hostingersite\.com\/media\/pages\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\s"',\)]+)/g;

let totalFound = 0;
let totalMissing = 0;
const missing = new Set();
const changed = new Set();

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, "utf8");
  let m;
  while ((m = mediaRegex.exec(content)) !== null) {
    const [fullUrl, type, slug, folder, filename] = m;
    const [hash, ts] = folder.split("-");
    if (hashMap.has(hash)) {
      totalFound++;
      const newFolder = hashMap.get(hash);
      if (newFolder !== folder) {
        changed.add(`${folder} -> ${newFolder}`);
      }
    } else {
      totalMissing++;
      missing.add(`${type}/${slug}/${folder}/${filename}`);
    }
  }
});

console.log("Total found across all files:", totalFound);
console.log("Total missing:", totalMissing);
console.log("Missing files:", Array.from(missing));
console.log("Changed folders:", changed.size);
