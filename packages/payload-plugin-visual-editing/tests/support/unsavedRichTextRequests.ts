import type { Payload } from "payload";

export type Credentials = { email: string; password: string };

export const EDITOR: Credentials = { email: "editor@example.com", password: "editor-password" };
export const OUTSIDER: Credentials = {
  email: "outsider@example.com",
  password: "outsider-password",
};
export const WRITER: Credentials = { email: "writer@example.com", password: "writer-password" };

export const signIn = async (payload: Payload, credentials: Credentials): Promise<Headers> => {
  await payload.create({ collection: "users", data: credentials });
  const { token } = await payload.login({ collection: "users", data: credentials });
  return new Headers({ Authorization: `JWT ${token}` });
};

const RENDER_URL = "http://localhost/unsaved-rich-text";

type StreamedRequestInit = RequestInit & { duplex: "half" };

export const postOf = (body: string, headers: Headers, signal?: AbortSignal): Request =>
  new Request(RENDER_URL, { body, headers, method: "POST", signal });

export const streamedPostOf = (body: ReadableStream<Uint8Array>, headers: Headers): Request => {
  const init: StreamedRequestInit = { body, duplex: "half", headers, method: "POST" };
  return new Request(RENDER_URL, init);
};

export type WatchedBody = { body: ReadableStream<Uint8Array>; cancelled: boolean; reads: number };

export const slowBodyOf = (chunk: string, delayMs: number): WatchedBody => {
  const encoded = new TextEncoder().encode(chunk);
  const watched: WatchedBody = {
    body: new ReadableStream<Uint8Array>(
      {
        cancel: () => {
          watched.cancelled = true;
        },
        pull: async (controller) => {
          watched.reads += 1;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          controller.enqueue(encoded);
        },
      },
      { highWaterMark: 0 }
    ),
    cancelled: false,
    reads: 0,
  };
  return watched;
};
