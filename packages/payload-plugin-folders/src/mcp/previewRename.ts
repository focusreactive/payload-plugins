import type { PayloadRequest } from "payload";

import { findRefusedChecks, findUnreadableItems } from "../core/access.js";
import { buildFolderEditPlan } from "../core/folderPreview.js";
import type { FolderEditPlan } from "../core/folderPreview.js";
import { readFolderRecord } from "../core/folderRecords.js";
import type { FolderRecord } from "../core/folderRecords.js";
import {
  effectiveSegment,
  getDefaultLocaleKey,
  getFolderLocaleKeys,
  noLocaleKey,
} from "../core/locales.js";
import type { MoveBlock } from "../core/move.js";
import { slugify } from "../core/slugify.js";
import { folderPathIn } from "../core/uniqueness.js";
import { parseId } from "../endpoints/request.js";
import type { FolderId, ResolvedOptions } from "../types.js";
import { confirmationTokenLifetimeSeconds, issueConfirmationToken } from "./confirmationToken.js";
import {
  describeBlockedPreview,
  exampleSentence,
  joinWords,
  pluralize,
  pickExamples,
} from "./moveChanges.js";
import type { UrlChange } from "./moveChanges.js";
import { languageName, readLocaleValues } from "./locales.js";
import { describeRenameChanges, pickStored } from "./renameChanges.js";
import type { RenameChanges, RenameRequest } from "./renameChanges.js";
import { runTool, toolRefusal } from "./toolResult.js";
import type { FoldersMcpTool, FoldersMcpToolArguments } from "./types.js";

type FolderKeys = { defaultKey: string; keys: string[] };

type PlannedRename = {
  changes: RenameChanges;
  examples: UrlChange[];
  plan: FolderEditPlan;
  request: RenameRequest;
  token: string;
};

const nameOf = (stored: FolderRecord, key: string, defaultKey: string): string =>
  stored.name[key] || stored.name[defaultKey] || "";

const toRequest = ({
  folder,
  name,
  redirects,
  slug,
  stored,
}: {
  folder: FolderId;
  name: Record<string, string>;
  redirects: boolean;
  slug: Record<string, string>;
  stored: FolderRecord;
}): RenameRequest => ({
  expected: {
    name: pickStored(stored.name, Object.keys(name)),
    slug: pickStored(stored.slug, Object.keys(slug)),
  },
  folder,
  name,
  redirects,
  slug,
});

const planRename = async ({
  options,
  req,
  request,
  stored,
}: {
  options: ResolvedOptions;
  req: PayloadRequest;
  request: RenameRequest;
  stored: FolderRecord;
}): Promise<FolderEditPlan> => {
  if (Object.keys(request.slug).length > 0) {
    return buildFolderEditPlan(
      req,
      { folder: request.folder, redirects: request.redirects, slugs: request.slug },
      { overrideAccess: false }
    );
  }

  // A name change moves no URL, so the folder edit plan has nothing to check; the save still asks
  // the folder's update access, and the preview should say so before the user is asked.
  const refused = await findRefusedChecks({
    checks: [
      {
        collection: options.folders.slug,
        data: { name: request.name },
        id: stored.id,
        key: "update",
        operation: "update",
      },
    ],
    req,
  });
  const blocked: MoveBlock[] = refused.has("update")
    ? [
        {
          item: { collection: options.folders.slug, id: stored.id },
          message: "You are not allowed to change this folder",
          reason: "forbidden",
        },
      ]
    : [];

  return {
    changes: [],
    preview: {
      blocked,
      droppedItems: [],
      foldersRewritten: 0,
      mirrorRowsToWrite: 0,
      ok: blocked.length === 0,
      orderKeys: {},
      redirectRowsToWrite: 0,
      samples: [],
      targetFolderId: stored.parent,
      urlChanges: { draftOnly: 0, published: 0, publishedAcrossLocales: 0 },
      warnings: [],
    },
    redirects: request.redirects,
  };
};

const describeOption = (planned: PlannedRename) => ({
  confirmationToken: planned.token,
  draftOnlyPages: planned.changes.draftOnlyPages,
  examples: planned.examples,
  needsConfirmation: planned.changes.needsConfirmation,
  publishedUrlChanges: planned.changes.publishedUrlChanges,
  redirects: planned.changes.redirects,
  summary: planned.changes.summary,
});

