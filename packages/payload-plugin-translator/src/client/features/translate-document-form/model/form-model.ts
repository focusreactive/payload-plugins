"use client";

import type { UseFormReturn } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";

import { defaultValues } from "./constants";
import type { FormInput, FormValues } from "./schema";
import { validationSchema } from "./schema";

type UseFormReturn_ = {
  form: UseFormReturn<FormValues>;
};

type UseFormProps = {
  initialValues?: FormInput;
  disabled?: boolean;
};

export const useTranslateDocumentForm = ({ initialValues, disabled }: UseFormProps = {}): UseFormReturn_ => {
  const defaultFormValues = useMemo(
    () => ({
      ...defaultValues,
      ...initialValues,
    }),
    [initialValues]
  );

  const form = useForm<FormValues>({
    defaultValues: defaultFormValues,
    // tsgo TS2589: zodResolver + computed-key zod schema causes infinite type
    // instantiation in the native TS preview. Cast to break the inference chain.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: (zodResolver as any)(validationSchema) as import("react-hook-form").Resolver<FormValues>,
    mode: "onTouched",
    disabled,
  });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    form.reset(defaultFormValues);
  }, [defaultFormValues]);

  return { form };
};
