"use client";

import { clsx as cn } from "clsx";
import { useEffect, useState } from "react";
import { Button, Drawer, useConfig, useModal } from "@payloadcms/ui";
import { following } from "../library/reconcileSection.js";
import { isTyped } from "../field/typedJson.js";
import type { TypedNode, TypedRoot } from "../field/typedJson.js";
import { useJsonFormConfig } from "../useJsonFormConfig.js";
import { labelOf } from "./JsonNode.js";

const taken = (root: TypedRoot) => new Set(root.map((node) => node.name));

export const LibraryPicker = ({
  onAdd,
  root,
  slug,
}: {
  onAdd: (nodes: TypedNode[]) => void;
  root: TypedRoot;
  slug: string;
}) => {
  const { config } = useConfig();
  const { library } = useJsonFormConfig();
  const { closeModal } = useModal();
  const [shared, setShared] = useState<TypedRoot | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!library) return;
    const request = new AbortController();
    fetch(`${config.routes.api}/globals/${library.global}?depth=0`, {
      credentials: "include",
      signal: request.signal,
    })
      .then((answer) => answer.json())
      .then((doc) => {
        const value = (doc as Record<string, unknown>)?.[library.field];
        setShared(isTyped(value) ? (value as TypedRoot) : []);
      })
      .catch(() => setShared([]));
    return () => request.abort();
  }, [config.routes.api, library]);

  const here = taken(root);
  const pick = (name: string) =>
    setPicked((held) =>
      held.includes(name) ? held.filter((own) => own !== name) : [...held, name]
    );

  const add = () => {
    const chosen = (shared ?? []).filter((node) => picked.includes(node.name ?? ""));
    onAdd(chosen.map((node) => following(node, node.name ?? "")));
    setPicked([]);
    closeModal(slug);
  };

  return (
    <Drawer
      className="json-library"
      Header={
        <div className="drawer__header json-library__bar">
          <h2 className="drawer__header__title">Shared sections</h2>
          <Button buttonStyle="primary" disabled={!picked.length} onClick={add}>
            {picked.length ? `Add ${picked.length}` : "Add"}
          </Button>
        </div>
      }
      slug={slug}
    >
      <div className="json-library__list">
        {shared === null && <p className="field-description">Reading the library…</p>}
        {shared?.length === 0 && (
          <p className="field-description">The library has no sections yet.</p>
        )}
        {(shared ?? []).map((node, at) => {
          const name = node.name ?? `#${at + 1}`;
          const used = here.has(node.name);
          return (
            <button
              className={cn(
                "json-library__card",
                picked.includes(name) && "json-library__card--picked",
                used && "json-library__card--used"
              )}
              disabled={used}
              key={name}
              onClick={() => pick(name)}
              type="button"
            >
              <span className="json-library__name">{labelOf(node, name)}</span>
              <span className="json-library__key">{used ? "key is taken" : name}</span>
            </button>
          );
        })}
      </div>
    </Drawer>
  );
};
