"use client";

import { FieldLabel, TextareaInput, TextInput, useField } from "@payloadcms/ui";
import type { ChangeEvent, ReactNode } from "react";
import { getSeoClientConfig } from "../../client-config/registry";
import { measureDescription, measureTitle } from "../../measure/measure";
import type { RangeOverride } from "../../measure/measure";
import type { SeoFieldKind } from "../../server/generate/prompts";
import { Tooltip, TooltipText, TooltipTitle } from "../../ui/Tooltip";
import { cn } from "../../utils/style";
import { AutoPublishIcon, ErrorIcon, GenerateIcon, SpinnerIcon } from "./icons";
import { Meter } from "./Meter";
import { useGenerate } from "./useGenerate";

interface SeoFieldProps {
  path: string;
  field?: {
    label?: Record<string, string> | string;
    required?: boolean;
    admin?: { description?: Record<string, string> | string };
  };
  readOnly?: boolean;
  kind: SeoFieldKind;
  showButton?: boolean;
  generateOnPublish?: boolean;
  range?: RangeOverride;
}

const GEN_BTN_CLASS = cn(
  "inline-flex items-center gap-[6px] rounded-rs border border-neutral-200 bg-transparent px-[9px] py-[4px] text-[12px] font-semibold text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-100 disabled:cursor-default disabled:text-neutral-400 cursor-pointer"
);

interface InjectedComponents {
  Label?: ReactNode;
  Description?: ReactNode;
  BeforeInput?: ReactNode;
  AfterInput?: ReactNode;
  Error?: ReactNode;
}

export function SeoField(props: SeoFieldProps) {
  const { path, field, readOnly, kind, showButton, generateOnPublish, range } = props;
  const fieldState = useField<string>({ path });
  const { value, setValue, showError } = fieldState;
  const injected: InjectedComponents =
    (fieldState as { customComponents?: InjectedComponents }).customComponents ?? {};
  const text = value ?? "";
  const measurement =
    kind === "title" ? measureTitle(text, range) : measureDescription(text, range);
  const kindLabel = kind === "title" ? "title" : "description";

  const { generate, status, error } = useGenerate({ kind, measurement, setValue });
  const enabled = getSeoClientConfig().enabled;
  const loading = status === "loading";

  const labelRow = (
    <div className="flex min-h-[26px] items-center justify-between gap-[12px] pb-[5px] [&_.field-label]:pb-0!">
      {injected.Label ?? <FieldLabel label={field?.label} path={path} required={field?.required} />}

      <span className="inline-flex items-center gap-[8px]">
        {status === "error" && (
          <Tooltip
            align="end"
            content={
              <>
                <TooltipTitle>Generation failed</TooltipTitle>
                <TooltipText>
                  {error ?? "Your text is unchanged — press Generate to try again."}
                </TooltipText>
              </>
            }
            side="bottom"
          >
            <ErrorIcon aria-label="Generation failed" className="size-[14px] text-seo-bad" />
          </Tooltip>
        )}

        {generateOnPublish && enabled && (
          <Tooltip
            align="end"
            content={
              <>
                <TooltipTitle>Generated automatically</TooltipTitle>
                <TooltipText>
                  Left empty, this {kindLabel} is generated from the page content when you publish.
                  Type a value to keep your own.
                </TooltipText>
              </>
            }
            side="bottom"
          >
            <AutoPublishIcon
              aria-label="Generated on publish"
              className="size-[14px] text-neutral-500"
            />
          </Tooltip>
        )}

        {showButton && enabled && (
          <button
            className={GEN_BTN_CLASS}
            disabled={loading || readOnly}
            onClick={generate}
            type="button"
          >
            {loading ? (
              <SpinnerIcon className="size-[14px] animate-spin" />
            ) : (
              <GenerateIcon className="size-[14px]" />
            )}

            {loading ? "Generating…" : "Generate"}
          </button>
        )}
      </span>
    </div>
  );

  const commonInputProps = {
    AfterInput: injected.AfterInput,
    BeforeInput: injected.BeforeInput,
    Description: injected.Description,
    Error: injected.Error,
    Label: labelRow,
    description: injected.Description ? undefined : field?.admin?.description,
    path,
    readOnly: loading || readOnly,
    showError,
    value: text,
  };

  return (
    <div className={cn("seo-generated-field", showError && "error")}>
      {kind === "description" ? (
        <TextareaInput
          {...commonInputProps}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
          rows={3}
        />
      ) : (
        <TextInput
          {...commonInputProps}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />
      )}

      <Meter
        hasText={text.trim().length > 0}
        kindLabel={kindLabel}
        loading={loading}
        measurement={measurement}
      />
    </div>
  );
}

export default SeoField;
