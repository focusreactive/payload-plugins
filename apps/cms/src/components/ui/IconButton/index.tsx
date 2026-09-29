import { Button } from "@/components/ui/Button";

export interface IconButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  children: React.ReactNode;
  "aria-label": string;
  /**
   * All four concept instances (search, cart, the rail's prev/next) land on the bordered `surface`
   * tone once search's missing border is treated as the outlier it is - its three visual twins all
   * carry one. `bordered` stays as the escape hatch to the borderless `white` tone for a future icon
   * button that should not have one; it is not exercised by anything in this concept.
   */
  bordered?: boolean;
}

/** A thin wrapper over `Button` (iconOnly, size "md") rather than its own component, so the tone,
 * hover and transition rules stay defined in exactly one place. */
export function IconButton({ bordered = true, children, ...props }: IconButtonProps) {
  return (
    <Button tone={bordered ? "surface" : "white"} iconOnly size="md" {...props}>
      {children}
    </Button>
  );
}
