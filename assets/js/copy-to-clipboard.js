// Contract: SCRIPTS_CONTRACT.md (v0.6.17).
// Hook: .rd-js-copy (delegated). Payload API unchanged: data-copy / data-copy-target.
// The default glyph is baked into CSS (.copy-data-icon), so markup needs no
// data-icon. On success the script sets data-icon="check"; on reset it removes
// the attribute, so the CSS default (content_copy) shows again.
const ICON_SUCCESS = "check";
const RESET_MS = 1200;

function getCopyText(icon) {
  if (icon.dataset.copyTarget) {
    const target = document.querySelector(icon.dataset.copyTarget);
    return target?.textContent?.trim() || "";
  }

  const source =
    icon.closest("[data-copy]") ||
    icon.parentElement?.querySelector("[data-copy]");

  if (!source) return "";
  return source.getAttribute("href") || source.textContent.trim();
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  ta.style.pointerEvents = "none";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

document.addEventListener("click", async (e) => {
  const icon = e.target.closest(".rd-js-copy");
  if (!icon) return;

  if (icon.dataset.copyBusy) return;

  const text = getCopyText(icon);
  if (!text) return;

  icon.dataset.copyBusy = "1";

  const showSuccess = () => {
    icon.dataset.icon = ICON_SUCCESS;
    clearTimeout(icon._copyTimer);
    icon._copyTimer = setTimeout(() => {
      delete icon.dataset.icon;
      delete icon.dataset.copyBusy;
    }, RESET_MS);
  };

  try {
    await navigator.clipboard.writeText(text);
    showSuccess();
  } catch {
    if (fallbackCopy(text)) showSuccess();
    else delete icon.dataset.copyBusy;
  }
});

// Icon-only copy buttons render just a CSS glyph, so they have no accessible
// name. Give any bare .rd-js-copy an aria-label (author-provided aria-label /
// title / text is respected). One pass, not per-button listeners.
function labelCopyIcons() {
  document.querySelectorAll(".rd-js-copy").forEach((icon) => {
    if (
      !icon.getAttribute("aria-label") &&
      !icon.getAttribute("title") &&
      !icon.textContent.trim()
    ) {
      icon.setAttribute("aria-label", "Copy");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", labelCopyIcons);
} else {
  labelCopyIcons();
}
