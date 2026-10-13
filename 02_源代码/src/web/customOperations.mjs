/**
 * Persistent custom JavaScript function library.
 *
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

export const CUSTOM_OPERATIONS_KEY = "lapcry.customOperations.v1";

const MAX_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 100000;
const MIN_TIMEOUT = 1;
const MAX_TIMEOUT = 30000;

/**
 * Normalises a timeout value.
 * @param {*} value
 * @returns {number}
 */
function normaliseTimeout(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 2000;
    return Math.min(Math.max(parsed, MIN_TIMEOUT), MAX_TIMEOUT);
}

/**
 * Generates a stable identifier without relying on modern browser APIs.
 * @returns {string}
 */
function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Returns a clean custom operation object.
 * @param {Object} operation
 * @returns {Object}
 */
export function normaliseCustomOperation(operation) {
    const name = String(operation?.name || "").trim().slice(0, MAX_NAME_LENGTH);
    const body = String(operation?.body || "").slice(0, MAX_BODY_LENGTH);
    return {
        id: String(operation?.id || createId()),
        name,
        body,
        timeout: normaliseTimeout(operation?.timeout),
        updatedAt: Number(operation?.updatedAt) || Date.now()
    };
}

/**
 * Loads custom operations from local storage.
 * @returns {Object[]}
 */
export function loadCustomOperations() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CUSTOM_OPERATIONS_KEY) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normaliseCustomOperation)
            .filter(operation => operation.name && operation.body);
    } catch (err) {
        return [];
    }
}

/**
 * Persists custom operations to local storage.
 * @param {Object[]} operations
 * @returns {Object[]}
 */
export function saveCustomOperations(operations) {
    const normalised = Array.isArray(operations) ?
        operations.map(normaliseCustomOperation).filter(operation => operation.name && operation.body) :
        [];
    localStorage.setItem(CUSTOM_OPERATIONS_KEY, JSON.stringify(normalised));
    return normalised;
}

/**
 * Creates a new custom operation.
 * @param {Object} values
 * @returns {Object}
 */
export function createCustomOperation(values) {
    return normaliseCustomOperation({
        id: createId(),
        name: values.name,
        body: values.body,
        timeout: values.timeout,
        updatedAt: Date.now()
    });
}

/**
 * Inserts or replaces a custom operation.
 * @param {Object[]} operations
 * @param {Object} operation
 * @returns {Object[]}
 */
export function upsertCustomOperation(operations, operation) {
    const normalised = normaliseCustomOperation({
        ...operation,
        updatedAt: Date.now()
    });
    const index = operations.findIndex(item => item.id === normalised.id);
    const next = operations.slice();
    if (index >= 0) next[index] = normalised;
    else next.push(normalised);
    next.sort((a, b) => a.name.localeCompare(b.name));
    return next;
}

/**
 * Removes a custom operation by identifier.
 * @param {Object[]} operations
 * @param {string} id
 * @returns {Object[]}
 */
export function removeCustomOperation(operations, id) {
    return operations.filter(operation => operation.id !== id);
}

/**
 * Validates editor values before saving.
 * @param {Object} values
 * @returns {string}
 */
export function validateCustomOperation(values) {
    if (!String(values.name || "").trim()) return "Custom function name is required.";
    if (!String(values.body || "").trim()) return "Custom function body is required.";
    const timeout = parseInt(values.timeout, 10);
    if (!Number.isFinite(timeout) || timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT) {
        return `Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT} ms.`;
    }
    return "";
}
