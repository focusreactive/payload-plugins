"use client";

import { useRef, useState } from "react";
import { CodeEditor } from "@payloadcms/ui";

const written = (value: unknown) => (value == null ? "" : JSON.stringify(value, null, 2));

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
