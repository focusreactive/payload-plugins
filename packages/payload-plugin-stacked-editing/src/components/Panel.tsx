"use client";

import { Drawer, RenderFields, XIcon } from "@payloadcms/ui";

import { buildBreadcrumbs } from "../lib/breadcrumbs.js";
import { MODE_ATTRIBUTE, OWNER_ATTRIBUTE, PANEL_BODY_CLASS } from "../lib/constants.js";
import { blockLabelOf } from "../lib/labels.js";
import type { Translate } from "../lib/labels.js";
import type { RowLevel } from "../lib/resolveRowChain.js";
import { usePanelModal } from "../hooks/usePanelModal.js";
import { Breadcrumbs } from "./Breadcrumbs.js";
import { usePanelStackContext } from "./PanelStackContext.js";

const BASE = "stacked-editing";

const rowKindOf = (level: RowLevel, translate: Translate): string =>
  blockLabelOf(level, translate) ?? translate(level.field.labels?.singular);

const PanelHeader = ({ depth, onClose }: { depth: number; onClose: () => void }) => {
  const { crumbLevels, documentTitle, keepPanels, levels, translate } = usePanelStackContext();
  const level = levels[depth];
  const crumbs = buildBreadcrumbs({ documentTitle, levels: crumbLevels, depth });
  const title = crumbLevels[depth]?.rowLabel ?? "";
  const kind = level ? rowKindOf(level, translate) : "";
  const showKind = kind && !title.startsWith(kind);

  return (
    <div className={`${BASE}__header`}>
      <Breadcrumbs crumbs={crumbs} onNavigate={keepPanels} />
      <div className={`${BASE}__title-row`}>
        <h2 className={`${BASE}__title`} title={title}>
          {showKind ? <span className={`${BASE}__kind`}>{kind}</span> : null}
          {title}
        </h2>
        <button aria-label="Close" className={`${BASE}__close`} onClick={onClose} type="button">
          <XIcon />
        </button>
      </div>
    </div>
  );
};

const PanelFields = ({ level }: { level: RowLevel }) => {
  const { mode, ownerId } = usePanelStackContext();
  return (
    <div className={PANEL_BODY_CLASS} {...{ [MODE_ATTRIBUTE]: mode, [OWNER_ATTRIBUTE]: ownerId }}>
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
  );
};

export const Panel = ({ depth }: { depth: number }) => {
  const { confined, keepPanels, levels, ownerId } = usePanelStackContext();
  const slug = `stacked-editing-${ownerId}-${depth}`;
  const { close } = usePanelModal(slug, () => keepPanels(depth));
  const level = levels[depth];
  if (!level) {
    return null;
  }

  return (
    <Drawer
      className={[`${BASE}__drawer`, confined && `${BASE}__drawer--confined`]
        .filter(Boolean)
        .join(" ")}
      Header={<PanelHeader depth={depth} onClose={close} />}
      slug={slug}
    >
      <PanelFields key={level.rowPath} level={level} />
      {depth + 1 < levels.length ? <Panel depth={depth + 1} /> : null}
    </Drawer>
  );
};
