/**
 * URL Incrementer
 * @file options.js
 * @author Roy Six
 * @license LGPL-3.0
 */

var Options = (() => {

  // The DOM elements cache, KeyboardEvent.key and modifier bits map, and array of internal shortcuts
  const DOM = {};
  const KEY_MODIFIERS = new Map([["Alt",0x1],["Control",0x2],["Shift",0x4],["Meta",0x8]]);
  const shortcuts = ["increment", "decrement", "next", "prev", "clear", "return", "auto", "download"];

  // The backgroundPage cache, key variable that stores the key between keyDown and keyUp, and timeouts object
  let backgroundPage = {};
  let key = {};
  let timeouts = {};

  /**
   * Initializes the Options window. This script is set to defer so the DOM is guaranteed to be parsed by this point.
   *
   * @private
   */
  async function init() {
    backgroundPage = await Promisify.getBackgroundPage();
    buildShortcuts();
    const ids = document.querySelectorAll("[id]");
    const i18ns = document.querySelectorAll("[data-i18n]");
    // Cache DOM elements
    for (const element of ids) {
      DOM["#" + element.id] = element;
    }
    // Set i18n (internationalization) text from messages.json
    for (const element of i18ns) {
      element[element.dataset.i18n] = chrome.i18n.getMessage(element.id.replace(/-/g, '_').replace(/\*.*/, ''));
    }
    // Add Event Listeners to the DOM elements
    DOM["#internal-shortcuts-enable-button"].addEventListener("click", function() { Permissions.requestPermission("internalShortcuts", function(granted) { if (granted) { populateValuesFromStorage("internalShortcuts"); } }) });
    DOM["#browser-shortcuts-enable-button"].addEventListener("click", function() { Permissions.removePermission("internalShortcuts", function(removed) { if (removed) { populateValuesFromStorage("internalShortcuts"); } }) });
    DOM["#browser-shortcuts-quick-enable-input"].addEventListener("change", function () { chrome.storage.local.set({"commandsQuickEnabled": this.checked}); });
    DOM["#browser-shortcuts-button"].addEventListener("click", function() { chrome.tabs.update({url: "chrome://extensions/shortcuts"}); });
    DOM["#shortcuts-editable-disabled-input"].addEventListener("change", function () { chrome.storage.local.set({"shortcutsEditableDisabled": this.checked}); });
    DOM["#key-quick-enable-input"].addEventListener("change", function () { chrome.storage.local.set({"keyQuickEnabled": this.checked}); });
    DOM["#mouse-quick-enable-input"].addEventListener("change", function () { chrome.storage.local.set({"mouseQuickEnabled": this.checked}); });
    DOM["#mouse-click-speed-input"].addEventListener("change", function () { chrome.storage.local.set({"mouseClickSpeed": +this.value >= 100 && +this.value <= 1000 ? +this.value : 400}); });
    DOM["#icon-color-radios"].addEventListener("change", function(event) { changeIconColor.call(event.target); });
    DOM["#icon-feedback-enable-input"].addEventListener("change", function () { chrome.storage.local.set({"iconFeedbackEnabled": this.checked}); });
    DOM["#popup-button-size-input"].addEventListener("change", function () { if (+this.value >= 16 && +this.value <= 64) { saveInput(this, "popupButtonSize", "number");
      DOM["#popup-button-size-img"].style = "width:" + (+this.value) + "px; height:" + (+this.value) + "px;"; } });
    DOM["#popup-button-size-img"].addEventListener("click", function () { if (DOM["#popup-animations-enable-input"].checked) { UI.clickHoverCss(this, "hvr-push-click"); } });
    DOM["#popup-animations-enable-input"].addEventListener("change", function () { chrome.storage.local.set({"popupAnimationsEnabled": this.checked});
      DOM["#popup-button-size-img"].className = this.checked ? "hvr-grow" : "" });
    DOM["#decode-uri-enable-input"].addEventListener("change", function () { chrome.storage.local.set({"decodeURIEnabled": this.checked}); });
    DOM["#saved-urls-preselect-input"].addEventListener("change", function () { chrome.storage.local.set({"savePreselect": this.checked}); });
    DOM["#saved-urls-delete-button"].addEventListener("click", function() { deleteSavedURL(); });
    DOM["#saved-urls-wildcard-add-button"].addEventListener("click", function() { DOM["#saved-urls-wildcard"].className = "display-block fade-in"; DOM["#saved-urls-wildcard-url-textarea"].value = DOM["#saved-urls-wildcard-errors"].textContent = ""; });
    DOM["#saved-urls-wildcard-cancel-button"].addEventListener("click", function() { DOM["#saved-urls-wildcard"].className = "display-none"; });
    DOM["#saved-urls-wildcard-save-button"].addEventListener("click", function() { addSavedURL(); });
    DOM["#selection-select"].addEventListener("change", function() { DOM["#selection-custom"].className = this.value === "custom" ? "display-block fade-in" : "display-none"; chrome.storage.local.set({"selectionPriority": this.value}); });
    DOM["#selection-custom-save-button"].addEventListener("click", function () { customSelection("save"); });
    DOM["#selection-custom-test-button"].addEventListener("click", function() { customSelection("test"); });
    DOM["#interval-input"].addEventListener("change", function () { if (+this.value > 0) { saveInput(this, "interval", "number");} });
    DOM["#leading-zeros-pad-by-detection-input"].addEventListener("change", function() { chrome.storage.local.set({ "leadingZerosPadByDetection": this.checked}); });
    DOM["#base-select"].addEventListener("change", function() {
      DOM["#base-case"].className = +this.value > 10 ? "display-block fade-in" : "display-none";
      DOM["#base-date"].className = this.value === "date" ? "display-block fade-in" : "display-none";
      DOM["#base-roman"].className = this.value === "roman" ? "display-block fade-in" : "display-none";
      DOM["#base-custom"].className = this.value === "custom" ? "display-block fade-in" : "display-none";
      chrome.storage.local.set({"base": +this.value > 10 ? +this.value : this.value});
    });
    DOM["#base-case"].addEventListener("change", function() { chrome.storage.local.set({"baseCase": event.target.value}); });
    DOM["#base-date-format-input"].addEventListener("input", function() { saveInput(this, "baseDateFormat", "value"); });
    DOM["#base-roman"].addEventListener("change", function() { chrome.storage.local.set({"baseRoman": event.target.value}); });
    DOM["#base-custom-input"].addEventListener("input", function() { saveInput(this, "baseCustom", "value"); });
    DOM["#shuffle-limit-input"].addEventListener("change", function () { if (+this.value >= 1 && +this.value <= 5000) { saveInput(this, "shuffleLimit", "number"); } });
    DOM["#error-skip-input"].addEventListener("change", function() { if (+this.value >= 0 && +this.value <= 100) { saveInput(this, "errorSkip", "number"); } });
    DOM["#error-skip-checkboxes"].addEventListener("change", function() { updateErrorCodes(); });
    DOM["#error-codes-custom-input"].addEventListener("input", function() { saveInput(this, "errorCodesCustom", "array-split-all"); });
    DOM["#next-prev-rule-next"].addEventListener("change", function() {
      chrome.storage.local.set({"nextType": event.target.value});
      DOM["#next-prev-selector-next-input"].style.display = event.target.value === "selector" ? "" : "none";
      DOM["#next-prev-xpath-next-input"].style.display = event.target.value === "xpath" ? "" : "none";
    });
    DOM["#next-prev-rule-prev"].addEventListener("change", function() {
      chrome.storage.local.set({"prevType": event.target.value});
      DOM["#next-prev-selector-prev-input"].style.display = event.target.value === "selector" ? "" : "none";
      DOM["#next-prev-xpath-prev-input"].style.display = event.target.value === "xpath" ? "" : "none";
    });
    DOM["#next-prev-selector-next-input"].addEventListener("input", function() { saveInput(this, "nextSelector", "value"); });
    DOM["#next-prev-selector-prev-input"].addEventListener("input", function() { saveInput(this, "prevSelector", "value"); });
    DOM["#next-prev-xpath-next-input"].addEventListener("input", function() { saveInput(this, "nextXpath", "value"); });
    DOM["#next-prev-xpath-prev-input"].addEventListener("input", function() { saveInput(this, "prevXpath", "value"); });
    DOM["#next-prev-attribute-next-input"].addEventListener("input", function() { saveInput(this, "nextAttribute", "array-split-period"); });
    DOM["#next-prev-attribute-prev-input"].addEventListener("input", function() { saveInput(this, "prevAttribute", "array-split-period"); });
    DOM["#next-prev-keywords-next-textarea"].addEventListener("input", function() { saveInput(this, "nextKeywords", "array-split-nospace-lowercase"); });
    DOM["#next-prev-keywords-prev-textarea"].addEventListener("input", function() { saveInput(this, "prevKeywords", "array-split-nospace-lowercase"); });
    DOM["#next-prev-same-domain-policy-enable-input"].addEventListener("change", function() { chrome.storage.local.set({"nextPrevSameDomainPolicy": this.checked}); });
    DOM["#next-prev-popup-buttons-input"].addEventListener("change", function() { chrome.storage.local.set({"nextPrevPopupButtons": this.checked}); });
    DOM["#download-enable-button"].addEventListener("click", function() { Permissions.requestPermission("download", function(granted) { if (granted) { populateValuesFromStorage("download"); } }) });
    DOM["#download-disable-button"].addEventListener("click", function() { Permissions.removePermission("download", function(removed) { if (removed) { populateValuesFromStorage("download"); } }) });
    DOM["#enhanced-mode-enable-button"].addEventListener("click", function() { Permissions.requestPermission("enhancedMode", function(granted) { if (granted) { populateValuesFromStorage("enhancedMode"); } }) });
    DOM["#enhanced-mode-disable-button"].addEventListener("click", function() { Permissions.removePermission("enhancedMode", function(removed) { if (removed) { populateValuesFromStorage("enhancedMode"); } }) });
    DOM["#mascot-input"].addEventListener("click", clickMascot);
    DOM["#reset-options-button"].addEventListener("click", resetOptions);
    DOM["#manifest-name"].textContent = chrome.runtime.getManifest().name;
    DOM["#manifest-version"].textContent = chrome.runtime.getManifest().version;
    // Populate all values from storage
    populateValuesFromStorage("all");
  }

  /**
   * Builds out the shortcuts table HTML and adds event listeners.
   *
   * @private
   */
  function buildShortcuts() {
    const table = document.getElementById("internal-shortcuts-table");
    for (const shortcut of shortcuts) {
      const row = document.createElement("div"); row.className = "row";  table.appendChild(row);
      const column1 = document.createElement("div"); column1.className = "column"; row.appendChild(column1);
      const label = document.createElement("label"); label.id = "key-" + shortcut + "-label"; label.htmlFor = "key-" + shortcut + "-input"; label.dataset.i18n = "textContent"; column1.appendChild(label);
      const column2 = document.createElement("div"); column2.className = "column"; row.appendChild(column2);
      const input = document.createElement("input");
      input.id = "key-" + shortcut + "-input";
      input.className = "key-input";
      input.type = "text";
      input.readOnly = true;
      column2.appendChild(input);
      const clear = document.createElement("input");
      clear.id = "key-" + shortcut + "-clear";
      clear.className = "key-clear";
      clear.type = "image";
      clear.src = "../img/times-circle-2.png";
      clear.alt = "key-clear";
      clear.width = clear.height = "18";
      column2.appendChild(clear);
      const column3 = document.createElement("div");
      column3.className = "column";
      row.appendChild(column3);
      const select = document.createElement("select");
      select.id = "mouse-" + shortcut + "-select";
      column3.appendChild(select);
      const optionids = ["notset", "left", "middle", "right", "right-left", "left-right"];
      for (let i = 0, value = -1; i < optionids.length; i++, value++) {
        const option = document.createElement("option");
        option.id = "mouse-" + optionids[i] + "-option*" + shortcut;
        option.dataset.i18n = "textContent";
        option.value = value + "";
        select.appendChild(option);
      }
      const column4 = document.createElement("div");
      column4.className = "column";
      row.appendChild(column4);
      const clicks = document.createElement("input");
      clicks.id = "mouse-" + shortcut + "-clicks";
      clicks.style.width = "36px";
      clicks.type = "number";
      clicks.min = "1";
      clicks.max = "9";
      column4.appendChild(clicks);
      // Add Event Listeners
      input.addEventListener("keydown", function (event) { translateKey(event); writeInput(this, key); });
      input.addEventListener("keyup", function (event) { key.code = !KEY_MODIFIERS.has(event.key) ? event.code : key.code; writeInput(this, key); setKey(this); });
      clear.addEventListener("click", function () { chrome.storage.local.set({[getStorageKey(this)]: null}, function() { setKeyEnabled(); }); writeInput(DOM["#key-" + shortcut + "-input"], null); });
      select.addEventListener("change", function() { setMouse(this, undefined); });
      clicks.addEventListener("change", function() { setMouse(undefined, this); });
    }
  }

  /**
   * Populates the options form values from the extension storage.
   *
   * @param values which values to populate, e.g. "all" for all or "xyz" for only xyz values (with fade-in effect)
   * @private
   */
  async function populateValuesFromStorage(values) {
    const items = await Promisify.getItems();
    if (values === "all" || values === "internalShortcuts") {
      DOM["#browser-shortcuts"].className = !items.permissionsInternalShortcuts ? values === "internalShortcuts" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#internal-shortcuts"].className = items.permissionsInternalShortcuts ? values === "internalShortcuts" ? "display-block fade-in" : "display-block" : "display-none";
    }
    if (values === "all" || values === "download") {
      DOM["#download-disable-button"].className = items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#download-enable-button"].className = !items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#download-settings-enable"].className = items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#download-settings-disable"].className = !items.permissionsDownload ? values === "download" ? "display-block fade-in" : "display-block" : "display-none";
    }
    if (values === "all" || values === "enhancedMode") {
      DOM["#enhanced-mode-disable-button"].className = items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#enhanced-mode-enable-button"].className = !items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#enhanced-mode-enable"].className = items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
      DOM["#enhanced-mode-disable"].className = !items.permissionsEnhancedMode ? values === "enhancedMode" ? "display-block fade-in" : "display-block" : "display-none";
    }
    if (values === "all" || values === "savedURLs") {
      DOM["#saved-urls-delete-button"].className = items.saves && items.saves.length > 0 ? "fade-in" : "display-none";
      DOM["#saved-urls-preselect-input"].checked = items.savePreselect;
      buildSavedURLsTable(items.saves, items.saveKey);
    }
    if (values === "all") {
      DOM["#browser-shortcuts-quick-enable-input"].checked = items.commandsQuickEnabled;
      DOM["#shortcuts-editable-disabled-input"].checked = items.shortcutsEditableDisabled;
      DOM["#key-quick-enable-input"].checked = items.keyQuickEnabled;
      DOM["#mouse-quick-enable-input"].checked = items.mouseQuickEnabled;
      DOM["#key-enable-img"].className = items.keyEnabled ? "display-inline" : "display-none";
      DOM["#mouse-enable-img"].className = items.mouseEnabled ? "display-inline" : "display-none";
      DOM["#mouse-click-speed-input"].value = items.mouseClickSpeed;
      for (const shortcut of shortcuts) {
        const keyStorageKey = getStorageKey(DOM["#key-" + shortcut + "-input"]);
        const mouseStorageKey = getStorageKey(DOM["#mouse-" + shortcut + "-select"]);
        writeInput(DOM["#key-" + shortcut + "-input"], items[keyStorageKey]);
        DOM["#mouse-" + shortcut + "-select"].value = items[mouseStorageKey] ? items[mouseStorageKey].button : -1;
        DOM["#mouse-" + shortcut + "-clicks"].value = items[mouseStorageKey] ? items[mouseStorageKey].clicks : 1;
        DOM["#mouse-" + shortcut + "-clicks"].className = items[mouseStorageKey] ? "display-block fade-in" : "display-none";
      }
      DOM["#icon-color-radio-" + items.iconColor].checked = true;
      DOM["#icon-feedback-enable-input"].checked = items.iconFeedbackEnabled;
      DOM["#popup-button-size-input"].value = items.popupButtonSize;
      DOM["#popup-button-size-img"].style = "width:" + items.popupButtonSize + "px; height:" + items.popupButtonSize + "px;";
      DOM["#popup-button-size-img"].className = items.popupAnimationsEnabled ? "hvr-grow" : "";
      DOM["#popup-animations-enable-input"].checked = items.popupAnimationsEnabled;
      DOM["#decode-uri-enable-input"].checked = items.decodeURIEnabled;
      DOM["#selection-select"].value = items.selectionPriority;
      DOM["#selection-custom"].className = items.selectionPriority === "custom" ? "display-block" : "display-none";
      DOM["#selection-custom-url-textarea"].value = items.selectionCustom.url;
      DOM["#selection-custom-regex-input"].value = items.selectionCustom.regex;
      DOM["#selection-custom-flags-input"].value = items.selectionCustom.flags;
      DOM["#selection-custom-group-input"].value = items.selectionCustom.group;
      DOM["#selection-custom-index-input"].value = items.selectionCustom.index;
      DOM["#interval-input"].value = items.interval;
      DOM["#leading-zeros-pad-by-detection-input"].checked = items.leadingZerosPadByDetection;
      DOM["#base-select"].value = items.base;
      DOM["#base-case"].className = items.base > 10 ? "display-block" : "display-none";
      DOM["#base-case-lowercase-input"].checked = items.baseCase === "lowercase";
      DOM["#base-case-uppercase-input"].checked = items.baseCase === "uppercase";
      DOM["#base-date"].className = items.base === "date" ? "display-block" : "display-none";
      DOM["#base-date-format-input"].value = items.baseDateFormat;
      DOM["#base-roman"].className = items.base === "roman" ? "display-block" : "display-none";
      DOM["#base-roman-latin-input"].checked = items.baseRoman === "latin";
      DOM["#base-roman-u216x-input"].checked = items.baseRoman === "u216x";
      DOM["#base-roman-u217x-input"].checked = items.baseRoman === "u217x";
      DOM["#base-custom"].className = items.base === "custom" ? "display-block" : "display-none";
      DOM["#base-custom-input"].value = items.baseCustom;
      DOM["#shuffle-limit-input"].value = items.shuffleLimit;
      DOM["#error-skip-input"].value = items.errorSkip;
      DOM["#error-codes-404-input"].checked = items.errorCodes.includes("404");
      DOM["#error-codes-3XX-input"].checked = items.errorCodes.includes("3XX");
      DOM["#error-codes-4XX-input"].checked = items.errorCodes.includes("4XX");
      DOM["#error-codes-5XX-input"].checked = items.errorCodes.includes("5XX");
      DOM["#error-codes-CUS-input"].checked = items.errorCodes.includes("CUS");
      DOM["#error-codes-EXC-input"].checked = items.errorCodes.includes("EXC");
      DOM["#error-codes-custom"].className = items.errorCodes.includes("CUS") ? "display-block" : "display-none";
      DOM["#error-codes-custom-input"].value = items.errorCodesCustom;
      DOM["#next-prev-rule-selector-next"].checked = items.nextType === "selector";
      DOM["#next-prev-rule-xpath-next"].checked = items.nextType === "xpath";
      DOM["#next-prev-rule-selector-prev"].checked = items.prevType === "selector";
      DOM["#next-prev-rule-xpath-prev"].checked = items.prevType === "xpath";
      DOM["#next-prev-selector-next-input"].style.display = items.nextType === "selector" ? "" : "none";
      DOM["#next-prev-xpath-next-input"].style.display = items.nextType === "xpath" ? "" : "none";
      DOM["#next-prev-selector-prev-input"].style.display = items.prevType === "selector" ? "" : "none";
      DOM["#next-prev-xpath-prev-input"].style.display = items.prevType === "xpath" ? "" : "none";
      DOM["#next-prev-selector-next-input"].value = items.nextSelector;
      DOM["#next-prev-selector-prev-input"].value = items.prevSelector;
      DOM["#next-prev-xpath-next-input"].value = items.nextXpath;
      DOM["#next-prev-xpath-prev-input"].value = items.prevXpath;
      DOM["#next-prev-attribute-next-input"].value = items.nextAttribute.join(".");
      DOM["#next-prev-attribute-prev-input"].value = items.prevAttribute.join(".");
      DOM["#next-prev-keywords-next-textarea"].value = items.nextKeywords;
      DOM["#next-prev-keywords-prev-textarea"].value = items.prevKeywords;
      DOM["#next-prev-same-domain-policy-enable-input"].checked = items.nextPrevSameDomainPolicy;
      DOM["#next-prev-popup-buttons-input"].checked = items.nextPrevPopupButtons;
    }
  }

  /**
   * Changes the extension icon color in the browser's toolbar (browserAction).
   *
   * @private
   */
  function changeIconColor() {
    // Firefox Android: chrome.browserAction.setIcon() not supported
    if (!chrome.browserAction.setIcon) {
      return;
    }
    // Possible values may be: default, light, confetti, or urli
    chrome.browserAction.setIcon({
      path : {
        "16": "/img/16-" + this.value + ".png",
        "24": "/img/24-" + this.value + ".png",
        "32": "/img/32-" + this.value + ".png"
      }
    });
    chrome.storage.local.set({"iconColor": this.value});
  }

  /**
   * Translates the keydown event that was pressed into the key object. This is needed afterwards
   * to write the key to the input value and save the key to storage on keyup.
   *
   * @param event the key event fired
   * @private
   */
  function translateKey(event) {
    event.preventDefault();
    // Set key modifiers as the event modifiers OR'd together and the key code as the KeyboardEvent.code
    key = { "modifiers":
      (event.altKey   ? KEY_MODIFIERS.get("Alt") :     0x0) |
      (event.ctrlKey  ? KEY_MODIFIERS.get("Control") : 0x0) |
      (event.shiftKey ? KEY_MODIFIERS.get("Shift") :   0x0) |
      (event.metaKey  ? KEY_MODIFIERS.get("Meta") :    0x0),
      // Checking event.key is easier than event.code for the modifiers since code contains left/right separately
      "code": !KEY_MODIFIERS.has(event.key) ? event.code : ""
    };
  }

  /**
   * Sets the key into storage on keyup event. Then calls setKeyEnabled() to determine if any keys are set.
   *
   * @param input the key input from which this event occurred
   * @private
   */
  function setKey(input) {
    clearTimeout(timeouts[input.id]);
    timeouts[input.id] = setTimeout(function() {
      chrome.storage.local.set({ [getStorageKey(input)]: key }, function() { setKeyEnabled(); });
    }, 500);
  }

  /**
   * Sets mouse button and clicks when the select changes. Then calls setMouseEnabled() to determine if any mouse
   * buttons are set. This function is called by both the select button dropdown and the clicks number input.
   *
   * @param buttonInput (optional) the button input (select)
   * @param clicksInput (optional) the clicks input (number)
   * @private
   */
  function setMouse(buttonInput, clicksInput) {
    // Only updateMouseEnabled if the buttonInput triggered this function.
    const updateMouseEnabled = !!buttonInput;
    buttonInput = buttonInput ? buttonInput : DOM["#" + clicksInput.id.replace("clicks", "select")];
    clicksInput = clicksInput ? clicksInput : DOM["#" + buttonInput.id.replace("select", "clicks")];
    const mouse = +buttonInput.value < 0 ? null : { "button": +buttonInput.value, "clicks": +clicksInput.value};
    console.log("setMouse() - mouse=" + mouse);
    clicksInput.className = mouse ? "display-block fade-in" : "display-none";
    chrome.storage.local.set({ [getStorageKey(buttonInput)]: mouse }, function() { if (updateMouseEnabled) { setMouseEnabled(); }});
  }

  /**
   * Sets the enabled state of the key shortcuts.
   *
   * @private
   */
  function setKeyEnabled() {
    chrome.storage.local.get(null, function(items) {
      const enabled = items.keyIncrement || items.keyDecrement || items.keyNext || items.keyPrev || items.keyClear || items.keyReturn || items.keyAuto;
      chrome.storage.local.set({"keyEnabled": enabled}, function() {
        DOM["#key-enable-img"].className = enabled ? "display-inline" : "display-none";
      });
    });
  }

  /**
   * Sets the enabled state of the mouse button shortcuts.
   *
   * @private
   */
  function setMouseEnabled() {
    chrome.storage.local.get(null, function(items) {
      const enabled =  items.mouseIncrement || items.mouseDecrement || items.mouseNext || items.mousePrev || items.mouseClear || items.mouseReturn || items.mouseAuto;
      chrome.storage.local.set({"mouseEnabled": enabled}, function() {
        DOM["#mouse-enable-img"].className = enabled ? "display-inline" : "display-none";
      });
    });
  }

  /**
   * Gets the storage key from an input. e.g. "key-increment-input" returns the string "keyIncrement".
   *
   * @param input the input with a string ID
   * @returns {string} the storage key based on the input's ID
   * @private
   */
  function getStorageKey(input) {
    const regex = /(.*)-(.*)-/.exec(input.id);
    return regex[1] + regex[2][0].toUpperCase() + regex[2].substring(1);
  }

  /**
   * Writes the key(s) that were pressed to the text input.
   *
   * @param input the input to write to
   * @param key the key object to write
   * @private
   */
  function writeInput(input, key) {
    // Write the input value based on the key event modifier bits and key code
    // Note1: KeyboardEvent.code will output the text-representation of the key code, e.g.  the key "A" would output "KeyA"
    // Note2: If the key's code is a modifier (e.g. Alt, Ctrl), it is not written
    let text = "";
    if (!key) { text = chrome.i18n.getMessage("key_notset_option"); }
    else {
      if ((key.modifiers & KEY_MODIFIERS.get("Alt")))          { text += (text ? " + " : "") + "Alt";    }
      if ((key.modifiers & KEY_MODIFIERS.get("Control")) >> 1) { text += (text ? " + " : "") + "Ctrl";   }
      if ((key.modifiers & KEY_MODIFIERS.get("Shift"))   >> 2) { text += (text ? " + " : "") + "Shift";  }
      if ((key.modifiers & KEY_MODIFIERS.get("Meta"))    >> 3) { text += (text ? " + " : "") + "Meta";   }
      if (key.code)                                            { text += (text ? " + " : "") + key.code; }
    }
    input.value = text;
  }

  /**
   * Builds out the saved URLs table HTML.
   *
   * @param saves   the saved URLs to build from
   * @param saveKey the saved secret key for decrypting wildcards and regexp urls
   * @private
   */
  async function buildSavedURLsTable(saves, saveKey) {
    if (saves && saves.length > 0) {
      const table = document.createElement("table"); table.id = "saved-urls-table"; table.className = "display-block fade-in";
      const thead = document.createElement("thead"); table.appendChild(thead);
      const tr = document.createElement("tr"); thead.appendChild(tr);
      let th;
      th = document.createElement("th"); th.className = "check"; th.textContent = " "; tr.appendChild(th);
      th = document.createElement("th"); th.className = "count"; th.textContent = "#"; tr.appendChild(th);
      th = document.createElement("th"); th.className = "type"; th.textContent = "Type"; tr.appendChild(th);
      th = document.createElement("th"); th.className = "url"; th.textContent = "URL"; tr.appendChild(th);
      th = document.createElement("th"); th.className = "i"; th.textContent = "I"; th.title = "Interval"; tr.appendChild(th);
      th = document.createElement("th"); th.className = "b"; th.textContent = "B"; th.title = "Base"; tr.appendChild(th);
      th = document.createElement("th"); th.className = "e"; th.textContent = "E"; th.title="Error Skip"; tr.appendChild(th);
      th = document.createElement("th"); th.className = "date"; th.textContent = "Date"; tr.appendChild(th);
      const tbody = document.createElement("tbody"); table.appendChild(tbody);
      let count = 1;
      for (const save of saves) {
        const output = await backgroundPage.Cryptography.decrypt(save.ciphertext, save.iv, saveKey);
        const tr = document.createElement("tr"); tr.className = "unselected"; tr.dataset.ciphertext = save.ciphertext;
        //const check = document.createElement("img"); check.src = "../img/check-circle.png"; check.alt = ""; check.width = check.height = 16; check.className = "check-circle hvr-grow"; check.title = chrome.i18n.getMessage("download_preview_check_" + ("unselect"));
        const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.value = save.ciphertext;
        let td;
        td = document.createElement("td"); td.className = "check"; td.appendChild(checkbox); tr.appendChild(td);
        td = document.createElement("td"); td.className = "count"; td.textContent = count++; tr.appendChild(td);
        td = document.createElement("td"); td.className = "type"; td.textContent = save.type.substring(0 ,3); tr.appendChild(td);
        td = document.createElement("td"); td.className = "url"; td.textContent = output; tr.appendChild(td);
        td = document.createElement("td"); td.className = "i"; td.textContent = save.interval; tr.appendChild(td);
        td = document.createElement("td"); td.className = "b"; td.textContent = save.base; tr.appendChild(td);
        td = document.createElement("td"); td.className = "e"; td.textContent = save.errorSkip; tr.appendChild(td);
        td = document.createElement("td"); td.className = "date"; td.textContent =  new Date(save.date).toLocaleDateString(); tr.appendChild(td);
        tbody.appendChild(tr);
      }
      DOM["#saved-urls-table-div"].replaceChild(table, DOM["#saved-urls-table-div"].firstChild);
    } else {
      DOM["#saved-urls-table-div"].replaceChild(document.createElement("div"), DOM["#saved-urls-table-div"].firstChild);
    }
    DOM["#saved-urls-quantity"].textContent = " (" + (saves ? saves.length: 0) + "):";
  }


  /**
   * Adds a Saved URL wildcard or regular expression. Note that exact URLs are added in a separate function in Saves.
   *
   * @private
   */
  async function addSavedURL() {
    const url = DOM["#saved-urls-wildcard-url-textarea"].value;
    const type = DOM["#saved-urls-regexp-input"].checked ? "regexp" : "wildcard";
    // If the url textarea value is empty, return with error
    if (!url || url.length < 0) {
      DOM["#saved-urls-wildcard-errors"].textContent = chrome.i18n.getMessage("saved_urls_wildcard_url_error");
      return;
    }
    // If the regexp is invalid, return with error
    if (type === "regexp") {
      try {
        new RegExp(url);
      } catch(e) {
        DOM["#saved-urls-wildcard-errors"].textContent = e;
        return;
      }
    }
    await backgroundPage.Saves.addSave(type, undefined, url);
    populateValuesFromStorage("savedURLs");
    DOM["#saved-urls-wildcard"].className = "display-none";
  }

  /**
   * Deletes Saved URL(s) (all types) by their unique ciphertext.
   *
   * @private
   */
  async function deleteSavedURL() {
    // Dynamically Generated Checkboxes, must get elements dynamically, can't use DOM Cache
    const checkboxes = [...document.querySelectorAll("#saved-urls-table input[type=checkbox]:checked")].map(o => o.value);
    const saves = await Promisify.getItems("local", "saves");
    if (saves && saves.length > 0 && checkboxes && checkboxes.length > 0) {
      const newsaves = saves.filter(o => !checkboxes.includes(o.ciphertext));
      await Promisify.setItems("local", {saves: newsaves});
      populateValuesFromStorage("savedURLs");
    }
  }

  /**
   * Updates the error codes for error skip by examining if each checkbox is checked (on change event).
   *
   * @private
   */
  function updateErrorCodes() {
    chrome.storage.local.set({"errorCodes":
      [DOM["#error-codes-404-input"].checked ? DOM["#error-codes-404-input"].value : "",
       DOM["#error-codes-3XX-input"].checked ? DOM["#error-codes-3XX-input"].value : "",
       DOM["#error-codes-4XX-input"].checked ? DOM["#error-codes-4XX-input"].value : "",
       DOM["#error-codes-5XX-input"].checked ? DOM["#error-codes-5XX-input"].value : "",
       DOM["#error-codes-CUS-input"].checked ? DOM["#error-codes-CUS-input"].value : "",
       DOM["#error-codes-EXC-input"].checked ? DOM["#error-codes-EXC-input"].value : ""].filter(Boolean)
    });
    DOM["#error-codes-custom"].className = DOM["#error-codes-CUS-input"].checked ? "display-block fade-in" : "display-none";
  }

  /**
   * This function is called as the user is typing in a text input or textarea that is updated dynamically.
   * We don't want to call chrome.storage after each key press, as it's an expensive procedure, so we set a timeout delay.
   *
   * @param input      the text input or textarea
   * @param storageKey the storage key to set
   * @param type       the type (number, value, or array)
   * @private
   */
  function saveInput(input, storageKey, type) {
    console.log("saveInput() - about to clearTimeout and setTimeout... input.id=" + input.id + ", storageKey=" + storageKey +", type=" + type);
    clearTimeout(timeouts[input.id]);
    timeouts[input.id] = setTimeout(function() {
      chrome.storage.local.set({[storageKey]:
        type === "number" ? +input.value :
        type === "value" ? input.value :
        type.startsWith("array") ? input.value ? input.value.toLowerCase().split(type === "array-split-all" ? /[, \n]+/ : /[,\n]/).filter(Boolean) : [] : undefined
      });
    }, 1000);
  }

  /**
   * Validates the custom selection regular expression fields and then performs the desired action.
   *
   * @param action the action to perform (test or save)
   * @private
   */
  async function customSelection(action) {
    const url = DOM["#selection-custom-url-textarea"].value;
    const regex = DOM["#selection-custom-regex-input"].value;
    const flags = DOM["#selection-custom-flags-input"].value;
    const group = +DOM["#selection-custom-group-input"].value;
    const index = +DOM["#selection-custom-index-input"].value;
    let regexp;
    let matches;
    let selection;
    let selectionStart;
    try {
      regexp = new RegExp(regex, flags);
      matches = regexp.exec(url);
      if (!regex || !matches) {
        throw chrome.i18n.getMessage("selection_custom_match_error");
      }
      if (group < 0) {
        throw chrome.i18n.getMessage("selection_custom_group_error");
      }
      if (index < 0) {
        throw chrome.i18n.getMessage("selection_custom_index_error");
      }
      if (!matches[group]) {
        throw chrome.i18n.getMessage("selection_custom_matchgroup_error");
      }
      selection = matches[group].substring(index);
      if (!selection || selection === "") {
        throw chrome.i18n.getMessage("selection_custom_matchindex_error");
      }
      selectionStart = matches.index + index;
      if (selectionStart > url.length || selectionStart + selection.length > url.length) {
        throw chrome.i18n.getMessage("selection_custom_matchindex_error");
      }
      // TODO:
      const base = isNaN(DOM["#base-select"].value) ? DOM["#base-select"].value : +DOM["#base-select"].value;
      const baseCase = DOM["#base-case-uppercase-input"].checked ? DOM["#base-case-uppercase-input"].value : DOM["#base-case-lowercase-input"].checked;
      const baseDateFormat = DOM["#base-date-format-input"].value;
      const baseRoman = DOM["#base-roman-latin-input"].checked ? DOM["#base-roman-latin-input"].value : DOM["#base-roman-u216x-input"].checked ? DOM["#base-roman-u216x-input"].value : DOM["#base-roman-u217x-input"].value;
      const baseCustom = DOM["#base-custom-input"].value;
      const leadingZeros = selection.startsWith("0") && selection.length > 1;
      if (backgroundPage.IncrementDecrement.validateSelection(selection, base, baseCase, baseDateFormat, baseRoman, baseCustom, leadingZeros)) {
        throw url.substring(selectionStart, selectionStart + selection.length) + " " + chrome.i18n.getMessage("selection_custom_matchnotvalid_error");
      }
    } catch (e) {
      DOM["#selection-custom-message-span"].textContent = e;
      return;
    }
    if (action === "test") {
      DOM["#selection-custom-message-span"].textContent = chrome.i18n.getMessage("selection_custom_test_success");
      DOM["#selection-custom-url-textarea"].setSelectionRange(selectionStart, selectionStart + selection.length);
      DOM["#selection-custom-url-textarea"].focus();
    } else if (action === "save") {
      DOM["#selection-custom-message-span"].textContent = chrome.i18n.getMessage("selection_custom_save_success");
      chrome.storage.local.set({"selectionCustom": { "url": url, "regex": regex, "flags": flags, "group": group, "index": index }});
    }
  }

  /**
   * Resets the options by clearing the storage and setting it with the default storage values, removing any extra
   * permissions, and finally re-populating the options input values from storage again.
   *
   * @private
   */
  async function resetOptions() {
    await Promisify.clearItems();
    await Promisify.setItems("local", backgroundPage.Background.getSDV());
    await Permissions.removeAllPermissions();
    console.log("resetOptions() - storage cleared and set and permissions removed");
    changeIconColor.call(DOM["#icon-color-radio-dark"]);
    populateValuesFromStorage("all");
    UI.generateAlert([chrome.i18n.getMessage("reset_options_message")]);
  }

  /**
   * Called when our favorite mascot is clicked!
   *
   * @private
   */
  function clickMascot() {
    const faces = ["≧☉_☉≦", "(⌐■_■)♪", "(︶︹︺)", "◉_◉", "(+__X)"];
    const face = " " + faces[Math.floor(Math.random() * faces.length)];
    const value = +this.dataset.value + 1;
    this.dataset.value = value + "";
    UI.clickHoverCss(this, "hvr-buzz-out-click");
    UI.generateAlert([value <= 10 ? value + " ..." : chrome.i18n.getMessage("tickles_click") + face]);
  }

  // Initialize Options
  init();

})();