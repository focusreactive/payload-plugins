"use client";

import React, { useState } from "react";

import { ClinicMap } from "./ClinicMap";
import type { MapPoint } from "./ClinicMap";
import type { ClinicSite } from "./stateData";

interface Props {
  /** `region` is the state page's list, an accordion on phones; `index` sits in a locations group. */
  variant: "region" | "index";
  /** The original map script's key for the area, kept on `data-location`. */
  mapKey: string;
  sites: ClinicSite[];
  reviewsLabel: string;
  linkText: string;
  allLink?: { href?: string; text: string };
}

const EARTH_RADIUS_METRES = 6_371_000;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function distance(from: ClinicSite, to: ClinicSite): number {
  if (from.latitude === undefined || from.longitude === undefined) {
    return 0;
  }
  if (to.latitude === undefined || to.longitude === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * EARTH_RADIUS_METRES;
}

const mapPoints = (sites: ClinicSite[]): MapPoint[] =>
  sites.flatMap((site) =>
    site.latitude === undefined || site.longitude === undefined
      ? []
      : [{ key: site.key, label: site.name, latitude: site.latitude, longitude: site.longitude }]
  );

function SiteDetails({
  site,
  reviewsLabel,
  linkText,
}: Pick<Props, "reviewsLabel" | "linkText"> & { site: ClinicSite }) {
  return (
    <>
      {site.addressLines.length > 0 && (
        <p>
          {site.addressLines.map((line, index) => (
            <React.Fragment key={index}>
              {index > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </p>
      )}
      <div className="reviews">
        <div className="stars">
          {Array.from({ length: site.stars }, (_, star) => (
            <span key={star} />
          ))}
        </div>
        {site.reviewCount === undefined ? null : `${site.reviewCount} ${reviewsLabel}`}
      </div>
      {linkText && site.href && (
        <a className="button border small" href={site.href}>
          {linkText}
        </a>
      )}
    </>
  );
}

/**
 * A map of clinics and the list under it. Choosing a pin moves the nearest clinics to the top and
 * marks the chosen one, as the original site does; choosing it again restores the order.
 */
export function ClinicSites({ variant, mapKey, sites, reviewsLabel, linkText, allLink }: Props) {
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const anchor = sites.find((site) => site.key === anchorKey);
  const ordered = anchor
    ? sites.toSorted((first, second) => distance(anchor, first) - distance(anchor, second))
    : sites;

  const toggle = (key: string) =>
    setOpenKeys((keys) => {
      const next = new Set(keys);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });

  const select = (key: string) => {
    const next = key === anchorKey ? null : key;

    setAnchorKey(next);
    if (next) {
      setOpenKeys((keys) => new Set(keys).add(next));
    }
  };

  const map = (
    <div
      className={variant === "region" ? "map-container loaded" : "map-container"}
      data-location={mapKey}
      style={{ position: "relative" }}
    >
      <ClinicMap onSelect={select} points={mapPoints(sites)} selectedKey={anchorKey} />
    </div>
  );

  if (variant === "region") {
    return (
      <>
        {map}
        <ul className="sites">
          {ordered.map((site) => {
            const open = openKeys.has(site.key);

            return (
              <li
                className={
                  site.key === anchorKey
                    ? "accordion region-accordion selected"
                    : "accordion region-accordion"
                }
                id={`location-${site.key}`}
                key={site.key}
              >
                <button
                  aria-expanded={open}
                  className={open ? "accordion-button open" : "accordion-button"}
                  onClick={() => toggle(site.key)}
                  type="button"
                >
                  <h4>
                    <a href={site.href}>{site.name}</a>
                  </h4>
                </button>
                <div className="answer" style={open ? { display: "block" } : undefined}>
                  <SiteDetails linkText={linkText} reviewsLabel={reviewsLabel} site={site} />
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      {map}
      <div className="accordion-content">
        <ul className="sites">
          {ordered.map((site) => (
            <li
              className={site.key === anchorKey ? "selected" : undefined}
              id={`location-${site.key}`}
              key={site.key}
            >
              <h4>
                <a href={site.href}>{site.name}</a>
              </h4>
              <SiteDetails linkText={linkText} reviewsLabel={reviewsLabel} site={site} />
            </li>
          ))}
        </ul>
        {allLink?.href && allLink.text && (
          <a className="all-locations-link" href={allLink.href}>
            {allLink.text}
          </a>
        )}
      </div>
    </>
  );
}
