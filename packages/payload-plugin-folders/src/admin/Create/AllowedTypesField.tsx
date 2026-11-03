import { CheckboxInput } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";
import { LockIcon } from "../Tree/icons.js";

export type TypesMode = "all" | "specific";

/** What the page types section of a folder form edits. */
export type AllowedTypesValue = {
  chosenTypes: readonly string[];
  defaultType: string;
  locksTypes: boolean;
  mode: TypesMode;
};

/** A lock from a folder above: the types are its and cannot be edited here. */
export type TypesLock = {
  /** The locking folder's name, `null` while it is not known. */
  ownerTitle: string | null;
  /** The types the lock hands down; empty means every type. */
  types: readonly string[];
};

/**
 * The page types of a folder (spec section 7.7): "All types" or "Specific types" with a chip for
 * each page type, the default type and "Lock subfolders' page types". Under a lock the section is
 * greyed out, shows the types it took with a lock icon on each chip and says who locked them
 * (Storyblok 3.6). The New folder dialog and the folder settings drawer both use it.
 */
export const AllowedTypesField = ({
  formId,
  lock,
  onChange,
  translate,
  typeLabels,
  value,
}: {
  formId: string;
  lock: TypesLock | null;
  onChange: (value: AllowedTypesValue) => void;
  translate: Translate;
  typeLabels: Readonly<Record<string, string>>;
  value: AllowedTypesValue;
}): ReactNode => {
  const isLocked = lock !== null;
  const allSlugs = Object.keys(typeLabels);
  const mode: TypesMode = isLocked ? (lock.types.length > 0 ? "specific" : "all") : value.mode;
  const shownTypes = isLocked ? lock.types : value.chosenTypes;
  const defaultOptions = mode === "specific" ? shownTypes : allSlugs;
  // A default that left the list (its chip was unticked) reads as no default.
  const effectiveDefault = defaultOptions.includes(value.defaultType) ? value.defaultType : "";
  const needsTypes = !isLocked && mode === "specific" && value.chosenTypes.length === 0;

  const toggleType = (slug: string) => {
    onChange({
      ...value,
      chosenTypes: value.chosenTypes.includes(slug)
        ? value.chosenTypes.filter((chosen) => chosen !== slug)
        : [...value.chosenTypes, slug],
    });
  };

  return (
    <fieldset className="fr-folders-fieldset" data-testid="types-section" disabled={isLocked}>
      <legend className="fr-folders-field__label">{translate("createTypes")}</legend>
      {isLocked ? (
        <p className="fr-folders-field__hint" data-testid="types-locked">
          {lock.ownerTitle === null
            ? translate("createTypesLockedUnknown")
            : translate("createTypesLocked", { title: lock.ownerTitle })}
        </p>
      ) : null}
      <div className="fr-folders-radios">
        <label>
          <input
            checked={mode === "all"}
            name={`${formId}-types`}
            onChange={() => onChange({ ...value, mode: "all" })}
            type="radio"
          />
          {translate("createTypesAll")}
        </label>
        <label>
          <input
            checked={mode === "specific"}
            name={`${formId}-types`}
            onChange={() => onChange({ ...value, mode: "specific" })}
            type="radio"
          />
          {translate("createTypesSpecific")}
        </label>
      </div>
      {mode === "specific" ? (
        <div className="fr-folders-chips" data-testid="type-chips" role="group">
          {allSlugs.map((slug) => {
            const isOn = shownTypes.includes(slug);

            return (
              <button
                aria-checked={isOn}
                className={`fr-folders-type-chip${isOn ? " fr-folders-type-chip--on" : ""}`}
                data-locked={isLocked && isOn ? "true" : undefined}
                key={slug}
                onClick={() => toggleType(slug)}
                role="checkbox"
                type="button"
              >
                {isLocked && isOn ? <LockIcon /> : null}
                {typeLabels[slug] ?? slug}
              </button>
            );
          })}
        </div>
      ) : null}
      {needsTypes ? (
        <p className="fr-folders-field__hint" data-testid="types-needed">
          {translate("createTypesNeeded")}
        </p>
      ) : null}
      <div className="fr-folders-field">
        <label className="fr-folders-field__label" htmlFor={`${formId}-default`}>
          {translate("createDefaultType")}
        </label>
        <select
          className="fr-folders-input"
          data-testid="default-type"
          id={`${formId}-default`}
          onChange={(event) => onChange({ ...value, defaultType: event.target.value })}
          value={effectiveDefault}
        >
          <option value="">{translate("createDefaultTypeNone")}</option>
          {defaultOptions.map((slug) => (
            <option key={slug} value={slug}>
              {typeLabels[slug] ?? slug}
            </option>
          ))}
        </select>
      </div>
      <div className="fr-folders-field">
        <CheckboxInput
          checked={mode === "specific" && !isLocked && value.locksTypes}
          id={`${formId}-lock`}
          label={translate("createLockTypes")}
          onToggle={() => onChange({ ...value, locksTypes: !value.locksTypes })}
          readOnly={mode !== "specific" || isLocked}
        />
        {mode === "specific" ? null : (
          <p className="fr-folders-field__hint">{translate("createLockNeedsTypes")}</p>
        )}
      </div>
    </fieldset>
  );
};
