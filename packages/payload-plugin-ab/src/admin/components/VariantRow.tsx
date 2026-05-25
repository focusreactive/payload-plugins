import { useDocumentDrawer, EditIcon } from "@payloadcms/ui";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";

import type { VariantData } from "./VariantsField";

interface VariantRowProps {
  variant: VariantData;
  collectionSlug: string;
  maxPercentage: number;
  onPercentageChange: (value: string) => void;
  onPercentageBlur: () => void;
  onDelete: () => void;
  onSaved: () => void;
}

export function VariantRow({
  variant,
  collectionSlug,
  maxPercentage,
  onPercentageChange,
  onPercentageBlur,
  onDelete,
  onSaved,
}: VariantRowProps) {
  const [DocumentDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug,
    id: variant.id,
  });

  const handleAfterAction = () => {
    closeDrawer();
    onSaved();
  };

  return (
    <div
      style={{
        alignItems: "center",
        background: "var(--theme-elevation-50)",
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: 4,
        display: "flex",
        gap: 8,
        marginBottom: 6,
        padding: "8px 12px",
      }}
    >
      <span
        style={{
          color: "var(--theme-elevation-800)",
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {variant.title}
      </span>

      <div className="ab-percent-input-wrapper">
        <input
          type="number"
          min={1}
          max={maxPercentage}
          value={variant.passPercentage ?? ""}
          onChange={(e) => onPercentageChange(e.target.value)}
          onBlur={onPercentageBlur}
          className="ab-percent-input"
          title="Traffic percentage (1–99)"
        />
        <span className="ab-percent-suffix">%</span>
      </div>

      <button
        type="button"
        onClick={openDrawer}
        className="ab-variant-icon-btn"
        title="Edit variant"
      >
        <EditIcon />
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="ab-variant-icon-btn ab-variant-icon-btn--danger"
        title="Remove variant"
      >
        <TrashIcon />
      </button>

      <DocumentDrawer onSave={handleAfterAction} onDelete={handleAfterAction} />
    </div>
  );
}
