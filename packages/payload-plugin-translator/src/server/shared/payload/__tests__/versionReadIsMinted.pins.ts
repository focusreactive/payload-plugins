/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { CollectionConfig, SanitizedCollectionConfig } from "payload";

import { worldOfCollection } from "../worldOfCollection.js";
import type { VersionRead } from "../worldOfCollection.js";

declare const raw: CollectionConfig;
declare const registered: SanitizedCollectionConfig;

// @ts-expect-error the arguments a read hands the CMS cannot be written by hand
const _handWritten: VersionRead = { draft: true, fallbackLocale: false };

// @ts-expect-error nor forged by guessing the name of the key that marks them
const _guessedMark: VersionRead = { draft: true, fallbackLocale: false, minted: true };

export const mintedFromARawConfig: VersionRead = worldOfCollection(raw).read.latest;
export const mintedFromARegisteredConfig: VersionRead = worldOfCollection(registered).read.latest;
export const mintedFromATestLiteral: VersionRead = worldOfCollection({ versions: { drafts: true } })
  .read.latest;
