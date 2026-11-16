import type { VariantData } from "./VariantsField";

import { ConfirmationModal, Popup, PopupList, useDocumentDrawer, useModal } from "@payloadcms/ui";

import { useState } from "react";

import { PercentInput } from "./PercentInput";

interface VariantRowProps {
  variant: VariantData;
  series: number;
  collectionSlug: string;
  max: number;
  onPercentageChange: (value: number) => void;
  onDelete: () => void;
  onSaved: () => void;
}

export function VariantRow({
  variant,
  series,
  collectionSlug,
  max,
  onPercentageChange,
  onDelete,
  onSaved,
}: VariantRowProps) {
  const [DocumentDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug,
    id: variant.id,
  });
  const { openModal } = useModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteModalSlug = `ab-delete-variant-${variant.id}`;
  const name = variant.title ?? variant.id;

  const afterDrawerAction = () => {
    closeDrawer();
    onSaved();
  };

  return (
    <li className="ab-row">
      <span className="ab-row__swatch" data-series={series} aria-hidden="true" />
      <button type="button" className="ab-row__name ab-row__name--link" onClick={openDrawer}>
        {name}
      </button>

      <PercentInput
        value={variant.passPercentage}
        min={1}
        max={max}
        label={name}
        onChange={onPercentageChange}
      />

      <Popup
        className={menuOpen ? "ab-row__menu ab-row__menu--open" : "ab-row__menu"}
        onToggleOpen={setMenuOpen}
        buttonClassName="ab-row__menu-trigger"
        horizontalAlign="right"
        verticalAlign="bottom"
        size="fit-content"
        caret={false}
        button={
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="3.5" cy="8" r="1.25" />
              <circle cx="8" cy="8" r="1.25" />
              <circle cx="12.5" cy="8" r="1.25" />
            </svg>
            <span className="ab-sr-only">Actions for {name}</span>
          </>
        }
        render={({ close }) => (
          <PopupList.ButtonGroup>
            <PopupList.Button
              onClick={() => {
                close();
                openDrawer();
              }}
            >
              Edit variant
            </PopupList.Button>
            <PopupList.Button
              className="ab-menu__item--danger"
              onClick={() => {
                close();
                openModal(deleteModalSlug);
              }}
            >
              Delete variant
            </PopupList.Button>
          </PopupList.ButtonGroup>
        )}
      />

      <ConfirmationModal
        modalSlug={deleteModalSlug}
        heading={`Delete “${name}”?`}
        body="This deletes the variant and its content. Its share of traffic goes back to the original."
        confirmLabel="Delete variant"
        onConfirm={onDelete}
      />
      <DocumentDrawer onSave={afterDrawerAction} onDelete={afterDrawerAction} />
    </li>
  );
}
