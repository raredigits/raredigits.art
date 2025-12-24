document.addEventListener("click", async (e) => {
  const icon = e.target.closest(".copy-data-icon");
  if (!icon) return;

  const container = icon.closest(".meta-info") || icon.parentElement;
  const source = container?.querySelector("[data-copy]"); // ближайший источник
  if (!source) return;

  // Для ссылок логичнее копировать URL (href), а не текст "CDN link"
  const text = source.getAttribute("href") || source.textContent.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    icon.textContent = "check";
    setTimeout(() => (icon.textContent = "content_copy"), 1200);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    icon.textContent = "check";
    setTimeout(() => (icon.textContent = "content_copy"), 1200);
  }
});