/**
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 */

import HTMLOperation from "../HTMLOperation.mjs";
import {operationLabel} from "../i18n.mjs";
import Sortable from "sortablejs";
import {fuzzyMatch, calcMatchRanges} from "../../core/lib/FuzzyMatch.mjs";


/**
 * Waiter to handle events related to the operations.
 */
class OperationsWaiter {

    /**
     * OperationsWaiter constructor.
     *
     * @param {App} app - The main view object for CyberChef.
     * @param {Manager} manager - The CyberChef event manager.
     */
    constructor(app, manager) {
        this.app = app;
        this.manager = manager;

        this.options = {};
        this.removeIntent = false;
        // Tracks the pointer while the favourites editor is being dragged so removal-by-drag-out
        // also works on the pointer-event fallback path used by touch and pen devices.
        this.draggingFavourites = false;
        this.favouritesPointer = null;
        this.favouritesPointerTracker = null;
    }

    /**
     * Handler for search events.
     * Finds operations which match the given search term and displays them under the search box.
     *
     * @param {KeyboardEvent | ClipboardEvent | Event} e
     */
    searchOperations(e) {
        let ops, selected;

        if ((e.type === "search" && e.target.value !== "") || e.keyCode === 13) { // Search (non-empty) or Return
            e.preventDefault();
            ops = document.querySelectorAll("#search-results li");
            if (ops.length) {
                selected = this.getSelectedOp(ops);
                if (selected > -1) {
                    this.manager.recipe.addOperation(this.operationName(ops[selected]));
                }
            }
        }

        /**
         * Sets up the operation element with the correct attributes when selected
         * @param {HTMLElement} element
         */
        const _selectOperation = (element) => {
            element.classList.add("selected-op");
            element.scrollIntoView({block: "nearest"});
            $(element).popover("show");
            e.target.setAttribute("aria-activedescendant", element.id);
        };

        /**
         * Sets up the operation element with the correct attributes when deselected
         * @param {HTMLElement} element
         */
        const _deselectOperation = (element) => {
            element.classList.remove("selected-op");
            $(element).popover("hide");
        };

        if (e.keyCode === 40) { // Down
            e.preventDefault();
            ops = document.querySelectorAll("#search-results li");
            if (ops.length) {
                selected = this.getSelectedOp(ops);
                if (selected > -1) _deselectOperation(ops[selected]);
                if (selected === ops.length-1) selected = -1;
                _selectOperation(ops[selected+1]);
            }
        } else if (e.keyCode === 38) { // Up
            e.preventDefault();
            ops = document.querySelectorAll("#search-results li");
            if (ops.length) {
                selected = this.getSelectedOp(ops);
                if (selected > -1) _deselectOperation(ops[selected]);
                if (selected === 0) selected = ops.length;
                _selectOperation(ops[selected-1]);
            }
        } else {
            const searchResultsEl = document.getElementById("search-results");
            const el = e.target;
            const str = el.value;

            $("#categories .show").collapse("hide");
            this.clearSearchResults();

            if (str) {
                const matchedOps = this.filterOperations(str, true);
                const matchedOpsHtml = matchedOps
                    .map((operation, idx) => operation.toStubHtml(false, `search-result-${idx}`))
                    .join("");

                searchResultsEl.innerHTML = matchedOpsHtml;
                searchResultsEl.dispatchEvent(this.manager.oplistcreate);
            }
        }
    }


