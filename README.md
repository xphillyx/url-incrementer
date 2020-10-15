# URL Incrementer
<img src="https://raw.githubusercontent.com/roysix/url-incrementer/master/assets/app/icon-dark.png" width="128" height="128" alt="URL Incrementer" title="URL Incrementer">
<br><br>

<a href="https://chrome.google.com/webstore/detail/url-incrementer/hjgllnccfndbjbedlecgdedlikohgbko" title="Chrome Web Store Download">
  <img src="https://raw.githubusercontent.com/roysix/url-incrementer/master/assets/chrome/ChromeWebStore_Badge_v2_496x150.png" height="64" alt="Chrome Web Store">
</a>
&nbsp;&nbsp;&nbsp;&nbsp;
<a href="https://addons.mozilla.org/firefox/addon/url-incrementer" title="Firefox Addon Download">
  <img src="https://raw.githubusercontent.com/roysix/url-incrementer/master/assets/firefox/FirefoxAddon_Badge_v2_492x128.png" height="64" alt="Firefox Addon">
</a>
&nbsp;&nbsp;&nbsp;&nbsp;
<a href="https://microsoftedge.microsoft.com/addons/detail/url-incrementer/hnndkchemmjdlodgpcnojbmadckbieek" title="Microsoft Edge Extension Download">
  <img src="https://raw.githubusercontent.com/roysix/url-incrementer/master/assets/edge/1024px-Microsoft_Edge_logo_(2019).svg.png" height="64" alt="Microsoft Edge Extension, Icon: By Source, Fair use, https://en.wikipedia.org/w/index.php?curid=62848768">
  Microsoft Edge
</a>

<br><br>
<img src="https://raw.githubusercontent.com/roysix/url-incrementer/master/assets/app/urli.svg?sanitize=true" width="196" height="196" align="left" title="URLI">

## About
URLI can help you increment URLs. For example, if the URL has a "page=1" in it or if there's a Next link on the page, URLI can get you to "page=2" in a variety of ways.
<br><br><br><br><br><br>

## Features
<em>Some Features Coming Soon in 6.0 (October 2020)</em>
<ul>
  <li>Keyboard and Mouse Shortcuts</li>
  <li>1-Click Increment Decrement Buttons</li>
  <li>Auto Incrementing</li>
  <li>Download Incrementing (Multiple Page Downloading) [Experimental]</li>
  <li>Advanced Incrementing Features: Multi, Error Skip, Date Time, Decimal Number, Roman Numeral, Custom Base, and Alphanumeric (Base 2-36)</li>
  <li>Next Prev Link Support</li>
  <li>URLI's Toolkit [Experimental]</li>
  <li>Save URLs and Wildcards [Experimental]: Save settings for your favorite URLs and URLI will always remember them the next time you visit</li>
  <li>Shuffle URLs: Make it fun and randomize the next pages you see!</li>
  <li>Options: Change how URLI pre-selects the number to increment... and more</li>
  <li>Chrome / Edge: Uses 0 Background Memory when inactive</li>
  <li>Chrome / Edge: No permissions required</li>
  <li>Firefox: Support for Firefox for Android (Fennec Version 68, Some features may not work perfectly)</li>
  <li>Open Source on GitHub</li>
  <li>No Ads, No Tracking, No Bloat</li>
</ul>

## Notes
<ol>
  <li>Mapping shortcut keys to mouse buttons with 3rd party apps like Logitech Gaming Software is not supported and may only work if you use Logitech's "Multikey Macro" option.</li>
  <li>Download Incrementing is an optional and experimental feature that is designed to be used with Auto so you can have a unique Multiple Page Downloader (think a simple "Down them all" that can run automatically!). It uses a custom-built downloader that I've developed for URLI.</li>
  <li>URLI's Toolkit is a toolkit I made to help me develop and test URLI, but I've "unlocked" for you to use as a non-standard feature!</li>
  <li>Saving URLs is completely optional. URLI only saves URLs as cryptographic hashes that are stored on your device's local storage -- not in the cloud.</li>
  <li>Firefox only: Local file:// URLs may not increment due to a bug in Firefox (Bug 1266960).</li>
  <li>Firefox only: URLI's Popup may not work in Private Windows due to the different way Firefox decided to handle this in respect to Chrome (Bug 1329304).</li>
  <li>Firefox only: Firefox 60 (non ESR) Users won't be able to grant Download permissions on the Options page due to a bug in Firefox 60 (Bug 1382953); please update to Firefox 61 or higher.</li>
</ol>

## Permissions Justification
Chrome/Edge: URL Incrementer requires no special permissions.

Firefox: URL Incrementer requires the `all_urls` permission in order to offer Internal Shortcuts because Firefox does not support the chrome.declarativeContent API to make this an optional feature that sticks like in Chrome/Edge.

Some optional features require extra permissions:
<ol>
  <li>Internal Shortcuts - requires the `all_urls` Permission</li>
  <li>Enhanced Mode - requires the `all_urls` Permission</li>
  <li>Download - requires the Download Permission and `all_urls` Permission</li>
</ol>

## Remote Code Policy
URL Incrementer does *not* use any remote code. All code is included locally in the extension package and goes under review before being published.

## Privacy Policy
URL Incrementer does *not* collect or transmit any data from your device or computer. All data is stored locally on your device. Your data is *your* data.

## Help Guide
[View the Help Guide!](https://github.com/roysix/url-incrementer/wiki)

## Credits and Special Thanks
<ul>
  <li>UI: <a href="https://material.io/">Material Design</a></li>
  <li>Icons: <a href="https://fontawesome.com/">FontAwesome</a></li>
  <li>Animations: <a href="https://ianlunn.github.io/Hover/">Hover.css</a></li>
  <li>Tooltips: <a href="https://kazzkiq.github.io/balloon.css/">Balloon.css</a></li>
  <li>Dialogs: <a href="https://github.com/mikewest">Mike West</a></li>
  <li>Loading: <a href="https://loading.io/">Loading.io</a></li>
  <li>Code Fragments: <a href="https://stackoverflow.com/">Stack Overflow Users</a></li>
  <li>User Contributions: @akaustav (Color), Coolio Wolfus (Test), Eric C (Alpha), Gopi P & NickMWPrince (Auto)</li>
  <li>Firefox: <a href="#">URL Flipper</a></li>
</ul>

## Copyright and License
URLI, a URL Incrementer    
Copyright © 2011-2020 Roy Six  
<a href="https://github.com/roysix/infy-scroll/blob/master/LICENSE">License</a>