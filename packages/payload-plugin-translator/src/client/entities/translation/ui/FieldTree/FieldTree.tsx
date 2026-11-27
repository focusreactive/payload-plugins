"use client";

import type { TreeNode } from "../../../../../types/wire/DocumentTranslationState.js";
import { Checkbox } from "../../../../shared/ui/Checkbox/index.js";
import InfoPopover from "../../../../shared/ui/InfoPopover/index.js";
import { addressesOf, checkStateOf } from "../../model/fieldSelection.js";
import type { FieldSelection } from "../../model/fieldSelection.js";
import type { TreeMode } from "../../model/localeRow.js";

import styles from "./styles.module.scss";

type Picking = {
  selection: FieldSelection;
  onToggle: (node: TreeNode) => void;
  disabled: boolean;
};

export type FieldTreeProps = {
  tree: readonly TreeNode[];
  excluded: readonly string[];
  /** The target and source locales' names, for the whole-list hint. */
  localeLabel: string;
  sourceLabel: string;
} & ({ mode: Extract<TreeMode, "whole"> } | ({ mode: Extract<TreeMode, "pick"> } & Picking));

type NodeProps = {
  node: TreeNode;
  hint: string;
  picking: Picking | null;
};

const fieldCount = (count: number) => `${count} ${count === 1 ? "field" : "fields"}`;

function NodeCheckbox({
  node,
  picking,
  label,
}: {
  node: TreeNode;
  picking: Picking;
  label: string;
}) {
  const state = checkStateOf(node, picking.selection);
  return (
    <Checkbox
      aria-label={label}
      checked={state === "checked"}
      ref={(box) => {
        if (box) box.indeterminate = state === "mixed";
      }}
      disabled={picking.disabled}
      onChange={() => picking.onToggle(node)}
    />
  );
}

function TreeItem({ node, hint, picking }: NodeProps) {
  if (node.kind === "leaf") {
    return (
      <li className={styles.item}>
        {picking && <NodeCheckbox node={node} picking={picking} label={node.label} />}
        <span className={styles.name}>{node.label}</span>
        {!picking && node.required && <span className={styles.muted}>required</span>}
      </li>
    );
  }

  if (node.kind === "whole-list") {
    return (
      <li className={styles.item}>
        {picking && (
          <NodeCheckbox
            node={node}
            picking={picking}
            label={`${node.label}, replaced as a whole`}
          />
        )}
        <span className={styles.name}>
          <strong className={styles.strong}>{node.label}</strong>
          <span className={styles.muted}>· replaced as a whole</span>
          <InfoPopover label={hint} content={hint} />
        </span>
        {!picking && <span className={styles.count}>{fieldCount(node.addresses.length)}</span>}
      </li>
    );
  }

  const total = addressesOf(node).length;
  const picked = picking
    ? addressesOf(node).filter((address) => picking.selection.has(address)).length
    : 0;
  return (
    <li className={styles.group}>
      <div className={styles.item}>
        {picking && <NodeCheckbox node={node} picking={picking} label={node.label} />}
        <span className={`${styles.name} ${styles.strong}`}>{node.label}</span>
        <span className={styles.count}>
          {picking ? `${picked} of ${total}` : fieldCount(total)}
        </span>
      </div>
      <ul className={styles.children}>
        {node.children.map((child, index) => (
          <TreeItem key={`${child.label}-${index}`} node={child} hint={hint} picking={picking} />
        ))}
      </ul>
    </li>
  );
}

/** The saved document's translatable fields, as one locale's run would take them. */
export function FieldTree(props: FieldTreeProps) {
  const picking = props.mode === "pick" ? props : null;
  const hint = `This list has its own blocks in every locale. Translating it replaces all of ${props.localeLabel}’s blocks with the ${props.sourceLabel} ones, translated.`;
  return (
    <div className={styles.tree}>
      <ul className={styles.list}>
        {props.tree.map((node, index) => (
          <TreeItem key={`${node.label}-${index}`} node={node} hint={hint} picking={picking} />
        ))}
      </ul>
      {props.excluded.length > 0 && (
        <details className={styles.excluded}>
          <summary>{fieldCount(props.excluded.length)} excluded from translation</summary>
          <ul className={styles.list}>
            {props.excluded.map((label) => (
              <li key={label} className={`${styles.item} ${styles.muted}`}>
                {label}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
