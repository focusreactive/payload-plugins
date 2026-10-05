"use client";

import { useRef, useState } from "react";
import { CodeEditor } from "@payloadcms/ui";

const written = (value: unknown) => (value == null ? "" : JSON.stringify(value, null, 2));

// Payload's own json field keeps the raw text as the value while it does not parse, and that string
// then travels: the form holds it, the server is asked to store it, and a jsonb column is handed a
// sentence. Here the text stays here. The field keeps the last value that parsed, so nothing
// downstream ever sees anything but json — no refused save, and no form left looking saved.
export const JsonCode = ({
  maxHeight,
  onChange,
  readOnly,
  value,
}: {
  maxHeight?: number;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  value: unknown;
}) => {
  const [text, setText] = useState(() => written(value));
  const [fault, setFault] = useState("");
  // What was last sent up, so a value changed elsewhere — the builder, a section deleted — redraws
  // the editor, while our own writes do not fight the caret.
  const sent = useRef(text);

  if (!readOnly) {
    const outside = written(value);
    if (outside !== sent.current) {
      sent.current = outside;
      setText(outside);
      setFault("");
    }
  }

  const edit = (typed: string | undefined = "") => {
    setText(typed);
    if (!typed.trim()) {
      sent.current = "";
      setFault("");
      return onChange(null);
    }
    try {
      const parsed = JSON.parse(typed);
      sent.current = written(parsed);
      setFault("");
      onChange(parsed);
    } catch (error) {
      setFault(error instanceof Error ? error.message : "This is not valid json.");
    }
  };

  return (
    <>
      <CodeEditor
        defaultLanguage="json"
        maxHeight={maxHeight}
        onChange={edit}
        options={{ insertSpaces: true, tabSize: 3 }}
        readOnly={readOnly}
        value={readOnly ? written(value) : text}
      />
      {fault ? <p className="json-form__errors">{fault}</p> : null}
    </>
  );
};
