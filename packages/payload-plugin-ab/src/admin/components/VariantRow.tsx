import type { VariantData } from "./VariantsField";

import { useDocumentDrawer, EditIcon } from "@payloadcms/ui";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";

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
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: 4,
        marginBottom: 6,
        background: "var(--theme-elevation-50)",
      }}>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--theme-elevation-800)" }}>
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

      <button type="button" onClick={openDrawer} className="ab-variant-icon-btn" title="Edit variant">
        <EditIcon />
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="ab-variant-icon-btn ab-variant-icon-btn--danger"
        title="Remove variant">
        <TrashIcon />
      </button>

      <DocumentDrawer onSave={handleAfterAction} onDelete={handleAfterAction} />
    </div>
  );
}