    /**
     * Filters operations based on the search string and returns the matching ones.
     *
     * @param {string} searchStr
     * @param {boolean} highlight - Whether or not to highlight the matching string in the operation
     *   name and description
     * @returns {HTMLOperation[]}
     */
    filterOperations(inStr, highlight) {
        const matchedOps = [];
        const matchedDescs = [];

        // Create version with no whitespace for the fuzzy match
        // Helps avoid missing matches e.g. query "TCP " would not find "Parse TCP"
        const inStrNWS = inStr.replace(/\s/g, "");

        for (const opName in this.app.operations) {
            const op = this.app.operations[opName];

            const display = operationLabel(opName);
            const displayDiffers = display !== opName;

            // Prefer a direct match against the localised display name, then fall back to the
            // fuzzy match over the canonical English name so English queries keep working.
            let nameMatch = false, score = 0, idxs = [], labelRanges = null;
            if (displayDiffers) {
                const pos = display.toLowerCase().indexOf(inStr.toLowerCase());
                if (pos >= 0) {
                    nameMatch = true;
                    score = 1000 - pos;
                    labelRanges = [[pos, inStr.length]];
                }
            }
            if (!nameMatch) {
                [nameMatch, score, idxs] = fuzzyMatch(inStrNWS, opName);
            }

            // Match description based on exact match
            const descPos = op.description.toLowerCase().indexOf(inStr.toLowerCase());

            if (nameMatch || descPos >= 0) {
                const operation = new HTMLOperation(opName, this.app.operations[opName], this.app, this.manager);
                if (highlight) {
                    const nameRanges = labelRanges || (displayDiffers ? [] : calcMatchRanges(idxs));
                    operation.highlightSearchStrings(nameRanges, [[descPos, inStr.length]]);
                }

                if (nameMatch) {
                    matchedOps.push([operation, score]);
                } else {
                    matchedDescs.push(operation);
                }
            }
        }

        // Sort matched operations based on fuzzy score
        matchedOps.sort((a, b) => b[1] - a[1]);

        return matchedOps.map(a => a[0]).concat(matchedDescs);
    }


    /**
     * Finds the operation which has been selected using keyboard shortcuts. This will have the class
     * 'selected-op' set. Returns the index of the operation within the given list.
     *
     * @param {element[]} ops
     * @returns {number}
     */
    getSelectedOp(ops) {
        for (let i = 0; i < ops.length; i++) {
            if (ops[i].classList.contains("selected-op")) {
                return i;
            }
        }
        return -1;
    }


    /**
     * Handler for oplistcreate events.
     *
     * @listens Manager#oplistcreate
     * @param {event} e
     */
    opListCreate(e) {
        this.manager.recipe.createSortableSeedList(e.target);

        // Populate ops total
        document.querySelector("#operations .title .op-count").innerText = Object.keys(this.app.operations).length;

        this.enableOpsListPopovers(e.target);
    }


    /**
     * Sets up popovers, allowing the popover itself to gain focus which enables scrolling
     * and other interactions.
     *
     * @param {Element} el - The element to start selecting from
     */
    enableOpsListPopovers(el) {
        const self = this;
        $(el).find("[data-toggle=popover]").addBack("[data-toggle=popover]")
            .popover({trigger: "manual"})
            .on("mouseenter", function(e) {
                if (e.buttons > 0 || self.manager.recipe.dragInProgress) return; // Mouse button held down - likely dragging an operation
                const _this = this;
                $(this).popover("show");
                $(".popover").on("mouseleave", function () {
                    $(_this).popover("hide");
                });
            }).on("mouseleave", function () {
                const _this = this;
                setTimeout(function() {
                    // Determine if the popover associated with this element is being hovered over
                    if ($(_this).data("bs.popover") &&
                        ($(_this).data("bs.popover").tip && !$($(_this).data("bs.popover").tip).is(":hover"))) {
                        $(_this).popover("hide");
                    }
                }, 50);
            });
    }


    /**
     * Handler for operation doubleclick events.
     * Adds the operation to the recipe and auto bakes.
     *
     * @param {event} e
     */
    operationDblclick(e) {
        const li = e.target.closest("li.operation") || e.target;

        // Ignore the delete icon inside the favourites editor.
        if (!li.classList.contains("operation") || e.target.closest(".remove-icon, .op-icon")) return;

        this.manager.recipe.addOperation(this.operationName(li));

        // Collapse the search flyout once an operation has been taken from it, so the results no
        // longer sit over the workspace controls. Drag-and-drop additions are left untouched so
        // several operations can still be dragged out of one search in a row.
        if (li.closest("#search-results")) {
            this.clearSearchResults();
        }
    }


    /**
     * Empties the operation search results without touching the query in the search box. An empty
     * list is hidden by CSS, so this doubles as dismissing the palette flyout.
     */
    clearSearchResults() {
        const searchResultsEl = document.getElementById("search-results");
        if (!searchResultsEl) return;

        while (searchResultsEl.firstChild) {
            try {
                $(searchResultsEl.firstChild).popover("dispose");
            } catch (err) {}
            searchResultsEl.removeChild(searchResultsEl.firstChild);
        }

        const search = document.getElementById("search");
        if (search) search.removeAttribute("aria-activedescendant");
    }


