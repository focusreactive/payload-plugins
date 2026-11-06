import { Button, useConfig, useListQuery } from "@payloadcms/ui";
import { DEFAULT_SLUG } from "../constants";
import { toBracketParams } from "../utils/toBracketParams";

type Props = { slug?: string };
type ExportFormat = "csv" | "ndjson";

export function AuditExportButton({ slug = DEFAULT_SLUG }: Props) {
  const { config } = useConfig();
  const { query } = useListQuery();

  const exportUrl = (format: ExportFormat) => {
    const params = toBracketParams(query?.where);
    if (query?.search) params.set("search", query.search);
    params.set("format", format);
    return `${config.routes.api}/${slug}/export?${params.toString()}`;
  };

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <Button buttonStyle="secondary" el="anchor" size="small" url={exportUrl("csv")}>
        Export CSV
      </Button>
      <Button buttonStyle="secondary" el="anchor" size="small" url={exportUrl("ndjson")}>
        Export NDJSON
      </Button>
    </div>
  );
}
