import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getGridColumnCount,
  getMeasuredRowStride,
  getScrollKeyTarget,
  getScrollTopForFirstItem,
  getVirtualRootHeight,
  getVirtualScrollModel,
  getVirtualScrollMaximum,
  settleScrollJump,
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

test('inventory virtual model uses the same root height for DOM and End across real item counts and widths', () => {
  const widths = [280, 576, 872, 1168, 1464, 1760]
  const counts = [1793, 897]
  const stride = 195
  const padding = 16
  const viewport = 800

  for (const containerWidth of widths) {
    const columns = getGridColumnCount({ containerWidth, minCardWidth: 280, gap: 16 })
    assert.equal(columns, widths.indexOf(containerWidth) + 1)

    for (const itemCount of counts) {
      const model = getVirtualScrollModel({
        itemCount,
        columns,
        rowStride: stride,
        bottomPadding: padding,
      })
      const expectedRows = Math.ceil(itemCount / columns)
      const expectedRootHeight = expectedRows * stride + padding
      const expectedMaximum = Math.max(0, expectedRootHeight - viewport)

      assert.equal(model.rowCount, expectedRows)
      assert.equal(model.rootHeight, expectedRootHeight)
      assert.equal(getVirtualScrollMaximum({ ...model, clientHeight: viewport }), expectedMaximum)
      assert.equal(getScrollKeyTarget({
        key: 'End',
        scrollTop: 0,
        clientHeight: viewport,
        scrollHeight: 0,
        modelMaximumTop: expectedMaximum,
      }), expectedMaximum)
    }
  }
})

test('inventory virtual roots cannot be compressed by the surrounding column flex layouts', () => {
  const source = fs.readFileSync(new URL('../../src/screens/Inventory.jsx', import.meta.url), 'utf8')
  const roots = source.match(/className="relative pb-4 flex-shrink-0"/g) ?? []
  assert.equal(roots.length, 3)
})

test('inventory End target uses the virtual model and root offset', () => {
  const modelMaximum = getVirtualScrollMaximum({
    rowCount: 20,
    rowStride: 209,
    bottomPadding: 16,
    rootOffset: 120,
    clientHeight: 300,
  })
  assert.equal(modelMaximum, 4016)
  assert.equal(getScrollKeyTarget({
    key: 'End',
    scrollTop: 0,
    clientHeight: 300,
    scrollHeight: 500,
    modelMaximumTop: modelMaximum,
  }), 4016)
})

test('inventory jump settles after a virtual height change and is bounded to six passes', async () => {
  const container = {
    scrollTop: 0,
    scrollHeight: 500,
    clientHeight: 100,
    scrollTo({ top }) {
      this.scrollTop = Math.min(top, this.scrollHeight - this.clientHeight)
      if (this.scrollHeight === 500) this.scrollHeight += 60
    },
  }
  let frameCount = 0
  const result = await settleScrollJump({
    container,
    requestAnimationFrame(callback) {
      frameCount += 1
      callback()
    },
    getTarget: ({ scrollHeight, clientHeight }) => scrollHeight - clientHeight,
  })

  assert.equal(result.scrollTop, 460)
  assert.equal(result.scrollHeight, 560)
  assert.equal(result.passes, 3)
  assert.equal(frameCount, 3)
  assert.ok(result.passes <= 6)
})

test('inventory jump stops at six passes when layout never stabilizes', async () => {
  const container = {
    scrollTop: 0,
    scrollHeight: 500,
    clientHeight: 100,
    scrollTo({ top }) {
      this.scrollTop = top
      if (this.scrollHeight < 505) this.scrollHeight += 1
    },
  }
  const result = await settleScrollJump({
    container,
    requestAnimationFrame(callback) {
      callback()
    },
    getTarget: ({ scrollHeight, clientHeight }) => scrollHeight - clientHeight,
  })

  assert.equal(result.passes, 6)
  assert.equal(result.scrollTop, result.scrollHeight - container.clientHeight)
})