    /**
     * Resolves the canonical operation name for a rendered operation element. The localised
     * label is never used for recipe data, so the canonical name is read from the data
     * attribute whenever it is available.
     *
     * @param {element} el
     * @returns {string}
     */
    operationName(el) {
        if (!el) return "";
        return el.dataset?.opName || el.textContent.trim();
    }


    /**
     * Handler for edit favourites click events.
     * Sets up the 'Edit favourites' pane and displays it.
     *
     * @param {event} e
     */
    editFavouritesClick(e) {
        e.preventDefault();
        e.stopPropagation();

        // Add favourites to modal
        const favCat = this.app.categories.filter(function(c) {
            return c.name === "Favourites";
        })[0];

        let html = "";
        for (let i = 0; i < favCat.ops.length; i++) {
            const opName = favCat.ops[i];
            const operation = new HTMLOperation(opName, this.app.operations[opName], this.app, this.manager);
            html += operation.toStubHtml(true);
        }

        const editFavouritesList = document.getElementById("edit-favourites-list");
        editFavouritesList.innerHTML = html;
        this.removeIntent = false;
        this.favouritesPointer = null;

        if (!this.favouritesPointerTracker) {
            this.favouritesPointerTracker = function(evt) {
                if (!this.draggingFavourites) return;
                const src = evt.touches && evt.touches.length ? evt.touches[0] : evt;
                if (typeof src.clientX === "number" && typeof src.clientY === "number") {
                    this.favouritesPointer = {x: src.clientX, y: src.clientY};
                }
            }.bind(this);
            document.addEventListener("pointermove", this.favouritesPointerTracker, true);
            document.addEventListener("mousemove", this.favouritesPointerTracker, true);
            document.addEventListener("touchmove", this.favouritesPointerTracker, true);
        }

        const editableList = Sortable.create(editFavouritesList, {
            filter: ".remove-icon",
            onFilter: function (evt) {
                const el = editableList.closest(evt.item);
                if (el && el.parentNode) {
                    $(el).popover("dispose");
                    el.parentNode.removeChild(el);
                }
            },
            onStart: function() {
                this.draggingFavourites = true;
                this.favouritesPointer = null;
            }.bind(this),
            onEnd: function(evt) {
                let outside = this.removeIntent;
                const pointer = this.favouritesPointer;
                if (!outside && pointer) {
                    const rect = editFavouritesList.getBoundingClientRect();
                    outside = pointer.x < rect.left || pointer.x > rect.right ||
                        pointer.y < rect.top || pointer.y > rect.bottom;
                }
                this.favouritesPointer = null;
                this.draggingFavourites = false;
                if (outside) {
                    $(evt.item).popover("dispose");
                    evt.item.remove();
                }
            }.bind(this),
        });

        Sortable.utils.on(editFavouritesList, "dragleave", function() {
            this.removeIntent = true;
        }.bind(this));

        Sortable.utils.on(editFavouritesList, "dragover", function() {
            this.removeIntent = false;
        }.bind(this));

        $("#edit-favourites-list [data-toggle=popover]").popover();
        $("#favourites-modal").modal();
    }


    /**
     * Handler for save favourites click events.
     * Saves the selected favourites and reloads them.
     */
    saveFavouritesClick() {
        const favs = document.querySelectorAll("#edit-favourites-list li");
        const favouritesList = Array.from(favs, e => e.childNodes[0].textContent);

        this.app.saveFavourites(favouritesList);
        this.app.loadFavourites();
        this.app.populateOperationsList();
        this.manager.recipe.initialiseOperationDragNDrop();
    }


    /**
     * Handler for reset favourites click events.
     * Resets favourites to their defaults.
     */
    resetFavouritesClick() {
        this.app.resetFavourites();
    }


    /**
     * Sets whether operation counts are displayed next to a category title
     */
    setCatCount() {
        if (this.app.options.showCatCount) {
            document.querySelectorAll(".category-title .op-count").forEach(el => el.classList.remove("hidden"));
        } else {
            document.querySelectorAll(".category-title .op-count").forEach(el => el.classList.add("hidden"));
        }
    }

}

export default OperationsWaiter;