const folderPathSentence = ({
  changes,
  folder,
  foldersSlug,
  isLocalized,
}: {
  changes: FolderEditPlan["changes"];
  folder: FolderId;
  foldersSlug: string;
  isLocalized: boolean;
}): string =>
  changes
    .filter(
      (change) =>
        change.kind === "folder" &&
        change.collection === foldersSlug &&
        String(change.id) === String(folder) &&
        change.from !== null &&
        change.to !== null
    )
    .slice(0, 3)
    .map(
      (change) =>
        `${change.from} becomes ${change.to}${isLocalized && change.locale ? ` (${change.locale})` : ""}`
    )
    .join("; ");

const languagesSentence = (byLocale: Record<string, number>): string => {
  const languages = Object.keys(byLocale).filter((key) => key !== noLocaleKey);

  return languages.length > 0 ? ` in ${joinWords(languages.map((key) => languageName(key)))}` : "";
};

const urlsLabel = (count: number): string => `live ${pluralize(count, "URL", "URLs")}`;

const buildQuestions = ({
  alsoChangeUrl,
  asked,
  folderKeys,
  options,
  req,
  stored,
  touchedKeys,
}: {
  alsoChangeUrl: PlannedRename | null;
  asked: PlannedRename;
  folderKeys: FolderKeys;
  options: ResolvedOptions;
  req: PayloadRequest;
  stored: FolderRecord;
  touchedKeys: Set<string>;
}): string[] => {
  const questions: string[] = [];
  const isLocalized = !(folderKeys.keys.length === 1 && folderKeys.keys[0] === noLocaleKey);
  const title = nameOf(stored, folderKeys.defaultKey, folderKeys.defaultKey);

  if (asked.changes.needsConfirmation) {
    const { total, byLocale } = asked.changes.publishedUrlChanges;
    questions.push(
      `Renaming "${title}" changes ${total} ${urlsLabel(total)}${languagesSentence(byLocale)}.${exampleSentence(asked.examples, isLocalized)} Go ahead?`
    );
    if (asked.plan.redirects) {
      questions.push(
        "Redirect the old URLs to the new ones? (recommended) It is on in this preview. If the user says no, preview again with redirects set to false."
      );
    }
  }

  if (alsoChangeUrl) {
    const { total, byLocale } = alsoChangeUrl.changes.publishedUrlChanges;
    const paths = folderPathSentence({
      changes: alsoChangeUrl.plan.changes,
      folder: stored.id,
      foldersSlug: options.folders.slug,
      isLocalized,
    });
    questions.push(
      total > 0
        ? `Change only the name, or the URL too (${paths}, which changes ${total} ${urlsLabel(total)}${languagesSentence(byLocale)})?`
        : `Change only the name, or the URL too (${paths})? No live URL would change.`
    );
  }

  for (const key of folderKeys.keys) {
    if (key === noLocaleKey || touchedKeys.has(key) || (!stored.name[key] && !stored.slug[key])) {
      continue;
    }
    const language = languageName(key);
    questions.push(
      `The ${language} name stays ${nameOf(stored, key, folderKeys.defaultKey)} and the ${language} URLs stay ${folderPathIn(stored, key, options, req.payload)}. Rename those too?`
    );
  }

  return questions;
};

const describeCurrent = ({
  folderKeys,
  options,
  req,
  stored,
}: {
  folderKeys: FolderKeys;
  options: ResolvedOptions;
  req: PayloadRequest;
  stored: FolderRecord;
}) => ({
  fallingBack: folderKeys.keys.filter(
    (key) => key !== folderKeys.defaultKey && !stored.name[key] && !stored.slug[key]
  ),
  fullPath: Object.fromEntries(
    folderKeys.keys.map((key) => [key, folderPathIn(stored, key, options, req.payload)])
  ),
  id: stored.id,
  name: Object.fromEntries(
    folderKeys.keys.map((key) => [key, nameOf(stored, key, folderKeys.defaultKey)])
  ),
  slug: Object.fromEntries(
    folderKeys.keys.map((key) => [key, effectiveSegment(stored.slug, key, folderKeys.defaultKey)])
  ),
});

