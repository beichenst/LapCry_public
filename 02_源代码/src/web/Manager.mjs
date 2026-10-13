/**
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 */

import WorkerWaiter from "./waiters/WorkerWaiter.mjs";
import WindowWaiter from "./waiters/WindowWaiter.mjs";
import ControlsWaiter from "./waiters/ControlsWaiter.mjs";
import RecipeWaiter from "./waiters/RecipeWaiter.mjs";
import OperationsWaiter from "./waiters/OperationsWaiter.mjs";
import InputWaiter from "./waiters/InputWaiter.mjs";
import OutputWaiter from "./waiters/OutputWaiter.mjs";
import OptionsWaiter from "./waiters/OptionsWaiter.mjs";
import HighlighterWaiter from "./waiters/HighlighterWaiter.mjs";
import SeasonalWaiter from "./waiters/SeasonalWaiter.mjs";
import BindingsWaiter from "./waiters/BindingsWaiter.mjs";
import BackgroundWorkerWaiter from "./waiters/BackgroundWorkerWaiter.mjs";
import TabWaiter from "./waiters/TabWaiter.mjs";
import TimingWaiter from "./waiters/TimingWaiter.mjs";
import {operationLabel} from "./i18n.mjs";

/* Kept apart from the settings blob so resetting one preference never wipes the other. */
const LAYOUT_STORAGE_KEY = "lapcry.layout.v1";


/**
 * This object controls the Waiters responsible for handling events from all areas of the app.
 */
class Manager {

    /**
     * Manager constructor.
     *
     * @param {App} app - The main view object for CyberChef.
     */
    constructor(app) {
        this.app = app;

        // Define custom events
        /**
         * @event Manager#appstart
         */
        this.appstart = new CustomEvent("appstart", {bubbles: true});
        /**
         * @event Manager#apploaded
         */
        this.apploaded = new CustomEvent("apploaded", {bubbles: true});
        /**
         * @event Manager#operationadd
         */
        this.operationadd = new CustomEvent("operationadd", {bubbles: true});
        /**
         * @event Manager#operationremove
         */
        this.operationremove = new CustomEvent("operationremove", {bubbles: true});
        /**
         * @event Manager#oplistcreate
         */
        this.oplistcreate = new CustomEvent("oplistcreate", {bubbles: true});
        /**
         * @event Manager#statechange
         */
        this.statechange = new CustomEvent("statechange", {bubbles: true});

        // Define Waiter objects to handle various areas
        this.timing      = new TimingWaiter(this.app, this);
        this.worker      = new WorkerWaiter(this.app, this);
        this.window      = new WindowWaiter(this.app);
        this.controls    = new ControlsWaiter(this.app, this);
        this.recipe      = new RecipeWaiter(this.app, this);
        this.ops         = new OperationsWaiter(this.app, this);
        this.tabs        = new TabWaiter(this.app, this);
        this.input       = new InputWaiter(this.app, this);
        this.output      = new OutputWaiter(this.app, this);
        this.options     = new OptionsWaiter(this.app, this);
        this.highlighter = new HighlighterWaiter(this.app, this);
        this.seasonal    = new SeasonalWaiter(this.app, this);
        this.bindings    = new BindingsWaiter(this.app, this);
        this.background  = new BackgroundWorkerWaiter(this.app, this);

        // Object to store dynamic handlers to fire on elements that may not exist yet
        this.dynamicHandlers = {};

        this.initialiseEventListeners();
    }


    /**
     * Sets up the various components and listeners.
     */
    setup() {
        this.input.setupInputWorker();
        this.input.addInput(true);
        this.worker.setupChefWorker();
        this.recipe.initialiseOperationDragNDrop();
        this.controls.initComponents();
        this.controls.autoBakeChange();
        this.bindings.updateKeybList();
        this.background.registerChefWorker();
        this.seasonal.load();

        this.confirmWaitersLoaded();
    }

