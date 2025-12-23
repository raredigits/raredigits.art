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

document.addEventListener("DOMContentLoaded", function () {
    const cookieNotice = document.getElementById("cookie-notice");
    const acceptBtn = document.getElementById("cookie-notice-accept");
    if (!cookieNotice || !acceptBtn) return;

    if (readCookie("cookie-notice-dismissed") === "true") {
      cookieNotice.style.display = "none";
    } else {
      cookieNotice.style.display = "block";
    }

    acceptBtn.addEventListener("click", function () {
      createCookie("cookie-notice-dismissed", "true", 31);
      cookieNotice.style.display = "none";
    });
});