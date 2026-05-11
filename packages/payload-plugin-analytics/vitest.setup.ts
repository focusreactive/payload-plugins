import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

afterEach(() => {
  cleanup();
});

beforeEach(async () => {
  try {
    const ga4ClientPath = "./src/services/ga4DataClient";
    const mod = await import(/* @vite-ignore */ ga4ClientPath);
    if (typeof mod.__resetGa4Client === "function") {
      mod.__resetGa4Client();
    }
  } catch {
    // module not present yet in early phases — skip
  }
});
