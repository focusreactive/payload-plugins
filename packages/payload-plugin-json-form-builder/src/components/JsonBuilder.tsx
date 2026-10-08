"use client";

import { clsx as cn } from "clsx";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Banner,
  Button,
  ConfirmationModal,
  Drawer,
  EditIcon,
  TextInput,
  Tooltip,
  useDrawerSlug,
  useConfig,
  useModal,
  XIcon,
} from "@payloadcms/ui";
import { IconButton } from "./IconButton.js";
import { JsonBuilderLevel } from "./JsonBuilderLevel.js";
import { followed, following } from "../library/reconcileSection.js";
import { isTyped } from "../field/typedJson.js";
import { JsonBuilderSettings } from "./JsonBuilderSettings.js";
import { labelOf } from "./JsonNode.js";
import { schemaErrors } from "../field/checks.js";
import {
  addAt,
  addSection,
  editAt,
  keyFault,
  nodeAt,
  renameSection,
  shapeOf,
  withShape,
} from "../field/edits.js";
import type { Spot } from "../field/edits.js";
import { GROUPS, KINDS } from "../field/kinds.js";
import { useJsonFormConfig } from "../useJsonFormConfig.js";
import { blankNode, TYPES } from "../field/typedJson.js";
import type { NodeType, TypedNode, TypedRoot } from "../field/typedJson.js";

const holds = (node: TypedNode | undefined, missing: readonly NodeType[]): readonly NodeType[] =>
  node?.type === "tabs"
    ? ["tab"]
    : TYPES.filter((type) => type !== "tab" && !missing.includes(type));

