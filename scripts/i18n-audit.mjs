// AST-based scanner for hardcoded user-facing English text that bypasses
// t(). Replaces fragile regex greps (which repeatedly missed multi-line
// JSX, module-level constants outside any component, and shared
// components) - see project_full_app_locale_audit.md memory for the
// history of misses this is meant to close.
//
// Usage: node scripts/i18n-audit.mjs [--json]
import { parse } from '../node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

// Deliberately-English allowlist built up during the 2026-09-16 audit.
// Keep in sync with project_full_app_locale_audit.md's allowlist section.
const ALLOWLIST = new Set([
  // Proper nouns / official terms left English pending official-dict lookup
  'Cambion Drift', 'Duviri', 'Vallis', 'Holdfasts', 'Void Storm',
  // Theme brand names (deliberately untranslated, see ThemeContext.jsx)
  'Vitruvian', 'Corpus', 'Fortuna', 'Equinox', 'Harrier', 'Grineer',
  'Stalker', 'Conquera', 'Lunar Renewal', 'Baruuk', 'Dark Lotus',
  'Deadlock', 'Legacy', 'POM-2',
  // Technical / brand names never translated
  'JavaScript', 'TypeScript', 'Python', 'Rust', 'Warframe', 'Preview',
  'Ko-fi', 'Etsy shop', 'X/Twitter', 'GitHub',
]);

const USER_FACING_ATTRS = new Set(['placeholder', 'title', 'alt', 'aria-label']);
const USER_FACING_KEYS = new Set(['label', 'desc', 'title', 'subtitle', 'name', 'text', 'message', 'tier', 'badge']);

const EXCLUDE_DIRS = new Set(['node_modules', '.git']);

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function looksLikeUserText(str) {
  const s = str.trim();
  if (!s) return false;
  if (ALLOWLIST.has(s)) return false;
  if (/^[a-z0-9_\-./]+$/.test(s)) return false; // technical id/slug/path-like
  if (/^[A-Z_]+$/.test(s) && s.length < 4) return false; // short enum-like
  if (/^\/Lotus\//.test(s)) return false; // internal DE paths
  if (/\.(png|json|svg|jpg|jpeg|css)$/i.test(s)) return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false; // hex colors
  if (!/[a-zA-Z]/.test(s)) return false; // no letters at all
  if (s.length < 3) return false;
  // require at least one space OR a capital-letter word - filters out
  // single lowercase technical tokens like "flex" while keeping "Steel Path"
  if (!/\s/.test(s) && !/^[A-Z]/.test(s)) return false;
  return true;
}

function isInsideTCall(pathNode) {
  // Walk up ancestors (Babel nodes carry no parent pointers by default in
  // this hand-rolled walk, so callers pass the ancestor stack explicitly)
  return false; // handled by caller via ancestor stack, see below
}

const findings = [];

function visit(node, file, ancestors) {
  if (!node || typeof node.type !== 'string') return;

  // Skip entirely if this string literal is an argument to t(...)
  const isArgOfTCall = (n) => {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const a = ancestors[i];
      if (a.type === 'CallExpression' && a.callee && a.callee.type === 'Identifier' && a.callee.name === 't') {
        return true;
      }
      // stop climbing once we leave the immediate argument list chain
      if (a.type !== 'CallExpression' && a.type !== 'ObjectExpression' && a.type !== 'TemplateLiteral') break;
    }
    return false;
  };

  if (node.type === 'JSXText') {
    if (looksLikeUserText(node.value)) {
      findings.push({ file, line: node.loc?.start.line, kind: 'jsx-text', text: node.value.trim() });
    }
  }

  if (node.type === 'JSXAttribute' && node.name && USER_FACING_ATTRS.has(node.name.name)) {
    const v = node.value;
    if (v && v.type === 'StringLiteral' && looksLikeUserText(v.value)) {
      findings.push({ file, line: node.loc?.start.line, kind: `attr:${node.name.name}`, text: v.value });
    }
  }

  if (node.type === 'ObjectProperty' && node.key && (node.key.name || node.key.value) && USER_FACING_KEYS.has(node.key.name || node.key.value)) {
    const v = node.value;
    if (v && v.type === 'StringLiteral' && looksLikeUserText(v.value) && !isArgOfTCall([...ancestors, node])) {
      findings.push({ file, line: node.loc?.start.line, kind: `field:${node.key.name || node.key.value}`, text: v.value });
    }
  }

  // Recurse into all child nodes generically
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'leadingComments' || key === 'trailingComments') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c.type === 'string') visit(c, file, [...ancestors, node]);
      }
    } else if (child && typeof child.type === 'string') {
      visit(child, file, [...ancestors, node]);
    }
  }
}

const files = walkFiles(SRC).filter((f) => !f.includes(`${path.sep}i18n${path.sep}`));

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  } catch (e) {
    console.error(`PARSE FAILED: ${file}: ${e.message}`);
    continue;
  }
  visit(ast.program, path.relative(SRC, file), []);
}

const asJson = process.argv.includes('--json');
if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  console.log(`${findings.length} candidate hardcoded strings found\n`);
  const byFile = {};
  for (const f of findings) (byFile[f.file] ??= []).push(f);
  for (const [file, items] of Object.entries(byFile).sort()) {
    console.log(`\n=== ${file} (${items.length}) ===`);
    for (const it of items) console.log(`  L${it.line} [${it.kind}] ${JSON.stringify(it.text)}`);
  }
}
