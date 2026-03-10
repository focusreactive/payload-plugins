import { canUseGtag, type WindowWithGtag } from "./canUseGtag";

type GtagFn = WindowWithGtag["gtag"];

interface WaitForGtagOptions {
  interval?: number;
  timeout?: number;
}

export function waitForGtag(callback: (gtag: GtagFn) => void, options: WaitForGtagOptions = {}) {
  const { interval = 50, timeout = 5000 } = options;

  if (canUseGtag(window)) {
    callback(window.gtag);

    return;
  }

  const start = Date.now();
  const id = setInterval(() => {
    if (canUseGtag(window)) {
      clearInterval(id);

      callback(window.gtag);
    } else if (Date.now() - start >= timeout) {
      clearInterval(id);
    }
  }, interval);
}
