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
  // Which collection the file is looked for in. With none, every url is simply a link we did not
  // put there — which is the branch below that already knows what to do with one.
  const { uploads } = useJsonFormConfig();
  // Relative, like UploadInput's own requests: `serverURL` is production's even on a preview.
  const api = config.routes.api;
  const filename = fileOf(url);
  // The write-back happens after a request, and by then the form may have moved on: the callback of
  // the last render rebuilds the value from what is in it now, the captured one from what was.
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
      // Not left waiting: an empty upload field can still be filled in, a shimmer cannot.
      .catch((error) => error?.name !== "AbortError" && setDoc(null));
    return () => request.abort();
  }, [api, filename, uploads]);

  // A url Media has no document for is two different situations, and they need different answers:
  // the file may still be where it points — the document was renamed, or the link was never ours —
  // or there may be nothing there at all. Only the image can say which, so it is asked.
  const stray = Boolean(url) && doc === null;
  const [reachable, setReachable] = useState<boolean | undefined>();
  // Read off the same image, so what the card says about it is measured rather than claimed.
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

  // The same wrapper, label and 62px UploadInput itself shows while it loads a document, so the
  // accordion opening onto it animates to the height it ends at.
  if (doc === undefined || (stray && reachable === undefined))
    return (
      <div className={cn("field-type upload", fault && "error")}>
        <FieldLabel label={label} path={id} required={required} />
        <ShimmerEffect height="62px" />
      </div>
    );

  // The card UploadInput draws for a file that has been chosen, less the one action with nothing to
  // act on: Edit opens a document, and there is none. Payload's own classes rather than a copy of
  // its look — `RelationshipContent` is not in the root barrel, and by subpath it is a second copy
  // of the module graph, which is where its config and translation hooks throw. What it would put
  // in the meta line is the mime type and the byte size, neither of which exists without a
  // document; the size the image reports is measured, so that is what stands there.
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
        {/* Nothing in Media by that name and nothing at the url either. The value is left where it
				    is rather than quietly dropped — said plainly instead, and a file picked replaces it. */}
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
