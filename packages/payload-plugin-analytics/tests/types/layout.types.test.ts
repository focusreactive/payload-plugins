import { describe, it, expectTypeOf } from "vitest";
import type {
  AnalyticsLayoutConfig,
  BlockComponentProps,
  BlockDefinition,
  BlockPlacement,
  RowConfig,
  TabLayoutConfig,
} from "../../src/types/layout";
import type { Comparison, DateRange } from "../../src/types/query";

describe("layout types", () => {
  it("BlockDefinition is generic on TData", () => {
    type Custom = BlockDefinition<{ count: number }>;
    expectTypeOf<Custom["fetch"]>().toMatchTypeOf<
      | undefined
      | ((args: {
          dateRange: DateRange;
          comparison: Comparison;
          ga4: unknown;
          req: unknown;
        }) => Promise<{ count: number }>)
    >();
  });

  it("BlockPlacement requires order and colSpan", () => {
    const ok: BlockPlacement = { order: 1, colSpan: 1 };
    const okWithEnabled: BlockPlacement = { order: 1, colSpan: 1, enabled: false };
    expectTypeOf(ok).toMatchTypeOf<BlockPlacement>();
    expectTypeOf(okWithEnabled).toMatchTypeOf<BlockPlacement>();
  });

  it("RowConfig requires order, columns, blocks", () => {
    const row: RowConfig = { order: 1, columns: 5, blocks: {} };
    expectTypeOf(row).toMatchTypeOf<RowConfig>();
  });

  it("TabLayoutConfig has rows map", () => {
    const tab: TabLayoutConfig = { rows: {} };
    expectTypeOf(tab).toMatchTypeOf<TabLayoutConfig>();
  });

  it("AnalyticsLayoutConfig has tabs map", () => {
    const layout: AnalyticsLayoutConfig = { tabs: {} };
    expectTypeOf(layout).toMatchTypeOf<AnalyticsLayoutConfig>();
  });

  it("BlockComponentProps has all the agreed props", () => {
    type Props = BlockComponentProps<{ x: number }>;
    expectTypeOf<Props["data"]>().toEqualTypeOf<{ x: number } | undefined>();
    expectTypeOf<Props["loading"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Props["error"]>().toEqualTypeOf<Error | undefined>();
    expectTypeOf<Props["dateRange"]>().toEqualTypeOf<DateRange>();
    expectTypeOf<Props["comparison"]>().toEqualTypeOf<Comparison>();
    expectTypeOf<Props["colSpan"]>().toEqualTypeOf<number>();
    expectTypeOf<Props["t"]>().toMatchTypeOf<(key: string) => string>();
  });
});
