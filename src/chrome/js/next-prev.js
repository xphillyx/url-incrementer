/**
 * Infy Scroll
 * @file next-prev.js
 * @author Roy Six
 * @license MIT
 */

/**
 * NextPrev handles all next and prev link logic, mainly finding the next or prev link on the page.
 *
 * The algorithm performs the following steps:
 * 1. Rule - Using a CSS Selector or XPath rule to find the link directly
 * 2. Keywords - Parsing the page for links that contain common next or prev keywords
 */
var NextPrev = (() => {

  /**
   * Finds the next or prev URL based on the CSS Selector or XPath rule. Falls back to parsing the page using common
   * next or prev keywords.
   *
   * TODO: Parse iframes (and older frames and framesets?) nested inside the document.
   *
   * @param type             the rule type can be "selector" or "xpath"
   * @param selector         the next or prev css selector rule to use
   * @param xpath            the next or prev xpath rule to use
   * @param attribute        the next or prev css selector/xpath attribute to use
   * @param keywordsEnabled  whether to use the next or prev keywords as a fallback to the selector/xpath rule
   * @param keywords         the next or prev keywords list to use
   * @param decodeURIEnabled whether to decode the URI or not
   * @param debugEnabled     if debug mode is enabled (to highlight the next/prev DOM element)
   * @param document_        (optional) Infy Scroll only: the current document on the page to query
   * @returns {*} the next or prev url (if found) along with the subtype and keyword that was used to find it
   * @public
   */
  function findNextPrevURL(type, selector, xpath, attribute, keywordsEnabled, keywords, decodeURIEnabled, debugEnabled, document_) {
    console.log("findNextPrevURL() - type=" + type + ", selector=" + selector + ", xpath=" + xpath + ", attribute=" + attribute + ", keywordsEnabled=" + keywordsEnabled + ", keywords=" + keywords + ", document=" + (document_ ? document_.location : "") + ", debugEnabled=" + debugEnabled);
    // The urls object stores the rule URL (sox: selector or xpath), attribute, innerText, and innerHTML links that were found
    const urls = {
      "sox": undefined,
      "attribute": { "equals": new Map(), "startsWith": new Map(), "includes": new Map(), "rel": new Map() },
      "innerText": { "equals": new Map(), "startsWith": new Map(), "includes": new Map() },
      "innerHTML": { "equals": new Map(), "startsWith": new Map(), "includes": new Map() }
    };
    // Note: the algorithm order matters, the highest priority algorithms are first when they are iterated below
    const algorithms = [
      { "type": "attribute", "subtypes": ["rel"] },
      { "type": "attribute", "subtypes": ["equals"] },
      { "type": "innerText", "subtypes": ["equals"] },
      { "type": "innerHTML", "subtypes": ["equals"] },
      // Combined startsWith and includes for priority on keywords instead of the subtypes
      { "type": "attribute", "subtypes": ["startsWith", "includes"] },
      { "type": "innerText", "subtypes": ["startsWith", "includes"] },
      { "type": "innerHTML", "subtypes": ["startsWith", "includes"] }
    ];
    // If not parsing a specific document, assume this is the root HTML document
    if (!document_) {
      document_ = document;
    }
    checkRule(urls, type, selector, xpath, attribute, decodeURIEnabled, document_);
    // If a URL was found using the selector or xpath rule, return it (minus the element)
    if (urls.sox) {
      console.log("findNextPrevURL() - found a URL using the " + urls.sox.method + " rule " + urls.sox.rule + ": " + urls.sox.url);
      highlightElement(urls.sox.element, debugEnabled);
      return { "url": urls.sox.url, "method": urls.sox.method, "rule": urls.sox.rule, "element": urls.sox.element.elementName };
    }
    if (!keywordsEnabled) {
      return null;
    }
    checkKeywords(urls, keywords, decodeURIEnabled, document_);
    console.log("findNextPrevURL() - found the following next/prev URLs via keywords (no rule match):");
    console.log(JSON.stringify(Object.values(urls)));
    for (const algorithm of algorithms) {
      const result = traverseURLs(urls, algorithm.type, algorithm.subtypes, keywords, debugEnabled);
      if (result) { return result; }
    }
  }

  /**
   * Builds the urls results object by parsing all link and anchor elements.
   *
   * @param urls             the urls object stores important, attribute, innerText, and innerHTML links that were found
   * @param type             the link type to use: important, attributes or innerHTML
   * @param selector         the next or prev css selector rule to use
   * @param xpath            the next or prev xpath rule to use
   * @param attribute        the next or prev css selector/xpath attribute to use
   * @param decodeURIEnabled whether to decode the URI or not
   * @param document_        (optional) Infy Scroll: the current document on the page to query
   * @private
   */
  function checkRule(urls, type, selector, xpath, attribute, decodeURIEnabled, document_) {
    try {
      let element;
      if (type === "xpath") {
        element = document_.evaluate(xpath, document_, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      } else {
        element = document_.querySelector(selector);
      }
      let url = element[attribute[0]];
      for (let i = 1; i < attribute.length; i++) {
        url = url[attribute[i]];
      }
      // If no URL was found using the specified attribute, try using hard-coded attributes that are known to contain URLs
      if (!url) {
        url = element.href ? element.href : element.action ? element.action : element.formAction ? element.formAction : url;
      }
      if (decodeURIEnabled) {
        try {
          url = decodeURIComponent(url);
        } catch(e) {
          console.log(e);
        }
      }
      if (isValidURL(url)) {
        urls.sox = { "url": url, "method": type, "rule": (type === "xpath" ? xpath : selector) + "." + attribute.join("."), "element": element };
      }
    } catch(e) {
      console.log("checkRule() - Exception caught when querying for selector or evaluating xpath: " + e);
    }
  }

  /**
   * Builds the urls results object by parsing all link and anchor elements.
   *
   * @param urls             the urls object stores important, attribute, innerText, and innerHTML links that were found
   * @param keywords         the next or prev keywords list to use
   * @param decodeURIEnabled whether to decode the URI or not
   * @param document_        (optional) Infy Scroll: the current document on the page to query
   * @private
   */
  function checkKeywords(urls, keywords, decodeURIEnabled, document_) {
    const elements = document_.querySelectorAll("link[href], a[href], area[href], form[action], button[formaction]");
    for (const element of elements) {
      try {
        // Check if URL is in same domain if enabled, wrap in try/catch in case of exceptions with URL object
        const elementName = element.nodeName.toLowerCase();
        let url = element.href ? element.href : elementName === "form" && element.action ? element.action : element.tagName === "button" && element.formAction ? element.formAction : "";
        if (decodeURIEnabled) {
          try {
            url = decodeURIComponent(url);
          } catch(e) {
            console.log(e);
          }
        }
        if (isValidURL(url)) {
          parseText(urls, keywords, "innerText", url, element.innerText.replace(/\s/g,"").toLowerCase(), elementName, element);
          parseText(urls, keywords, "innerHTML", url, element.innerHTML.replace(/\s/g,"").toLowerCase(), elementName, element);
          for (const eattribute of element.attributes) {
            parseText(urls, keywords, "attribute", url, eattribute.nodeValue.replace(/\s/g,"").toLowerCase(), elementName, element, eattribute.nodeName.toLowerCase());
          }
        }
      } catch (e) {
        console.log("buildURLs() - exception caught:" + e);
      }
    }
  }

  /**
   * Parses an element's text for keywords that might indicate a next or prev link.
   * Adds the link to the urls map if a match is found.
   *
   * @param urls        the urls object stores important, attribute, innerText, and innerHTML links that were found
   * @param keywords    the next or prev keywords list to use
   * @param type        the type of element text value to parse: attribute, innerText, or innerHTML
   * @param url         the URL of the link
   * @param text        the element's attribute value, innerText, or innerHTML to parse keywords from
   * @param elementName the element's name
   * @param element     the element
   * @param eattribute  the element attribute's node name if it's needed
   * @private
   */
  function parseText(urls, keywords, type, url, text, elementName, element, eattribute) {
    // Iterate over this direction's keywords and build out the urls object's maps
    const value = { url: url, element: element, elementName: elementName, attribute: eattribute };
    for (const keyword of keywords) {
      // Important e.g. rel="next" or rel="prev"
      if (eattribute && eattribute === "rel" && text === keyword) {
        urls.attribute.rel.set(keyword, value);
      } else if (text === keyword) {
        urls[type].equals.set(keyword, value);
      } else if (text.startsWith(keyword)) {
        urls[type].startsWith.set(keyword, value);
      } else if (text.includes(keyword)) {
        urls[type].includes.set(keyword, value);
      }
    }
  }

  /**
   * Traverses the urls object to see if a URL was found. e.g. urls[attributes][equals][next]
   *
   * @param urls         the urls object stores attribute, innerText, and innerHTML links that were found
   * @param type         the algorithm main type to use: attribute, innerText, or innerHTML
   * @param subtypes     the algorithm subtypes to use: rel, equals, startsWith, includes
   * @param keywords     the ordered list of keywords sorted in priority
   * @param debugEnabled if debug mode is enabled (to highlight the next/prev DOM element)
   * @returns {*} the next or prev url (if found) along with the subtype and keyword that was used to find it
   * @private
   */
  function traverseURLs(urls, type, subtypes, keywords, debugEnabled) {
    for (const keyword of keywords) {
      for (const subtype of subtypes) {
        if (urls[type][subtype].has(keyword)) {
          const value = urls[type][subtype].get(keyword);
          console.log("traverseResults() - a next/prev link was found:" +  type + " - " + subtype + " - " + keyword + " - " + value.element + " - " + value.attribute + " - " + value.url);
          highlightElement(value.element, debugEnabled);
          return {url: value.url, method: "keyword", type: type, subtype: subtype, keyword: keyword, element: value.elementName, attribute: value.attribute };
        }
      }
    }
  }

  /**
   * Determines if a potential URL is a valid URL.
   * Rules: A URL must 1) be parsed as a URL object, 2) have a href and not be the existing URL, 3) be in the same domain (hostname)
   *
   * @param url the URL to parse
   * @returns {boolean} true if the URL is a valid URL, false otherwise
   * @private
   */
  function isValidURL(url) {
    let valid = false;
    try {
      const url_ = new URL(url);
      valid = url_ && url_.href && url_.href !== window.location.href && url_.hostname === window.location.hostname;
    } catch (e) {
      console.log("isValidURL() - exception caught: " + e);
    }
    return valid;
  }

  /**
   * Highlights the next or prev element on the document page (if debug mode is enabled).
   *
   * @param element      the DOM element to highlight
   * @param debugEnabled if debug mode is enabled (to highlight the next/prev DOM element)
   * @private
   */
  function highlightElement(element, debugEnabled) {
    if (debugEnabled) {
      element.style.outline = "3px solid black";
      element.style.backgroundColor = "#FDFF47";
      setTimeout(function() {
        element.style.outline = "";
        element.style.backgroundColor = "";
      }, 5000);
    }
  }

  // Return Public Functions
  return {
    findNextPrevURL: findNextPrevURL
  };

})();