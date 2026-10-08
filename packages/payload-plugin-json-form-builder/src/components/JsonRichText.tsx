"use client";

import { FieldLabel } from "@payloadcms/ui";
import { RenderLexical } from "@payloadcms/richtext-lexical/client";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import { useState } from "react";
import { htmlToLexical } from "../field/htmlToLexical.js";
import { useJsonFormConfig } from "../useJsonFormConfig.js";

// The editor is not mounted from here: `RenderLexical` takes the path of a real richText field,
// which the plugin puts in the config as its anchor.
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
