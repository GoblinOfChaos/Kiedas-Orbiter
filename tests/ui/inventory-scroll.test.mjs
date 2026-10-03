import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getMeasuredRowStride,
  getScrollKeyTarget,
  getScrollTopForFirstItem,
  getVirtualRootHeight,
} from '../../src/lib/inventoryScroll.js'

test('inventory keyboard targets handle paging, Home, End, Space, and unknown keys', () => {
  const dimensions = { scrollTop: 400, clientHeight: 300, scrollHeight: 1000 }
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'Home' }), 0)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'End' }), 700)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'PageUp' }), 100)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'PageDown' }), 700)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: ' ', shiftKey: true }), 100)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: ' ' }), 700)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'ArrowDown' }), null)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'PageUp', scrollTop: 0 }), 0)
  assert.equal(getScrollKeyTarget({ ...dimensions, key: 'PageDown', scrollTop: 900 }), 700)
})

test('inventory stride uses the measured card height and falls back before measurement', () => {
  assert.equal(getMeasuredRowStride(193, 16, 184), 209)
  assert.equal(getMeasuredRowStride(0, 16, 184), 184)
  assert.equal(getMeasuredRowStride(undefined, 16, 184), 184)
})

test('inventory resize preserves the first visible item across column changes', () => {
  assert.equal(getScrollTopForFirstItem({ firstItemIndex: 14, columns: 4, rowStride: 209 }), 627)
  assert.equal(getScrollTopForFirstItem({ firstItemIndex: 14, columns: 2, rowStride: 209 }), 1463)
  assert.equal(getScrollTopForFirstItem({ firstItemIndex: 0, columns: 7, rowStride: 209 }), 0)
})

test('inventory virtual root includes bottom padding only when rows exist', () => {
  assert.equal(getVirtualRootHeight({ rowCount: 0, rowStride: 209, bottomPadding: 16 }), 0)
  assert.equal(getVirtualRootHeight({ rowCount: 1, rowStride: 209, bottomPadding: 16 }), 225)
  assert.equal(getVirtualRootHeight({ rowCount: 3, rowStride: 209, bottomPadding: 16 }), 643)
  assert.equal(getVirtualRootHeight({ rowCount: 3, rowStride: 209 }), 627)
})
