"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

import { defaultValues } from "./constants";
import type { FormInput, FormValues } from "./schema";
import { validationSchema } from "./schema";

interface UseFormReturn_ {
  form: UseFormReturn<FormValues>;
}

interface UseFormProps {
  initialValues?: FormInput;
  disabled?: boolean;
}

export const useTranslateDocumentForm = ({
  initialValues,
  disabled,
}: UseFormProps = {}): UseFormReturn_ => {
  const defaultFormValues = useMemo(
    () => ({
      ...defaultValues,
      ...initialValues,
    }),
    [initialValues]
  );

  const form = useForm<FormValues>({
    defaultValues: defaultFormValues,
    disabled,
    mode: "onTouched",
    resolver: zodResolver(validationSchema),
  });

  useEffect(() => {
    form.reset(defaultFormValues);
  }, [defaultFormValues, form, form.reset]);

  return { form };
};
