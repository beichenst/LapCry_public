/**
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 */

import { applyLocale, saveSettings, translatePhrase } from "../i18n.mjs";
import {
    createCustomOperation,
    loadCustomOperations,
    removeCustomOperation,
    saveCustomOperations,
    upsertCustomOperation,
    validateCustomOperation
} from "../customOperations.mjs";

/**
 * Waiter to handle events related to LapCry options.
 */
class OptionsWaiter {

    /**
     * OptionsWaiter constructor.
     *
     * @param {App} app - The main view object for LapCry.
     * @param {Manager} manager - The LapCry event manager.
     */
    constructor(app, manager) {
        this.app = app;
        this.manager = manager;
        this.customFunctionId = null;
        this.customFunctions = loadCustomOperations();
        this.initialiseCustomFunctionLibrary();
    }

    /**
     * Loads options and sets values of switches and inputs to match them.
     *
     * @param {Object} options
     */
    load(options) {
        Object.assign(this.app.options, options);
        applyLocale(this.app.options.language || "zh-CN");

        // Set options to match object
        document.querySelectorAll("#options-body input[type=checkbox]").forEach(cbox => {
            cbox.checked = this.app.options[cbox.getAttribute("option")];
        });

        document.querySelectorAll("#options-body input[type=number]").forEach(nbox => {
            nbox.value = this.app.options[nbox.getAttribute("option")];
            nbox.dispatchEvent(new CustomEvent("change", {bubbles: true}));
        });

        document.querySelectorAll("#options-body select").forEach(select => {
            const val = this.app.options[select.getAttribute("option")];
            if (val) {
                select.value = val;
                select.dispatchEvent(new CustomEvent("change", {bubbles: true}));
            } else {
                select.selectedIndex = 0;
            }
        });

        // Initialise options
        this.setWordWrap();
        this.manager.ops.setCatCount();
    }


    /**
     * Handler for options click events.
     * Displays the options pane.
     *
     * @param {event} e
     */
    optionsClick(e) {
        e.preventDefault();
        $("#options-modal").modal();
    }


    /**
     * Handler for reset options click events.
     * Resets options back to their default values.
     */
    resetOptionsClick() {
        this.load(this.app.doptions);
    }


    /**
     * Handler for switch change events.
     *
     * @param {event} e
     */
    switchChange(e) {
        const el = e.target;
        const option = el.getAttribute("option");
        const state = el.checked;

        this.updateOption(option, state);
    }


    /**
     * Handler for number change events.
     *
     * @param {event} e
     */
    numberChange(e) {
        const el = e.target;
        const option = el.getAttribute("option");
        const val = parseInt(el.value, 10);

        this.updateOption(option, val);
    }


    /**
     * Handler for select change events.
     *
     * @param {event} e
     */
    selectChange(e) {
        const el = e.target;
        const option = el.getAttribute("option");

        this.updateOption(option, el.value);
        if (option === "language") {
            this.applyLanguageChange(el.value);
        }
    }

    /**
     * Applies a user-selected language without reinitialising the app during startup.
     * The operations list and sortable recipe list are rebuilt only after the app has loaded.
     *
     * @param {string} locale
     */
    applyLanguageChange(locale) {
        applyLocale(locale);
        if (!this.app.appLoaded) return;

        this.app.populateOperationsList();
        this.manager.recipe.initialiseOperationDragNDrop();
    }

    /**
     * Modifies an option value and saves it to local storage.
     *
     * @param {string} option - The option to be updated
     * @param {string|number|boolean} value - The new value of the option
     */
    updateOption(option, value) {
        log.debug(`Setting ${option} to ${value}`);
        this.app.options[option] = value;

        if (this.app.isLocalStorageAvailable())
            localStorage.setItem("options", JSON.stringify(this.app.options));

        if (option === "theme" || option === "language") {
            saveSettings({[option]: value});
        }
    }


    /**
     * Sets or unsets word wrap on the input and output depending on the wordWrap option value.
     */
    setWordWrap() {
        this.manager.input.setWordWrap(this.app.options.wordWrap);
        this.manager.output.setWordWrap(this.app.options.wordWrap);
    }


    /**
     * Theme change event listener
     *
     * @param {Event} e
     */
    themeChange(e) {
        const themeClass = e.target.value;
        this.changeTheme(themeClass);
    }


    /**
     * Changes the theme by setting the class of the <html> element.
     *
     * @param (string} theme
     */
    changeTheme(theme) {
        if (theme !== "dark" && theme !== "light") {
            theme = this.getPreferredColorScheme();
        }
        document.querySelector(":root").className = theme;

        // Update theme selection
        const themeSelect = document.getElementById("theme");
        let themeOption = themeSelect.querySelector(`option[value="${theme}"]`);

        if (!themeOption) {
            const preferredColorScheme = this.getPreferredColorScheme();
            document.querySelector(":root").className = preferredColorScheme;
            themeOption = themeSelect.querySelector(`option[value="${preferredColorScheme}"]`);
        }

        themeSelect.selectedIndex = themeOption.index;
    }

    /**
     * Applies the user's preferred color scheme using the `prefers-color-scheme` media query.
     */
    applyPreferredColorScheme() {
        const themeFromStorage = this.app?.options?.theme;
        let theme = themeFromStorage;
        if (!theme) {
            theme = this.getPreferredColorScheme();
        }
        this.changeTheme(theme);
    }

    /**
     * Get the user's preferred color scheme using the `prefers-color-scheme` media query.
     */
    getPreferredColorScheme() {
        const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDarkScheme ? "dark" : "light";
    }

