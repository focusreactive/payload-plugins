"use client";

import type { DefaultCellComponentProps, TextFieldClient } from "payload";
import { EditIcon, ShimmerEffect, useDocumentDrawer } from "@payloadcms/ui";
import { useEffect, useMemo, useState } from "react";

type TargetDocCellProps = DefaultCellComponentProps<TextFieldClient, string>;

interface BaseTargetDoc {
  id?: string | number;
  name?: string;
  title?: string;
}

function getTargetDocLabel(doc: BaseTargetDoc | null, fallback: string) {
  return doc?.title ?? doc?.name ?? doc?.id?.toString() ?? fallback;
}

export function TargetDocCell({ cellData, rowData }: TargetDocCellProps) {
  const targetCollection =
    typeof rowData.targetCollection === "string"
      ? rowData.targetCollection
      : undefined;
  const targetDoc = cellData?.toString();

  if (!targetCollection || !targetDoc) {
    return <span>{targetDoc ?? ""}</span>;
  }

  return (
    <TargetDocDrawerCell
      targetCollection={targetCollection}
      targetDoc={targetDoc}
    />
  );
}

function TargetDocDrawerCell({
  targetCollection,
  targetDoc,
}: {
  targetCollection: string;
  targetDoc: string;
}) {
  const [doc, setDoc] = useState<BaseTargetDoc | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [DocumentDrawer, DocumentDrawerToggler] = useDocumentDrawer({
    collectionSlug: targetCollection,
    id: targetDoc,
  });

  useEffect(() => {
    if (!targetCollection || !targetDoc) return;

    const controller = new AbortController();

    setIsLoading(true);
    fetch(
      `/api/${encodeURIComponent(targetCollection)}/${encodeURIComponent(
        targetDoc,
      )}?depth=0&draft=true`,
      { signal: controller.signal },
    )
      .then(async (res) => {
        if (!res.ok) return null;

        return (await res.json()) as BaseTargetDoc;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDoc(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDoc(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [targetCollection, targetDoc]);

  const label = useMemo(
    () => getTargetDocLabel(doc, targetDoc ?? ""),
    [doc, targetDoc],
  );

  return (
    <>
      <div className="drawer-link">
        {isLoading && <ShimmerEffect width="100%" height="20px" />}

        {!isLoading && (
          <>
            <span className="drawer-link__cell">{label}</span>

            <DocumentDrawerToggler className="drawer-link__doc-drawer-toggler">
              <EditIcon />
            </DocumentDrawerToggler>
          </>
        )}
      </div>

      <DocumentDrawer />
    </>
  );
}
