// Contract: SCRIPTS_CONTRACT.md (v0.6.17).
// Hook: .rd-js-cookie-consent (notice), .rd-js-cookie-accept (button).
// State: .rd-is-hidden on the notice. Cookie logic unchanged.
// Anti-FOUC: initializes immediately when the notice markup is already parsed
// (include this script right after the markup, synchronously, no defer);
// falls back to DOMContentLoaded otherwise.
function createCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }

    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      encodeURIComponent(name) + "=" + encodeURIComponent(value) +
      expires +
      "; Path=/" +
      "; SameSite=Lax" +
      secure;
}

function readCookie(name) {
    const nameEQ = encodeURIComponent(name) + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
    return null;
}

function initCookieNotice() {
    const cookieNotice = document.querySelector(".rd-js-cookie-consent");
    if (!cookieNotice) return;
    const acceptBtn = cookieNotice.querySelector(".rd-js-cookie-accept");
    if (!acceptBtn) return;

    if (readCookie("cookie-notice-dismissed") === "true") {
      cookieNotice.classList.add("rd-is-hidden");
    }

    acceptBtn.addEventListener("click", function () {
      createCookie("cookie-notice-dismissed", "true", 31);
      cookieNotice.classList.add("rd-is-hidden");
    });
}

if (document.querySelector(".rd-js-cookie-consent")) {
    initCookieNotice();
} else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieNotice);
} else {
    initCookieNotice();
}
