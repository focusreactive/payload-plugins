"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { runAnalysis } from "../../engine/runAnalysis";
import type { AnalysisInput, AnalysisResult } from "../../engine/types";
import { ensureLanguagePack } from "./languagePacks";

const DEBOUNCE_MS = 500;

export interface UseAnalysisResult {
  result: AnalysisResult | null;
  analyzing: boolean;
  analyzeNow: () => void;
}

export function useAnalysis(input: AnalysisInput, supportedLocales: string[], enabled = true): UseAnalysisResult {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef(input);
  inputRef.current = input;
  const localesRef = useRef(supportedLocales);
  localesRef.current = supportedLocales;

  const run = useCallback(async () => {
    const current = inputRef.current;
    setAnalyzing(true);

    await ensureLanguagePack(current.locale, localesRef.current);

    try {
      setResult(runAnalysis(current));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const analyzeNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    void run();
  }, [run]);

  const signature = JSON.stringify(input);

  useEffect(() => {
    if (!enabled) return;

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => void run(), DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [signature, run, enabled]);

  return {
    result,
    analyzing,
    analyzeNow,
  };
}
