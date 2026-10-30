import type { ChangeEvent, ReactNode } from "react";

import type { Translate } from "../compat.js";
import { LinkIcon } from "../Tree/icons.js";
import type { SegmentStatus } from "./useSegmentCheck.js";

const statusLineOf = (
  status: SegmentStatus,
  path: string,
  translate: Translate
): { isError: boolean; text: string } => {
  switch (status.state) {
    case "checking": {
      return { isError: false, text: translate("createSegmentChecking") };
    }
    case "invalid": {
      return { isError: true, text: translate("createSegmentInvalid") };
    }
    case "taken": {
      return { isError: true, text: status.message };
    }
    case "error": {
      return {
        isError: true,
        text: `${translate("createSegmentCheckFailed")}${status.message === "" ? "" : `: ${status.message}`}`,
      };
    }
    case "ok": {
      return { isError: false, text: translate("createSegmentFree", { path }) };
    }
    default: {
      return { isError: false, text: "" };
    }
  }
};

/**
 * The URL segment field of the create dialogs (spec section 7.7): it follows the text above it
 * until the editor types in it, a link icon makes it follow again, and under it the check says
 * whether the segment is valid and free, with the URL it gives.
 */
export const SlugField = ({
  disabled = false,
  inputId,
  isLinked,
  onChange,
  onRelink,
  parentPath,
  status,
  translate,
  value,
}: {
  /** The segment is not part of any URL (a root page): greyed out, and not checked. */
  disabled?: boolean;
  inputId: string;
  isLinked: boolean;
  onChange: (value: string) => void;
  onRelink: () => void;
  /** The path of the folder it goes in, `/` for the top level, for the URL under the field. */
  parentPath: string;
  status: SegmentStatus;
  translate: Translate;
  value: string;
}): ReactNode => {
  const line = statusLineOf(status, `${parentPath === "/" ? "" : parentPath}/${value}`, translate);

  return (
    <div className="fr-folders-field">
      <label className="fr-folders-field__label" htmlFor={inputId}>
        {translate("createSegment")}
      </label>
      <div className="fr-folders-slug">
        <input
          aria-describedby={`${inputId}-status`}
          aria-invalid={line.isError ? true : undefined}
          autoComplete="off"
          className="fr-folders-input"
          data-linked={isLinked ? "true" : "false"}
          data-testid="segment-input"
          disabled={disabled}
          id={inputId}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          spellCheck={false}
          type="text"
          value={value}
        />
        <button
          aria-label={translate(isLinked ? "createSegmentLinked" : "createSegmentRelink")}
          aria-pressed={isLinked}
          className="fr-folders-slug__link"
          data-testid="segment-link"
          disabled={disabled || isLinked}
          onClick={onRelink}
          title={translate(isLinked ? "createSegmentLinked" : "createSegmentRelink")}
          type="button"
        >
          <LinkIcon isLinked={isLinked} />
        </button>
      </div>
      <p
        aria-live="polite"
        className={
          line.isError ? "fr-folders-field__hint fr-folders-error" : "fr-folders-field__hint"
        }
        data-state={disabled ? "idle" : status.state}
        data-testid="segment-status"
        id={`${inputId}-status`}
        role="status"
      >
        {disabled ? "" : line.text}
      </p>
    </div>
  );
};
