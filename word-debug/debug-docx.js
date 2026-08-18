const fs = require("fs");
const path = require("path");
const debugWordSystemLayout = require("../src/services/word/debugWordSystemLayout");

const filePath = process.argv[2];
if (!filePath) {
  throw new Error("Pass path to docx");
}

const report = debugWordSystemLayout(filePath);

const out = path.join(process.cwd(), "debug-system-layout.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
console.log(`Saved: ${out}`);
