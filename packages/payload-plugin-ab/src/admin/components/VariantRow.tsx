import type { VariantData } from "./VariantsField";

import { ConfirmationModal, useDocumentDrawer, useModal } from "@payloadcms/ui";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@ui-sdk/react/menu";
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input";

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

      <NumberInput
        className="ab-percent"
        value={variant.passPercentage}
        min={1}
        max={max}
        step={1}
        onValueChange={(value) => {
          if (value !== null) onPercentageChange(value);
        }}
      >
        <NumberInputGroup className="ab-percent__group">
          <NumberInputDecrement className="ab-percent__step" aria-label={`Less traffic to ${name}`}>
            −
          </NumberInputDecrement>
          <NumberInputControl
            className="ab-percent__input"
            aria-label={`Traffic to ${name}, percent`}
          />
          <span className="ab-percent__unit" aria-hidden="true">
            %
          </span>
          <NumberInputIncrement className="ab-percent__step" aria-label={`More traffic to ${name}`}>
            +
          </NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>

      <Menu
        onAction={(value) => {
          if (value === "edit") openDrawer();
          if (value === "delete") openModal(deleteModalSlug);
        }}
      >
        <MenuTrigger className="ab-row__menu-trigger" aria-label={`Actions for ${name}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="3.5" cy="8" r="1.25" />
            <circle cx="8" cy="8" r="1.25" />
            <circle cx="12.5" cy="8" r="1.25" />
          </svg>
        </MenuTrigger>
        <MenuContent className="ab-menu" align="end" sideOffset={4}>
          <MenuItem className="ab-menu__item" value="edit">
            Edit variant
          </MenuItem>
          <MenuSeparator className="ab-menu__separator" />
          <MenuItem className="ab-menu__item ab-menu__item--danger" value="delete">
            Delete variant
          </MenuItem>
        </MenuContent>
      </Menu>

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
