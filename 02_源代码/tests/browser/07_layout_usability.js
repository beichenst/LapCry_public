/**
 * Layout and usability regressions for the LapCry command deck.
 *
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

module.exports = {
    before: browser => {
        browser
            .resizeWindow(1440, 1000)
            .url(browser.launchUrl)
            .waitForElementNotPresent("#preloader", 10000);

        browser.execute(function() {
            localStorage.removeItem("lapcry.settings.v1");
            localStorage.removeItem("lapcry.layout.v1");
            localStorage.removeItem("options");
        });
        browser.refresh();
        browser.waitForElementNotPresent("#preloader", 10000);
    },

    "Search field is vertically aligned and recipe cards stay compact": browser => {
        browser.execute(function() {
            window.app.manager.recipe.addOperation("To Base64");
            const card = document.querySelector("#rec-list li.operation");
            const search = document.querySelector("#search").getBoundingClientRect();
            const command = document.querySelector(".lc-command").getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            return {
                searchOffset: Math.abs((search.top + search.height / 2) - (command.top + command.height / 2)),
                cardHeight: cardRect.height,
                titleHeight: card.querySelector(".op-title").getBoundingClientRect().height,
                argVisible: card.querySelector(".arg").getBoundingClientRect().height > 0,
                panelHeight: document.querySelector("#recipe").getBoundingClientRect().height
            };
        }, [], function({value}) {
            browser.expect(value.searchOffset).to.be.at.most(2);
            browser.expect(value.cardHeight).to.be.at.most(60);
            browser.expect(value.titleHeight).to.be.at.most(30);
            browser.expect(value.argVisible).to.equal(true);
            browser.expect(value.panelHeight).to.be.at.least(150);
        });
    },

    "Recipe argument labels align with values and dropdown controls stay inside the field": browser => {
        browser.execute(function() {
            window.app.manager.recipe.clearRecipe();
            window.app.manager.recipe.addOperation("To Base64");
        });
        browser.pause(250);

        browser.execute(function() {
            const group = document.querySelector("#rec-list li.operation .ingredients .form-group");
            const label = group.querySelector("label.bmd-label-floating");
            const input = group.querySelector("input.arg");
            const button = group.querySelector(".input-group-append .btn");
            const labelRect = label.getBoundingClientRect();
            const inputRect = input.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();
            const inputStyle = getComputedStyle(input);
            const paddingLeft = parseFloat(inputStyle.paddingLeft);
            const paddingTop = parseFloat(inputStyle.paddingTop);
            return {
                labelBottom: labelRect.bottom,
                valueTop: inputRect.top + paddingTop,
                labelLeft: labelRect.left,
                valueLeft: inputRect.left + paddingLeft,
                buttonTop: buttonRect.top,
                buttonBottom: buttonRect.bottom,
                fieldTop: inputRect.top,
                fieldBottom: inputRect.bottom
            };
        }, [], function({value}) {
            browser.expect(value.labelBottom).to.be.at.most(value.valueTop + 0.5);
            browser.expect(Math.abs(value.labelLeft - value.valueLeft)).to.be.at.most(1);
            browser.expect(value.buttonTop).to.be.at.least(value.fieldTop - 0.5);
            browser.expect(value.buttonBottom).to.be.at.most(value.fieldBottom + 0.5);
        });
    },

    "Thirty-step recipe scrolls and later arguments remain editable": browser => {
        browser.execute(function() {
            document.getElementById("auto-bake").checked = false;
            window.app.autoBake_ = false;
            window.app.manager.recipe.clearRecipe();
            for (let i = 0; i < 30; i++) {
                window.app.manager.recipe.addOperation(i % 2 ? "To Hex" : "To Base64");
            }
        });
        browser.pause(250);

        browser.execute(function() {
            const list = document.getElementById("rec-list");
            const items = Array.from(list.querySelectorAll("li.operation"));
            const last = items[items.length - 1];
            last.scrollIntoView({block: "nearest"});
            const lastRect = last.getBoundingClientRect();
            const listRect = list.getBoundingClientRect();
            const editable = items[10].querySelector(".arg");
            editable.value = "LapCry edited argument";
            editable.dispatchEvent(new Event("input", {bubbles: true}));
            editable.dispatchEvent(new Event("change", {bubbles: true}));
            return {
                count: items.length,
                scrollable: list.scrollHeight > list.clientHeight,
                lastVisible: lastRect.top >= listRect.top - 1 && lastRect.bottom <= listRect.bottom + 1,
                edited: window.app.getRecipeConfig()[10].args[0],
                lastTitle: last.querySelector(".op-title").textContent.trim()
            };
        }, [], function({value}) {
            browser.expect(value.count).to.equal(30);
            browser.expect(value.scrollable).to.equal(true);
            browser.expect(value.lastVisible).to.equal(true);
            browser.expect(value.edited).to.equal("LapCry edited argument");
            browser.expect(value.lastTitle).to.equal("Hex 编码");
        });
    },

    "Pipeline splitter changes size, persists, and restores the default": browser => {
        browser.execute(function() {
            window.app.manager.recipe.clearRecipe();
            document.documentElement.style.removeProperty("--lc-recipe-size");
            return document.querySelector("#recipe").getBoundingClientRect().height;
        }, [], function({value}) {
            browser.expect(value).to.be.at.least(150);
        });

        browser.execute(function() {
            const before = document.querySelector("#recipe").getBoundingClientRect().height;
            const splitter = document.getElementById("lc-splitter");
            splitter.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown", bubbles: true}));
            const after = document.querySelector("#recipe").getBoundingClientRect().height;
            return {
                before: before,
                after: after,
                stored: JSON.parse(localStorage.getItem("lapcry.layout.v1") || "{}")
            };
        }, [], function({value}) {
            browser.expect(value.after).to.be.above(value.before);
            browser.expect(value.stored.recipeRatio).to.be.above(0);
        });

        browser.execute(function() {
            document.getElementById("lc-splitter").dispatchEvent(new MouseEvent("dblclick", {bubbles: true}));
            return {
                stored: localStorage.getItem("lapcry.layout.v1"),
                style: document.documentElement.style.getPropertyValue("--lc-recipe-size")
            };
        }, [], function({value}) {
            browser.expect(value.stored).to.equal(null);
            browser.expect(value.style).to.equal("");
        });
    },

    "Top bar stays aligned inside desktop and compact viewports": browser => {
        for (const [width, height] of [[1024, 768], [620, 760]]) {
            browser.resizeWindow(width, height).pause(200).execute(function() {
                const banner = document.querySelector("#banner").getBoundingClientRect();
                const actions = document.querySelector(".lc-topbar-actions").getBoundingClientRect();
                return {
                    viewportWidth: window.innerWidth,
                    bannerLeft: banner.left,
                    bannerRight: banner.right,
                    actionsRight: actions.right,
                    documentScrollWidth: document.documentElement.scrollWidth
                };
            }, [], function({value}) {
                browser.expect(value.bannerLeft).to.be.at.least(7);
                browser.expect(value.bannerRight).to.be.at.most(value.viewportWidth - 7);
                browser.expect(value.actionsRight).to.be.at.most(value.bannerRight - 4);
                browser.expect(value.documentScrollWidth).to.be.at.most(value.viewportWidth);
            });
        }
    },

    "Theme classes expose complete dark and light surfaces": browser => {
        browser.execute(function() {
            window.app.manager.options.changeTheme("dark");
            const dark = getComputedStyle(document.documentElement).getPropertyValue("--lc-space-background").trim();
            window.app.manager.options.changeTheme("light");
            const light = getComputedStyle(document.documentElement).getPropertyValue("--lc-space-background").trim();
            return {
                dark: dark,
                light: light,
                darkClass: document.documentElement.className
            };
        }, [], function({value}) {
            browser.expect(value.dark).to.not.equal("");
            browser.expect(value.light).to.not.equal("");
            browser.expect(value.dark).to.not.equal(value.light);
            browser.expect(value.darkClass).to.equal("light");
        });
    },

    after: browser => {
        browser.execute(function() {
            localStorage.removeItem("lapcry.settings.v1");
            localStorage.removeItem("lapcry.layout.v1");
            localStorage.removeItem("options");
        });
    }
};
