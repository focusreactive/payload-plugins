"use client";

import { FieldLabel } from "@payloadcms/ui";
import { RenderLexical } from "@payloadcms/richtext-lexical/client";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import { useState } from "react";
import { htmlToLexical } from "../field/htmlToLexical.js";
import { useJsonFormConfig } from "../useJsonFormConfig.js";

// A rich text node holds html, so this is one half of a round trip: lexical is written out by
// Payload's own converters and read back by `htmlToLexical`. The two have to agree about every tag,
// or whatever one writes and the other cannot read is gone the next time the field is opened.
//
// The editor is not mounted from here. `RenderLexical` takes a `schemaPath` — a real richText field
// Payload has already sanitized — and the plugin is what puts that field in the config and publishes
// its path. There is no way to mount lexical without one.
export const JsonRichText = ({
  html,
  id,
  label,
  onChange,
  readOnly,
}: {
  html: string;
  id: string;
  label: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}) => {
  const { anchor, holds } = useJsonFormConfig();
  // Read once, as the field opens; after that the editor owns the document and writes html back.
  const [state, setState] = useState(() => htmlToLexical(html, holds) ?? undefined);

  if (readOnly) {
    return (
      <div className="field-type json-form__read-only">
        <FieldLabel label={label} path={id} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the html is this field's own value */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <RenderLexical
      label={label}
      path={`${anchor.split(".").pop()}.${id}`}
      schemaPath={anchor}
      setValue={(next) => {
        setState(next);
        const data = next as Parameters<typeof convertLexicalToHTML>[0]["data"];
        // No container, no indent, no alignment: the html is content, and the site styles it.
        onChange(
          next
            ? convertLexicalToHTML({
                data,
                disableContainer: true,
                disableIndent: true,
                disableTextAlign: true,
              })
            : ""
        );
      }}
      value={state}
    />
  );
};
