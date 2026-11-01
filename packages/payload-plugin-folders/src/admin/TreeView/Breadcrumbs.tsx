import { ChevronIcon } from "@payloadcms/ui";
import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import type { FolderId, TreeItem } from "../../types.js";
import type { Translate } from "../compat.js";
import { useCrumbDrop } from "../DragAndDrop/dragState.js";

/** Where a crumb leads: the tree zoomed into the folder, or the top level for `null`. */
export const zoomHrefOf = (
  adminRoute: string,
  foldersSlug: string,
  folderId: FolderId | null
): string =>
  `${adminRoute}/collections/${foldersSlug}${folderId === null ? "" : `?folder=${folderId}`}`;

type CrumbProps = {
  /** The folder this crumb names; `null` is the top level. */
  folder: TreeItem | null;
  href: string;
  isCurrent: boolean;
  label: string;
  onZoom: (folderId: FolderId | null) => void;
};

/**
 * One crumb. A plain click zooms in place, a click with a modifier or the middle button keeps the
 * browser's own new tab. Every crumb takes drops, the last one (the zoomed folder itself, the zoom
 * header) too: "inside" the folder, at the top.
 */
const Crumb = ({ folder, href, isCurrent, label, onZoom }: CrumbProps) => {
  const drop = useCrumbDrop(folder);
  const className = [
    "fr-folders-crumb",
    isCurrent ? "fr-folders-crumb--current" : "",
    drop.isOver ? "fr-folders-crumb--drop-inside" : "",
    drop.isRefused ? "fr-folders-crumb--drop-refused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onZoom(folder?.id ?? null);
  };

  return (
    <span
      className={className}
      data-crumb={folder === null ? "root" : String(folder.id)}
      data-testid={isCurrent ? "zoom-header" : "breadcrumb"}
      ref={drop.setNodeRef}
    >
      {isCurrent ? (
        <span aria-current="page" className="fr-folders-crumb__name" data-testid="zoom-current">
          {label}
        </span>
      ) : (
        <a className="fr-folders-crumb__name" draggable={false} href={href} onClick={handleClick}>
          {label}
        </a>
      )}
    </span>
  );
};

export type BreadcrumbsProps = {
  adminRoute: string;
  /** The folders from the top to the zoomed one, as tree rows; `null` while they are read. */
  chain: readonly TreeItem[] | null;
  foldersSlug: string;
  /** The zoomed folder's id, from the address. */
  folderId: FolderId;
  onZoom: (folderId: FolderId | null) => void;
  /** The name of the top level, the collection's label. */
  title: string;
  translate: Translate;
};

/**
 * `Content > Blog > 2026` above the tree while zoomed (spec section 7.2). Each crumb zooms to its
 * folder and takes drops; the last is the zoomed folder, shown as the header of the view. While
 * the folders are read the zoomed folder is only its id, which the crumb does not show.
 */
export const Breadcrumbs = ({
  adminRoute,
  chain,
  folderId,
  foldersSlug,
  onZoom,
  title,
  translate,
}: BreadcrumbsProps): ReactNode => {
  const navRef = useRef<HTMLDivElement | null>(null);
  const hasShownBefore = useRef(false);
  // After the editor zooms, the old rows are gone and the focus with them: it goes to the crumbs.
  // Not on the first render, which would pull focus into the page the editor just opened.
  useEffect(() => {
    if (hasShownBefore.current) {
      navRef.current?.focus();
    }
    hasShownBefore.current = true;
  }, [folderId]);

  const crumbs: Array<{ key: string; node: ReactNode }> = [
    {
      key: "root",
      node: (
        <Crumb
          folder={null}
          href={zoomHrefOf(adminRoute, foldersSlug, null)}
          isCurrent={false}
          label={title}
          onZoom={onZoom}
        />
      ),
    },
    ...(chain ?? []).map((folder, index) => ({
      key: String(folder.id),
      node: (
        <Crumb
          folder={folder}
          href={zoomHrefOf(adminRoute, foldersSlug, folder.id)}
          isCurrent={index === (chain?.length ?? 0) - 1}
          label={folder.title}
          onZoom={onZoom}
        />
      ),
    })),
  ];

  return (
    // Not a `nav` with an `ol`: Payload's own stylesheet puts a ">" before such list items.
    <div
      aria-busy={chain === null}
      aria-label={translate("breadcrumbLabel")}
      className="fr-folders-crumbs"
      data-testid="breadcrumbs"
      ref={navRef}
      role="navigation"
      tabIndex={-1}
    >
      <div className="fr-folders-crumbs__list" role="list">
        {crumbs.map((crumb, index) => (
          <div className="fr-folders-crumbs__item" key={crumb.key} role="listitem">
            {index > 0 ? (
              <span aria-hidden="true" className="fr-folders-crumbs__separator">
                <ChevronIcon direction="right" size={16} />
              </span>
            ) : null}
            {crumb.node}
          </div>
        ))}
        {chain === null ? (
          <div
            className="fr-folders-crumbs__item fr-folders-muted"
            data-testid="breadcrumb-loading"
            role="listitem"
          >
            <span aria-hidden="true" className="fr-folders-crumbs__separator">
              <ChevronIcon direction="right" size={16} />
            </span>
            <span aria-label={translate("loading")}>...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
