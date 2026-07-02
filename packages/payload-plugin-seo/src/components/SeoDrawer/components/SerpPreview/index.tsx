import type { ReactElement } from "react";
import type { SerpResult } from "../../../../engine/types/analysis";
import { highlightKeyphrase } from "./highlight-keyphrase";
import { SerpFavicon } from "./serp-favicon";
import {
  serpContainer,
  serpDescription,
  serpHostname,
  serpSiteName,
  serpTitle,
  serpUrlRow,
} from "./variants";
import { truncateDescription } from "./truncate-description";

export type SerpMode = "mobile" | "desktop";

interface SerpPreviewProps {
  data: SerpResult;
  keyphrase: string;
  synonyms?: string[];
  faviconUrl: string;
  mode: SerpMode;
}

export function SerpPreview({
  data,
  keyphrase,
  synonyms = [],
  faviconUrl,
  mode,
}: SerpPreviewProps): ReactElement {
  const result = (
    <div className={serpContainer({ mode })}>
      <div className={serpUrlRow({ mode })}>
        <SerpFavicon faviconUrl={faviconUrl} siteName={data.siteName} />

        <div className="overflow-hidden">
          <div className={serpSiteName({ mode })}>{data.siteName}</div>
          <div className={serpHostname({ mode })}>{data.url}</div>
        </div>
      </div>

      <div className={serpTitle({ mode })}>{data.title}</div>

      <div className={serpDescription({ mode })}>
        {highlightKeyphrase(truncateDescription(data.description), keyphrase, synonyms)}
      </div>
    </div>
  );

  return mode === "desktop" ? <div className="overflow-x-auto">{result}</div> : result;
}
