import type { TextareaField, TextField } from "payload";
import { getComponentPath } from "../utils/config/getComponentPath";
import { makeGenerateOnPublishHook } from "./onPublishHook";
import type { RangeOverride } from "../measure/measure";
import type { SeoFieldKind } from "../server/generate/prompts";

export interface SeoTextFieldOptions {
  name: string;
  kind: SeoFieldKind;
  label?: TextField["label"];
  required?: boolean;
  localized?: boolean;
  admin?: TextField["admin"];
  /** Show the manual Generate button.
   * @default false
   */
  showButton?: boolean;
  /** Generate on publish when the field is empty
   * @default false
   */
  generateOnPublish?: boolean;
  /** Length range override in the kind's unit (px for title, chars for description). */
  range?: RangeOverride;
}

export function seoTextField(options: SeoTextFieldOptions): TextField | TextareaField {
  const { name, kind, label, required, localized, admin, range } = options;
  const showButton = options.showButton ?? false;
  const generateOnPublish = options.generateOnPublish ?? false;

  const common = {
    name,
    ...(label === undefined ? {} : { label }),
    ...(required === undefined ? {} : { required }),
    ...(localized === undefined ? {} : { localized }),
    admin: {
      ...admin,
      components: {
        ...admin?.components,
        Field: {
          path: getComponentPath("components/SeoField", "SeoField"),
          clientProps: {
            kind,
            showButton,
            generateOnPublish,
            range,
          },
        },
      },
    },
  };

  const field: TextField | TextareaField =
    kind === "description"
      ? ({ ...common, type: "textarea" } as TextareaField)
      : ({ ...common, type: "text" } as TextField);

  if (generateOnPublish) {
    field.hooks = {
      ...field.hooks,
      beforeChange: [
        ...(field.hooks?.beforeChange ?? []),
        makeGenerateOnPublishHook({ kind, range }),
      ],
    };
  }

  return field;
}
