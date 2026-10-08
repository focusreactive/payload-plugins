"use client";

import type { ChangeEvent } from "react";
import { Button, CheckboxInput, FieldLabel, TextInput, XIcon } from "@payloadcms/ui";
import { toWords } from "payload/shared";
import { IconButton } from "./IconButton.js";
import { JsonInput } from "./JsonInput.js";
import { holdsFields } from "../field/typedJson.js";
import type { Leaf, TypedNode } from "../field/typedJson.js";

type Settings = { node: TypedNode; onChange: (node: TypedNode) => void };

const without = (node: TypedNode, key: string) => {
  const { [key]: _gone, ...rest } = node as Record<string, unknown>;
  return rest as TypedNode;
};

const put = (node: TypedNode, key: string, value: unknown) =>
  ({ ...node, [key]: value }) as TypedNode;

const Starts = ({ node, onChange }: Settings) => (
  <>
    <CheckboxInput
      checked={(node as Leaf).time === true}
      id="builder-time"
      label="Pick a time as well"
      name="builder-time"
      onToggle={() =>
        onChange((node as Leaf).time ? without(node, "time") : put(node, "time", true))
      }
    />
    <JsonInput
      id="builder-value"
      kind="date"
      label="Default value"
      onChange={(next) => onChange(put(node, "value", next))}
      time={(node as Leaf).time}
      value={"value" in node ? node.value : undefined}
    />
  </>
);

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
  const fills = !holdsFields(node);

  return (
    <>
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
