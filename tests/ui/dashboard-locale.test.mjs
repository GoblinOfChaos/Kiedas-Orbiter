import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { formatCalendarLabel, formatCalendarMonthKey } from '../../src/lib/calendarFormatting.js'

test('calendar display labels use the selected locale while month keys stay stable', () => {
  const date = new Date(2026, 9, 5)
  assert.equal(formatCalendarLabel(date, 'de', { weekday: 'long' }), 'Montag')
  assert.equal(formatCalendarLabel(date, 'fr', { weekday: 'long' }), 'lundi')
  assert.equal(formatCalendarLabel(date, 'ja', { month: 'long' }), '10月')
  assert.equal(formatCalendarMonthKey(date), 'OCTOBER')
})

test('Dashboard has no hardcoded en-US displayed date formatting', () => {
  const source = fs.readFileSync(new URL('../../src/screens/Dashboard.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /toLocaleDateString\('en-US'/)
})
