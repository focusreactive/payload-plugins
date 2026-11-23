type Turn = {
  latest: object;
  running: Promise<unknown> | null;
  stale: Promise<unknown> | null;
  staleAt: number;
  waiters: Set<() => void>;
};

type LatestReadOptions = { signal: AbortSignal; staleAfterMs: number };

export type LatestReads = {
  read<Value>(
    readKey: string,
    read: () => Promise<Value>,
    options: LatestReadOptions
  ): Promise<Value | null>;
};

export type ReadTurns = Map<string, Turn>;

const wakeWaiters = (turn: Turn): void => {
  for (const wake of turn.waiters) wake();
};

const abortOf = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });

const waitForTurn = async (turn: Turn, signal: AbortSignal): Promise<void> => {
  const turnCame = new AbortController();
  const wake = () => turnCame.abort();
  turn.waiters.add(wake);
  const staleIn = AbortSignal.timeout(Math.max(0, turn.staleAt - Date.now()));
  const until = AbortSignal.any([signal, turnCame.signal, staleIn]);
  if (!until.aborted) await abortOf(until);
  turn.waiters.delete(wake);
};

const isRunning = (turn: Turn): boolean => turn.running !== null && Date.now() < turn.staleAt;

const isIdle = (turn: Turn): boolean =>
  turn.running === null && turn.stale === null && turn.waiters.size === 0;

const newTurn = (): Turn => ({
  latest: {},
  running: null,
  stale: null,
  staleAt: 0,
  waiters: new Set(),
});

export const createLatestReads = (turns: ReadTurns): LatestReads => {
  const forgetIfIdle = (readKey: string, turn: Turn): void => {
    if (isIdle(turn) && turns.get(readKey) === turn) turns.delete(readKey);
  };

  const leaveWithoutReading = (readKey: string, turn: Turn): null => {
    forgetIfIdle(readKey, turn);
    return null;
  };

  return {
    async read(readKey, read, { signal, staleAfterMs }) {
      const turn = turns.get(readKey) ?? newTurn();
      turns.set(readKey, turn);
      const ticket = {};
      turn.latest = ticket;
      wakeWaiters(turn);

      while (isRunning(turn)) {
        await waitForTurn(turn, signal);
        if (signal.aborted || turn.latest !== ticket) return leaveWithoutReading(readKey, turn);
      }
      if (signal.aborted) return leaveWithoutReading(readKey, turn);
      if (turn.running !== null) {
        if (turn.stale !== null) return leaveWithoutReading(readKey, turn);
        turn.stale = turn.running;
      }

      const running = read();
      turn.running = running;
      turn.staleAt = Date.now() + staleAfterMs;
      try {
        return await running;
      } finally {
        if (turn.running === running) turn.running = null;
        if (turn.stale === running) turn.stale = null;
        forgetIfIdle(readKey, turn);
        wakeWaiters(turn);
      }
    },
  };
};
