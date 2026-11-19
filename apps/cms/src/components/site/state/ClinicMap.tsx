"use client";

import React, { useEffect, useRef, useState } from "react";

export interface MapPoint {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
}

interface Props {
  points: MapPoint[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 12;
const EDGE_PADDING = 48;
const PIN_WIDTH = 45;
const PIN_HEIGHT = 52;
// Where the pin's point sits inside its 45 x 52 drawing.
const PIN_TIP_Y = 39.45;
const SELECTED_PIN_SCALE = 1.5;
const TILE_URL = (zoom: number, column: number, row: number) =>
  `https://tile.openstreetmap.org/${zoom}/${column}/${row}.png`;

interface Size {
  width: number;
  height: number;
}

function project(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const sine = Math.sin((latitude * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function bounds(points: MapPoint[], zoom: number) {
  const projected = points.map((point) => project(point.latitude, point.longitude, zoom));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);

  return {
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    minX: Math.min(...xs),
    minY: Math.min(...ys),
  };
}

function fitZoom(points: MapPoint[], size: Size): number {
  for (let zoom = MAX_ZOOM; zoom > MIN_ZOOM; zoom -= 1) {
    const box = bounds(points, zoom);

    if (
      box.maxX - box.minX <= size.width - 2 * EDGE_PADDING &&
      box.maxY - box.minY <= size.height - 2 * EDGE_PADDING - PIN_HEIGHT
    ) {
      return zoom;
    }
  }

  return MIN_ZOOM;
}

function tilesFor(zoom: number, left: number, top: number, size: Size) {
  const count = 2 ** zoom;
  const tiles: { key: string; src: string; x: number; y: number }[] = [];

  for (
    let row = Math.floor(top / TILE_SIZE);
    row <= Math.floor((top + size.height) / TILE_SIZE);
    row += 1
  ) {
    if (row < 0 || row >= count) {
      continue;
    }

    for (
      let column = Math.floor(left / TILE_SIZE);
      column <= Math.floor((left + size.width) / TILE_SIZE);
      column += 1
    ) {
      const wrapped = ((column % count) + count) % count;

      tiles.push({
        key: `${column}-${row}`,
        src: TILE_URL(zoom, wrapped, row),
        x: column * TILE_SIZE - left,
        y: row * TILE_SIZE - top,
      });
    }
  }

  return tiles;
}

const fill: React.CSSProperties = { inset: 0, overflow: "hidden", position: "absolute" };

const controlButton: React.CSSProperties = {
  background: "#fff",
  border: 0,
  boxShadow: "0 1px 4px rgba(0,0,0,.3)",
  cursor: "pointer",
  display: "block",
  fontSize: "1.25rem",
  height: "2.25rem",
  lineHeight: "2.25rem",
  textAlign: "center",
  width: "2.25rem",
};

/**
 * The clinics on a map drawn from OpenStreetMap tiles, framed to fit every pin. It fills the
 * `div.map-container` it is placed in; the original site drew a Google map there.
 */
export function ClinicMap({ points, selectedKey, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [zoomOffset, setZoomOffset] = useState(0);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();

      setSize(width > 0 && height > 0 ? { height, width } : null);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const visible = size && points.length > 0;
  const fitted = visible ? fitZoom(points, size) : MIN_ZOOM;
  const zoom = Math.min(MAX_ZOOM + 3, Math.max(MIN_ZOOM, fitted + zoomOffset));
  const box = visible ? bounds(points, zoom) : null;
  const left = box && size ? (box.minX + box.maxX) / 2 - size.width / 2 : 0;
  const top = box && size ? (box.minY + box.maxY) / 2 - PIN_HEIGHT / 2 - size.height / 2 : 0;

  return (
    <div ref={containerRef} style={{ ...fill, background: "#e5e3df" }}>
      {visible &&
        tilesFor(zoom, left, top, size).map((tile) => (
          <img
            alt=""
            draggable={false}
            height={TILE_SIZE}
            key={tile.key}
            src={tile.src}
            // The site stylesheet stretches images to their container; tiles must stay exactly one tile wide.
            style={{
              height: TILE_SIZE,
              left: tile.x,
              maxHeight: "none",
              maxWidth: "none",
              minWidth: TILE_SIZE,
              position: "absolute",
              top: tile.y,
              width: TILE_SIZE,
            }}
            width={TILE_SIZE}
          />
        ))}
      {visible &&
        points.map((point) => {
          const position = project(point.latitude, point.longitude, zoom);
          const selected = point.key === selectedKey;

          return (
            <button
              aria-label={point.label}
              aria-pressed={selected}
              key={point.key}
              onClick={() => onSelect(point.key)}
              style={{
                background: "none",
                border: 0,
                cursor: "pointer",
                height: PIN_HEIGHT,
                left: position.x - left - PIN_WIDTH / 2,
                padding: 0,
                position: "absolute",
                top: position.y - top - PIN_TIP_Y,
                transform: selected ? `scale(${SELECTED_PIN_SCALE})` : undefined,
                transformOrigin: `${PIN_WIDTH / 2}px ${PIN_TIP_Y}px`,
                width: PIN_WIDTH,
                zIndex: selected ? 2 : 1,
              }}
              title={point.label}
              type="button"
            >
              <svg aria-hidden="true" height={PIN_HEIGHT} viewBox="0 0 45 52" width={PIN_WIDTH}>
                <path
                  d="M38.6958 16.4831C38.6958 25.2934 22.7434 39.4524 22.7434 39.4524C22.7434 39.4524 6.79102 25.2934 6.79102 16.4831C6.79102 7.67288 13.9331 0.530762 22.7434 0.530762C31.5536 0.530762 38.6958 7.67288 38.6958 16.4831Z"
                  fill="#FD7B7B"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" }}
                />
              </svg>
            </button>
          );
        })}
      {visible && (
        <div style={{ position: "absolute", right: "0.625rem", top: "0.625rem", zIndex: 3 }}>
          <button
            aria-label="Zoom in"
            onClick={() => setZoomOffset((offset) => offset + 1)}
            style={controlButton}
            type="button"
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setZoomOffset((offset) => offset - 1)}
            style={{ ...controlButton, borderTop: "1px solid #e6e6e6" }}
            type="button"
          >
            −
          </button>
        </div>
      )}
      {visible && (
        <a
          href="https://www.openstreetmap.org/copyright"
          rel="noopener noreferrer"
          style={{
            background: "rgba(255,255,255,.8)",
            bottom: 0,
            color: "#333",
            fontSize: "0.625rem",
            lineHeight: "1rem",
            padding: "0 0.25rem",
            position: "absolute",
            right: 0,
            zIndex: 3,
          }}
          target="_blank"
        >
          © OpenStreetMap
        </a>
      )}
    </div>
  );
}
