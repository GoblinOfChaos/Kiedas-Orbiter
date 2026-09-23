/**
 * Shared structured event contract.
 *
 * This project is JavaScript, so the JSDoc typedef is the frontend's typed
 * contract while Rust's StructuredEvent mirrors the same JSON shape.
 */
/** @typedef {'trace'|'debug'|'info'|'warn'|'error'|'fatal'} LogLevel */
/** @typedef {'frontend'|'rust'|'network'|'ipc'|'data'} LogSource */
/** @typedef {'started'|'sample'|'complete'|'failed'|'ignored'} LogPhase */
/** @typedef {'success'|'failure'|'cancelled'|'dropped'|'unknown'} LogOutcome */

/** @typedef {Object} StructuredEvent
 * @property {number} schema
 * @property {string} event_id
 * @property {string} session_id
 * @property {number} sequence
 * @property {string} timestamp_utc
 * @property {number} monotonic_ms
 * @property {string} process
 * @property {string} window
 * @property {LogSource} source
 * @property {LogLevel} level
 * @property {string} event
 * @property {string=} screen
 * @property {string=} route
 * @property {string=} component
 * @property {string=} control_id
 * @property {string=} interaction
 * @property {string=} correlation_id
 * @property {string=} parent_event_id
 * @property {LogPhase=} phase
 * @property {number=} duration_ms
 * @property {LogOutcome=} outcome
 * @property {Record<string, unknown>} payload
 * @property {Record<string, unknown>=} error
 * @property {Record<string, unknown>} build
 */

export const LOG_SCHEMA = 1;
