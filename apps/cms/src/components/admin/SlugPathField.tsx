"use client";

import { getTranslation } from "@payloadcms/translations";
import {
  Button,
  ExternalLinkIcon,
  FieldDescription,
  FieldLabel,
  TextInput,
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useLocale,
  useServerFunctions,
  useTranslation,
} from "@payloadcms/ui";
import type { SlugFieldClientProps } from "payload";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

import { getPathFromBreadcrumbs } from "@/lib/utils/path/getPathFromBreadcrumbs";
import { getSlugPathPreview } from "@/lib/utils/path/getSlugPathPreview";
import type { Page } from "@/payload-types";

interface SlugPathFieldProps extends SlugFieldClientProps {
  /** Public site origin, resolved on the server (see `createSharedSlugField`). */
  siteUrl: string;
}

const PARENT_FIELD = "parent";

/**
 * Prefixes longer than this (in characters) no longer fit beside the input in the
 * sidebar without squeezing the editable slug, so the addon shrinks to "…/".
 */
const INLINE_PREFIX_MAX_LENGTH = 18;

const TEXT = {
  homeDescription: {
    en: "Home page: this page opens at",
    es: "Página de inicio: esta página se abre en",
  },
  loadingParent: { en: "Loading parent path…", es: "Cargando ruta del padre…" },
  openPage: { en: "Open page in a new tab", es: "Abrir página en una pestaña nueva" },
};

type ParentDoc = Partial<Pick<Page, "breadcrumbs" | "slug">>;

const getRelationId = (value: unknown): number | string | undefined => {
  if (typeof value === "number" || typeof value === "string") {
    return value === "" ? undefined : value;
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return getRelationId((value as { id: unknown }).id);
  }
  return undefined;
};

const getParentPath = (doc: ParentDoc): string | undefined =>
  getPathFromBreadcrumbs(doc.breadcrumbs) ?? doc.slug ?? undefined;

/**
 * Payload's slug field (same lock / generate behaviour) with the document's full
 * public path drawn around it: the non-editable prefix (locale, `/blog`, parent
 * pages) sits before the input, and a link in the label row opens the live URL.
 *
 * The prefix follows the unsaved form: when the editor picks another parent, that
 * parent's path is fetched from the REST API. The stored slug value is unchanged.
 */
export const SlugPathField = ({
  field,
  path,
  readOnly,
  siteUrl,
  useAsSlug,
}: SlugPathFieldProps) => {
  const { admin, label } = field;
  const fieldPath = path || field.name;
  const isReadOnly = Boolean(readOnly || admin?.readOnly);

  const { i18n, t } = useTranslation();
  const { code: locale } = useLocale();
  const {
    config: {
      routes: { api: apiRoute },
      serverURL,
    },
  } = useConfig();
  const { collectionSlug, globalSlug, initialData } = useDocumentInfo();
  const { slugify } = useServerFunctions();
  const { getData, getDataByPath } = useForm();
  const { setValue, showError, value } = useField<string>({ path: fieldPath });
  const [isLocked, setIsLocked] = useState(true);

  const parentId = getRelationId(useFormFields(([fields]) => fields[PARENT_FIELD]?.value));
  const savedParentId = getRelationId(initialData?.[PARENT_FIELD]);
  const savedParentPath =
    parentId !== undefined && parentId === savedParentId
      ? getPathFromBreadcrumbs((initialData?.breadcrumbs as Page["breadcrumbs"])?.slice(0, -1))
      : undefined;

  const parentKey = parentId === undefined ? undefined : `${parentId}:${locale}`;
  const [fetchedParent, setFetchedParent] = useState<{ key: string; path?: string }>();

  useEffect(() => {
    if (parentKey === undefined || parentId === undefined) {
      return;
    }

    const controller = new AbortController();
    const url = `${serverURL}${apiRoute}/page/${encodeURIComponent(parentId)}?depth=0&locale=${encodeURIComponent(locale)}&select[slug]=true&select[breadcrumbs]=true`;

    const loadParentPath = async () => {
      try {
        const response = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        });
        const doc: ParentDoc = response.ok ? await response.json() : {};
        setFetchedParent({ key: parentKey, path: getParentPath(doc) });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load the parent page path", error);
          setFetchedParent({ key: parentKey });
        }
      }
    };

    void loadParentPath();

    return () => controller.abort();
  }, [apiRoute, locale, parentId, parentKey, serverURL]);

  const fetchedParentPath = fetchedParent?.key === parentKey ? fetchedParent?.path : undefined;
  const parentPath = parentKey === undefined ? undefined : (fetchedParentPath ?? savedParentPath);
  const isParentLoading =
    parentKey !== undefined && fetchedParent?.key !== parentKey && savedParentPath === undefined;

  const preview = getSlugPathPreview({
    collection: collectionSlug,
    locale,
    parentPath,
    slug: value,
  });
  const prefix = isParentLoading ? `${preview.prefix}…/` : preview.prefix;
  // Hovering the prefix or the slug shows the whole path; long prefixes collapse to "…/".
  const fullPathTitle = isParentLoading ? getTranslation(TEXT.loadingParent, i18n) : preview.path;
  const isLongPrefix = prefix.length > INLINE_PREFIX_MAX_LENGTH;
  const liveUrl = value ? `${siteUrl}${preview.path}` : undefined;
  const openPageLabel = getTranslation(TEXT.openPage, i18n);

  const handleGenerate = async (event: MouseEvent) => {
    event.preventDefault();

    const formattedSlug = await slugify({
      collectionSlug,
      data: getData(),
      globalSlug,
      path,
      valueToSlugify: useAsSlug ? getDataByPath(useAsSlug) : undefined,
    });

    if (formattedSlug === null || formattedSlug === undefined) {
      setValue("");
      return;
    }

    if (value !== formattedSlug) {
      setValue(formattedSlug);
    }
  };

  const toggleLock = (event: MouseEvent) => {
    event.preventDefault();
    setIsLocked((locked) => !locked);
  };

  return (
    <div className="field-type slug-field-component slug-path-field">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`field-${fieldPath}`} label={label} />
        {liveUrl ? (
          <a
            aria-label={openPageLabel}
            className="slug-path-field__open"
            href={liveUrl}
            rel="noopener"
            target="_blank"
            title={`${openPageLabel}: ${preview.path}`}
          >
            <ExternalLinkIcon />
          </a>
        ) : null}
      </div>
      <div title={fullPathTitle}>
        <TextInput
          AfterInput={
            isReadOnly ? undefined : (
              <div className="slug-field-component__actions">
                {isLocked ? null : (
                  <Button
                    buttonStyle="none"
                    className="lock-button"
                    id={`field-${fieldPath}-generate`}
                    onClick={handleGenerate}
                  >
                    {t("authentication:generate")}
                  </Button>
                )}
                <Button
                  buttonStyle="none"
                  className="lock-button"
                  id={`field-${fieldPath}-lock`}
                  onClick={toggleLock}
                >
                  {isLocked ? t("general:unlock") : t("general:lock")}
                </Button>
              </div>
            )
          }
          BeforeInput={
            <span className="slug-path-field__prefix">{isLongPrefix ? "…/" : prefix}</span>
          }
          onChange={setValue}
          path={fieldPath}
          readOnly={isReadOnly || isLocked}
          showError={showError}
          value={value}
        />
      </div>
      {preview.isHome ? (
        <FieldDescription
          description={`${getTranslation(TEXT.homeDescription, i18n)} ${preview.path}`}
          path={fieldPath}
        />
      ) : null}
    </div>
  );
};
