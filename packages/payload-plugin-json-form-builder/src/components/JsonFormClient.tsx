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
import { followed } from "../library/reconcileSection.js";
import { LibraryPicker } from "./LibraryPicker.js";
import { useJsonFormConfig } from "../useJsonFormConfig.js";
import { faults, jsonErrors, schemaErrors } from "../field/checks.js";
import { isObject, isTyped, visible } from "../field/typedJson.js";
import type { TypedNode, TypedRoot } from "../field/typedJson.js";

type Props = ComponentProps<JSONFieldClientComponent> & {
  library?: boolean;
  mayBuild: boolean;
};

export const JsonFormClient = ({ library, mayBuild, ...props }: Props) => {
  const { path, field } = props;
  const validate = useCallback(
    (next: unknown, options: { required?: boolean }) => jsonErrors(next, options?.required),
    []
  );
  const { setValue, showError, value } = useField<unknown>({ path, validate });
  const { openModal } = useModal();
  const builderSlug = useDrawerSlug("json-builder");
  const dropSlug = useDrawerSlug("json-form-drop");
  const librarySlug = useDrawerSlug("json-form-library");
  const [dropping, setDropping] = useState("");
  const [adding, setAdding] = useState(false);
  const build = (fresh: boolean) => {
    setAdding(fresh);
    openModal(builderSlug);
  };
  const valid = value == null || Array.isArray(value);
  const [code, setCode] = useState(!valid);
  const root: TypedRoot = isTyped(value) ? value : [];
  const broken = schemaErrors(root).length > 0;
  const asCode = code || broken;
  const locked = props.readOnly || !mayBuild;
  const shares = Boolean(useJsonFormConfig().library) && !library;
  const set = (name: string, node: TypedNode) =>
    setValue(root.map((entry) => (entry.name === name ? node : entry)));
  const drop = (name: string) => setValue(root.filter((entry) => entry.name !== name));
  const untyped = Boolean(value) && !isTyped(value) && Object.keys(value as object).length > 0;
  const sections = root.filter((node) => visible(node, root));
  const bare = !sections.length && !untyped && !asCode;
  const unfilled = showError ? faults(root) : [];
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
                            badge={followed(node) ? "global" : undefined}
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
            {mayBuild && !untyped && (
              <div className="json-form__adders">
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
                {shares && (
                  <Button
                    buttonStyle="icon-label"
                    className="array-field__add-row json-form__add-row"
                    icon="plus"
                    iconPosition="left"
                    iconStyle="with-border"
                    onClick={() => openModal(librarySlug)}
                  >
                    From library
                  </Button>
                )}
              </div>
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
      {mayBuild && shares && (
        <LibraryPicker
          onAdd={(nodes) => setValue([...root, ...nodes])}
          root={root}
          slug={librarySlug}
        />
      )}
      {mayBuild && (
        <JsonBuilder
          adding={adding}
          library={library}
          onChange={setValue}
          root={root}
          slug={builderSlug}
        />
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
