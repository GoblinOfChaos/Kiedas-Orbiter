import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8')
const config = JSON.parse(read('src-tauri/tauri.conf.json'))
const csp = config.app.security.csp

function directive(name) {
  const entry = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(name + ' '))
  return entry ? entry.slice(name.length).trim().split(/\s+/) : null
}

test('no directive allows every http or https host or inline script', () => {
  for (const part of csp.split(';')) {
    const tokens = part.trim().split(/\s+/)
    assert.ok(!tokens.includes('http:') && !tokens.includes('https:'), 'wildcard scheme in: ' + part)
  }
  assert.ok(!directive('script-src').includes("'unsafe-inline'"))
  assert.ok(!directive('script-src').includes("'unsafe-eval'"))
  assert.ok(!directive('default-src').includes("'unsafe-inline'"))
})

test('the inline script in index.html is allowed by its hash and is the only one', () => {
  const html = read('index.html')
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
  assert.equal(inline.length, 1)
  const hash = "'sha256-" + crypto.createHash('sha256').update(inline[0]).digest('base64') + "'"
  assert.ok(directive('script-src').includes(hash), 'script-src is missing ' + hash + ' (re-hash after editing the inline script)')
})

test('remote images are limited to the hosts the bundled data uses, and local asset schemes stay allowed', () => {
  const img = directive('img-src')
  for (const token of ['asset:', 'asset-cache:', 'http://asset-cache.localhost', 'data:', 'blob:', 'https://wiki.warframe.com', 'https://cdn.warframestat.us', 'https://browse.wf', 'https://content.warframe.com']) {
    assert.ok(img.includes(token), 'img-src is missing ' + token)
  }
  const data = read('src-tauri/data/assets/data/cosmetic-catalog-additions.json')
  const hosts = new Set([...data.matchAll(/https?:\/\/([a-z0-9.-]+)\/[^\s"]*\.(?:png|jpe?g|webp)/gi)].map((match) => match[1]))
  for (const host of hosts) assert.ok(img.includes('https://' + host), 'image host ' + host + ' used by bundled data is not allowed')
})

test('the IPC and asset transports the app needs are allowed to connect', () => {
  const connect = directive('connect-src')
  for (const token of ["'self'", 'ipc:', 'http://ipc.localhost', 'asset:', 'asset-cache:']) assert.ok(connect.includes(token), token)
})

test('blocked loads are written to the app log', () => {
  assert.match(read('src/main.jsx'), /addEventListener\('securitypolicyviolation'/)
})

test('the frontend makes no direct fetch, iframe, worker or remote stylesheet request that the policy would block', () => {
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(jsx?|css)$/.test(entry.name)) files.push(full)
    }
  }
  walk('src')
  for (const file of files) {
    const source = read(file)
    assert.doesNotMatch(source, /[^.\w]fetch\(\s*['"`]https?:/, file + ' fetches a remote URL directly')
    assert.doesNotMatch(source, /<iframe|new Worker\(|@import\s+url\(\s*['"]?https?:/, file + ' uses a frame, worker or remote stylesheet')
  }
})

test('inline style elements stay allowed through style-src-elem (Tauri adds a nonce to style-src, which disables unsafe-inline there)', () => {
  assert.ok(directive('style-src-elem').includes("'unsafe-inline'"))
  assert.ok(directive('style-src-elem').includes("'self'"))
  assert.ok(!directive('style-src-elem').includes('http:') && !directive('style-src-elem').includes('https:'))
})
