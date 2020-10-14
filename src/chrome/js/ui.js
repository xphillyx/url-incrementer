/**
 * URL Incrementer
 * @file ui.js
 * @author Roy Six
 * @license LGPL-3.0
 */

/**
 * UI provides user-interface specific logic, such as generating alert messages and clicking buttons.
 *
 * The MDC object is also present in this file for handling Matieral Design Component objects, as this is largely
 * UI-specific.
 */
var UI = (() => {

  /**
   * Generates an alert to display messages.
   *
   * This function is derived from the sample Google extension, Proxy Settings,
   * by Mike West.
   *
   * @param messages the messages array to display, line by line
   * @param isError  true if this is an error alert, false otherwise
   * @see https://developer.chrome.com/extensions/samples#search:proxy
   * @public
   */
  function generateAlert(messages, isError) {
    const div = document.createElement("div");
    const ul = document.createElement("ul");
    div.classList.add("overlay");
    if (isError) {
      messages.unshift(chrome.i18n.getMessage("oops_error"));
      ul.classList.add("error");
    }
    for (const message of messages) {
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(message));
      ul.appendChild(li);
    }
    div.appendChild(ul);
    document.body.appendChild(div);
    setTimeout(function () { div.classList.add("overlay-visible"); }, 10);
    setTimeout(function () { div.classList.remove("overlay-visible"); document.body.removeChild(div); }, 5000);
  }

  /**
   * Applies a Hover.css effect to DOM elements on click events.
   *
   * @param el     the DOM element to apply the effect to
   * @param effect the Hover.css effect (class name) to use
   * @public
   */
  function clickHoverCss(el, effect) {
    // Carefully toggle the Hover.css class using setTimeout() to force a delay
    el.classList.remove(effect);
    setTimeout(function () { el.classList.add(effect); }, 50);
  }

  // Return Public Functions
  return {
    generateAlert: generateAlert,
    clickHoverCss: clickHoverCss
  };

})();

/**
 * MDC is a global variable that contains all the Material Design Components that are being used.
 * Each component is stored in a Map with its DOM ID as the key and the component as the value.
 */
var MDC = {

  buttons: new Map([].map.call(document.querySelectorAll('.mdc-button'), function(el) {
    return [el.id, new mdc.ripple.MDCRipple(el)];
  })),

  cards: new Map([].map.call(document.querySelectorAll('.mdc-card__primary-action'), function(el) {
    return [el.id, new mdc.ripple.MDCRipple(el)];
  })),

  checkboxes: new Map([].map.call(document.querySelectorAll('.mdc-checkbox'), function(el) {
    return [el.id, new mdc.checkbox.MDCCheckbox(el)];
  })),

  dialogs: new Map([].map.call(document.querySelectorAll('.mdc-dialog'), function(el) {
    return [el.id, new mdc.dialog.MDCDialog(el)];
  })),

  fabs: new Map([].map.call(document.querySelectorAll('.mdc-fab'), function(el) {
    return [el.id, new mdc.ripple.MDCRipple(el)];
  })),

  formFields: new Map([].map.call(document.querySelectorAll('.mdc-form-field'), function(el) {
    return [el.id, new mdc.formField.MDCFormField(el)];
  })),

  lists: new Map([].map.call(document.querySelectorAll('.mdc-list'), function(el) {
    // Add lists with ripple for each list item
    const list = new mdc.list.MDCList(el);
    list.listElements.map((listItemEl) => new mdc.ripple.MDCRipple(listItemEl));
    list.singleSelection = true;
    return [el.id, list];
  })),

  radios: new Map([].map.call(document.querySelectorAll('.mdc-radio'), function(el) {
    return [el.id, new mdc.radio.MDCRadio(el)];
  })),

  selects: new Map([].map.call(document.querySelectorAll('.mdc-select'), function(el) {
    return [el.id, new mdc.select.MDCSelect(el)];
  })),

  snackbars: new Map([].map.call(document.querySelectorAll('.mdc-snackbar'), function(el) {
    return [el.id, new mdc.snackbar.MDCSnackbar(el)];
  })),

  switches: new Map([].map.call(document.querySelectorAll('.mdc-switch'), function(el) {
    return [el.id, new mdc.switchControl.MDCSwitch(el)];
  })),

  tabBars: new Map([].map.call(document.querySelectorAll('.mdc-tab-bar'), function(el) {
    return [el.id, new mdc.tabBar.MDCTabBar(el)];
  })),

  tables: new Map([].map.call(document.querySelectorAll('.mdc-data-table'), function(el) {
    return [el.id, new mdc.dataTable.MDCDataTable(el)];
  })),

  textFields: new Map([].map.call(document.querySelectorAll('.mdc-text-field'), function(el) {
    return [el.id, new mdc.textField.MDCTextField(el)];
  })),

  /**
   * Performs a layout for each applicable MDC object. And MDC object needs to run layout each time it is displayed or
   * is shown again after being hidden (e.g. display: none).
   */
  layout: function() {
    MDC.selects.forEach(el => el.layout());
    MDC.textFields.forEach(el => {
      // If the text field input is empty (no value), remove the float-above from the label so it doesn't look broken
      if (el.input_ && el.label_ && el.label_.root_) {
        if (!el.input_.value) {
          el.label_.root_.classList.remove("mdc-floating-label--float-above");
        } else {
          el.label_.root_.classList.add("mdc-floating-label--float-above");
        }
      }
      el.layout();
    });
  }

};