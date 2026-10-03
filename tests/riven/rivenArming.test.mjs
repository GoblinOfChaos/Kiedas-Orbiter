import test from 'node:test'
import assert from 'node:assert/strict'
import { applyRivenArming, createRivenArmingState, RIVEN_ARMING_EVENTS, rivenPromptVisibility } from '../../src/lib/rivenArming.js'

const { SCREEN_OPEN, GRADE_ARMED, REROLL, REROLL_CONFIRMED, SCREEN_CLOSED } = RIVEN_ARMING_EVENTS

function step(state, event) {
  return applyRivenArming(state, event)
}

test('two presses on the same roll each start one OCR', () => {
  let state = createRivenArmingState(false)
  state = step(state, SCREEN_OPEN)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [true, 'Middle'])
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [true, 'Middle'])
})

test('new-roll window grades only while a new roll is on screen', () => {
  let state = createRivenArmingState(true)
  state = step(state, SCREEN_OPEN)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [false, null])
  state = step(state, REROLL)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [true, 'Middle'])
  state = step(state, REROLL_CONFIRMED)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [false, null])
})

test('non-new card uses Middle before reroll, Left during reroll, then Middle again', () => {
  let state = createRivenArmingState(false)
  state = step(state, SCREEN_OPEN)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [true, 'Middle'])
  state = step(state, REROLL)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [true, 'Left'])
  state = step(state, REROLL_CONFIRMED)
  state = step(state, GRADE_ARMED)
  assert.deepEqual([state.startOcr, state.position], [true, 'Middle'])
})

test('no OCR without a press for every other event', () => {
  for (const isNew of [true, false]) {
    let state = createRivenArmingState(isNew)
    for (const event of [SCREEN_OPEN, REROLL, REROLL_CONFIRMED, SCREEN_CLOSED]) {
      state = step(state, event)
      assert.equal(state.startOcr, false, `${isNew ? 'new' : 'current'} ${event}`)
    }
  }
})

test('new-roll confirmation requests a delayed hide and cancels it on fresh activity', () => {
  let state = createRivenArmingState(true)
  state = step(state, REROLL_CONFIRMED)
  assert.equal(state.hideAfterMs, 2000)
  assert.equal(state.clearResult, false)

  for (const event of [GRADE_ARMED, REROLL, SCREEN_OPEN, SCREEN_CLOSED]) {
    state = step(state, event)
    assert.equal(state.cancelHideTimer, true, event)
  }
})

test('new-roll generation clears the previous result without starting OCR', () => {
  const next = step(createRivenArmingState(true), REROLL)
  assert.equal(next.clearResult, true)
  assert.equal(next.startOcr, false)
})

test('current card keeps its result through reroll but clears after confirmation', () => {
  let state = step(createRivenArmingState(false), REROLL)
  assert.equal(state.clearResult, false)
  assert.equal(state.startOcr, false)
  state = step(state, REROLL_CONFIRMED)
  assert.equal(state.clearResult, true)
  assert.equal(state.startOcr, false)
})

test('prompt remains visible on activation and hides only on close', () => {
  let visible = rivenPromptVisibility(false, SCREEN_OPEN)
  visible = rivenPromptVisibility(visible, GRADE_ARMED)
  assert.equal(rivenPromptVisibility(visible, GRADE_ARMED), true)
  assert.equal(rivenPromptVisibility(visible, SCREEN_CLOSED), false)
})