    /**
     * Confirms that all Waiters have loaded correctly.
     */
    confirmWaitersLoaded() {
        if (this.tabs.getActiveTab("input") >= 0 &&
            this.tabs.getActiveTab("output") >= 0) {
            log.debug("Waiters loaded");
            this.app.waitersLoaded = true;
            this.app.loaded();
        } else {
            // Not loaded yet, try again soon
            setTimeout(this.confirmWaitersLoaded.bind(this), 10);
        }
    }


    /**
     * Main function to handle the creation of the event listeners.
     */
    initialiseEventListeners() {
        // Global
        window.addEventListener("resize", this.window.windowResize.bind(this.window));
        window.addEventListener("blur", this.window.windowBlur.bind(this.window));
        window.addEventListener("focus", this.window.windowFocus.bind(this.window));
        window.addEventListener("statechange", this.app.stateChange.bind(this.app));
        window.addEventListener("popstate", this.app.popState.bind(this.app));
        window.addEventListener("message", this.input.handlePostMessage.bind(this.input));

        // Controls
        document.getElementById("bake").addEventListener("click", this.controls.bakeClick.bind(this.controls));
        document.getElementById("auto-bake").addEventListener("change", this.controls.autoBakeChange.bind(this.controls));
        document.getElementById("auto-bake").addEventListener("keydown", this.controls.autoBakeKeyboardHandler.bind(this.controls));
        document.getElementById("step").addEventListener("click", this.controls.stepClick.bind(this.controls));
        document.getElementById("clr-recipe").addEventListener("click", this.controls.clearRecipeClick.bind(this.controls));
        document.getElementById("save").addEventListener("click", this.controls.saveClick.bind(this.controls));
        document.getElementById("save-button").addEventListener("click", this.controls.saveButtonClick.bind(this.controls));
        document.getElementById("save-link-recipe-checkbox").addEventListener("change", this.controls.slrCheckChange.bind(this.controls));
        document.getElementById("save-link-input-checkbox").addEventListener("change", this.controls.sliCheckChange.bind(this.controls));
        document.getElementById("load").addEventListener("click", this.controls.loadClick.bind(this.controls));
        document.getElementById("load-delete-button").addEventListener("click", this.controls.loadDeleteClick.bind(this.controls));
        document.getElementById("load-name").addEventListener("change", this.controls.loadNameChange.bind(this.controls));
        document.getElementById("load-button").addEventListener("click", this.controls.loadButtonClick.bind(this.controls));
        document.getElementById("hide-icon").addEventListener("click", this.controls.hideRecipeArgsClick.bind(this.recipe));
        document.getElementById("support").addEventListener("click", this.controls.supportButtonClick.bind(this.controls));
        this.addMultiEventListeners("#save-texts textarea", "keyup paste", this.controls.saveTextChange, this.controls);

        // Operations
        this.addMultiEventListener("#search", "keyup paste search", this.ops.searchOperations, this.ops);
        // including descendants, so double-clicking a highlighted search term still adds the op
        this.addDynamicListener(".op-list li.operation, .op-list li.operation *", "dblclick", this.ops.operationDblclick, this.ops);
        document.getElementById("edit-favourites").addEventListener("click", this.ops.editFavouritesClick.bind(this.ops));
        document.getElementById("save-favourites").addEventListener("click", this.ops.saveFavouritesClick.bind(this.ops));
        document.getElementById("reset-favourites").addEventListener("click", this.ops.resetFavouritesClick.bind(this.ops));
        this.addDynamicListener(".op-list", "oplistcreate", this.ops.opListCreate, this.ops);
        this.addDynamicListener("li.operation", "operationadd", this.recipe.opAdd, this.recipe);

        // Recipe
        this.addDynamicListener(".arg:not(select)", "input", this.recipe.ingChange, this.recipe);
        this.addDynamicListener(".arg[type=checkbox], .arg[type=radio], select.arg", "change", this.recipe.ingChange, this.recipe);
        this.addDynamicListener(".hide-args-icon", "click", this.recipe.hideArgsClick, this.recipe);
        this.addDynamicListener(".disable-icon", "click", this.recipe.disableClick, this.recipe);
        this.addDynamicListener(".breakpoint", "click", this.recipe.breakpointClick, this.recipe);
        this.addDynamicListener("#rec-list li.operation", "dblclick", this.recipe.operationDblclick, this.recipe);
        this.addDynamicListener("#rec-list li.operation > div", "dblclick", this.recipe.operationChildDblclick, this.recipe);
        this.addDynamicListener("#rec-list .dropdown-menu.toggle-dropdown a", "click", this.recipe.dropdownToggleClick, this.recipe);
        this.addDynamicListener("#rec-list", "operationremove", this.recipe.opRemove.bind(this.recipe));
        this.addDynamicListener("textarea.arg", "dragover", this.recipe.textArgDragover, this.recipe);
        this.addDynamicListener("textarea.arg", "dragleave", this.recipe.textArgDragLeave, this.recipe);
        this.addDynamicListener("textarea.arg", "drop", this.recipe.textArgDrop, this.recipe);

        // Input
        document.getElementById("reset-layout").addEventListener("click", this.app.resetLayout.bind(this.app));
        this.addListeners("#clr-io,#btn-close-all-tabs", "click", this.input.clearAllIoClick, this.input);
        this.addListeners("#open-file,#open-folder", "change", this.input.inputOpen, this.input);
        document.getElementById("btn-open-file").addEventListener("click", this.input.inputOpenClick.bind(this.input));
        document.getElementById("btn-open-folder").addEventListener("click", this.input.folderOpenClick.bind(this.input));
        this.addListeners("#input-wrapper", "dragover", this.input.inputDragover, this.input);
        this.addListeners("#input-wrapper", "dragleave", this.input.inputDragleave, this.input);
        this.addListeners("#input-wrapper", "drop", this.input.inputDrop, this.input);
        document.getElementById("btn-new-tab").addEventListener("click", this.input.addInputClick.bind(this.input));
        document.getElementById("btn-previous-input-tab").addEventListener("mousedown", this.input.previousTabClick.bind(this.input));
        document.getElementById("btn-next-input-tab").addEventListener("mousedown", this.input.nextTabClick.bind(this.input));
        this.addListeners("#btn-next-input-tab,#btn-previous-input-tab", "mouseup", this.input.tabMouseUp, this.input);
        this.addListeners("#btn-next-input-tab,#btn-previous-input-tab", "mouseout", this.input.tabMouseUp, this.input);
        document.getElementById("btn-go-to-input-tab").addEventListener("click", this.input.goToTab.bind(this.input));
        document.getElementById("btn-find-input-tab").addEventListener("click", this.input.findTab.bind(this.input));
        this.addDynamicListener("#input-tabs li .input-tab-content", "click", this.input.changeTabClick, this.input);
        document.getElementById("input-show-pending").addEventListener("change", this.input.filterTabSearch.bind(this.input));
        document.getElementById("input-show-loading").addEventListener("change", this.input.filterTabSearch.bind(this.input));
        document.getElementById("input-show-loaded").addEventListener("change", this.input.filterTabSearch.bind(this.input));
        this.addListeners("#input-filter-content,#input-filter-filename", "click", this.input.filterOptionClick, this.input);
        document.getElementById("input-filter").addEventListener("change", this.input.filterTabSearch.bind(this.input));
        document.getElementById("input-filter").addEventListener("keyup", this.input.filterTabSearch.bind(this.input));
        document.getElementById("input-num-results").addEventListener("change", this.input.filterTabSearch.bind(this.input));
        document.getElementById("input-num-results").addEventListener("keyup", this.input.filterTabSearch.bind(this.input));
        document.getElementById("input-filter-refresh").addEventListener("click", this.input.filterTabSearch.bind(this.input));
        this.addDynamicListener(".input-filter-result", "click", this.input.filterItemClick, this.input);


        // Output
        document.getElementById("save-to-file").addEventListener("click", this.output.saveClick.bind(this.output));
        document.getElementById("save-all-to-file").addEventListener("click", this.output.saveAllClick.bind(this.output));
        document.getElementById("copy-output").addEventListener("click", this.output.copyClick.bind(this.output));
        document.getElementById("switch").addEventListener("click", this.output.switchClick.bind(this.output));
        document.getElementById("maximise-output").addEventListener("click", this.output.maximiseOutputClick.bind(this.output));
        document.getElementById("magic").addEventListener("click", this.output.magicClick.bind(this.output));
        this.addDynamicListener(".extract-file,.extract-file i", "click", this.output.extractFileClick, this.output);
        this.addDynamicListener("#output-tabs-wrapper #output-tabs li .output-tab-content", "click", this.output.changeTabClick, this.output);
        document.getElementById("btn-previous-output-tab").addEventListener("mousedown", this.output.previousTabClick.bind(this.output));
        document.getElementById("btn-next-output-tab").addEventListener("mousedown", this.output.nextTabClick.bind(this.output));
        this.addListeners("#btn-next-output-tab,#btn-previous-output-tab", "mouseup", this.output.tabMouseUp, this.output);
        this.addListeners("#btn-next-output-tab,#btn-previous-output-tab", "mouseout", this.output.tabMouseUp, this.output);
        document.getElementById("btn-go-to-output-tab").addEventListener("click", this.output.goToTab.bind(this.output));
        document.getElementById("btn-find-output-tab").addEventListener("click", this.output.findTab.bind(this.output));
        document.getElementById("output-show-pending").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-show-baking").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-show-baked").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-show-stale").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-show-errored").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-content-filter").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-content-filter").addEventListener("keyup", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-num-results").addEventListener("change", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-num-results").addEventListener("keyup", this.output.filterTabSearch.bind(this.output));
        document.getElementById("output-filter-refresh").addEventListener("click", this.output.filterTabSearch.bind(this.output));
        this.addDynamicListener(".output-filter-result", "click", this.output.filterItemClick, this.output);


        // Options
        document.getElementById("options").addEventListener("click", this.options.optionsClick.bind(this.options));
        document.getElementById("reset-options").addEventListener("click", this.options.resetOptionsClick.bind(this.options));
        this.addDynamicListener(".option-item input[type=checkbox]", "change", this.options.switchChange, this.options);
        this.addDynamicListener(".option-item input[type=checkbox]#wordWrap", "change", this.options.setWordWrap, this.options);
        this.addDynamicListener(".option-item input[type=checkbox]#useMetaKey", "change", this.bindings.updateKeybList, this.bindings);
        this.addDynamicListener(".option-item input[type=checkbox]#showCatCount", "change", this.ops.setCatCount, this.ops);
        this.addDynamicListener(".option-item input[type=number]", "keyup", this.options.numberChange, this.options);
        this.addDynamicListener(".option-item input[type=number]", "change", this.options.numberChange, this.options);
        this.addDynamicListener(".option-item select", "change", this.options.selectChange, this.options);
        document.getElementById("theme").addEventListener("change", this.options.themeChange.bind(this.options));
        document.getElementById("logLevel").addEventListener("change", this.options.logLevelChange.bind(this.options));

        // Misc
        window.addEventListener("keydown", this.bindings.parseInput.bind(this.bindings));

        // LapCry shell controls
        document.getElementById("vault-toggle").addEventListener("click", () => this.setVaultOpen(true));
        document.getElementById("vault-close").addEventListener("click", () => this.setVaultOpen(false));
        document.getElementById("vault-scrim").addEventListener("click", () => this.setVaultOpen(false));
        document.getElementById("language-toggle").addEventListener("click", this.toggleLanguage.bind(this));
        document.getElementById("theme-toggle").addEventListener("click", this.toggleTheme.bind(this));
        document.addEventListener("keydown", this.handleShellKeydown.bind(this));
        document.addEventListener("lapcrylocalechange", this.refreshOperationLabels.bind(this));
        // Safety net: a catalog drag that the browser cancels never reports an end to Sortable.
        document.addEventListener("dragend", () => {
            document.body.classList.remove("catalog-drag");
        }, true);
        this.syncShellControls();
        this.setupSplitter();
    }


    /**
     * Opens or closes the slide-over operations catalog.
     * @param {boolean} open
     */
    setVaultOpen(open) {
        document.body.classList.toggle("vault-open", open);
        const toggle = document.getElementById("vault-toggle");
        const scrim = document.getElementById("vault-scrim");
        if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (scrim) scrim.hidden = !open;

        // The command palette's result list is re-parented into the catalog while it is open. Inside
        // the catalog it reads as "filter these operations", and it can never end up sitting on top
        // of the catalog's own chrome the way a floating panel would.
        this.parkSearchResults(open);

        if (open) {
            setTimeout(() => {
                const search = document.getElementById("search");
                if (search && !search.value) search.focus();
            }, 180);
        }
    }


    /**
     * Moves the operation search results between the top bar palette and the catalog body.
     * The result list is the same element either way, so Sortable, popovers and the search
     * highlighting all keep working while it moves.
     *
     * @param {boolean} open - Whether the catalog is open
     */
    parkSearchResults(open) {
        const results = document.getElementById("search-results");
        const target = open ?
            document.querySelector("#operations .lc-operation-surface") :
            document.querySelector(".lc-command");

        if (results && target && results.parentElement !== target) {
            target.appendChild(results);
        }
    }


    /**
     * Wires the drag handle that splits the recipe pipeline from the source and result bays.
     * The split is stored as a ratio so it survives a window resize sensibly.
     */
    setupSplitter() {
        const splitter = document.getElementById("lc-splitter");
        const wrapper = document.getElementById("workspace-wrapper");
        const recipe = document.getElementById("recipe");
        if (!splitter || !wrapper || !recipe) return;

        const MIN_TOP = 150;
        const MIN_BOTTOM = 180;
        let dragging = false;

        const paddingTop = () => parseFloat(getComputedStyle(wrapper).paddingTop) || 0;

        const applyHeight = height => {
            const ceiling = wrapper.clientHeight - paddingTop() - MIN_BOTTOM;
            const clamped = Math.max(MIN_TOP, Math.min(Math.round(height), Math.max(MIN_TOP, ceiling)));
            document.documentElement.style.setProperty("--lc-recipe-size", `${clamped}px`);
        };

        splitter.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            dragging = true;
            splitter.classList.add("is-active");
            document.body.classList.add("lc-resizing");
            try {
                splitter.setPointerCapture(e.pointerId);
            } catch (err) {}
            e.preventDefault();
        });

        splitter.addEventListener("pointermove", e => {
            if (!dragging) return;
            applyHeight(e.clientY - wrapper.getBoundingClientRect().top - paddingTop());
        });

        const finishDrag = e => {
            if (!dragging) return;
            dragging = false;
            splitter.classList.remove("is-active");
            document.body.classList.remove("lc-resizing");
            try {
                splitter.releasePointerCapture(e.pointerId);
            } catch (err) {}
            this.persistRecipeSize();
            this.app.adjustComponentSizes();
        };
        splitter.addEventListener("pointerup", finishDrag);
        splitter.addEventListener("pointercancel", finishDrag);

        splitter.addEventListener("dblclick", () => this.resetRecipeSize());
        splitter.addEventListener("keydown", e => {
            const step = e.shiftKey ? 48 : 16;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const delta = e.key === "ArrowUp" ? -step : step;
                applyHeight(recipe.getBoundingClientRect().height + delta);
                this.persistRecipeSize();
            } else if (e.key === "Home") {
                e.preventDefault();
                this.resetRecipeSize();
            }
        });

        this.restoreRecipeSize();
    }


    /**
     * Stores the current pipeline share of the workspace as a ratio.
     */
    persistRecipeSize() {
        const wrapper = document.getElementById("workspace-wrapper");
        const recipe = document.getElementById("recipe");
        if (!wrapper || !recipe || !wrapper.clientHeight) return;

        const ratio = recipe.getBoundingClientRect().height / wrapper.clientHeight;
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({recipeRatio: Number(ratio.toFixed(4))}));
        } catch (err) {}
    }


    /**
     * Applies the stored split, or the stylesheet default when nothing has been stored.
     */
    restoreRecipeSize() {
        let ratio = null;
        try {
            const stored = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || "{}");
            if (typeof stored.recipeRatio === "number") ratio = stored.recipeRatio;
        } catch (err) {}
        this.applyRecipeRatio(ratio);
    }


    /**
     * @param {number|null} ratio - Pipeline share of the workspace, or null for the default.
     */
    applyRecipeRatio(ratio) {
        if (typeof ratio === "number" && ratio > 0.15 && ratio < 0.85) {
            document.documentElement.style.setProperty("--lc-recipe-size", `${Math.round(ratio * 100)}%`);
        } else {
            document.documentElement.style.removeProperty("--lc-recipe-size");
        }
    }


    /**
     * Returns the pipeline split to its default and forgets the stored preference.
     */
    resetRecipeSize() {
        try {
            localStorage.removeItem(LAYOUT_STORAGE_KEY);
        } catch (err) {}
        this.applyRecipeRatio(null);
        this.app.adjustComponentSizes();
    }


    /**
     * Handles shell shortcuts: / focuses operation search, Escape closes the catalog.
     * @param {KeyboardEvent} e
     */
    handleShellKeydown(e) {
        const target = e.target;
        const isTyping = target instanceof Element && Boolean(target.closest(
            "input, textarea, select, [contenteditable='true']"
        ));

        if (e.key === "/" && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.setVaultOpen(true);
            document.getElementById("search")?.focus();
            return;
        }

        if (e.key === "Escape" && document.body.classList.contains("vault-open")) {
            this.setVaultOpen(false);
        }
    }


    /**
     * Switches between Chinese and English and persists the selection.
     */
    toggleLanguage() {
        const next = document.documentElement.lang === "zh-CN" ? "en-US" : "zh-CN";
        this.options.updateOption("language", next);
        const select = document.getElementById("language");
        if (select) select.value = next;
        this.options.applyLanguageChange(next);
        this.syncShellControls();
    }


    /**
     * Re-renders the localised operation labels after a language change. Recipe data keeps the
     * canonical English identifiers; only the visible labels are updated.
     */
    refreshOperationLabels() {
        this.app.populateOperationsList();
        this.recipe.initialiseOperationDragNDrop();

        document.querySelectorAll("#rec-list li.operation").forEach(el => {
            const name = el.dataset.opName;
            const title = el.querySelector(".op-title");
            if (name && title) title.textContent = operationLabel(name);
        });
    }


    /**
     * Switches between the light and dark themes and persists the selection.
     */
    toggleTheme() {
        const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        this.options.updateOption("theme", next);
        const select = document.getElementById("theme");
        if (select) select.value = next;
        this.options.changeTheme(next);
        this.syncShellControls();
    }


    /**
     * Keeps the compact shell controls in sync with the current settings.
     */
    syncShellControls() {
        const isDark = document.documentElement.classList.contains("dark");
        const themeToggle = document.getElementById("theme-toggle");
        const languageToggle = document.getElementById("language-toggle");

        if (themeToggle) {
            const icon = themeToggle.querySelector("i");
            if (icon) icon.textContent = isDark ? "light_mode" : "dark_mode";
            themeToggle.setAttribute("title", "Theme / 主题");
            themeToggle.setAttribute("aria-label", "Switch theme");
        }

        if (languageToggle) {
            languageToggle.setAttribute("title", "Language / 语言");
            languageToggle.setAttribute("aria-label", "Switch language");
        }
    }


    /**
     * Adds an event listener to each element in the specified group.
     *
     * @param {string} selector - A selector string for the element group to add the event to, see
     *   this.getAll()
     * @param {string} eventType - The event to listen for
     * @param {function} callback - The function to execute when the event is triggered
     * @param {Object} [scope=this] - The object to bind to the callback function
     *
     * @example
     * // Calls the clickable function whenever any element with the .clickable class is clicked
     * this.addListeners(".clickable", "click", this.clickable, this);
     */
    addListeners(selector, eventType, callback, scope) {
        scope = scope || this;
        [].forEach.call(document.querySelectorAll(selector), function(el) {
            el.addEventListener(eventType, callback.bind(scope));
        });
    }


    /**
     * Adds multiple event listeners to the specified element.
     *
     * @param {string} selector - A selector string for the element to add the events to
     * @param {string} eventTypes - A space-separated string of all the event types to listen for
     * @param {function} callback - The function to execute when the events are triggered
     * @param {Object} [scope=this] - The object to bind to the callback function
     *
     * @example
     * // Calls the search function whenever the keyup, paste or search events are triggered on the
     * // search element
     * this.addMultiEventListener("search", "keyup paste search", this.search, this);
     */
    addMultiEventListener(selector, eventTypes, callback, scope) {
        const evs = eventTypes.split(" ");
        for (let i = 0; i < evs.length; i++) {
            document.querySelector(selector).addEventListener(evs[i], callback.bind(scope));
        }
    }


    /**
     * Adds multiple event listeners to each element in the specified group.
     *
     * @param {string} selector - A selector string for the element group to add the events to
     * @param {string} eventTypes - A space-separated string of all the event types to listen for
     * @param {function} callback - The function to execute when the events are triggered
     * @param {Object} [scope=this] - The object to bind to the callback function
     *
     * @example
     * // Calls the save function whenever the keyup or paste events are triggered on any element
     * // with the .saveable class
     * this.addMultiEventListener(".saveable", "keyup paste", this.save, this);
     */
    addMultiEventListeners(selector, eventTypes, callback, scope) {
        const evs = eventTypes.split(" ");
        for (let i = 0; i < evs.length; i++) {
            this.addListeners(selector, evs[i], callback, scope);
        }
    }


    /**
     * Adds an event listener to the global document object which will listen on dynamic elements which
     * may not exist in the DOM yet.
     *
     * @param {string} selector - A selector string for the element(s) to add the event to
     * @param {string} eventType - The event(s) to listen for
     * @param {function} callback - The function to execute when the event(s) is/are triggered
     * @param {Object} [scope=this] - The object to bind to the callback function
     *
     * @example
     * // Pops up an alert whenever any button is clicked, even if it is added to the DOM after this
     * // listener is created
     * this.addDynamicListener("button", "click", alert, this);
     */
    addDynamicListener(selector, eventType, callback, scope) {
        const eventConfig = {
            selector: selector,
            callback: callback.bind(scope || this)
        };

        if (Object.prototype.hasOwnProperty.call(this.dynamicHandlers, eventType)) {
            // Listener already exists, add new handler to the appropriate list
            this.dynamicHandlers[eventType].push(eventConfig);
        } else {
            this.dynamicHandlers[eventType] = [eventConfig];
            // Set up listener for this new type
            document.addEventListener(eventType, this.dynamicListenerHandler.bind(this));
        }
    }


    /**
     * Handler for dynamic events. This function is called for any dynamic event and decides which
     * callback(s) to execute based on the type and selector.
     *
     * @param {Event} e - The event to be handled
     */
    dynamicListenerHandler(e) {
        const { type, target } = e;
        const handlers = this.dynamicHandlers[type];
        const matches = target.matches ||
                target.webkitMatchesSelector ||
                target.mozMatchesSelector ||
                target.msMatchesSelector ||
                target.oMatchesSelector;

        for (let i = 0; i < handlers.length; i++) {
            if (matches && matches.call(target, handlers[i].selector)) {
                handlers[i].callback(e);
            }
        }
    }
}

export default Manager;
