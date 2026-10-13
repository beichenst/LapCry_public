/**
 * Regression tests for recipe operation controls.
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

    "Disable operation toggles the recipe state and skips execution": browser => {
        browser.execute(function() {
            window.app.setInput("abc");
            window.app.manager.recipe.addOperation("To Base64");
        });
        browser.waitForElementVisible("#rec-list li.operation .disable-icon", 2000);

        browser.click("#rec-list li.operation .disable-icon");
        browser.pause(100);
        browser.execute(function() {
            const item = document.querySelector("#rec-list li.operation");
            return {
                className: item.className,
                disabled: item.querySelector(".disable-icon").getAttribute("disabled"),
                config: window.app.getRecipeConfig()
            };
        }, [], function({value}) {
            browser.expect(value.className).to.contain("disabled");
            browser.expect(value.disabled).to.equal("true");
            browser.expect(value.config[0].disabled).to.equal(true);
        });

        browser.execute(function() {
            window.app.bake();
        });
        browser.pause(300);
        browser.execute(function() {
            return window.app.manager.output.outputEditorView.state.doc.toString();
        }, [], function({value}) {
            browser.expect(value).to.equal("abc");
        });

        browser.click("#rec-list li.operation .disable-icon");
        browser.pause(100);
        browser.execute(function() {
            return {
                className: document.querySelector("#rec-list li.operation").className,
                config: window.app.getRecipeConfig()
            };
        }, [], function({value}) {
            browser.expect(value.className).to.not.contain("disabled");
            browser.expect(value.config[0]).to.not.have.property("disabled");
        });
    },

    "Breakpoint toggles and persists in the recipe config": browser => {
        browser.click("#rec-list li.operation .breakpoint");
        browser.pause(100);
        browser.execute(function() {
            const icon = document.querySelector("#rec-list li.operation .breakpoint");
            return {
                selected: icon.classList.contains("breakpoint-selected"),
                value: icon.getAttribute("break"),
                config: window.app.getRecipeConfig()
            };
        }, [], function({value}) {
            browser.expect(value.selected).to.equal(true);
            browser.expect(value.value).to.equal("true");
            browser.expect(value.config[0].breakpoint).to.equal(true);
        });

        browser.click("#rec-list li.operation .breakpoint");
        browser.pause(100);
        browser.execute(function() {
            const icon = document.querySelector("#rec-list li.operation .breakpoint");
            return {
                selected: icon.classList.contains("breakpoint-selected"),
                value: icon.getAttribute("break"),
                config: window.app.getRecipeConfig()
            };
        }, [], function({value}) {
            browser.expect(value.selected).to.equal(false);
            browser.expect(value.value).to.equal("false");
            browser.expect(value.config[0]).to.not.have.property("breakpoint");
        });
    },

    "Operation control labels are localised": browser => {
        browser.pause(200);
        browser.execute(function() {
            const breakpoint = document.querySelector("#rec-list li.operation .breakpoint");
            const disable = document.querySelector("#rec-list li.operation .disable-icon");
            return {
                locale: document.documentElement.lang,
                breakpointTitle: breakpoint.getAttribute("title"),
                breakpointHelp: breakpoint.getAttribute("data-help-title"),
                disableTitle: disable.getAttribute("title"),
                disableHelp: disable.getAttribute("data-help-title")
            };
        }, [], function({value}) {
            browser.expect(value.locale).to.equal("zh-CN");
            browser.expect(value.breakpointTitle).to.equal("设置断点");
            browser.expect(value.breakpointHelp).to.equal("设置断点");
            browser.expect(value.disableTitle).to.equal("禁用操作");
            browser.expect(value.disableHelp).to.equal("禁用操作");
        });

        browser.click("#language-toggle");
        browser.pause(200);
        browser.execute(function() {
            const breakpoint = document.querySelector("#rec-list li.operation .breakpoint");
            const disable = document.querySelector("#rec-list li.operation .disable-icon");
            return {
                locale: document.documentElement.lang,
                breakpointTitle: breakpoint.getAttribute("title"),
                breakpointHelp: breakpoint.getAttribute("data-help-title"),
                disableTitle: disable.getAttribute("title"),
                disableHelp: disable.getAttribute("data-help-title")
            };
        }, [], function({value}) {
            browser.expect(value.locale).to.equal("en-US");
            browser.expect(value.breakpointTitle).to.equal("Set breakpoint");
            browser.expect(value.breakpointHelp).to.equal("Setting breakpoints");
            browser.expect(value.disableTitle).to.equal("Disable operation");
            browser.expect(value.disableHelp).to.equal("Disabling operations");
        });
    },

    "Search popover descriptions are localised": browser => {
        browser
            .click("#language-toggle")
            .click("#vault-toggle")
            .useCss()
            .clearValue("#search")
            .setValue("#search", "To Base64");

        browser.waitForElementVisible("#search-results li[data-op-name='To Base64']", 2000);
        browser.execute(function() {
            const item = document.querySelector("#search-results li[data-op-name='To Base64']");
            return {
                locale: document.documentElement.lang,
                content: item.getAttribute("data-content")
            };
        }, [], function({value}) {
            browser.expect(value.locale).to.equal("zh-CN");
            browser.expect(value.content).to.contain("Base64 是一种");
            browser.expect(value.content).to.contain("aGVsbG8=");
        });

        browser
            .clearValue("#search")
            .click("#vault-close");
    },
    "About page lists the current iteration": browser => {
        browser
            .click("#support")
            .waitForElementVisible("#support-modal", 2000)
            .click("#tab-3")
            .pause(150);

        browser.execute(function() {
            return {
                header: document.querySelector("#support-modal .subtext").innerText,
                notes: document.querySelector("#about").innerText
            };
        }, [], function({value}) {
            browser.expect(value.header).to.contain("0.0.8");
            browser.expect(value.notes).to.contain("v0.0.8");
            browser.expect(value.notes).to.contain("v0.0.3");
            browser.expect(value.notes).to.contain("v0.0.2");
            browser.expect(value.notes).to.contain("v0.0.1");
        });

        browser.click("#support-modal .modal-footer .btn-secondary");
    },

    after: browser => {
        browser.execute(function() {
            localStorage.removeItem("lapcry.settings.v1");
            localStorage.removeItem("lapcry.customOperations.v1");
            localStorage.removeItem("options");
        });
    }
};
