import type {
  GlobalBeforeChangeHook,
  GlobalBeforeOperationHook,
  GlobalConfig,
  PayloadRequest,
} from "payload";
import { GLOBALS_NAMESPACE } from "../constants";
import { pushOpFlags, takeOpFlags } from "../core/requestState";
import { flagsOfSave } from "../core/saveFlags";
import type { OpFlags, SaveArgs } from "../core/saveFlags";
import {
  closeMainGlobalCapture,
  openMainGlobalCapture,
  takeCapturedMainGlobal,
} from "../db/mainGlobalCapture";
import type { CapturedMainGlobal } from "../db/mainGlobalCapture";
import { failOpen } from "../utils/failOpen";
import { hasAutosave } from "../utils/versions";

export type FinishedGlobalSave = { flags: OpFlags; mainGlobal?: CapturedMainGlobal };

const capturesMainGlobal = (flags: OpFlags): boolean =>
  flags.source === "operation" && !flags.restore;

export function trackGlobalOperations(global: GlobalConfig) {
  const slug = global.slug;
  const autosaveEnabled = hasAutosave(global.versions);

  const trackOperation = ({ args, operation, req }: Parameters<GlobalBeforeOperationHook>[0]) => {
    if (operation !== "update" && operation !== "restoreVersion") return;
    if (operation === "update") openMainGlobalCapture(req, slug);
    const savedIn = { locale: req.locale, fallbackLocale: req.fallbackLocale };
    const flags = flagsOfSave(operation, (args ?? {}) as SaveArgs, autosaveEnabled, savedIn);
    pushOpFlags(req, GLOBALS_NAMESPACE, slug, flags);
  };

  const beforeOperation: GlobalBeforeOperationHook = async (args) => {
    await failOpen(args.req.payload, "could not track the global operation", () =>
      trackOperation(args)
    );
  };

  const beforeChange: GlobalBeforeChangeHook = async ({ data, req }) => {
    await failOpen(req.payload, "could not track the global change", () =>
      closeMainGlobalCapture(req, slug)
    );
    return data;
  };

  const finishSave = (req: PayloadRequest): FinishedGlobalSave => {
    const flags = takeOpFlags(req, GLOBALS_NAMESPACE, slug);
    return {
      flags,
      mainGlobal: capturesMainGlobal(flags) ? takeCapturedMainGlobal(req, slug) : undefined,
    };
  };

  return { beforeOperation, beforeChange, finishSave };
}
