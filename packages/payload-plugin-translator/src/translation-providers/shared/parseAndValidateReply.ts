import { isObject } from "../../core/kernel/utils/isObject.js";
import { KeySetMismatchError, UnparseableReplyError } from "./errors/index.js";
import { SECTION_NAMES, emptySections, indexOfKey } from "./wire/index.js";
import type { Sections } from "./wire/index.js";

type Harvest = {
  kept: Sections;
  keysAsked: number;
  keysPresentInReply: number;
  stringValuesKept: number;
  missing: Set<number>;
  unrequested: string[];
};

function asObject(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new UnparseableReplyError("The provider's reply was not valid JSON.", { cause });
  }

  if (!isObject(parsed) || Array.isArray(parsed)) {
    throw new UnparseableReplyError("The provider's reply was JSON, but not an object.");
  }

  return parsed;
}

function harvest(sent: Sections, parsed: Record<string, unknown>): Harvest {
  const kept = emptySections();
  const missing = new Set<number>();
  const unrequested = Object.keys(parsed).filter(
    (key) => !(SECTION_NAMES as readonly string[]).includes(key)
  );
  let keysAsked = 0;
  let keysPresentInReply = 0;
  let stringValuesKept = 0;

  for (const name of SECTION_NAMES) {
    const answer = parsed[name];
    const section = isObject(answer) ? answer : {};
    const askedKeys = new Set(Object.keys(sent[name]));

    for (const key of askedKeys) {
      keysAsked += 1;
      if (Object.hasOwn(section, key)) keysPresentInReply += 1;

      const value = section[key];
      if (typeof value === "string") {
        kept[name][key] = value;
        stringValuesKept += 1;
      } else {
        missing.add(indexOfKey(key));
      }
    }

    unrequested.push(...Object.keys(section).filter((key) => !askedKeys.has(key)));
  }

  return { kept, keysAsked, keysPresentInReply, stringValuesKept, missing, unrequested };
}

function refuseIfNothingKept(harvested: Harvest): void {
  if (harvested.keysAsked === 0 || harvested.stringValuesKept > 0) return;

  throw new KeySetMismatchError(
    harvested.keysPresentInReply > 0
      ? `The provider's reply carried the requested keys, but none of the ${harvested.keysAsked} values was a string.`
      : `The provider's reply answered none of the ${harvested.keysAsked} requested keys.`,
    [...harvested.missing],
    harvested.unrequested
  );
}

/** A partial reply is returned; only one answering none of the sent keys throws {@link KeySetMismatchError}. */
export function parseAndValidateReply(sent: Sections, raw: string): Sections {
  const parsed = asObject(raw);
  const harvested = harvest(sent, parsed);

  refuseIfNothingKept(harvested);

  return harvested.kept;
}
