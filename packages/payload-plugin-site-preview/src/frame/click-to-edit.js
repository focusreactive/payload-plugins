// A click on anything the site marked opens it in the admin (components/ClickToEditListener.tsx):
// `data-payload-id` a row of this page, `data-payload-doc="collection:id"` another document in a
// drawer; `data-payload-field` narrows either to one field. Form controls and anchors are left to the page, so
// popups close, tabs switch and forms work; a link that would leave the page does not navigate.
(() => {
  if (window.self === window.top) return;

  const { message: EDIT_MESSAGE, scrollOffset: SCROLL_OFFSET } = document.currentScript.dataset;
  const CONTROLS = 'button, input, select, textarea, label, summary, [role="button"], a[href^="#"]';
  const MARKED = "[data-payload-id], [data-payload-doc]";

  const label = document.createElement("div");
  label.className = "payload-edit-label";
  label.textContent = "Click to edit";
  document.body.append(label);

  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest?.(MARKED);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    label.style.top = `${Math.max(rect.top, 0) + window.scrollY}px`;
    label.style.left = `${Math.max(rect.left, 0) + window.scrollX}px`;
  });

  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest || e.target.closest(CONTROLS)) return;

      // A relative link resolves against the CMS here, so following it would leave the preview on a 404.
      if (e.target.closest("a[href]")) e.preventDefault();

      const el = e.target.closest(MARKED);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const { payloadId: id, payloadDoc: doc, payloadField: field } = el.dataset;
      window.parent.postMessage({ type: EDIT_MESSAGE, id, doc, field }, window.location.origin);
    },
    true
  );

  // The row focused in the admin's form, innermost first: the first one on the page is shown — a
  // hidden row is not rendered, its section is.
  const FOCUS_MS = 1500;
  const GAP = 16;
  const SCROLL_MS = 700;

  // Room for the site's fixed header, from the plugin's `scrollOffset`: `80px`, or the header's
  // selector, measured now — it may have shrunk since the page scrolled.
  const headerOffset = () => {
    if (!SCROLL_OFFSET) return 0;
    if (/^\d+(\.\d+)?px$/u.test(SCROLL_OFFSET)) return parseFloat(SCROLL_OFFSET);
    let header = null;
    try {
      header = document.querySelector(SCROLL_OFFSET);
    } catch {
      return 0;
    }
    if (!header || !["fixed", "sticky"].includes(getComputedStyle(header).position)) return 0;
    return Math.max(header.getBoundingClientRect().bottom, 0);
  };
  const find = (ids, field) => {
    const byId = (id) =>
      Array.from(document.querySelectorAll(`[data-payload-id="${CSS.escape(id)}"]`));
    if (field) {
      const group = byId(ids[0]).find((el) => el.dataset.payloadField === field);
      if (group) return group;
    }
    for (const id of ids) {
      const row = byId(id).find((el) => !el.dataset.payloadField);
      if (row) return row;
    }
    return null;
  };

  let focused = null;
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent || e.data?.type !== EDIT_MESSAGE || !Array.isArray(e.data.ids))
      return;
    const el = find(e.data.ids, e.data.field);
    if (!el) return;
    // Its top edge under the header, unless that edge is already in view; measured again once the
    // scroll is over, since a sticky header shrinks as the page moves.
    const align = () =>
      window.scrollTo({
        top: window.scrollY + el.getBoundingClientRect().top - headerOffset() - GAP,
        behavior: "smooth",
      });
    const { top } = el.getBoundingClientRect();
    if (top < headerOffset() || top > window.innerHeight * 0.75) {
      align();
      setTimeout(() => {
        if (Math.abs(el.getBoundingClientRect().top - headerOffset() - GAP) > 4) align();
      }, SCROLL_MS);
    }
    focused?.classList.remove("payload-focused");
    focused = el;
    el.classList.add("payload-focused");
    setTimeout(() => el.classList.remove("payload-focused"), FOCUS_MS);
  });
})();
