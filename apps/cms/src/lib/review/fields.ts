import type { Field, Option } from "payload";

import { isAuthor, REVIEW_STATUS } from "./status";

const optionValue = (option: Option): string =>
  typeof option === "string" ? option : option.value;

export const reviewFields = (): Field[] => [
  {
    admin: {
      description: {
        en: "Set Ready for review and choose a reviewer to ask for a review. The reviewer is notified in the comments.",
        es: "Elige Listo para revisión y un revisor para pedir una revisión. El revisor recibe un aviso en los comentarios.",
      },
      position: "sidebar",
    },
    defaultValue: REVIEW_STATUS.inProgress,
    filterOptions: ({ options, req, siblingData }) =>
      isAuthor(req.user) &&
      (siblingData as { reviewStatus?: string } | undefined)?.reviewStatus !==
        REVIEW_STATUS.approved
        ? options.filter((option) => optionValue(option) !== REVIEW_STATUS.approved)
        : options,
    label: { en: "Review status", es: "Estado de revisión" },
    name: "reviewStatus",
    options: [
      { label: { en: "In progress", es: "En curso" }, value: REVIEW_STATUS.inProgress },
      {
        label: { en: "Ready for review", es: "Listo para revisión" },
        value: REVIEW_STATUS.readyForReview,
      },
      { label: { en: "Approved", es: "Aprobado" }, value: REVIEW_STATUS.approved },
    ],
    type: "select",
  },
  {
    admin: { position: "sidebar" },
    filterOptions: { role: { not_equals: "author" } },
    label: { en: "Reviewer", es: "Revisor" },
    name: "reviewer",
    relationTo: "users",
    type: "relationship",
  },
  {
    admin: {
      condition: (_data, siblingData) => Boolean(siblingData?.reviewRequestedBy),
      position: "sidebar",
      readOnly: true,
    },
    label: { en: "Review requested by", es: "Revisión solicitada por" },
    name: "reviewRequestedBy",
    relationTo: "users",
    type: "relationship",
  },
];
