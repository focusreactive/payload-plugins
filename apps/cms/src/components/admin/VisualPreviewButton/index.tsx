"use client";

import { useLivePreviewContext } from "@payloadcms/ui";

export const VisualPreviewButton: React.FC = () => {
  const { previewURL, isPreviewEnabled } = useLivePreviewContext();

  if (!isPreviewEnabled || !previewURL) {
    return null;
  }

  const openWithOpener = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    window.open(previewURL, "_blank", "noopener=no");
  };

  return (
    <a
      aria-label="Preview"
      className="preview-btn"
      href={previewURL}
      id="preview-button"
      onClick={openWithOpener}
      rel="opener"
      target="_blank"
      title="Preview"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="18"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" x2="21" y1="14" y2="3" />
      </svg>
    </a>
  );
};
