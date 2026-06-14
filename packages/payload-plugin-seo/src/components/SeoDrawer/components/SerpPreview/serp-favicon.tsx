import type { ReactElement } from "react";

interface SerpFaviconProps {
  faviconUrl: string;
  siteName: string;
}

export function SerpFavicon({ faviconUrl, siteName }: SerpFaviconProps): ReactElement {
  return (
    <div className="grid h-[28px] w-[28px] min-w-[28px] flex-none place-items-center rounded-[50px] bg-serp-favicon-bg">
      {faviconUrl ? <img alt="" className="mx-[5px] h-[18px] w-[18px]" src={faviconUrl} /> : <span className="text-[12px] text-neutral-600">{siteName.charAt(0).toUpperCase()}</span>}
    </div>
  );
}
