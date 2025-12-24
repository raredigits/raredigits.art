document.addEventListener("click", async (e) => {
  const icon = e.target.closest(".copy-data-icon");
  if (!icon) return;

  let text = "";

  // 1) Explicit target wins
  if (icon.dataset.copyTarget) {
    const target = document.querySelector(icon.dataset.copyTarget);
    text = target?.textContent?.trim() || "";
  } else {
    // 2) Find nearest copy source around the icon
    const source = icon
      .closest("[data-copy]") ||
      icon.parentElement?.querySelector("[data-copy]") ||
      icon.previousElementSibling?.matches?.("[data-copy]") && icon.previousElementSibling;

    if (!source) return;

    text = source.getAttribute("href") || source.textContent.trim();
  }

  if (!text) return;

  const success = () => {
    icon.textContent = "check";
    setTimeout(() => (icon.textContent = "content_copy"), 1200);
  };

  try {
    await navigator.clipboard.writeText(text);
    success();
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    success();
  }
});