const previewRename = ({
  input,
  options,
  req,
}: FoldersMcpToolArguments & { options: ResolvedOptions }) =>
  runTool(async () => {
    if (!req.user) {
      return toolRefusal("Sign in to preview a rename.");
    }
    if (input.parent !== undefined) {
      return toolRefusal(
        "previewRename changes a folder's name and URL segment only. A folder's parent changes with a move. Use previewMove, then applyTreeChange. Nothing was changed."
      );
    }
    const { payload } = req;
    const folderKeys: FolderKeys = {
      defaultKey: getDefaultLocaleKey(payload, options),
      keys: getFolderLocaleKeys(payload, options),
    };
    const folder = parseId(payload, options.folders.slug, input.folder, "folder");
    const requestedNames = readLocaleValues({
      field: "name",
      keys: folderKeys.keys,
      value: input.name,
    });
    const requestedSlugs = readLocaleValues({
      field: "slug",
      keys: folderKeys.keys,
      value: input.slug,
    });
    if (Object.keys(requestedNames).length === 0 && Object.keys(requestedSlugs).length === 0) {
      return toolRefusal(
        "Pass name, slug or both, one text per language. Ask the user what the folder should be called, and whether its URL should change too."
      );
    }

    const stored = await readFolderRecord(req, options, folder);
    const unreadable = stored
      ? await findUnreadableItems({
          items: [{ collection: options.folders.slug, id: folder }],
          req,
        })
      : [];
    if (!stored || unreadable.length > 0) {
      return toolRefusal(
        `Folder ${String(folder)} was not found. Use browseTree to find folder ids.`
      );
    }

    const effectiveSlugOf = (key: string): string =>
      effectiveSegment(stored.slug, key, folderKeys.defaultKey);
    const name = Object.fromEntries(
      Object.entries(requestedNames).filter(([key, text]) => text !== (stored.name[key] || null))
    );
    const slug = Object.fromEntries(
      Object.entries(requestedSlugs).filter(([key, text]) => text !== effectiveSlugOf(key))
    );
    if (Object.keys(name).length === 0 && Object.keys(slug).length === 0) {
      return {
        content: [
          {
            text: "Nothing to change: the folder already has this name and URL segment. No confirmation token was issued.",
            type: "text",
          },
        ],
        structuredContent: { nothingToChange: true, ok: true },
      };
    }

    const redirects =
      typeof input.redirects === "boolean" ? input.redirects : options.redirects.enabled;
    const secret = payload.secret;
    const user = { collection: req.user.collection, id: req.user.id };

    const planOne = async (request: RenameRequest): Promise<PlannedRename> => {
      const plan = await planRename({ options, req, request, stored });
      const changes = describeRenameChanges({ keys: folderKeys.keys, plan, request });

      return {
        changes,
        examples: plan.preview.ok ? await pickExamples({ changes: plan.changes, req }) : [],
        plan,
        request,
        token: plan.preview.ok
          ? issueConfirmationToken({
              digest: changes.digest,
              kind: "rename",
              request: request as unknown as Record<string, unknown>,
              secret,
              user,
            })
          : "",
      };
    };

    const asked = await planOne(toRequest({ folder, name, redirects, slug, stored }));
    if (!asked.plan.preview.ok) {
      return describeBlockedPreview(asked.plan.preview.blocked, "rename");
    }

    const derivedSlug: Record<string, string> = {};
    for (const key of Object.keys(name)) {
      if (key in requestedSlugs) {
        continue;
      }
      const derived = slugify(name[key], key);
      if (derived !== "" && derived !== effectiveSlugOf(key)) {
        derivedSlug[key] = derived;
      }
    }
    const alsoChangeUrl =
      Object.keys(derivedSlug).length > 0
        ? await planOne(
            toRequest({ folder, name, redirects, slug: { ...slug, ...derivedSlug }, stored })
          )
        : null;
    const offeredUrlChange = alsoChangeUrl?.plan.preview.ok ? alsoChangeUrl : null;

    const touchedKeys = new Set([
      ...Object.keys(name),
      ...Object.keys(slug),
      ...Object.keys(derivedSlug),
    ]);
    const askUser = buildQuestions({
      alsoChangeUrl: offeredUrlChange,
      asked,
      folderKeys,
      options,
      req,
      stored,
      touchedKeys,
    });
    if (alsoChangeUrl && !offeredUrlChange) {
      const reasons = [
        ...new Set(alsoChangeUrl.plan.preview.blocked.map(({ message }) => message)),
      ].join(". ");
      askUser.push(
        `The URL cannot follow the new name: ${reasons}. Tell the user, and ask for a different URL segment if they want the URL changed.`
      );
    }

    const askedStructure = { ...describeOption(asked), name, slug };
    const alsoStructure = alsoChangeUrl
      ? offeredUrlChange
        ? { ...describeOption(offeredUrlChange), slug: offeredUrlChange.request.slug }
        : {
            blocked: alsoChangeUrl.plan.preview.blocked.map(({ locale, message }) => ({
              ...(locale === undefined ? {} : { locale }),
              message,
            })),
            ok: false,
            slug: alsoChangeUrl.request.slug,
          }
      : null;

    const lines = [
      `Folder ${String(folder)} "${nameOf(stored, folderKeys.defaultKey, folderKeys.defaultKey)}".`,
    ];
    const optionLine = (label: string, planned: PlannedRename): string[] => [
      `${label}: ${planned.changes.summary}`,
      ...(planned.examples.length > 0
        ? planned.examples.map(
            (example) =>
              `- ${example.from} becomes ${example.to}${example.locale === noLocaleKey ? "" : ` (${example.locale})`}`
          )
        : []),
      planned.changes.needsConfirmation
        ? `confirmationToken (confirmedSummary is needed, word for word): ${planned.token}`
        : `confirmationToken (no confirmedSummary needed): ${planned.token}`,
    ];
    lines.push(...optionLine("As asked", asked));
    if (offeredUrlChange) {
      lines.push(...optionLine("With the URL changed too", offeredUrlChange));
    }
    if (askUser.length > 0) {
      lines.push("Ask the user:", ...askUser.map((question) => `- ${question}`));
    }
    lines.push(
      "Show the user the options and the questions, wait for their answer, then call applyTreeChange with the token of the option they chose. Do not choose for them.",
      `Each token works for ${confirmationTokenLifetimeSeconds / 60} minutes, for you only, and only for exactly that change.`
    );

    return {
      content: [{ text: lines.join("\n"), type: "text" }],
      structuredContent: {
        askUser,
        asked: askedStructure,
        ...(alsoStructure ? { alsoChangeUrl: alsoStructure } : {}),
        expiresInSeconds: confirmationTokenLifetimeSeconds,
        folder: describeCurrent({ folderKeys, options, req, stored }),
        ok: true,
      },
    };
  });

