import { buildMovePlan } from "../core/move.js";
import { parseMoveRequest } from "../endpoints/request.js";
import type { ResolvedOptions } from "../types.js";
import { confirmationTokenLifetimeSeconds, issueConfirmationToken } from "./confirmationToken.js";
import {
  buildMoveQuestions,
  describeBlockedPreview,
  describeMoveChanges,
  pickExamples,
  withExpectedState,
} from "./moveChanges.js";
import { noLocaleKey } from "../core/locales.js";
import { runTool, toolRefusal } from "./toolResult.js";
import type { FoldersMcpTool, FoldersMcpToolArguments } from "./types.js";

const previewMove = ({
  input,
  options,
  req,
}: FoldersMcpToolArguments & { options: ResolvedOptions }) =>
  runTool(async () => {
    if (!req.user) {
      return toolRefusal("Sign in to preview a move.");
    }
    const requested = parseMoveRequest(req.payload, options, input);
    const request = await withExpectedState({ options, req, request: requested });
    const plan = await buildMovePlan(req, options, request, { overrideAccess: false });
    if (!plan.preview.ok) {
      return describeBlockedPreview(plan.preview.blocked, "move");
    }

    const changes = describeMoveChanges(plan);
    const examples = await pickExamples({
      changes: plan.items.flatMap((item) => item.changes),
      req,
    });
    const askUser = await buildMoveQuestions({ changes, examples, options, plan, req });
    const confirmationToken = issueConfirmationToken({
      digest: changes.digest,
      kind: "move",
      request: { ...request, redirects: plan.redirects } as unknown as Record<string, unknown>,
      secret: req.payload.secret,
      user: { collection: req.user.collection, id: req.user.id },
    });

    const lines = [changes.summary];
    if (examples.length > 0) {
      lines.push(
        "Examples:",
        ...examples.map(
          (example) =>
            `- ${example.from} becomes ${example.to}${example.locale === noLocaleKey ? "" : ` (${example.locale})`}`
        )
      );
    }
    if (askUser.length > 0) {
      lines.push("Ask the user:", ...askUser.map((question) => `- ${question}`));
    }
    lines.push(
      changes.needsConfirmation
        ? `Show the user the summary and these questions and wait for their answer. Then call applyTreeChange with confirmationToken and confirmedSummary set to the summary above, word for word.`
        : "No published URL changes, so no confirmedSummary is needed. Call applyTreeChange with confirmationToken to apply it.",
      `confirmationToken: ${confirmationToken}`,
      `The token works for ${confirmationTokenLifetimeSeconds / 60} minutes, for you only, and only for exactly this change.`
    );

    return {
      content: [{ text: lines.join("\n"), type: "text" }],
      structuredContent: {
        askUser,
        confirmationToken,
        draftOnlyPages: changes.draftOnlyPages,
        examples,
        expiresInSeconds: confirmationTokenLifetimeSeconds,
        needsConfirmation: changes.needsConfirmation,
        ok: true,
        publishedUrlChanges: changes.publishedUrlChanges,
        redirects: changes.redirects,
        summary: changes.summary,
      },
    };
  });

export const buildPreviewMoveTool = (
  options: ResolvedOptions,
  collections: string[]
): FoldersMcpTool => {
  const itemReference = {
    additionalProperties: false,
    properties: {
      collection: {
        description: "The folders collection or a page collection.",
        enum: collections,
        type: "string",
      },
      id: { type: ["integer", "string"] },
    },
    required: ["collection", "id"],
    type: "object",
  };

  return {
    access: ({ req }) => Boolean(req.user),
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
      readOnlyHint: true,
      title: "Preview moving content",
    },
    description: `Previews moving pages or folders into another folder, or putting them in a different order, and returns a confirmation token. This is the only way to move a page or folder: updateDocument cannot change folder or parent, and it answers success while it drops the value. This tool writes nothing.

A move changes the live URL of every published page it touches, in every language the page is published in. Show the user the summary and the askUser questions, and wait for their answer before you call applyTreeChange. Do not answer for them. If they do not want redirects from the old URLs, preview again with redirects set to false. If needsConfirmation is false (a reorder, or a move of pages that are drafts only), no URL changes and applyTreeChange needs only the token.

Name the target with toFolder (a folder id, or null for the top level), with position start or end, or with after, an item to land right behind. Items keep the order you give. Use browseTree to find ids. If the move is blocked (a folder into itself, a path already taken, a rule of the site) the answer says why and no token is issued. The preview only shows what your own account may do. The token works for 15 minutes, for you only, and for exactly this change.`,
    handler: ({ input, req }) =>
      previewMove({ input: input as Record<string, unknown>, options, req }),
    input: {
      additionalProperties: false,
      properties: {
        after: {
          ...itemReference,
          description: "Put the items right after this item, in its folder. Use this or toFolder.",
        },
        items: {
          description: "The pages and folders to move, as { collection, id }.",
          items: itemReference,
          minItems: 1,
          type: "array",
        },
        position: {
          description: "With toFolder: put the items at the start or at the end. Default start.",
          enum: ["start", "end"],
          type: "string",
        },
        redirects: {
          description:
            "Redirect the old URLs to the new ones. Default is the site's setting, normally true. Set false only when the user said so.",
          type: "boolean",
        },
        toFolder: {
          description: "The id of the folder to move into. null is the top level.",
          type: ["integer", "string", "null"],
        },
      },
      required: ["items"],
      type: "object",
    },
  };
};
