import type { PortfolioExperiment, PortfolioWinRate } from "./types";

/** Aggregates per-experiment qualification + winner flags into the portfolio win rate. */
export function portfolioWinRate(experiments: PortfolioExperiment[]): PortfolioWinRate {
  const qualified = experiments.filter((e) => e.qualified);
  const winners = qualified.filter((e) => e.hasWinner).length;

  return {
    winners,
    qualified: qualified.length,
    notQualified: experiments.length - qualified.length,
    rate: qualified.length > 0 ? winners / qualified.length : null,
  };
}