export const JsonBuilder = ({
  library,
  root,
  onChange,
  shares,
  slug,
}: {
  library?: boolean;
  root: TypedRoot;
  onChange: (root: TypedRoot) => void;
  shares?: boolean;
  slug: string;
}) => {
  const [draft, setDraft] = useState<TypedRoot>(root);
  const [current, setCurrent] = useState("");
  const [at, setAt] = useState<number[]>([]);
  const [picked, setPicked] = useState<Spot | null>(null);
  const [edited, setEdited] = useState<TypedNode | null>(null);
  const [key, setKey] = useState("");
  const [hovered, setHovered] = useState("");
  const [making, setMaking] = useState<"field" | "section" | null>(null);
  const { anchor: richTextAnchor, library: held, uploads } = useJsonFormConfig();
  const missing: NodeType[] = [
    ...(uploads ? [] : ["upload" as NodeType]),
    ...(richTextAnchor ? [] : ["richText" as NodeType]),
  ];
  const formSlug = useDrawerSlug("json-builder-field");
  const leaveSlug = useDrawerSlug("json-builder-leave");
  const { closeModal, isModalOpen, openModal } = useModal();

  const showing = isModalOpen(slug);
  // `body-scroll-lock` frees the page as soon as any one modal gives up its lock, with no regard
  // for the modals still open; this class holds it while the builder is.
  useEffect(() => {
    if (!showing) return;
    document.body.classList.add("json-builder-open");
    return () => document.body.classList.remove("json-builder-open");
  }, [showing]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(root);
  useEffect(() => {
    if (!showing) return;
    setDraft(root);
    // biome-ignore lint/correctness/useExhaustiveDependencies: the stored value is read on opening only
  }, [showing]);

  const sections = draft;
  const [shared, setShared] = useState<TypedRoot>([]);
  const { config } = useConfig();

  useEffect(() => {
    if (!(showing && shares && held)) return;
    const request = new AbortController();
    fetch(`${config.routes.api}/globals/${held.global}?depth=0`, {
      credentials: "include",
      signal: request.signal,
    })
      .then((answer) => answer.json())
      .then((doc) => {
        const value = (doc as Record<string, unknown>)?.[held.field];
        setShared(isTyped(value) ? (value as TypedRoot) : []);
      })
      .catch(() => setShared([]));
    return () => request.abort();
  }, [held, config.routes.api, shares, showing]);

  const take = (node: TypedNode) => setDraft([...draft, following(node, node.name ?? "")]);

  const dropSection = (spot: Spot) => {
    remove(spot);
    setCurrent("");
    setAt([]);
  };

  const drop = (entry: string) => {
    setDraft(draft.filter((node) => (node.name || "") !== entry));
    if (current === entry) setCurrent("");
  };

  const free = shared.filter((node) => !draft.some((own) => own.name === node.name));
  const kept = draft.filter(followed);
  const faults = schemaErrors(draft);
  const section = draft.find((node) => node.name === current);
  const here: Spot = { section: current, at };
  const holder = section ? nodeAt(draft, here) : undefined;
  const fields = holder ? shapeOf(holder) : [];
  const offered = holds(holder, missing);

  const isSection = making === "section" || Boolean(picked && !picked.at.length);

  const neighbours = () => {
    if (isSection) {
      const taken = draft.map((node) => node.name ?? "");
      return making ? taken : taken.filter((name) => name !== current);
    }
    const names = fields.map((field) => field.name ?? "");
    return making ? names : names.filter((_, index) => index !== picked?.at.at(-1));
  };
  const fault = edited ? keyFault(key, neighbours()) : "";

  const trail = at.map((index, depth) => ({
    at: at.slice(0, depth + 1),
    name:
      labelOf(nodeAt(draft, { section: current, at: at.slice(0, depth + 1) }) ?? undefined) ||
      `#${index + 1}`,
  }));

  const start = (what: "field" | "section", type: NodeType) => {
    setPicked(null);
    setMaking(what);
    setEdited(blankNode(type));
    setKey("");
    openModal(formSlug);
  };

  const edit = (spot: Spot) => {
    const node = nodeAt(draft, spot);
    setPicked(spot);
    setMaking(null);
    setEdited(node ?? null);
    setKey(spot.at.length ? (node?.name ?? "") : spot.section);
    openModal(formSlug);
  };

  const shut = () => {
    closeModal(formSlug);
    setPicked(null);
    setMaking(null);
    setEdited(null);
  };

  const save = () => {
    if (!edited) return shut();
    if (making === "section") {
      setDraft(addSection(draft, key, edited));
      setCurrent(key);
      setAt([]);
    } else if (making === "field") setDraft(addAt(draft, here, { ...edited, name: key }));
    else if (picked && isSection) {
      const kept = editAt(draft, picked, () => edited);
      setDraft(key === current ? kept : renameSection(kept, current, key));
      setCurrent(key);
    } else if (picked) setDraft(editAt(draft, picked, () => ({ ...edited, name: key })));
    shut();
  };

  const reorder = (next: TypedNode[]) =>
    setDraft(editAt(draft, here, (node) => withShape(node, next)));

  const remove = (spot: Spot) => {
    setDraft(editAt(draft, spot, () => undefined));
    setPicked(null);
  };

  const leave = () => (dirty ? openModal(leaveSlug) : closeModal(slug));

  const walk = (entry: string) => {
    setCurrent(entry);
    setAt([]);
  };

  return (
    <Drawer
      className="json-builder__shell"
      Header={
        <div className="drawer__header json-builder__bar">
          <h2 className="drawer__header__title">Build the sections</h2>
          {dirty ? <span className="json-builder__unsaved">Unsaved</span> : null}
          <Button
            buttonStyle="primary"
            onClick={() => {
              onChange(draft);
              closeModal(slug);
            }}
          >
            Save
          </Button>
          <button
            aria-label="Close"
            className="drawer__header__close json-builder__close"
            onClick={leave}
            type="button"
          >
            <XIcon />
          </button>
        </div>
      }
      slug={slug}
    >
      <div className="json-builder">
        <aside className="json-builder__sections">
          <h5 className="json-builder__group">Sections</h5>
          {sections.map((held, index) => {
            const entry = held.name || `#${index + 1}`;
            if (followed(held)) return null;
            return (
              <button
                className={cn(
                  "json-builder__row",
                  "json-builder__row--act",
                  entry === current && "json-builder__row--held"
                )}
                key={entry}
                onClick={() => walk(entry)}
                type="button"
              >
                <span className="json-builder__section-name">{held.label || entry}</span>
              </button>
            );
          })}
          <Button
            buttonStyle="secondary"
            onClick={() => start("section", "collapsible")}
            size="large"
          >
            Add section
          </Button>

          {shares && kept.length > 0 && (
            <>
              <h5 className="json-builder__group json-builder__group--shared">Attached sections</h5>
              {kept.map((node, index) => {
                const entry = node.name || `#${index + 1}`;
                return (
                  <div className="json-builder__row json-builder__row--held" key={entry}>
                    <span className="json-builder__section-name">{node.label || entry}</span>
                    <button
                      aria-label={`Detach ${entry}`}
                      className="json-builder__mark"
                      onClick={() => drop(entry)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {shares && free.length > 0 && (
            <>
              <h5 className="json-builder__group json-builder__group--shared">Shared sections</h5>
              {free.map((node, index) => {
                const entry = node.name || `#${index + 1}`;
                return (
                  <div className="json-builder__row" key={entry}>
                    <span className="json-builder__section-name">{node.label || entry}</span>
                    <button
                      aria-label={`Attach ${entry}`}
                      className="json-builder__mark"
                      onClick={() => take(node)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </aside>

        <section className="json-builder__canvas">
          {faults.length ? <Banner type="error">{faults.join("; ")}</Banner> : null}
          {section ? (
            <>
              <nav className="json-builder__trail">
                <button className="json-builder__step" onClick={() => setAt([])} type="button">
                  {section.label || current}
                </button>
                {trail.map((step) => (
                  <span className="json-builder__crumb" key={step.at.join(",")}>
                    <span className="json-builder__arrow">→</span>
                    <button
                      className="json-builder__step"
                      onClick={() => setAt(step.at)}
                      type="button"
                    >
                      {step.name}
                    </button>
                  </span>
                ))}
                <span className="json-builder__trail-actions">
                  <IconButton
                    label={at.length ? "Edit this field" : "Edit this section"}
                    onClick={() => edit(here)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    className="json-builder__drop"
                    label={at.length ? "Remove this field" : "Remove this section"}
                    onClick={() => {
                      if (!at.length) return dropSection(here);
                      remove(here);
                      setAt(at.slice(0, -1));
                    }}
                  >
                    <XIcon />
                  </IconButton>
                </span>
              </nav>
              <JsonBuilderLevel
                fields={fields}
                hands={{
                  onEdit: (index) => edit({ section: current, at: [...at, index] }),
                  onOrder: reorder,
                  onOpen: (index) => setAt([...at, index]),
                  onRemove: (index) => remove({ section: current, at: [...at, index] }),
                }}
              />
            </>
          ) : (
            <Banner type="info">Pick a section on the left, or add one.</Banner>
          )}
        </section>

        <aside className="json-builder__settings">
          <div className="json-builder__head">
            <h4>Add a field</h4>
          </div>
          <p className="json-builder__hint">
            {!section
              ? "Pick a section on the left first."
              : holder?.type === "tabs"
                ? "A strip of tabs holds tabs only."
                : "It lands where you are standing."}
          </p>
          {section &&
            GROUPS.map((group) => {
              const inGroup = offered.filter((type) => KINDS[type].group === group);
              if (!inGroup.length) return null;
              return (
                <div className="json-builder__palette" key={group}>
                  <h5 className="json-builder__group">{group}</h5>
                  {inGroup.map((type) => (
                    <button
                      className="json-builder__kind-card"
                      key={type}
                      onBlur={() => setHovered("")}
                      onClick={() => start("field", type)}
                      onFocus={() => setHovered(type)}
                      onMouseEnter={() => setHovered(type)}
                      onMouseLeave={() => setHovered("")}
                      type="button"
                    >
                      <Tooltip delay={0} show={hovered === type}>
                        {KINDS[type].draws}
                      </Tooltip>
                      <span
                        className={cn(
                          "json-builder__tile",
                          `json-builder__tile--${group.toLowerCase()}`
                        )}
                      >
                        {KINDS[type].glyph}
                      </span>
                      <span className="json-builder__kind-name">{type}</span>
                    </button>
                  ))}
                </div>
              );
            })}
        </aside>
      </div>

      <Drawer
        className="json-builder__drawer"
        slug={formSlug}
        title={
          making === "section"
            ? "New section"
            : making
              ? `New ${edited?.type} field`
              : isSection
                ? "Section"
                : `${edited?.type} field`
        }
      >
        {edited ? (
          <div className="json-builder__form">
            <TextInput
              label="Key"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setKey(event.target.value)}
              path="builder-key"
              readOnly={Boolean(library) && !making}
              required
              value={key}
            />
            {fault ? <p className="json-builder__fault">{fault}</p> : null}
            <JsonBuilderSettings node={edited} onChange={setEdited} />

            {making ? (
              <div className="json-builder__buttons">
                <Button buttonStyle="primary" disabled={Boolean(fault)} onClick={save} size="large">
                  {making === "section" ? "Add section" : "Add field"}
                </Button>
                <Button buttonStyle="none" className="json-builder__quiet" onClick={shut}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="json-builder__buttons">
                <Button buttonStyle="primary" disabled={Boolean(fault)} onClick={save} size="large">
                  Done
                </Button>
                <Button
                  buttonStyle="none"
                  className="json-builder__quiet"
                  onClick={() => {
                    if (picked && isSection) {
                      shut();
                      return dropSection(picked);
                    }
                    if (picked) remove(picked);
                    if (picked?.at.length && picked.at.length <= at.length)
                      setAt(picked.at.slice(0, -1));
                    shut();
                  }}
                >
                  {isSection ? "Remove section" : "Remove field"}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      <ConfirmationModal
        body="The sections were changed here and not saved. Leaving drops those changes."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        heading="Leave the builder"
        modalSlug={leaveSlug}
        onConfirm={() => {
          setDraft(root);
          closeModal(slug);
        }}
      />
    </Drawer>
  );
};
