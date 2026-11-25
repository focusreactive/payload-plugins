export type WindowPairOptions = {
  adminOrigin: string;
  pageOrigin: string;
  isPopup?: boolean;
};

export type WindowPair = {
  page: Window;
  admin: Window;
  closeAdmin(): void;
};

const ANY_ORIGIN = "*";

const isFor = (targetOrigin: string, origin: string): boolean =>
  targetOrigin === ANY_ORIGIN || targetOrigin === origin;

const messageOf = (data: unknown, origin: string, source: unknown): MessageEvent => {
  const message = new MessageEvent("message", { data: structuredClone(data), origin });
  Object.defineProperty(message, "source", { value: source });
  return message;
};

export function createWindowPair({
  adminOrigin,
  isPopup = false,
  pageOrigin,
}: WindowPairOptions): WindowPair {
  const pageEvents = new EventTarget();
  let isAdminClosed = false;

  const admin = {
    get closed() {
      return isAdminClosed;
    },
  };

  const page = {
    addEventListener: pageEvents.addEventListener.bind(pageEvents),
    closed: false,
    location: { origin: pageOrigin },
    opener: isPopup ? admin : null,
    removeEventListener: pageEvents.removeEventListener.bind(pageEvents),
  };

  Object.assign(admin, {
    postMessage(data: unknown, targetOrigin: string) {
      if (isAdminClosed || !isFor(targetOrigin, adminOrigin)) return;
      const message = messageOf(data, pageOrigin, page);
      setTimeout(() => {
        if (!isAdminClosed) window.dispatchEvent(message);
      });
    },
  });

  Object.assign(page, {
    parent: isPopup ? page : admin,
    postMessage(data: unknown, targetOrigin: string) {
      if (!isFor(targetOrigin, pageOrigin)) return;
      const message = messageOf(data, adminOrigin, admin);
      setTimeout(() => pageEvents.dispatchEvent(message));
    },
  });

  return {
    admin: admin as unknown as Window,
    closeAdmin: () => {
      isAdminClosed = true;
    },
    page: page as unknown as Window,
  };
}
