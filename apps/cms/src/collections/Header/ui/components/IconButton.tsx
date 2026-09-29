import { cn } from "@/components/utils";

type IconButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  bordered?: boolean;
};

/**
 * The square that search, cart and the menu toggle all share, so the three controls sit on one
 * baseline at every width instead of each finding its own height.
 */
export const iconButtonClassName =
  "inline-flex size-[clamp(40px,3.4vw,46px)] flex-none items-center justify-center rounded-lg bg-surface text-foreground transition-colors duration-[250ms] ease-[ease] hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

/** Only the cart carries an outline in the design; search and the menu toggle deliberately do not. */
export const iconButtonBorderedClassName = "border border-border hover:border-primary";

export function IconButton({ bordered, className, type, ...props }: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(iconButtonClassName, bordered && iconButtonBorderedClassName, className)}
      {...props}
    />
  );
}
