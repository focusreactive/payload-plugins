/**
 * How the target-language field behaves in the translation forms (bulk dashboard + per-document panel).
 *
 * - `'single'` (default): one target locale per run — today's behaviour, unchanged.
 * - `'multi'`: the editor picks several target locales and the run fans out one translation per
 *   `(document × target locale)`; the target field renders a compact multi-select.
 *
 * @since 0.10.0
 */
export type TargetSelectionMode = "single" | "multi";
