type Chunks = { bytes: number; text: string };

const readChunks = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  read: Chunks,
  maxBytes: number
): Promise<string | null> => {
  const { done, value } = await reader.read();
  if (done) return read.text + decoder.decode();

  const bytes = read.bytes + value.byteLength;
  if (bytes > maxBytes) return null;
  const text = read.text + decoder.decode(value, { stream: true });
  return readChunks(reader, decoder, { bytes, text }, maxBytes);
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const stopReading = async (reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> => {
  try {
    await reader.cancel();
  } catch {
    return;
  }
};

export const readJsonBody = async (
  request: Request,
  maxBytes: number,
  signal: AbortSignal
): Promise<unknown> => {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const stopAtDeadline = () => {
    void stopReading(reader);
  };
  signal.addEventListener("abort", stopAtDeadline);
  try {
    const text = await readChunks(reader, new TextDecoder(), { bytes: 0, text: "" }, maxBytes);
    return text === null || signal.aborted ? null : parseJson(text);
  } finally {
    signal.removeEventListener("abort", stopAtDeadline);
    await stopReading(reader);
  }
};
