import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { completeScreenMount } from '../../src/lib/logging/screenInstrumentation.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE_ROOT = process.env.P33_SOURCE_ROOT || path.join(ROOT, 'src')

const ALLOWED_EXPRESSION_CALLBACKS = new Map([
  ['installUiDelegation', 'returns the DOM listener cleanup function required by the effect'],
])

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(file) : /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [file] : []
  })
}

function matchingDelimiter(source, start, open, close) {
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1 }
      continue
    }
    if (quote) {
      if (escaped) { escaped = false; continue }
      if (char === '\\') { escaped = true; continue }
      if (char === quote) quote = null
      continue
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue }
    if (char === open) depth += 1
    if (char === close) {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length
}

function topLevelNonFunctionReturn(body) {
  let braceDepth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    const next = body[index + 1]
    if (lineComment) { if (char === '\n') lineComment = false; continue }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1 }; continue }
    if (quote) {
      if (escaped) { escaped = false; continue }
      if (char === '\\') { escaped = true; continue }
      if (char === quote) quote = null
      continue
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue }
    if (char === '{') { braceDepth += 1; continue }
    if (char === '}') { braceDepth -= 1; continue }
    if (braceDepth !== 0 || !body.startsWith('return', index) || /[\w$]/.test(body[index - 1] || '')) continue
    const returned = body.slice(index + 6).match(/^\s+(null|true|false|[-+]?\d+(?:\.\d+)?|['"`]|[\[{])/)
    if (returned) return { index, value: returned[1] }
  }
  return null
}

function scanEffects(file) {
  const source = fs.readFileSync(file, 'utf8')
  const violations = []
  const hookPattern = /\buse(?:Layout)?Effect\s*\(/g
  let hookMatch
  while ((hookMatch = hookPattern.exec(source))) {
    const callbackStart = hookMatch.index + hookMatch[0].length
    const arrow = source.indexOf('=>', callbackStart)
    const hookEnd = matchingDelimiter(source, source.indexOf('(', hookMatch.index), '(', ')')
    if (arrow < 0 || hookEnd < 0 || arrow > hookEnd) continue
    let bodyStart = arrow + 2
    while (/\s/.test(source[bodyStart] || '')) bodyStart += 1
    if (source[bodyStart] !== '{') {
      const expression = source.slice(bodyStart, hookEnd)
      const callee = expression.match(/^([A-Za-z_$][\w$]*)/)?.[1] || '<expression>'
      if (!ALLOWED_EXPRESSION_CALLBACKS.has(callee)) {
        violations.push(`${path.relative(ROOT, file)}:${lineNumber(source, hookMatch.index)} expression callback returns ${callee}()`)
      }
      continue
    }
    const bodyEnd = matchingDelimiter(source, bodyStart, '{', '}')
    if (bodyEnd < 0) continue
    const body = source.slice(bodyStart + 1, bodyEnd)
    const nonFunctionReturn = topLevelNonFunctionReturn(body)
    if (nonFunctionReturn) {
      violations.push(`${path.relative(ROOT, file)}:${lineNumber(source, bodyStart + 1 + nonFunctionReturn.index)} block returns a non-function literal`)
    }
  }
  return violations
}

test('all effect callbacks are cleanup-safe or explicitly reviewed', () => {
  const violations = sourceFiles(SOURCE_ROOT).flatMap(scanEffects)
  assert.deepEqual(violations, [])
})

test('reviewed effect cleanup allowlist documents a cleanup-producing function', () => {
  assert.equal(ALLOWED_EXPRESSION_CALLBACKS.get('installUiDelegation'), 'returns the DOM listener cleanup function required by the effect')
  const logger = fs.readFileSync(path.join(SOURCE_ROOT, 'lib/logging/logger.js'), 'utf8')
  assert.match(logger, /function installUiDelegation[\s\S]*?return\s*\(\)\s*=>/)
})

test('PageLayout effect logic completes a mount without returning the duration', () => {
  let completeCalls = 0
  const ref = { current: { tracker: { complete: () => { completeCalls += 1; return 42 } } } }
  assert.equal(completeScreenMount(ref), undefined)
  assert.equal(completeCalls, 1)
  assert.doesNotThrow(() => completeScreenMount({ current: null }))
})
