"use client";

import { Drawer, RenderFields, XIcon, useModal } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import { buildBreadcrumbs } from "../lib/breadcrumbs.js";
import type { CrumbLevel, Translate } from "../lib/breadcrumbs.js";
import type { DefaultMode } from "../lib/headerClick.js";
import type { RowLevel } from "../lib/resolveRowChain.js";
import { MODE_ATTRIBUTE, OWNER_ATTRIBUTE } from "./styles.js";

const BASE = "stacked-editing";

type PanelProps = {
  /** Live Preview is open: stay inside the editor column. */
  readonly confined: boolean;
  readonly depth: number;
  readonly levels: readonly RowLevel[];
  readonly mode: DefaultMode;
  readonly crumbLevels: readonly CrumbLevel[];
  readonly documentTitle: string;
  readonly ownerId: string;
  readonly translate: Translate;
  /** Keep the first `keep` panels open and close the rest. */
  readonly onNavigate: (keep: number) => void;
};

const Breadcrumbs = ({
  crumbs,
  onNavigate,
}: {
  crumbs: ReturnType<typeof buildBreadcrumbs>;
  onNavigate: (keep: number) => void;
}) => (
  <nav aria-label="Breadcrumbs">
    <ol className={`${BASE}__crumbs`}>
      {crumbs.map((crumb) => (
        <li className={`${BASE}__crumb ${BASE}__crumb--${crumb.kind}`} key={crumb.key}>
          {crumb.current ? (
            <span aria-current="page" className={`${BASE}__crumb--current`}>
              {crumb.label}
            </span>
          ) : (
            <button
              className={`${BASE}__crumb-button`}
              onClick={() => onNavigate(crumb.keep)}
              title={crumb.label}
              type="button"
            >
              {crumb.label}
            </button>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

/**
 * One level of the stack: a Payload `Drawer` showing one row's fields. The next level renders
 * inside it, so Payload's `DrawerDepthProvider` offsets and narrows each drawer above the last.
 */
export const Panel = ({
  confined,
  crumbLevels,
  depth,
  documentTitle,
  levels,
  mode,
  onNavigate,
  ownerId,
  translate,
}: PanelProps) => {
  const level = levels[depth];
  const slug = `stacked-editing-${ownerId}-${depth}`;
  const { closeModal, modalState, openModal } = useModal();
  const isOpen = Boolean(modalState[slug]?.isOpen);
  const hasOpened = useRef(false);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  // Opened a frame after mount: every level opens after its parent, so each gets a later
  // `openedOn` and Escape (which closes the most recently opened modal) closes the top panel.
  useEffect(() => {
    const frame = requestAnimationFrame(() => openModal(slug));
    return () => {
      cancelAnimationFrame(frame);
      closeModal(slug);
    };
  }, [closeModal, openModal, slug]);

  // Closed by Payload's drawer (Escape, the backdrop strip): drop this level and everything above.
  useEffect(() => {
    if (isOpen) {
      hasOpened.current = true;
    } else if (hasOpened.current) {
      hasOpened.current = false;
      navigateRef.current(depth);
    }
  }, [depth, isOpen]);

  if (!level) {
    return null;
  }

  const crumbs = buildBreadcrumbs({ documentTitle, levels: crumbLevels, depth });
  const kind = level.block
    ? translate(level.block.labels?.singular) || level.block.slug
    : translate(level.field.labels?.singular);
  const title = crumbLevels[depth]?.rowLabel ?? "";

  const header = (
    <div className={`${BASE}__header`}>
      <Breadcrumbs crumbs={crumbs} onNavigate={onNavigate} />
      <div className={`${BASE}__title-row`}>
        <h2 className={`${BASE}__title`} title={title}>
          {kind && !title.startsWith(kind) ? <span className={`${BASE}__kind`}>{kind}</span> : null}
          {title}
        </h2>
        <button
          aria-label="Close"
          className={`${BASE}__close`}
          onClick={() => closeModal(slug)}
          type="button"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      className={[`${BASE}__drawer`, confined && `${BASE}__drawer--confined`]
        .filter(Boolean)
        .join(" ")}
      Header={header}
      slug={slug}
    >
      <div
        className={`${BASE}__body`}
        key={level.rowPath}
        {...{ [MODE_ATTRIBUTE]: mode, [OWNER_ATTRIBUTE]: ownerId }}
      >
        <RenderFields
          fields={level.fields}
          forceRender
          margins="small"
          parentIndexPath=""
          parentPath={level.rowPath}
          parentSchemaPath={level.schemaPath}
          permissions={level.permissions}
          readOnly={level.readOnly}
        />
      </div>
      {depth + 1 < levels.length ? (
        <Panel
          confined={confined}
          crumbLevels={crumbLevels}
          depth={depth + 1}
          documentTitle={documentTitle}
          levels={levels}
          mode={mode}
          onNavigate={onNavigate}
          ownerId={ownerId}
          translate={translate}
        />
      ) : null}
    </Drawer>
  );
};
