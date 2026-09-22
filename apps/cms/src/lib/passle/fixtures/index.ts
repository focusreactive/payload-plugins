import type { PasslePostPayload } from "../types";

import fixture0 from "./102mmg5.json";
import fixture1 from "./102n82s.json";
import fixture2 from "./102n83t.json";
import fixture3 from "./102n8dv.json";
import fixture4 from "./102n8hj.json";
import fixture5 from "./102n8jl.json";
import fixture6 from "./102n94o.json";
import fixture7 from "./102nbb2.json";
import fixture8 from "./102nbge.json";
import fixture9 from "./102nbox.json";
import fixture10 from "./102nbs7.json";
import fixture11 from "./102ne3i.json";
import fixture12 from "./102neab.json";
import fixture13 from "./102nf0g.json";
import fixture14 from "./102nfho.json";
import fixture15 from "./102nfz3.json";
import fixture16 from "./102o15k.json";
import fixture17 from "./102o16a.json";
import fixture18 from "./102o1nr.json";
import fixture19 from "./102o1qk.json";

/**
 * Static imports rather than a directory read: Turbopack cannot trace a runtime
 * `new URL("./fixtures/", import.meta.url)`, so a bundled function loses the files
 * and the build fails outright ("Module not found: Can't resolve './fixtures/'").
 */
export const passleFixturesByShortcode: Record<string, PasslePostPayload> = {
  "102mmg5": fixture0 as unknown as PasslePostPayload,
  "102n82s": fixture1 as unknown as PasslePostPayload,
  "102n83t": fixture2 as unknown as PasslePostPayload,
  "102n8dv": fixture3 as unknown as PasslePostPayload,
  "102n8hj": fixture4 as unknown as PasslePostPayload,
  "102n8jl": fixture5 as unknown as PasslePostPayload,
  "102n94o": fixture6 as unknown as PasslePostPayload,
  "102nbb2": fixture7 as unknown as PasslePostPayload,
  "102nbge": fixture8 as unknown as PasslePostPayload,
  "102nbox": fixture9 as unknown as PasslePostPayload,
  "102nbs7": fixture10 as unknown as PasslePostPayload,
  "102ne3i": fixture11 as unknown as PasslePostPayload,
  "102neab": fixture12 as unknown as PasslePostPayload,
  "102nf0g": fixture13 as unknown as PasslePostPayload,
  "102nfho": fixture14 as unknown as PasslePostPayload,
  "102nfz3": fixture15 as unknown as PasslePostPayload,
  "102o15k": fixture16 as unknown as PasslePostPayload,
  "102o16a": fixture17 as unknown as PasslePostPayload,
  "102o1nr": fixture18 as unknown as PasslePostPayload,
  "102o1qk": fixture19 as unknown as PasslePostPayload,
};
