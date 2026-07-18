import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const DIST_DIRECTORY = new URL("../dist/", import.meta.url);
const MANIFEST_PATH = new URL(".vite/manifest.json", DIST_DIRECTORY);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

const budgets = {
  initialTotalGzip: 210 * 1024,
  largestJavaScriptGzip: 165 * 1024,
  stylesheetGzip: 20 * 1024,
};

function gzipSize(relativePath) {
  return gzipSync(readFileSync(new URL(relativePath, DIST_DIRECTORY))).byteLength;
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function collectInitialFiles(key, files = new Set(), visited = new Set()) {
  if (visited.has(key)) return files;
  visited.add(key);
  const chunk = manifest[key];
  if (!chunk) return files;
  if (chunk.file) files.add(chunk.file);
  for (const stylesheet of chunk.css ?? []) files.add(stylesheet);
  for (const importedKey of chunk.imports ?? []) {
    collectInitialFiles(importedKey, files, visited);
  }
  return files;
}

const entryKeys = Object.entries(manifest)
  .filter(([, chunk]) => chunk.isEntry)
  .map(([key]) => key);

if (!entryKeys.length) throw new Error("No application entry found in the Vite manifest.");

const initialFiles = new Set();
for (const key of entryKeys) collectInitialFiles(key, initialFiles);

const assetFiles = readdirSync(new URL("assets/", DIST_DIRECTORY))
  .filter((file) => statSync(new URL(`assets/${file}`, DIST_DIRECTORY)).isFile());
const javascriptFiles = assetFiles.filter((file) => file.endsWith(".js"));
const stylesheetFiles = assetFiles.filter((file) => file.endsWith(".css"));

const initialTotalGzip = [...initialFiles].reduce((total, file) => total + gzipSize(file), 0);
const largestJavaScript = javascriptFiles
  .map((file) => ({ file, size: gzipSize(`assets/${file}`) }))
  .sort((a, b) => b.size - a.size)[0];
const stylesheetGzip = stylesheetFiles.reduce((total, file) => total + gzipSize(`assets/${file}`), 0);

const measurements = [
  ["Initial route (gzip)", initialTotalGzip, budgets.initialTotalGzip],
  [`Largest JS chunk: ${largestJavaScript.file}`, largestJavaScript.size, budgets.largestJavaScriptGzip],
  ["All stylesheets (gzip)", stylesheetGzip, budgets.stylesheetGzip],
];

let failed = false;
for (const [label, actual, budget] of measurements) {
  const passed = actual <= budget;
  failed ||= !passed;
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}: ${format(actual)} / ${format(budget)}`);
}

if (failed) {
  console.error("Bundle budget exceeded. Split the affected route or dependency before merging.");
  process.exitCode = 1;
}
