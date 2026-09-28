// Payload posts the unsaved form into the frame on every change. A short pause after the last
// one, the frame submits it back to the CMS and reloads as that render, at the same scroll.
(() => {
  if (window.self === window.top) return;

  const DEBOUNCE_MS = 400;
  const HANDSHAKE_MS = 1500;

  const address = window.location.origin + window.location.pathname;
  const SENT = `payload-preview-sent:${address}`;
  const SCROLL = `payload-preview-scroll:${address}`;

  // Form data that arrives right after the handshake is the saved page this html was
  // rendered from; the admin sends it only on the first load, so anything later is an edit.
  let rendered = null;
  const loadedAt = Date.now();

  if (sessionStorage.getItem(SCROLL) !== null) {
    rendered = sessionStorage.getItem(SENT);
    const y = Number(sessionStorage.getItem(SCROLL));
    sessionStorage.removeItem(SCROLL);
    window.scrollTo(0, y);
    window.addEventListener("load", () => window.scrollTo(0, y));
  }

  const render = (json) => {
    sessionStorage.setItem(SENT, json);
    sessionStorage.setItem(SCROLL, String(window.scrollY));

    const form = document.createElement("form");
    form.method = "POST";
    form.action = address;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "data";
    input.value = json;
    form.append(input);
    document.body.append(form);
    form.submit();
  };

  let timer = null;
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent || e.data?.type !== "payload-live-preview" || !e.data.data)
      return;

    const json = JSON.stringify(e.data.data);
    if (rendered === null && Date.now() - loadedAt < HANDSHAKE_MS) {
      rendered = json;
      return;
    }
    if (json === rendered) return;

    clearTimeout(timer);
    timer = setTimeout(() => render(json), DEBOUNCE_MS);
  });

  window.parent.postMessage({ type: "payload-live-preview", ready: true }, window.location.origin);
})();
