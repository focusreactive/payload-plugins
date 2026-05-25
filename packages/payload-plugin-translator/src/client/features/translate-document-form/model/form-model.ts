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
    resolver: zodResolver(validationSchema),
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
