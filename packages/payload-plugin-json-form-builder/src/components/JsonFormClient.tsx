"use client";

import "./jsonForm.scss";

import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import {
  Button,
  ConfirmationModal,
  DraggableSortable,
  DraggableSortableItem,
  FieldLabel,
  GearIcon,
  ListViewIcon,
  useDrawerSlug,
  useField,
  useModal,
  XIcon,
} from "@payloadcms/ui";
import type { JSONFieldClientComponent } from "payload";
import { BracesIcon } from "./icons/BracesIcon.js";
import { IconButton } from "./IconButton.js";
import { JsonBuilder } from "./JsonBuilder.js";
import { JsonCode } from "./JsonCode.js";
import { hideItem, JsonNode, labelOf } from "./JsonNode.js";
import { faults, jsonErrors, schemaErrors } from "../field/checks.js";
import { isObject, isTyped, visible } from "../field/typedJson.js";
import type { TypedNode, TypedRoot } from "../field/typedJson.js";

type Props = ComponentProps<JSONFieldClientComponent> & { mayBuild: boolean };

// A typed json value (src/fields/jsonField/typedJson.ts) laid out as admin fields. The builder owns
// the shape and Code only shows it — except while the json is broken, which is the one thing the
// builder cannot mend. Both gates are decided on the server, in JsonFormField.
export const JsonFormClient = ({ mayBuild, ...props }: Props) => {
  const { path, field } = props;
  // The same rule the field's own `validate` runs on the server. It cannot stop a submit — the edit
  // view turns client validation off there (`disableValidationOnSubmit`) — but it is what marks the
  // field invalid as the value changes, which is what the message below is read from.
  const validate = useCallback(
    (next: unknown, options: { required?: boolean }) => jsonErrors(next, options?.required),
    []
  );
  const { setValue, showError, value } = useField<unknown>({ path, validate });
  const { openModal } = useModal();
  const builderSlug = useDrawerSlug("json-builder");
  const dropSlug = useDrawerSlug("json-form-drop");
  // Which section the confirmation is about. One modal serves them all.
  const [dropping, setDropping] = useState("");
  // Whether the builder opens on its canvas or straight on the form a new section is answered in.
  const [adding, setAdding] = useState(false);
  const build = (fresh: boolean) => {
    setAdding(fresh);
    openModal(builderSlug);
  };
  // Anything that is not a list of sections opens in Code, to be mended by hand.
  const valid = value == null || Array.isArray(value);
  const [code, setCode] = useState(!valid);
  const root: TypedRoot = isTyped(value) ? value : [];
  const broken = schemaErrors(root).length > 0;
  const asCode = code || broken;
  // Code is open to whoever may build, and read-only to everyone else: it is the same value the form
  // shows, and the one way to mend json the form cannot draw.
  const locked = props.readOnly || !mayBuild;
  const set = (name: string, node: TypedNode) =>
    setValue(root.map((entry) => (entry.name === name ? node : entry)));
  // Deleting a section is the editor's to make: it is the one piece of the shape that is also a
  // piece of the page, and an edition that does not run it has no use for its fields either.
  const drop = (name: string) => setValue(root.filter((entry) => entry.name !== name));
  // Content that was never converted: it has keys but no kinds, so the form cannot draw it and the
  // builder would have nothing to open.
  const untyped = Boolean(value) && !isTyped(value) && Object.keys(value as object).length > 0;
  // A list keeps the order it is written in, so a section sits where it was put.
  const sections = root.filter((node) => visible(node, root));
  // Nothing built yet: both controls in the strip act on sections, and there are none — so the only
  // thing offered is the button that makes the first one.
  const bare = !sections.length && !untyped && !asCode;
  // After a refused save: Payload's own pill is pinned to the top right of the field, which is where
  // this one keeps its controls, so the one line naming what is missing is unreadable there. Said
  // again here, under the sections it is about, and only once a save has actually been turned down.
  const unfilled = showError ? faults(root) : [];
  // Sections are the keys a template reads, which is the one count worth carrying in the foot.
  const kept = root.length;

  return (
    <div className={cn("field-type json-form", unfilled.length > 0 && "json-form--alarmed")}>
      <div className="json-form__bar">
        <h4 className="json-form__title">
          <FieldLabel as="span" label={field.label} path={path} />
        </h4>
        <span className="json-form__badge">json</span>

        <div className="json-form__tools">
          {mayBuild && !bare && (
            <>
              <IconButton label="Section settings" onClick={() => build(false)}>
                <GearIcon />
              </IconButton>
              <span className="json-form__split" />
            </>
          )}
          {/* Two named ways of looking at one value, so which one is open is readable at a glance —
					    an icon that toggles only says so once you have guessed what it does. */}
          {mayBuild && !bare && (
            <div className="json-form__views">
              <button
                className={cn("json-form__view", !asCode && "json-form__view--on")}
                disabled={broken}
                onClick={() => setCode(false)}
                type="button"
              >
                <ListViewIcon />
                Fields
              </button>
              <button
                className={cn("json-form__view", asCode && "json-form__view--on")}
                disabled={code && !valid}
                onClick={() => setCode(true)}
                type="button"
              >
                <BracesIcon />
                JSON
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Directly under the header, so what is wrong is read before the thing it is wrong in. All of
			    them, numbered: a count alone sends the editor hunting. A row opens the json. */}
      {unfilled.length > 0 ? (
        <ol className="json-form__alarm">
          {unfilled.map((fault, at) => (
            <li key={`${fault.path.join(".")}-${fault.message}`}>
              <span className="json-form__alarm-row">
                <span className="json-form__alarm-no">{String(at + 1).padStart(2, "0")}</span>
                <span className="json-form__alarm-said">
                  <span className="json-form__alarm-message">{fault.message}</span>
                  <span className="json-form__crumbs">
                    {fault.path.map((step, depth) => (
                      <span
                        className={cn(
                          "json-form__crumb",
                          depth === fault.path.length - 1 && "json-form__crumb--bad"
                        )}
                        key={`${step}-${depth}`}
                      >
                        {depth > 0 ? <span className="json-form__crumb-sep">→</span> : null}
                        {step}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {/* The editor fills the card itself; only the form needs room around it. */}
      <div className={cn("json-form__body", asCode && "json-form__body--code")}>
        {asCode ? (
          <>
            <JsonCode
              maxHeight={
                typeof field.admin?.maxHeight === "number" ? field.admin.maxHeight : undefined
              }
              onChange={setValue}
              readOnly={locked}
              value={value}
            />
            {broken && !locked ? (
              <p className="json-form__errors">
                The form cannot draw this json, so it stays in Code. The builder lists what is
                wrong.
              </p>
            ) : null}
          </>
        ) : (
          <>
            {/* Dragged where they are read, not behind the gear: moving a section is the editor's
                work, not a change to the shape. The move is made on the stored list by name rather
                than by the seat on screen — a section hidden by a condition is still in the list. */}
            {sections.length > 0 && (
              <DraggableSortable
                className="json-form__fields"
                ids={sections.map((node, at) => node.name || `#${at + 1}`)}
                onDragEnd={({ moveFromIndex, moveToIndex }) => {
                  const from = root.findIndex(
                    (node) => node.name === sections[moveFromIndex]?.name
                  );
                  const to = root.findIndex((node) => node.name === sections[moveToIndex]?.name);
                  if (from < 0 || to < 0) return;
                  setValue(root.toSpliced(from, 1).toSpliced(to, 0, root[from]));
                }}
              >
                {sections.map((node, at) => {
                  const key = node.name || `#${at + 1}`;
                  return (
                    <DraggableSortableItem id={key} key={key}>
                      {({
                        attributes,
                        isDragging,
                        listeners,
                        setNodeRef,
                        transform,
                        transition,
                      }) => (
                        <div
                          ref={setNodeRef}
                          style={{ transform, transition, zIndex: isDragging ? 1 : undefined }}
                        >
                          <JsonNode
                            drag={props.readOnly ? undefined : { id: key, attributes, listeners }}
                            faults={showError}
                            hidden={node.hidden}
                            id={`${path}.${key}`}
                            label={labelOf(node, key)}
                            menu={[
                              hideItem(node, (next) => set(key, next)),
                              {
                                className: "json-form__action--remove",
                                icon: <XIcon />,
                                label: "Delete",
                                onClick: () => {
                                  setDropping(key);
                                  openModal(dropSlug);
                                },
                              },
                            ]}
                            node={node}
                            onChange={(next) => set(key, next)}
                            top
                          />
                        </div>
                      )}
                    </DraggableSortableItem>
                  );
                })}
              </DraggableSortable>
            )}
            {untyped && (
              <p className="field-description">
                This json has no field types yet — it is converted by the typed-json script.
              </p>
            )}
            {!sections.length && !untyped && !mayBuild && (
              <p className="field-description">
                No fields yet — someone with the builder adds them.
              </p>
            )}
            {/* What a list and a blocks field offer under their rows, so adding a section is where
						    the hand already goes looking. */}
            {mayBuild && !untyped && (
              <Button
                buttonStyle="icon-label"
                className="array-field__add-row json-form__add-row"
                icon="plus"
                iconPosition="left"
                iconStyle="with-border"
                onClick={() => build(true)}
              >
                Add section
              </Button>
            )}
          </>
        )}
      </div>
      <footer className="json-form__foot">
        <span
          className={cn(
            "json-form__state",
            unfilled.length || broken ? "json-form__state--off" : "json-form__state--on"
          )}
        >
          {broken
            ? "invalid"
            : unfilled.length
              ? `${unfilled.length} ${unfilled.length === 1 ? "error" : "errors"}`
              : "valid"}
        </span>
        <span className="json-form__meta">{`${kept} ${kept === 1 ? "section" : "sections"}`}</span>
        {asCode && locked ? (
          <span className="json-form__note">read only — the gear builds the sections</span>
        ) : null}
      </footer>
      {mayBuild && (
        <JsonBuilder adding={adding} onChange={setValue} root={root} slug={builderSlug} />
      )}
      <ConfirmationModal
        body={`This will delete "${labelOf(
          root.find((node) => node.name === dropping),
          dropping
        )}" and everything filled in under it.`}
        confirmLabel="Delete"
        heading="Delete section"
        modalSlug={dropSlug}
        onConfirm={() => drop(dropping)}
      />
    </div>
  );
};