    /**
     * Initialises the named custom function library in the settings modal.
     */
    initialiseCustomFunctionLibrary() {
        this.customFunctionList = document.getElementById("custom-function-list");
        this.customFunctionName = document.getElementById("custom-function-name");
        this.customFunctionBody = document.getElementById("custom-function-body");
        this.customFunctionTimeout = document.getElementById("custom-function-timeout");
        this.customFunctionStatus = document.getElementById("custom-function-status");

        if (!this.customFunctionList || !this.customFunctionName || !this.customFunctionBody || !this.customFunctionTimeout) {
            return;
        }

        this.customFunctionList.addEventListener("change", this.customFunctionSelectionChange.bind(this));
        document.getElementById("custom-function-new").addEventListener("click", this.newCustomFunction.bind(this));
        document.getElementById("custom-function-save").addEventListener("click", () => this.saveCustomFunctionFromEditor());
        document.getElementById("custom-function-add").addEventListener("click", this.addCustomFunctionToRecipe.bind(this));
        document.getElementById("custom-function-delete").addEventListener("click", this.deleteCustomFunction.bind(this));

        this.renderCustomFunctionList();
        this.newCustomFunction();
    }

    /**
     * Renders the saved custom function selector.
     */
    renderCustomFunctionList() {
        if (!this.customFunctionList) return;

        const selected = this.customFunctionId || "";
        this.customFunctionList.innerHTML = "";

        if (!this.customFunctions.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = translatePhrase("No saved functions");
            this.customFunctionList.appendChild(option);
            return;
        }

        for (const operation of this.customFunctions) {
            const option = document.createElement("option");
            option.value = operation.id;
            option.textContent = operation.name;
            this.customFunctionList.appendChild(option);
        }

        if (this.customFunctions.some(operation => operation.id === selected)) {
            this.customFunctionList.value = selected;
        }
    }

    /**
     * Loads a custom function into the editor.
     * @param {string} id
     */
    loadCustomFunction(id) {
        const operation = this.customFunctions.find(item => item.id === id);
        if (!operation) return false;

        this.customFunctionId = operation.id;
        this.customFunctionName.value = operation.name;
        this.customFunctionBody.value = operation.body;
        this.customFunctionTimeout.value = operation.timeout;
        this.setCustomFunctionStatus("");
        return true;
    }

    /**
     * Handles selection changes in the saved function selector.
     */
    customFunctionSelectionChange() {
        const id = this.customFunctionList.value;
        if (id) this.loadCustomFunction(id);
    }

    /**
     * Clears the custom function editor for a new function.
     */
    newCustomFunction() {
        this.customFunctionId = null;
        this.customFunctionName.value = "";
        this.customFunctionBody.value = "return input;";
        this.customFunctionTimeout.value = 2000;
        if (this.customFunctionList) this.customFunctionList.selectedIndex = 0;
        this.setCustomFunctionStatus("Select a saved function or create a new one.");
    }

    /**
     * Saves the function currently in the editor.
     * @returns {Object|null}
     */
    saveCustomFunctionFromEditor() {
        const values = {
            name: this.customFunctionName.value,
            body: this.customFunctionBody.value,
            timeout: this.customFunctionTimeout.value
        };
        const validationError = validateCustomOperation(values);
        if (validationError) {
            this.setCustomFunctionStatus(validationError, true);
            return null;
        }

        if (!this.app.isLocalStorageAvailable()) {
            this.setCustomFunctionStatus("Unable to save custom functions in this browser.", true);
            return null;
        }

        const operation = this.customFunctionId ? {
            id: this.customFunctionId,
            ...values
        } : createCustomOperation(values);
        this.customFunctions = upsertCustomOperation(this.customFunctions, operation);
        this.customFunctions = saveCustomOperations(this.customFunctions);
        this.customFunctionId = operation.id;
        this.renderCustomFunctionList();
        this.setCustomFunctionStatus("Custom function saved.");
        return this.customFunctions.find(item => item.id === operation.id);
    }

    /**
     * Adds the selected or edited custom function to the recipe.
     */
    addCustomFunctionToRecipe() {
        const operation = this.saveCustomFunctionFromEditor();
        if (!operation) return;

        const item = this.manager.recipe.addOperation("Custom JavaScript");
        const args = item.querySelectorAll(".arg");
        if (args[0]) args[0].value = operation.name;
        if (args[1]) args[1].value = operation.body;
        if (args[2]) args[2].value = operation.timeout;
        this.manager.recipe.triggerArgEvents(item);
        window.dispatchEvent(this.manager.statechange);
        this.setCustomFunctionStatus("Custom function added to the recipe.");
    }

    /**
     * Deletes the function currently loaded in the editor.
     */
    deleteCustomFunction() {
        if (this.customFunctionId) {
            this.customFunctions = removeCustomOperation(this.customFunctions, this.customFunctionId);
            this.customFunctions = saveCustomOperations(this.customFunctions);
        }
        this.renderCustomFunctionList();
        this.newCustomFunction();
        this.setCustomFunctionStatus("Custom function deleted.");
    }

    /**
     * Displays localised status text for the custom function editor.
     * @param {string} message
     * @param {boolean} [isError=false]
     */
    setCustomFunctionStatus(message, isError=false) {
        if (!this.customFunctionStatus) return;
        this.customFunctionStatus.textContent = message ? translatePhrase(message) : "";
        this.customFunctionStatus.classList.toggle("error", isError);
    }

    /**
     * Changes the console logging level.
     *
     * @param {Event} e
     */
    logLevelChange(e) {
        const level = e.target.value;
        log.setLevel(level, false);
        this.manager.worker.setLogLevel();
        this.manager.input.setLogLevel();
        this.manager.output.setLogLevel();
        this.manager.background.setLogLevel();
    }
}

export default OptionsWaiter;
