/**
 * Tests for LapCry language and theme settings.
 *
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

module.exports = {
    before: browser => {
        browser
            .resizeWindow(1280, 800)
            .url(browser.launchUrl)
            .waitForElementNotPresent("#preloader", 10000);

        browser.execute(function() {
            localStorage.removeItem("lapcry.settings.v1");
            localStorage.removeItem("lapcry.customOperations.v1");
            localStorage.removeItem("options");
        });
        browser.refresh();
        browser.waitForElementNotPresent("#preloader", 10000);
    },

    "Settings expose theme and language selectors": browser => {
        browser
            .useCss()
            .click("#options")
            .waitForElementVisible("#options-modal", 2000);

        browser.execute(function() {
            return {
                theme: document.getElementById("theme").value,
                language: document.getElementById("language").value,
                locale: document.documentElement.lang,
                themeClass: document.documentElement.className
            };
        }, [], function({value}) {
            browser.expect(value.theme).to.equal("dark");
            browser.expect(value.language).to.equal("zh-CN");
            browser.expect(value.locale).to.equal("zh-CN");
            browser.expect(value.themeClass).to.equal("dark");
        });

        browser.click("#options-modal .modal-footer button[data-dismiss='modal']");
        browser.waitForElementNotVisible("#options-modal", 2000);
        browser.pause(250);
    },

    "Quick language and theme controls switch immediately": browser => {
        browser
            .useCss()
            .click("#language-toggle")
            .click("#theme-toggle")
            .pause(200);

        browser.execute(function() {
            return {
                locale: document.documentElement.lang,
                theme: document.documentElement.className,
                stored: JSON.parse(localStorage.getItem("lapcry.settings.v1") || "{}")
            };
        }, [], function({value}) {
            browser.expect(value.locale).to.equal("en-US");
            browser.expect(value.theme).to.equal("light");
            browser.expect(value.stored.language).to.equal("en-US");
            browser.expect(value.stored.theme).to.equal("light");
        });

        browser
            .click("#language-toggle")
            .click("#theme-toggle")
            .pause(200);

        browser.execute(function() {
            const stored = JSON.parse(localStorage.getItem("lapcry.settings.v1") || "{}");
            return {locale: document.documentElement.lang, theme: document.documentElement.className, stored: stored};
        }, [], function({value}) {
            browser.expect(value.locale).to.equal("zh-CN");
            browser.expect(value.theme).to.equal("dark");
            browser.expect(value.stored.language).to.equal("zh-CN");
            browser.expect(value.stored.theme).to.equal("dark");
        });
    },

    "Language switching preserves input recipe and output": browser => {
        browser.execute(function() {
            window.app.setInput("lapcry");
            window.app.manager.recipe.addOperation("To Base64");
        });
        browser.pause(200);

        browser.execute(function() {
            const select = document.getElementById("language");
            select.value = "en-US";
            select.dispatchEvent(new Event("change", {bubbles: true}));
        });
        browser.pause(200);

        browser.execute(function() {
            return {
                locale: document.documentElement.lang,
                stored: JSON.parse(localStorage.getItem("lapcry.settings.v1") || "{}").language,
                input: window.app.manager.input.getInput(),
                recipe: window.app.getRecipeConfig().map(item => item.op),
                output: window.app.manager.output.outputEditorView.state.doc.toString()
            };
        }, [], function({value}) {
            browser.expect(value.locale).to.equal("en-US");
            browser.expect(value.stored).to.equal("en-US");
            browser.expect(value.input).to.equal("lapcry");
            browser.expect(value.recipe.join(" | ")).to.equal("To Base64");
            browser.expect(value.output).to.be.a("string");
        });
    },

    "Theme switching updates the document and persists": browser => {
        browser.execute(function() {
            const select = document.getElementById("theme");
            select.value = "dark";
            select.dispatchEvent(new Event("change", {bubbles: true}));
        });
        browser.pause(100);

        browser.execute(function() {
            return {
                className: document.documentElement.className,
                stored: JSON.parse(localStorage.getItem("lapcry.settings.v1") || "{}").theme,
                background: getComputedStyle(document.getElementById("operations")).backgroundColor
            };
        }, [], function({value}) {
            browser.expect(value.className).to.contain("dark");
            browser.expect(value.stored).to.equal("dark");
            browser.expect(value.background).to.not.equal("rgba(0, 0, 0, 0)");
        });

        browser.refresh();
        browser.waitForElementNotPresent("#preloader", 10000);
        browser.execute(function() {
            return {
                className: document.documentElement.className,
                language: document.documentElement.lang,
                stored: JSON.parse(localStorage.getItem("lapcry.settings.v1") || "{}")
            };
        }, [], function({value}) {
            browser.expect(value.className).to.equal("dark");
            browser.expect(value.language).to.equal("en-US");
            browser.expect(value.stored.theme).to.equal("dark");
            browser.expect(value.stored.language).to.equal("en-US");
        });
    },

    "Theme and language restore from LapCry settings without legacy options": browser => {
        browser.execute(function() {
            localStorage.setItem("lapcry.settings.v1", JSON.stringify({language: "zh-CN", theme: "light"}));
            localStorage.removeItem("options");
        });
        browser.refresh().waitForElementNotPresent("#preloader", 10000);
        browser.execute(function() {
            return {className: document.documentElement.className, language: document.documentElement.lang};
        }, [], function({value}) {
            browser.expect(value.className).to.equal("light");
            browser.expect(value.language).to.equal("zh-CN");
        });

        browser.execute(function() {
            localStorage.setItem("lapcry.settings.v1", JSON.stringify({language: "en-US", theme: "dark"}));
            localStorage.removeItem("options");
        });
        browser.refresh().waitForElementNotPresent("#preloader", 10000);
    },

    "Custom function library persists and adds operations": browser => {
        browser
            .useCss()
            .click("#options")
            .waitForElementVisible("#custom-functions-panel", 2000);

        browser.execute(function() {
            window.app.manager.recipe.clearRecipe();
            document.getElementById("custom-function-name").value = "Uppercase test";
            document.getElementById("custom-function-body").value = "return input.toUpperCase();";
            document.getElementById("custom-function-timeout").value = "1500";
            document.getElementById("custom-function-save").click();
            document.getElementById("custom-function-add").click();
        });
        browser.pause(250);

        browser.execute(function() {
            const stored = JSON.parse(localStorage.getItem("lapcry.customOperations.v1") || "[]");
            const item = document.querySelector("#rec-list li.operation");
            const args = item ? Array.from(item.querySelectorAll(".arg")).map(arg => arg.value) : [];
            return {stored: stored, args: args};
        }, [], function({value}) {
            browser.expect(value.stored.length).to.equal(1);
            browser.expect(value.stored[0].name).to.equal("Uppercase test");
            browser.expect(value.args[0]).to.equal("Uppercase test");
            browser.expect(value.args[1]).to.equal("return input.toUpperCase();");
            browser.expect(value.args[2]).to.equal("1500");
        });

        browser.click("#options-modal .modal-footer button[data-dismiss='modal']");
        browser.refresh();
        browser.waitForElementNotPresent("#preloader", 10000);
        browser.click("#options");
        browser.waitForElementVisible("#custom-function-list", 2000);
        browser.execute(function() {
            return {
                options: document.getElementById("custom-function-list").options.length,
                name: document.getElementById("custom-function-list").selectedOptions[0].textContent
            };
        }, [], function({value}) {
            browser.expect(value.options).to.equal(1);
            browser.expect(value.name).to.equal("Uppercase test");
        });
        browser.click("#options-modal .modal-footer button[data-dismiss='modal']");
    },

    after: browser => {
        browser.execute(function() {
            localStorage.removeItem("lapcry.settings.v1");
            localStorage.removeItem("lapcry.customOperations.v1");
            localStorage.removeItem("options");
        });
    }
};
