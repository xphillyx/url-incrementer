/**
 * URL Incrementer
 * @file background.js
 * @author Roy Six
 * @license LGPL-3.0
 */

/**
 * Background handles all extension-specific background tasks, such as installation and update events, listeners, and
 * supporting chrome.* apis that are only available in the background (such as commands or setting the toolbar icon).
 *
 * This extension is designed to primarily be a background-based extension and needs to maintain the state (objects in
 * memory i.e. the instance), so it contains an on-demand way to persist the background when an instance exist.
 */
var Background = (() => {

  // The storage default values. Note: Storage.set can only set top-level JSON objects, avoid using nested JSON objects (instead, prefix keys that should be grouped together with a label e.g. "auto")
  const STORAGE_DEFAULT_VALUES = {
    "installVersion": chrome.runtime.getManifest().version, "installDate": new Date().toJSON(), "firstRun": true,
    "toolbarIcon": "dark", "buttonSize": 40, "interfaceImage": "infy", "interfaceMessages": true,
    "decodeURIEnabled": false, "debugEnabled": false,
    "commandsQuickEnabled": true, "shortcutsEditableDisabled": true,
    "keyEnabled": true, "keyQuickEnabled": true, "keyIncrement": {"modifiers": 6, "code": "ArrowUp"}, "keyDecrement": {"modifiers": 6, "code": "ArrowDown"}, "keyNext": {"modifiers": 6, "code": "ArrowRight"}, "keyPrev": {"modifiers": 6, "code": "ArrowLeft"}, "keyClear": {"modifiers": 6, "code": "KeyX"}, "keyReturn": {"modifiers": 6, "code": "KeyZ"}, "keyAuto": {"modifiers": 6, "code": "Space"}, "keyDownload": null,
    "mouseEnabled": true, "mouseQuickEnabled": true, "mouseClickSpeed": 400, "mouseIncrement": {"button": 3, "clicks": 2}, "mouseDecrement": {"button": 4, "clicks": 2}, "mouseNext": null, "mousePrev": null, "mouseClear": null, "mouseReturn": null, "mouseAuto": null, "mouseDownload": null,
    "interval": 1, "leadingZerosPadByDetection": true, "shuffleLimit": 100, "shuffleStart": false, "listStart": false,
    "base": 10, "baseCase": "lowercase", "baseDateFormat": "yyyy/mm/dd", "baseRoman": "latin", "baseCustom": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    "selectionPriority": "smart", "selectionCustom": { "url": "", "regex": "", "flags": "", "group": 0, "index": 0 },
    "errorSkip": 0, "errorCodes": ["404", "3XX"], "errorCodesCustom": [],
    "nextType": "selector", "nextSelector": "[rel=\"next\"]", "nextXpath": "//*[@rel=\"next\"]", "nextAttribute": ["href"],
    "prevType": "selector", "prevSelector": "[rel=\"prev\"],[rel=\"previous\"]", "prevXpath": "//*[@rel=\"prev\"]|//*[@rel=\"previous\"]", "prevAttribute": ["href"],
    "nextKeywords": ["pnnext", "nextpage", "next-page", "next_page", "next>", "next»", "next→", "next", "moreresults", "olderposts", "olderpost", "older", "forward", "下一页", "次のページ", "次", "&gt;", ">", "›", "→", "»"],
    "prevKeywords": ["pnprev", "previouspage", "prevpage", "prev-page", "prev_page", "<prev", "«prev", "←prev", "prev", "previous", "newerposts", "newerpost", "newer", "上一页", "前のページ", "前", "&lt;", "<", "‹", "←", "«"],
    // TODO: These two nextPrev fields
    "nextPrevSameDomainPolicy": true, "nextPrevPopupButtons": false,
    "autoAction": "increment", "autoTimes": 10, "autoSeconds": 5, "autoWait": true, "autoBadge": "times", "autoStart": false, "autoRepeatStart": false,
    "downloadStrategy": "extensions", "downloadExtensions": [], "downloadTags": [], "downloadAttributes": [], "downloadSelector": "", "downloadIncludes": [], "downloadExcludes": [], "downloadSubfolder": "", "downloadSubfolderIncrement": false, "downloadPreview": ["count", "thumb", "extension", "tag", "url", "compressed"], "downloadStart": false,
    "toolkitTool": "crawl", "toolkitAction": "increment", "toolkitQuantity": 10, "toolkitSeconds": 1, "toolkitScrape": false, "toolkitCrawlCheckboxes": ["url", "response", "code", "info", "ok", "error", "redirected", "other", "exception"], "toolkitStart": false,
    "scrapeMethod": "selector", "scrapeSelector": "", "scrapeProperty": [],
    "saves": [], "savePreselect": false,
    // "saveKey": Cryptography.salt(),
    "permissionsInternalShortcuts": false, "permissionsDownload": false, "permissionsEnhancedMode": false
  };

  // The browser action badges that will be displayed against the extension icon
  const BROWSER_ACTION_BADGES = {
    "incrementm": { "text": "+",    "backgroundColor": "#4AACED" },
    "decrementm": { "text": "-",    "backgroundColor": "#4AACED" },
    "increment":  { "text": "+",    "backgroundColor": "#1779BA" },
    "decrement":  { "text": "-",    "backgroundColor": "#1779BA" },
    "increment2": { "text": "+",    "backgroundColor": "#004687" },
    "decrement2": { "text": "-",    "backgroundColor": "#004687" },
    "increment3": { "text": "+",    "backgroundColor": "#001354" },
    "decrement3": { "text": "-",    "backgroundColor": "#001354" },
    "next":       { "text": ">",    "backgroundColor": "#05854D" },
    "prev":       { "text": "<",    "backgroundColor": "#05854D" },
    "clear":      { "text": "X",    "backgroundColor": "#FF0000" },
    "return":     { "text": "RET",  "backgroundColor": "#FFCC22" },
    "auto":       { "text": "AUTO", "backgroundColor": "#FF6600" },
    "autotimes":  { "text": "",     "backgroundColor": "#FF6600" },
    "autopause":  { "text": "❚❚",    "backgroundColor": "#FF6600" },
    "autorepeat": { "text": "REP",  "backgroundColor": "#FF6600" },
    "download":   { "text": "DL",   "backgroundColor": "#663399" },
    "toolkit":    { "text": "TOOL", "backgroundColor": "#000028" },
    "skip":       { "text": "SKIP", "backgroundColor": "#000000" },
    "default":    { "text": "",     "backgroundColor": [0,0,0,0] }
  };

  // The individual tab instances in Background memory. Note: We never save instances in storage due to URLs being a privacy concern
  const instances = new Map();

  // A boolean flag to dynamically make the background temporarily persistent when an instance is enabled
  let persistent = false;

  /**
   * Gets all the instances.
   *
   * @returns {Map<tabId, instance>} the tab instances
   * @public
   */
  function getInstances() {
    return instances;
  }

  /**
   * Gets the instance.
   * 
   * @param tabId the tab id to lookup this instance by
   * @returns instance the tab's instance
   * @public
   */
  function getInstance(tabId) {
    return instances.get(tabId);
  }

  /**
   * Sets the instance. (Note: This is the only time we need to make the background persistent.)
   * 
   * @param tabId    the tab id to lookup this instance by
   * @param instance the instance to set
   * @public
   */
  function setInstance(tabId, instance) {
    // Firefox: Set a deep-copy of the instance via serialization to avoid the Firefox "can't access dead object" error
    instances.set(tabId, JSON.parse(JSON.stringify(instance)));
    if (!persistent) {
      makePersistent();
    }
  }

  /**
   * Deletes the instance.
   *
   * @param tabId the tab id to lookup this instance by
   * @public
   */
  function deleteInstance(tabId) {
    instances.delete(tabId);
  }

  /**
   * Builds an instance with default values (from either an existing save or by using the storage items).
   * 
   * @param tab   the tab properties (id, url) to set this instance with
   * @param items (optional) the storage items
   * @returns instance the newly built instance
   * @public
   */
  async function buildInstance(tab, items) {
    items = items ? items : await Promisify.getItems();
    let urlDecoded;
    try {
      urlDecoded = decodeURI(tab.url);
    } catch(e) {
      console.log("buildInstance() - exception decoding URI, e=" + e + ", tab.url=" + (tab ? tab.url : ""));
    }
    let saveFound = false;
    let object = items;
    let url = items.decodeURIEnabled && urlDecoded ? urlDecoded : tab.url;
    let selection = IncrementDecrement.findSelection(url, items.selectionPriority, items.selectionCustom);
    // First search for a save to build an instance from:
    for (const save of items.saves) {
      const result = await Saves.matchesSave( save.decodeURIEnabled && urlDecoded ? urlDecoded : tab.url, save, items.saveKey);
      if (result.matches) {
        console.log("buildInstance() - found a " + save.type + " save for this tab's url");
        saveFound = true;
        object = save;
        object.pattern = result.pattern;
        url = save.decodeURIEnabled && urlDecoded ? urlDecoded : tab.url;
        selection = save.type === "url" ? result.selection : IncrementDecrement.findSelection(url, save.selectionPriority, save.selectionCustom);
        break;
      }
    }
    // Return the newly built instance using tab, selection, object, items, and saveFound:
    return {
      "enabled": false, "autoEnabled": false, "downloadEnabled": false, "toolkitEnabled": false, "multiEnabled": false, "listEnabled": false, "decodeURIEnabled": object.decodeURIEnabled,
      "tabId": tab.id, "url": url,
      "saveFound": saveFound, "saveType": saveFound ? object.type : "", "savePattern": saveFound ? object.pattern : "",
      "selection": selection.selection, "selectionStart": selection.selectionStart,
      "leadingZeros": saveFound && object.type === "url" ? object.leadingZeros : items.leadingZerosPadByDetection && selection.selection.charAt(0) === '0' && selection.selection.length > 1,
      "interval": object.interval,
      "base": object.base, "baseCase": object.baseCase, "baseDateFormat": object.baseDateFormat, "baseRoman": object.baseRoman, "baseCustom": object.baseCustom,
      "errorSkip": object.errorSkip, "errorCodes": object.errorCodes, "errorCodesCustom": object.errorCodesCustom,
      "fetchMethod": "HEAD",
      "multi": {"1": {}, "2": {}, "3": {}}, "multiCount": 0,
      "list": "", "listArray": [], "listStart": items.listStart,
      "urls": [],
      "shuffleURLs": false, "shuffleLimit": items.shuffleLimit, "shuffleStart": items.shuffleStart,
      "nextType": items.nextType, "nextSelector": items.nextSelector, "nextXpath": items.nextXpath, "nextAttribute": items.nextAttribute,
      "prevType": items.prevType, "prevSelector": items.prevSelector, "prevXpath": items.prevXpath, "prevAttribute": items.prevAttribute,
      "nextKeywords": items.nextKeywords, "prevKeywords": items.prevKeywords, "nextPrevSameDomainPolicy": items.nextPrevSameDomainPolicy,
      "autoAction": items.autoAction, "autoTimes": items.autoTimes, "autoSeconds": items.autoSeconds, "autoWait": items.autoWait, "autoBadge": items.autoBadge, "autoPaused": false, "autoRepeat": false, "autoRepeating": false, "autoRepeatCount": 0, "autoStart": items.autoStart, "autoRepeatStart": items.autoRepeatStart,
      "downloadStrategy": items.downloadStrategy, "downloadExtensions": items.downloadExtensions, "downloadTags": items.downloadTags, "downloadAttributes": items.downloadAttributes, "downloadSelector": items.downloadSelector,
      "downloadSubfolder": items.downloadSubfolder, "downloadSubfolderIncrement": items.downloadSubfolderIncrement, "downloadIncludes": items.downloadIncludes, "downloadExcludes": items.downloadExcludes, "downloadPreview": items.downloadPreview,  "downloadStart": items.downloadStart,
      "toolkitTool": items.toolkitTool, "toolkitAction": items.toolkitAction, "toolkitQuantity": items.toolkitQuantity, "toolkitSeconds": items.toolkitSeconds, "toolkitScrape": items.toolkitScrape, "toolkitStart": items.toolkitStart,
      "scrapeMethod": items.scrapeMethod, "scrapeSelector": items.scrapeSelector, "scrapeProperty": items.scrapeProperty
    };
  }

  /**
   * Sets the browser action badge for this tabId. Can either be temporary or for an indefinite time.
   * Note that when the tab is updated, the browser removes the badge.
   *
   * @param tabId           the tab ID to set this badge for
   * @param badge           the badge key to set from BROWSER_ACTION_BADGES
   * @param temporary       boolean indicating whether the badge should be displayed temporarily (true) or not (false)
   * @param text            (optional) the text to use instead of the the badge text
   * @param backgroundColor (optional) the backgroundColor to use instead of the badge backgroundColor
   * @public
   */
  function setBadge(tabId, badge, temporary, text, backgroundColor) {
    // Firefox Android: chrome.browserAction.setBadge* not supported
    if (!chrome.browserAction.setBadgeText || !chrome.browserAction.setBadgeBackgroundColor) {
      return;
    }
    chrome.browserAction.setBadgeText({text: text ? text : BROWSER_ACTION_BADGES[badge].text, tabId: tabId});
    chrome.browserAction.setBadgeBackgroundColor({color: backgroundColor ? backgroundColor : BROWSER_ACTION_BADGES[badge].backgroundColor, tabId: tabId});
    if (temporary) {
      setTimeout(function () {
        chrome.browserAction.setBadgeText({text: BROWSER_ACTION_BADGES["default"].text, tabId: tabId});
        chrome.browserAction.setBadgeBackgroundColor({color: BROWSER_ACTION_BADGES["default"].backgroundColor, tabId: tabId});
      }, 2000);
    }
  }

  /**
   * Listen for installation changes and do storage/extension initialization work.
   *
   * @param details the installation details
   * @private
   */
  async function installedListener(details) {
    console.log("installedListener() - details=" + JSON.stringify(details));
    // Install:
    if (details.reason === "install") {
      console.log("installedListener() - installing...");
      await Promisify.clearItems();
      await Promisify.setItems(STORAGE_DEFAULT_VALUES);
      chrome.runtime.openOptionsPage();
    }
    // Update:
    else if (details.reason === "update") {
      // Pre 6.0 needs to reset storage items and add boolean for update message about 6.0
      if (details.previousVersion < "6.0") {
        console.log("installedListener() - updating to 6.0...");
        await Promisify.clearItems("sync");
        await Promisify.clearItems("local");
        await Promisify.setItems(STORAGE_DEFAULT_VALUES);
        await Permissions.removeAllPermissions();
        await Promisify.setItems({"installVersion": "0.0", "firstRunUpdate": true});
      }
    }
    startupListener();
  }

  /**
   * The extension's background startup listener that is run the first time the extension starts.
   * For example, when Chrome is started, when the extension is installed or updated, or when the
   * extension is re-enabled after being disabled.
   *
   * @private
   */
  async function startupListener() {
    console.log("startupListener()");
    const items = await Promisify.getItems();
    // Ensure the chosen toolbar icon is set. Firefox Android: chrome.browserAction.setIcon() not supported
    if (chrome.browserAction.setIcon && items && ["dark", "light", "urli"].includes(items.iconColor)) {
      console.log("startupListener() - setting browserAction icon to " + items.iconColor);
      chrome.browserAction.setIcon({
        path : {
          "16": "/img/16-" + items.iconColor + ".png",
          "24": "/img/24-" + items.iconColor + ".png",
          "32": "/img/32-" + items.iconColor + ".png"
        }
      });
    }
    // Firefox: Set badge text color to white always instead of using default color-contrasting introduced in FF 63
    if (typeof browser !== "undefined" && browser.browserAction && browser.browserAction.setBadgeTextColor) {
      browser.browserAction.setBadgeTextColor({color: "white"});
    }
    // Ensure Internal Shortcuts declarativeContent rule is added (it sometimes gets lost when the extension is updated re-enabled)
    if (items && items.permissionsInternalShortcuts) {
      Permissions.checkDeclarativeContent();
    }
  }

  /**
   * Listen for requests from chrome.runtime.sendMessage (e.g. Content Scripts). Note: sender contains tab
   * 
   * @param request      the request containing properties to parse (e.g. greeting message)
   * @param sender       the sender who sent this message, with an identifying tab
   * @param sendResponse the optional callback function (e.g. for a reply back to the sender)
   * @private
   */
  async function messageListener(request, sender, sendResponse) {
    console.log("messageListener() - request=" + (request ? JSON.stringify(request) : "undefined"));
    // Firefox: sender.tab.url is undefined in FF due to not having tabs permissions (even though we have <all_urls>!), so use sender.url, which should be identical in 99% of cases (e.g. iframes may be different)
    if (sender && sender.url && sender.tab && !sender.tab.url) {
      sender.tab.url = sender.url;
    }
    // Tab object can either be sent with the request (e.g. popup) or via the sender (e.g. content script)
    const tab = request && request.tab ? request.tab : sender && sender.tab ? sender.tab : undefined;
    let instance = request && request.instance ? request.instance : undefined;
    switch (request.greeting) {
      case "getSDV":
        sendResponse(STORAGE_DEFAULT_VALUES);
        break;
      case "getInstance":
        instance = getInstance(tab.id) || await buildInstance(tab, undefined);
        sendResponse(instance);
        break;
      case "setInstance":
        setInstance(instance.tabId, instance);
        break;
      case "deleteInstance":
        deleteInstance(instance.tabId);
        break;
      case "performAction":
        const items = await Promisify.getItems();
        instance = instance || getInstance(tab.id) || await buildInstance(tab, items);
        // TODO: Consolidate popup callers
        if (request.caller === "popupClickActionButton" || request.caller === "popup" ||
          (request.shortcut === "key" && items.keyEnabled && (items.keyQuickEnabled || (instance && (instance.enabled || instance.saveFound)))) ||
          (request.shortcut === "mouse" && items.mouseEnabled && (items.mouseQuickEnabled || (instance && (instance.enabled || instance.saveFound))))) {
          Action.performAction(request.action, request.caller, instance, items);
        }
        break;
      case "startAutoTimer":
        Auto.startAutoTimer(request.instance, request.caller);
        break;
      default:
        break;
    }
  }

  /**
   * Listen for external requests from external extensions: URL Increment/Decrement Buttons. Note: request contains tab.
   *
   * @param request      the request containing properties to parse (e.g. greeting message) and tab
   * @param sender       the sender who sent this message
   * @param sendResponse the optional callback function (e.g. for a reply back to the sender)
   * @private
   */
  async function messageExternalListener(request, sender, sendResponse) {
    console.log("messageExternalListener() - request.action=" + request.action + ", sender.id=" + sender.id);
    const URL_INCREMENT_BUTTON_EXTENSION_ID = "ahhkoahoodgaboecgkndcklmddgkaalh";
    const URL_DECREMENT_BUTTON_EXTENSION_ID = "ppnacbppaelhdgaehbkmkopdcjiemndm";
    if (sender && (sender.id === URL_INCREMENT_BUTTON_EXTENSION_ID || sender.id === URL_DECREMENT_BUTTON_EXTENSION_ID) &&
        request && request.tab && (request.action === "increment" || request.action === "decrement")) {
      sendResponse({received: true});
      const items = await Promisify.getItems();
      const instance = getInstance(request.tab.id) || await buildInstance(request.tab, items);
      Action.performAction(request.action, "external", instance, items);
    }
  }

  /**
   * Listen for commands (Browser Extension shortcuts) and perform the command's action.
   * 
   * @param command the shortcut command that was performed
   * @private
   */
  async function commandListener(command) {
    if (command === "increment" || command === "decrement" || command === "next" || command === "prev" || command === "clear" || command === "return" || command === "auto")  {
      const items = await Promisify.getItems();
      if (!items.permissionsInternalShortcuts) {
        const tabs = await Promisify.getTabs();
        // The tab may not exist if command is called while in popup window
        if (tabs && tabs[0]) {
          const instance = getInstance(tabs[0].id) || await buildInstance(tabs[0], items);
          if (items.commandsQuickEnabled || (instance && (instance.enabled || instance.saveFound))) {
            Action.performAction(command, "command", instance, items);
          }
        }
      }
    }
  }

  /**
   * Makes the background persistent by calling chrome.tabs.query() every few seconds using a setTimeout() recursively.
   * If no instance exists when checking for tabs, the recursion stops and the background is no longer made persistent.
   *
   * @private
   */
  async function makePersistent() {
    const tabs = await Promisify.getTabs({});
    const tabIds = tabs.map(tab => tab.id);
    [...instances.keys()].forEach(function(key) {
      if (!tabIds.includes(key)) {
        // Tab was removed so clear instance
        Action.performAction("clear", "tabRemovedListener", getInstance(key));
      }
    });
    if ([...instances.values()].some(instance => instance && instance.enabled)) {
      persistent = true;
      // Checking every 2.0 seconds keeps the background persistent
      setTimeout(makePersistent, 2000);
    } else {
      persistent = false;
    }
  }

  // Background Listeners
  chrome.runtime.onInstalled.addListener(installedListener);
  chrome.runtime.onStartup.addListener(startupListener);
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) { messageListener(request, sender, sendResponse); if (request.async) { return true; } });
  chrome.runtime.onMessageExternal.addListener(messageExternalListener);
  // Firefox Android: chrome.commands is unsupported
  if (chrome.commands) { chrome.commands.onCommand.addListener(commandListener); }

  // Return Public Functions
  return {
    getInstances: getInstances,
    getInstance: getInstance,
    setInstance: setInstance,
    deleteInstance: deleteInstance,
    buildInstance: buildInstance,
    setBadge: setBadge
  };

})();