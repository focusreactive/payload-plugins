import { createElement, useEffect, useState, type ComponentType, type ReactNode } from "react";

type Mod<P> = { default?: ComponentType<P> } | ComponentType<P>;

export function mockNextDynamic<P>(loader: () => Promise<Mod<P>>, opts?: { loading?: () => ReactNode; ssr?: boolean }) {
  return function Loadable(props: P) {
    const [Comp, setComp] = useState<ComponentType<P> | null>(null);
    useEffect(() => {
      let active = true;
      Promise.resolve(loader()).then((mod) => {
        if (!active) return;
        const resolved =
          mod && typeof mod === "object" && "default" in (mod as Record<string, unknown>) ?
            ((mod as { default: ComponentType<P> }).default ?? (mod as unknown as ComponentType<P>))
          : (mod as ComponentType<P>);
        setComp(() => resolved);
      });
      return () => {
        active = false;
      };
    }, []);
    if (!Comp) return opts?.loading ? opts.loading() : null;
    return createElement(Comp as ComponentType<unknown>, props as object);
  };
}
