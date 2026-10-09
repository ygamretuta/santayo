// Fails if any px measurement in the CSS is off the 8pt grid.
// Allowed: multiples of 8, 1px hairlines, the 4px focus ring, and font sizes
// (type sizes are not on the grid; line-heights are).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".css")) files.push(p);
  }
})("src");

let bad = 0;
for (const file of files) {
  // Blank out comments but keep line numbers intact.
  const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  text.split("\n").forEach((line, i) => {
    const raw = line;
    if (/^\s*(font-size|--font)/.test(line)) return;
    for (const [, n] of line.matchAll(/(\d+(?:\.\d+)?)px/g)) {
      const v = Number(n);
      const ok = v % 8 === 0 || v === 1 || (v === 4 && /focus-ring/.test(line));
      if (!ok) {
        bad++;
        console.error(`${file}:${i + 1}  ${n}px is off the 8px grid: ${raw.trim()}`);
      }
    }
  });
}
if (bad) process.exit(1);
console.log(`8pt grid OK (${files.length} stylesheets)`);
