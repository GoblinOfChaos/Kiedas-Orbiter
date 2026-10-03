export const RIVEN_ARMING_EVENTS = Object.freeze({
  SCREEN_OPEN: 'screen-open',
  GRADE_ARMED: 'grade-armed',
  REROLL: 'reroll',
  REROLL_CONFIRMED: 'reroll-confirmed',
  SCREEN_CLOSED: 'screen-closed',
})

export function createRivenArmingState(isNew) {
  return { isNew, armed: false, newRollSeen: false, hasRerolled: false }
}

export function applyRivenArming(state, event) {
  const next = {
    ...state,
    startOcr: false,
    position: null,
    cancelHideTimer: [
      RIVEN_ARMING_EVENTS.GRADE_ARMED,
      RIVEN_ARMING_EVENTS.REROLL,
      RIVEN_ARMING_EVENTS.SCREEN_OPEN,
      RIVEN_ARMING_EVENTS.SCREEN_CLOSED,
    ].includes(event),
    hideAfterMs: null,
    clearResult: false,
  }

  if (event === RIVEN_ARMING_EVENTS.SCREEN_OPEN) {
    next.armed = false
    next.newRollSeen = false
    next.hasRerolled = false
  } else if (event === RIVEN_ARMING_EVENTS.GRADE_ARMED) {
    next.armed = true
    if (!next.isNew || next.newRollSeen) {
      next.startOcr = true
      next.position = next.isNew ? 'Middle' : (next.hasRerolled ? 'Left' : 'Middle')
    }
  } else if (event === RIVEN_ARMING_EVENTS.REROLL) {
    next.newRollSeen = true
    next.armed = false
    if (next.isNew) next.clearResult = true
  } else if (event === RIVEN_ARMING_EVENTS.REROLL_CONFIRMED) {
    next.newRollSeen = false
    next.hasRerolled = false
    next.armed = false
    if (next.isNew) next.hideAfterMs = 2000
    else next.clearResult = true
  } else if (event === RIVEN_ARMING_EVENTS.SCREEN_CLOSED) {
    next.armed = false
    next.newRollSeen = false
    next.hasRerolled = false
  }

  if (event === RIVEN_ARMING_EVENTS.REROLL && !next.isNew) next.hasRerolled = true

  return next
}

export function rivenPromptVisibility(visible, event) {
  if (event === RIVEN_ARMING_EVENTS.SCREEN_OPEN) return true
  if (event === RIVEN_ARMING_EVENTS.SCREEN_CLOSED) return false
  return visible
}
