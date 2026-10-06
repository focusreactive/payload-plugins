"use client";

import { clsx as cn } from "clsx";
import { useEffect, useRef, useState } from "react";
import {
  BulkUploadProvider,
  Button,
  FieldLabel,
  ShimmerEffect,
  Thumbnail,
  UploadInput,
  useConfig,
} from "@payloadcms/ui";
import { useJsonFormConfig } from "../useJsonFormConfig.js";

// A url can hold a stray `%`, which `decodeURIComponent` throws on — in render that is the whole
// edit view gone.
const fileOf = (url: string) => {
  const name = url.split("/").pop()?.split("?")[0] ?? "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

export const JsonMediaInput = ({
  fault,
  id,
  label,
  url,
  onChange,
  readOnly,
  required,
}: {
  fault?: string;
  id: string;
  label: string;
  url: string;
  onChange: (url: string) => void;
  readOnly?: boolean;
  required?: boolean;
}) => {
  const { config } = useConfig();
  const { uploads } = useJsonFormConfig();
  // Relative, like UploadInput's own requests: `serverURL` is production's even on a preview.
  const api = config.routes.api;
  const filename = fileOf(url);
  const latest = useRef(onChange);
  latest.current = onChange;
  const [doc, setDoc] = useState<number | string | null | undefined>(filename ? undefined : null);

  useEffect(() => {
    if (!(filename && uploads)) return setDoc(null);
    const request = new AbortController();
    fetch(
      `${api}/${uploads}?where[filename][equals]=${encodeURIComponent(filename)}&limit=1&depth=0`,
      { credentials: "include", signal: request.signal }
    )
      .then((res) => res.json())
      .then(({ docs }) => setDoc(docs?.[0]?.id ?? null))
      .catch((error) => error?.name !== "AbortError" && setDoc(null));
    return () => request.abort();
  }, [api, filename, uploads]);

  const stray = Boolean(url) && doc === null;
  const [reachable, setReachable] = useState<boolean | undefined>();
  const [measured, setMeasured] = useState<{ height: number; width: number } | null>(null);

  useEffect(() => {
    if (!stray) {
      setMeasured(null);
      return setReachable(undefined);
    }
    setReachable(undefined);
    const image = new Image();
    const measure = () => {
      setMeasured({ height: image.naturalHeight, width: image.naturalWidth });
      setReachable(true);
    };
    const gone = () => setReachable(false);
    image.addEventListener("load", measure);
    image.addEventListener("error", gone);
    image.src = url;
    return () => {
      image.removeEventListener("load", measure);
      image.removeEventListener("error", gone);
    };
  }, [stray, url]);

  const pick = async (next?: number | string | null) => {
    const before = doc;
    setDoc(next ?? null);
    if (!next) return latest.current("");
    const picked = await fetch(`${api}/${uploads}/${next}?depth=0`, { credentials: "include" })
      .then((res) => res.json())
      .catch(() => null);
    if (picked?.url) latest.current(picked.url);
    else setDoc(before);
  };

  if (doc === undefined || (stray && reachable === undefined))
    return (
      <div className={cn("field-type upload", fault && "error")}>
        <FieldLabel label={label} path={id} required={required} />
        <ShimmerEffect height="62px" />
      </div>
    );

  if (stray && reachable)
    return (
      <div className={cn("field-type upload", fault && "error")}>
        <FieldLabel label={label} path={id} required={required} />
        <div className="upload-field-card upload-field-card--size-medium">
          <div className="upload-relationship-details">
            <div className="upload-relationship-details__imageAndDetails">
              <Thumbnail
                className="upload-relationship-details__thumbnail"
                fileSrc={url}
                size="small"
              />
              <div className="upload-relationship-details__details">
                <p className="upload-relationship-details__filename">
                  <a href={url} rel="noopener noreferrer" target="_blank">
                    {filename}
                  </a>
                </p>
                <p className="upload-relationship-details__meta">
                  {measured
                    ? `${measured.width}x${measured.height} · not in ${uploads}`
                    : `not in ${uploads}`}
                </p>
              </div>
            </div>
            {readOnly ? null : (
              <div className="upload-relationship-details__actions">
                <Button
                  buttonStyle="icon-label"
                  className="upload-relationship-details__remove"
                  icon="x"
                  iconStyle="none"
                  onClick={() => latest.current("")}
                />
              </div>
            )}
          </div>
        </div>
        {fault ? <p className="json-form__fault">{fault}</p> : null}
      </div>
    );

  return (
    <BulkUploadProvider drawerSlugPrefix={id}>
      <div className={cn("field-type upload", fault && "error")}>
        <UploadInput
          allowCreate
          api={api}
          label={label}
          onChange={pick}
          path={id}
          readOnly={readOnly}
          relationTo={uploads || "media"}
          required={required}
          serverURL={config.serverURL}
          value={doc ?? undefined}
        />
        {stray ? (
          <p className="json-form__fault">
            {`No file at this link, and none in ${uploads} by that name. It is still stored — pick one to replace it.`}
          </p>
        ) : null}
        {fault ? <p className="json-form__fault">{fault}</p> : null}
      </div>
    </BulkUploadProvider>
  );
};
