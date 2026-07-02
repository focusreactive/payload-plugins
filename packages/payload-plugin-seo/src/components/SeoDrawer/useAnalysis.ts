"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runAnalysis } from "../../engine/runAnalysis";
import type { AnalysisInput, AnalysisResult } from "../../engine/types/analysis";
import { decideAutoAction } from "./analysisDecision";
import { ensureLanguagePack } from "./languagePacks";

export interface UseAnalysisArgs {
  getInput: (opts?: { live?: boolean }) => Promise<AnalysisInput>;
  signature: string;
  supportedLocales: string[];
  enabled?: boolean;
}

export interface UseAnalysisResult {
  result: AnalysisResult | null;
  analyzing: boolean;
  analyzeNow: () => void;
}

export function useAnalysis({
  getInput,
  signature,
  supportedLocales,
  enabled = true,
}: UseAnalysisArgs): UseAnalysisResult {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const getInputRef = useRef(getInput);
  getInputRef.current = getInput;
  const signatureRef = useRef(signature);
  signatureRef.current = signature;
  const localesRef = useRef(supportedLocales);
  localesRef.current = supportedLocales;

  const lastSignature = useRef<string | null>(null);
  const runSeq = useRef(0);

  const run = useCallback(async (live: boolean) => {
    const runId = ++runSeq.current;

    lastSignature.current = signatureRef.current;
    setAnalyzing(true);

    try {
      const input = await getInputRef.current({ live });
      await ensureLanguagePack(input.locale, localesRef.current);
      if (runId !== runSeq.current) return;

      setResult(runAnalysis(input));
    } finally {
      if (runId === runSeq.current) setAnalyzing(false);
    }
  }, []);

  const analyzeNow = useCallback(() => {
    void run(true);
  }, [run]);

  useEffect(() => {
    const action = decideAutoAction({
      enabled,
      signature,
      lastSignature: lastSignature.current,
    });

    if (action === "skip") return;

    void run(false);
  }, [signature, run, enabled]);

  return {
    result,
    analyzing,
    analyzeNow,
  };
}