export const buildPreviewRenameTool = (
  options: ResolvedOptions,
  folderKeys: FolderKeys
): FoldersMcpTool => {
  const textPerLanguage = Object.fromEntries(
    folderKeys.keys.map((key) => [key, { type: "string" }])
  );

  return {
    access: ({ req }) => Boolean(req.user),
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
      readOnlyHint: true,
      title: "Preview renaming a folder",
    },
    description: `Previews renaming a folder and returns confirmation tokens. This tool writes nothing. Use it when the user asks to rename a folder. A folder slug cannot be changed with updateDocument; this and applyTreeChange are the way.

"Rename" can mean two things, and you must not pick one for the user. Changing the name changes only the label in the tree and the admin. Changing the slug changes the URL segment, and with it the live URL of every published page beneath the folder, in every language the page is published in. Pass name for the label, slug for the URL segment, or both, one text per language. When you pass name without slug, the answer has asked (the name alone, no URL change) and alsoChangeUrl (the URL made from the new name, with how many live pages change URL, example URLs and its own token). It also shows the folder's name, slug and URL in every language and asks about the languages you did not name, because a language keeps its own name and URL unless the user says to rename it too.

Show the user the summary, the examples and the askUser questions, and wait for their answer. Do not answer for them. Then call applyTreeChange with the token of the option they chose, and confirmedSummary when that option's needsConfirmation is true. If they do not want redirects from the old URLs, preview again with redirects set to false. To move a folder, use previewMove: a parent change is refused here. If the new URL is taken or a rule of the site forbids it, the answer says why and no token is issued. The preview only shows what your own account may do, and renaming a folder with live pages needs publish rights. Each token works for 15 minutes, for you only, and for exactly that change.`,
    handler: ({ input, req }) =>
      previewRename({ input: input as Record<string, unknown>, options, req }),
    input: {
      additionalProperties: false,
      properties: {
        folder: {
          description: "The id of the folder to rename. Use browseTree to find it.",
          type: ["integer", "string"],
        },
        name: {
          additionalProperties: false,
          description:
            "The new name, one text per language. A language left out keeps its own name, or keeps showing the default language's.",
          properties: textPerLanguage,
          type: "object",
        },
        parent: {
          description: "Not supported here: a folder's parent changes with previewMove.",
          type: ["integer", "string", "null"],
        },
        redirects: {
          description:
            "Redirect the old URLs to the new ones. Default is the site's setting, normally true. Set false only when the user said so.",
          type: "boolean",
        },
        slug: {
          additionalProperties: false,
          description:
            "The new URL segment, one per language, lowercase letters, digits and hyphens. Leave out to keep the URL, or to get the option that makes it from the name.",
          properties: textPerLanguage,
          type: "object",
        },
      },
      required: ["folder"],
      type: "object",
    },
  };
};
