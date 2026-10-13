/**
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

import TestRegister from "../../lib/TestRegister.mjs";

TestRegister.addTests([
    {
        name: "Custom JavaScript: uppercase",
        input: "lapcry",
        expectedOutput: "LAPCRY",
        recipeConfig: [
            {
                op: "Custom JavaScript",
                args: ["Uppercase", "return input.toUpperCase();", 1000]
            }
        ]
    },
    {
        name: "Custom JavaScript: JSON output",
        input: "abc",
        expectedOutput: "{\n  \"length\": 3\n}",
        recipeConfig: [
            {
                op: "Custom JavaScript",
                args: ["Length", "return {length: input.length};", 1000]
            }
        ]
    },
    {
        name: "Custom JavaScript: invalid syntax",
        input: "abc",
        expectedMatch: /^Custom JavaScript failed:/,
        recipeConfig: [
            {
                op: "Custom JavaScript",
                args: ["Syntax error", "return input.;", 1000]
            }
        ]
    }
]);
