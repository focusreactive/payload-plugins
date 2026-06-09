"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runAnalysis } from "../../engine/runAnalysis";
import type { AnalysisInput, AnalysisResult } from "../../engine/types/analysis";
import { decideAutoAction, hasKeyphrase } from "./analysisDecision";
import { ensureLanguagePack } from "./languagePacks";

export interface UseAnalysisResult {
  result: AnalysisResult | null;
  analyzing: boolean;
  analyzedKeyphrase: string | null;
  analyzeNow: (override?: Partial<AnalysisInput>) => void;
}

export function useAnalysis(input: AnalysisInput, supportedLocales: string[], enabled = true): UseAnalysisResult {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedKeyphrase, setAnalyzedKeyphrase] = useState<string | null>(null);

  const inputRef = useRef(input);
  inputRef.current = input;
  const localesRef = useRef(supportedLocales);
  localesRef.current = supportedLocales;

  const lastSignature = useRef<string | null>(null);

  const run = useCallback(async (override?: Partial<AnalysisInput>) => {
    const current = override ? { ...inputRef.current, ...override } : inputRef.current;

    if (!hasKeyphrase(current.keyphrase)) {
      lastSignature.current = null;
      setResult(null);
      setAnalyzedKeyphrase(null);
      return;
    }

    lastSignature.current = JSON.stringify(current);
    setAnalyzing(true);

    await ensureLanguagePack(current.locale, localesRef.current);

    try {
      setResult(runAnalysis(current));
      setAnalyzedKeyphrase(current.keyphrase);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const analyzeNow = useCallback(
    (override?: Partial<AnalysisInput>) => {
      void run(override);
    },
    [run]
  );

  const signature = useMemo(() => JSON.stringify(input), [input]);

  useEffect(() => {
    const action = decideAutoAction({
      enabled,
      hasKeyphrase: hasKeyphrase(inputRef.current.keyphrase),
      signature,
      lastSignature: lastSignature.current,
    });

    if (action === "reset") {
      lastSignature.current = null;
      setResult(null);
      setAnalyzedKeyphrase(null);
      return;
    }

    if (action === "skip") return;

    void run();
  }, [signature, run, enabled]);

  return {
    result,
    analyzing,
    analyzedKeyphrase,
    analyzeNow,
  };
}
