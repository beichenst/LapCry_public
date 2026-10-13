/**
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

/**
 * Runs a user-defined JavaScript function against the input in an isolated Worker.
 */
class CustomJavaScript extends Operation {

    /**
     * CustomJavaScript constructor
     */
    constructor() {
        super();

        this.name = "Custom JavaScript";
        this.module = "LapCry";
        this.description = "Runs a named user-defined JavaScript function in an isolated local Worker. The function receives input and args, and must return a value. Network APIs are disabled.";
        this.inputType = "string";
        this.outputType = "string";
        this.args = [
            {
                "name": "Function name",
                "type": "string",
                "value": "Custom JavaScript"
            },
            {
                "name": "Function body",
                "type": "text",
                "value": "return input.split(\"\").reverse().join(\"\");",
                "rows": 10
            },
            {
                "name": "Timeout (ms)",
                "type": "number",
                "value": 2000,
                "min": 1,
                "max": 30000
            }
        ];
    }

    /**
     * @param {string} input
     * @param {Object[]} args
     * @returns {Promise<string>|string}
     */
    run(input, args) {
        const code = args[1] || "";
        const timeout = Math.min(Math.max(parseInt(args[2], 10) || 2000, 1), 30000);

        if (!code.trim()) {
            throw new OperationError("Custom JavaScript function body cannot be empty.");
        }

        const isNodeRuntime = typeof window === "undefined" &&
            typeof process !== "undefined" &&
            Boolean(process.versions?.node);

        if (isNodeRuntime || typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
            return this.runInline(input, code);
        }

        return this.runInWorker(input, code, timeout);
    }

    /**
     * Node fallback used by the API and test runner.
     * @param {string} input
     * @param {string} code
     * @returns {string}
     */
    runInline(input, code) {
        try {
            const fn = new Function("input", "args", `"use strict";\n${code}`);
            return this.normaliseOutput(fn(input, Object.freeze({})));
        } catch (err) {
            throw new OperationError(`Custom JavaScript failed: ${err.message || err}`);
        }
    }

    /**
     * Browser path. A nested Worker provides a hard timeout and prevents a runaway
     * custom function from blocking the main ChefWorker.
     * @param {string} input
     * @param {string} code
     * @param {number} timeout
     * @returns {Promise<string>}
     */
    runInWorker(input, code, timeout) {
        const workerSource = `
"use strict";
const blockNetwork = () => {
    throw new Error("Network access is disabled for Custom JavaScript operations.");
};
for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts"]) {
    try {
        Object.defineProperty(self, name, {value: blockNetwork, configurable: true, writable: true});
    } catch (err) {
        self[name] = blockNetwork;
    }
}
self.onmessage = async (event) => {
    try {
        const data = event.data || {};
        const fn = new Function("input", "args", '"use strict";\\n' + data.code);
        const output = await fn(data.input, Object.freeze({}));
        if (output === undefined) throw new Error("Custom JavaScript must return a value.");
        self.postMessage({ok: true, output: output});
    } catch (err) {
        self.postMessage({ok: false, error: err && err.stack ? err.stack : String(err)});
    }
};
`;

        const blob = new Blob([workerSource], {type: "application/javascript"});
        const blobUrl = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            const worker = new Worker(blobUrl);
            let finished = false;

            const cleanup = () => {
                worker.terminate();
                URL.revokeObjectURL(blobUrl);
            };

            const timer = setTimeout(() => {
                if (finished) return;
                finished = true;
                cleanup();
                reject(new OperationError(`Custom JavaScript timed out after ${timeout} ms.`));
            }, timeout);

            worker.onmessage = event => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                cleanup();

                const data = event.data || {};
                if (!data.ok) {
                    reject(new OperationError(`Custom JavaScript failed: ${data.error || "Unknown error"}`));
                    return;
                }

                try {
                    resolve(this.normaliseOutput(data.output));
                } catch (err) {
                    reject(err);
                }
            };

            worker.onerror = event => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                cleanup();
                reject(new OperationError(`Custom JavaScript Worker failed: ${event.message || "Unknown error"}`));
            };

            try {
                worker.postMessage({input: input, code: code});
            } catch (err) {
                clearTimeout(timer);
                cleanup();
                reject(new OperationError(`Unable to pass input to Custom JavaScript: ${err.message || err}`));
            }
        });
    }

    /**
     * Converts supported return values into the operation's string output contract.
     * @param {*} output
     * @returns {string}
     */
    normaliseOutput(output) {
        if (output === undefined) {
            throw new OperationError("Custom JavaScript must return a value.");
        }
        if (typeof output === "string") return output;
        if (output instanceof Uint8Array) return Array.from(output).join(",");
        if (typeof output === "object" && output !== null) return JSON.stringify(output, null, 2);
        return String(output);
    }

}

export default CustomJavaScript;
