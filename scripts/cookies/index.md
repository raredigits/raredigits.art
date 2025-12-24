---
layout: page.njk
title: "Simple Cookie Notice"
section: "Scripts"
displaySidebar: true
img: "/assets/img/illustrations/cookies-consent-example.jpg"
permalink: '/scripts/cookies/'
---

<div class="meta-info">
    <p>js/cookie-consent.js</p>
    <p>v.1.0.0 Stable |
    <a class="copy-source" href="https://cdn.jsdelivr.net/gh/raredigits/rare-scripts@v1.0.0/simple-cookie-notice/cookie-consent.min.js" data-copy>CDN</a> (minified)
    <span class="material-icons copy-data-icon" title="Copy link">content_copy</span> |
    <a href="/assets/js/cookie-consent.js">Download</a>
    <span class="material-icons">file_download</span>
    </p>
</div>

A lightweight, dependency-free cookie notice banner written in plain HTML and JavaScript.

This snippet displays a basic notification informing users that the website uses cookies and hides it after user acknowledgment by storing a browser cookie.

It is designed to be simple, transparent, and easy to integrate into static websites, including Eleventy (11ty).

<div class="text-content-caption">
    <img src="{{ img }}" alt="Cookies consent script example">
</div>

## Important Legal Disclaimer ⚠️ 

This project is **NOT a full cookie consent management solution**. It does **not**:

- Implement granular consent (analytics / marketing / necessary cookies)
- Block scripts prior to consent
- Provide region-specific compliance logic
- Guarantee compliance with GDPR, ePrivacy Directive, CCPA, CPRA, or any other local or international privacy regulations

Its sole purpose is to **inform users that cookies are used** and to remember that the notice has been dismissed. This project provides **notification**, not **legal compliance**. Use at your own risk.

If your website is subject to specific legal requirements, consult a qualified legal professional and consider using a dedicated Consent Management Platform (CMP).

## Features

- No dependencies
- No build step
- Plain JavaScript (ES5+)
- Stores dismissal state in a browser cookie
- Works on static websites
- Safe cookie defaults (`SameSite=Lax`, `Secure` on HTTPS)

## How It Works

1. On page load, the script checks for a cookie named `cookie-notice-dismissed`
2. If the cookie is missing, the notice is displayed
3. When the user clicks the confirmation button, the cookie is set
4. The notice is hidden for subsequent visits

Default cookie lifetime: **31 days**

## Installation

<details>
<summary>Required HTML Markup</summary>

The script expects the following **mandatory element IDs**. If they are missing or renamed, the script will not function.

```html
<div id="cookie-notice" class="cookie-notice">
  <div class="cookie-notice__content">
    <h3>🍪</h3>
    <p class="bold">Help yourself to some cookies!</p>
    <p>We’re using third party cookies and scripts to improve the functionality of this website. For legal purpose, we have a <a href="/legal/privacy">Privacy Policy</a>.</p>
    <div class="width-100 right">
        <button id="cookie-notice-accept" class="cookie-notice__button">Nice!</button>
    </div>
  </div>
</div>
```
</details>

<div class="air-md"></div>

<details>
<summary>Required IDs (Mandatory)</summary>

Be sure to include **the mandatory IDs** in your HTML elements:

<table class="table-small">
    <tr>
        <th>ID</th>
        <th>Purpose</th> 
    </tr>
    <tr>
        <td><code>cookie-notice</code></td>
        <td>Root container shown / hidden by the script</td>
    </tr>
    <tr>
        <td><code>cookie-notice-accept</code></td>
        <td>Button that dismisses the notice</td>
    </tr>
</table>
    
These IDs are **hard-coded in the JavaScript file**.
</details>

<div class="air-md"></div>

<details>
<summary>Required CSS (Minimum)</summary>

The Rare Styles Library already includes styles for the cookie consent block. If you use this script on its own, make sure to add the required styles. At minimum, the notice **must be hidden by default**.

```css
.cookie-notice {
    display: none;
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    max-width: 360px;
    padding: 1rem;
    background: #111;
    color: #fff;
    border-radius: 8px;
    z-index: 1000;
}

.cookie-notice a {
    color: inherit;
    text-decoration: underline;
}

.cookie-notice__button {
    margin-top: 0.75rem;
    cursor: pointer;
}
```

You are free to fully replace these styles with your own design system.
</details>

<div class="air-md"></div>

<details>
<summary>JavaScript Setup</summary>

Place the script file anywhere you prefer and include it **after the markup**, or just before the closing `</body>` tag.

```html
<script src="/assets/js/cookie-consent.js"></script>
```

The script runs automatically on `DOMContentLoaded`. No configuration is required.
</details>


## Assumptions Made by the Script

- JavaScript is enabled
- Cookies are enabled
- The site operates on a single domain
- The notice markup exists on the page where the script runs

If any of these assumptions are false, the script will fail silently.

## Customization

You may safely change:

- Text content
- Styles and class names
- Cookie lifetime (in days)
- Cookie name

If you rename required IDs, you must update the script accordingly.
