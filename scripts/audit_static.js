// scripts/audit_static.js
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const parser = require("../node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser");
const traverse = require("../node_modules/.pnpm/@babel+traverse@7.29.0/node_modules/@babel/traverse").default;

console.log("\x1b[1m\x1b[36m==============================================================\x1b[0m");
console.log("\x1b[1m\x1b[36m             1. INDEPENDENT STATIC CODE ANALYSIS             \x1b[0m");
console.log("\x1b[1m\x1b[36m==============================================================\x1b[0m\n");

let errors = 0;

function scanDir(dir, filter) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat && stat.isDirectory()) {
      if (!file.includes("node_modules") && !file.includes(".git") && !file.includes("target")) {
        results = results.concat(scanDir(p, filter));
      }
    } else if (filter(p)) {
      results.push(p);
    }
  }
  return results;
}

const jsFiles = scanDir("src", (p) => p.endsWith(".js") || p.endsWith(".jsx"));

// Rule 1: Detect dangerous fuzzy substring matches in array searches
for (const f of jsFiles) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes(".some(") && line.includes(".includes(") && line.includes(".length >")) {
      console.log(`\x1b[31m[STATIC ERROR]\x1b[0m ${f}:${idx + 1}: Unsafe fuzzy substring array matching detected (prone to false-positive completion bugs):`);
      console.log(`  \x1b[33m${line.trim()}\x1b[0m\n`);
      errors++;
    }
  });
}

// Rule 2: Detect silent component hiding on image load error
for (const f of jsFiles) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes("onError=") && (line.includes("display = 'none'") || line.includes("display = \"none\""))) {
      console.log(`\x1b[31m[STATIC ERROR]\x1b[0m ${f}:${idx + 1}: Silent image element hiding (e.target.style.display = 'none') detected; causes blank UI cards on missing network requests.`);
      console.log(`  \x1b[33m${line.trim()}\x1b[0m\n`);
      errors++;
    }
  });
}

// Rule 3: Detect rogue secondary wrapper APIs mutating official state
const BANNED_PATTERNS = [
  "api.warframestat.us",
  "fandom.com",
  "warframe.fandom.com"
];

for (const f of jsFiles) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    for (const pattern of BANNED_PATTERNS) {
      if (line.includes(pattern)) {
        console.log(`\x1b[31m[STATIC ERROR]\x1b[0m ${f}:${idx + 1}: Banned 3rd party API endpoint detected (${pattern}):`);
        console.log(`  \x1b[33m${line.trim()}\x1b[0m\n`);
        errors++;
      }
    }
  });
}

// Rule 4: Detect banned fallback messages in acquisition drawers
for (const f of jsFiles) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes("No verified drop table route")) {
      console.log(`\x1b[31m[STATIC ERROR]\x1b[0m ${f}:${idx + 1}: Banned fallback error message detected:`);
      console.log(`  \x1b[33m${line.trim()}\x1b[0m\n`);
      errors++;
    }
  });
}

// Rule 5: Strict AST Scope Traversal (Catches all undeclared variables, missing imports, and broken handlers)
const STANDARD_GLOBALS = new Set([
  "console", "window", "document", "localStorage", "sessionStorage", "setTimeout", "setInterval",
  "clearInterval", "clearTimeout", "Date", "Math", "Number", "String", "Boolean",
  "Array", "Object", "Set", "Map", "Promise", "JSON", "parseInt", "parseFloat",
  "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent", "fetch", "alert", "confirm",
  "TextDecoder", "TextEncoder", "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array",
  "Float32Array", "Float64Array", "ArrayBuffer", "DataView", "Blob", "File", "URL", "URLSearchParams",
  "Intl", "requestAnimationFrame", "cancelAnimationFrame", "navigator", "location", "performance",
  "btoa", "atob", "crypto", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent", "Image", "FileReader",
  "FormData", "Headers", "Request", "Response", "AbortController", "AbortSignal",
  "IntersectionObserver", "ResizeObserver", "MutationObserver", "HTMLElement", "Element",
  "Node", "NodeList", "DOMParser", "XMLSerializer", "WebSocket", "Worker", "history",
  "screen", "createImageBitmap", "getComputedStyle", "process"
]);

for (const f of jsFiles) {
  const fileContent = fs.readFileSync(f, "utf8");
  try {
    const ast = parser.parse(fileContent, {
      sourceType: "module",
      plugins: ["jsx"]
    });

    traverse(ast, {
      Program(p) {
        p.traverse({
          ReferencedIdentifier(identPath) {
            const name = identPath.node.name;
            if (!STANDARD_GLOBALS.has(name) && !identPath.scope.hasBinding(name)) {
              console.log(`\x1b[31m[STATIC ERROR]\x1b[0m ${f}:${identPath.node.loc.start.line}: Undeclared identifier \"${name}\" referenced in scope.`);
              errors++;
            }
          }
        });
      }
    });
  } catch (parseErr) {
    console.log(`\x1b[31m[STATIC ERROR]\x1b[0m ${f}: Failed to parse AST: ${parseErr.message}`);
    errors++;
  }
}

if (errors > 0) {
  console.log(`\x1b[31m[STATIC ANALYSIS FAILED] Found ${errors} critical errors.\x1b[0m\n`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[STATIC ANALYSIS PASSED] 0 Errors Found (All AST Scopes Verified Clean).\x1b[0m\n`);
}
