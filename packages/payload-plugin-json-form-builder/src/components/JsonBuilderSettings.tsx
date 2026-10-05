"use client";

import type { ChangeEvent } from "react";
import { Button, CheckboxInput, FieldLabel, TextInput, XIcon } from "@payloadcms/ui";
import { toWords } from "payload/shared";
import { IconButton } from "./IconButton.js";
import { JsonInput } from "./JsonInput.js";
import { holdsFields } from "../field/typedJson.js";
import type { TypedNode } from "../field/typedJson.js";

type Settings = { node: TypedNode; onChange: (node: TypedNode) => void };

const without = (node: TypedNode, key: string) => {
  const { [key]: _gone, ...rest } = node as Record<string, unknown>;
  return rest as TypedNode;
};

const put = (node: TypedNode, key: string, value: unknown) =>
  ({ ...node, [key]: value }) as TypedNode;

// The date a field starts on, which is simply the date it holds until someone picks another. A date
// is the one kind nobody can type a sensible value into, so it is the one worth answering here.
const Starts = ({ node, onChange }: Settings) => (
  <JsonInput
    id="builder-value"
    kind="date"
    label="Default value"
    onChange={(next) => onChange(put(node, "value", next))}
    value={"value" in node ? node.value : undefined}
  />
);

// An emptied box takes the key away rather than storing a blank one: no `min` at all is what a
// field with no floor says.
const Limit = ({ node, onChange, name }: Settings & { name: string }) => (
  <JsonInput
    id={`builder-${name}`}
    kind="number"
    label={name}
    onChange={(next) =>
      onChange(typeof next === "number" ? put(node, name, next) : without(node, name))
    }
    value={(node as Record<string, unknown>)[name]}
  />
);

// What a select offers is its schema, so it is written here and the form only picks from it. A
// select with nothing to offer is a broken one, which is why the last row cannot be taken away.
const Options = ({ node, onChange }: Settings) => {
  const options = ("options" in node && node.options) || [];
  const write = (next: string[]) => onChange(put(node, "options", next));

  return (
    <div className="json-builder__options">
      <FieldLabel label="Options" path="builder-options" />
      {options.map((option, index) => (
        <div className="field-type text json-builder__option" key={index}>
          <input
            onChange={(event) => write(options.toSpliced(index, 1, event.target.value))}
            value={option}
          />
          <IconButton
            disabled={options.length < 2}
            label="Remove this option"
            onClick={() => write(options.toSpliced(index, 1))}
          >
            <XIcon />
          </IconButton>
        </div>
      ))}
      <Button buttonStyle="secondary" onClick={() => write([...options, ""])}>
        Add option
      </Button>
    </div>
  );
};

export const JsonBuilderSettings = ({ node, onChange }: Settings) => {
  // Filling in is a thing a field does, so a group, a tab or a list is asked neither.
  const fills = !holdsFields(node);

  return (
    <>
      {/* A container wears its name as a heading, so it is worth spelling out in words. */}
      {fills ? null : (
        <TextInput
          label="Title"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(
              event.target.value ? put(node, "label", event.target.value) : without(node, "label")
            )
          }
          path="builder-label"
          placeholder={toWords(node.name ?? "")}
          value={node.label ?? ""}
        />
      )}
      {node.type === "select" && <Options node={node} onChange={onChange} />}
      {node.type === "number" && (
        <>
          <Limit name="min" node={node} onChange={onChange} />
          <Limit name="max" node={node} onChange={onChange} />
        </>
      )}
      {node.type === "array" && (
        <>
          <Limit name="minRows" node={node} onChange={onChange} />
          <Limit name="maxRows" node={node} onChange={onChange} />
        </>
      )}
      {node.type === "date" && <Starts node={node} onChange={onChange} />}
      {fills ? (
        <>
          <TextInput
            label="Description"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange(
                event.target.value
                  ? put(node, "description", event.target.value)
                  : without(node, "description")
              )
            }
            path="builder-description"
            value={node.description ?? ""}
          />
          <CheckboxInput
            checked={node.required === true}
            id="builder-required"
            label="Required"
            name="builder-required"
            onToggle={() =>
              onChange(node.required ? without(node, "required") : put(node, "required", true))
            }
          />
          {/* Not for an upload or a rich text: their editors are not asked to be read-only here. */}
          {node.type === "upload" || node.type === "richText" ? null : (
            <CheckboxInput
              checked={node.readOnly === true}
              id="builder-readonly"
              label="Read only"
              name="builder-readonly"
              onToggle={() =>
                onChange(node.readOnly ? without(node, "readOnly") : put(node, "readOnly", true))
              }
            />
          )}
        </>
      ) : null}
    </>
  );
};
