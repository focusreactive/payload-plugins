import type { IssueItem, PathDrift, SegmentDrift, TreeIssue } from "../../core/treeIssues.js";
import type { Translate } from "../compat.js";

/** Items a line names before it counts the rest. */
const namedItemLimit = 5;

type ItemKind = "folder" | "page";

/** "Folder "Docs"" or "Page 12": the title when the full pass could read it, else the id. */
const itemLabel = (item: IssueItem, fallbackKind: ItemKind, translate: Translate): string => {
  const id = String(item.id);
  const title = item.title ?? null;
  if ((item.kind ?? fallbackKind) === "folder") {
    return title === null
      ? translate("repairItemFolderUntitled", { id })
      : translate("repairItemFolder", { title });
  }

  return title === null
    ? translate("repairItemPageUntitled", { id })
    : translate("repairItemPage", { title });
};

const itemList = (items: IssueItem[], count: number, translate: Translate): string => {
  const named = items.slice(0, namedItemLimit).map((item) => itemLabel(item, "page", translate));
  const leftOut = count - named.length;

  return leftOut > 0
    ? `${named.join(", ")}, ${translate("repairMore", { count: leftOut })}`
    : named.join(", ");
};

const localeSuffix = (locale: string | null, translate: Translate): string =>
  locale === null ? "" : translate("repairLocaleSuffix", { locale });

const valueOrNone = (value: string | null, translate: Translate): string =>
  value === null || value === "" ? translate("repairNone") : value;

/** One clause per drifted locale, so a folder that is wrong in two languages says both. */
const pathDrifts = (drifts: PathDrift[], translate: Translate): string =>
  drifts
    .map((drift) => {
      const values = {
        expected: drift.expected,
        stored: valueOrNone(drift.stored, translate),
      };

      return drift.locale === null
        ? translate("repairDriftHoldsPlain", values)
        : translate("repairDriftHolds", { ...values, locale: drift.locale });
    })
    .join("; ");

const segmentDrifts = (drifts: SegmentDrift[], translate: Translate): string =>
  drifts
    .map((drift) => {
      const values = {
        expected: valueOrNone(drift.expected, translate),
        stored: valueOrNone(drift.stored, translate),
      };

      return drift.locale === null
        ? translate("repairSegmentDriftPlain", values)
        : translate("repairSegmentDrift", { ...values, locale: drift.locale });
    })
    .join("; ");

const folderPlace = (
  id: number | string | null,
  title: string | null | undefined,
  translate: Translate
): string => {
  if (id === null) {
    return translate("repairPlaceTopLevel");
  }

  return title
    ? translate("repairPlaceFolder", { title })
    : translate("repairPlaceFolderUntitled", { id: String(id) });
};

const staleFieldNames = {
  folder: "repairFieldFolder",
  orderKey: "repairFieldOrderKey",
  structureRevision: "repairFieldRevision",
} as const;

/**
 * The sentence the Rebuild dialog shows for one issue, in the admin's language. The server's own
 * `message` is English and names items by id, which is right for a log; the dialog builds its line
 * from the issue's facts (the item's title, every drifted locale, who claims a duplicate path).
 */
export const describeIssue = (issue: TreeIssue, translate: Translate): string => {
  switch (issue.kind) {
    case "folderPath": {
      const item = itemLabel(issue.item, "folder", translate);
      if (issue.fullPath.length === 0) {
        return translate("repairIssueFolderStale", { item, path: issue.path });
      }

      return translate(issue.fixable ? "repairIssueFolderPath" : "repairIssueFolderPathHeld", {
        drifts: pathDrifts(issue.fullPath, translate),
        item,
      });
    }
    case "folderCycle": {
      const item = itemLabel(issue.item, "folder", translate);

      return issue.reservedSegment === undefined
        ? translate("repairIssueFolderCycle", { count: issue.folders.length, item })
        : translate("repairIssueFolderCycleReserved", {
            count: issue.folders.length,
            item,
            segment: issue.reservedSegment,
          });
    }
    case "folderParentMissing": {
      const item = itemLabel(issue.item, "folder", translate);

      return issue.reservedSegment === undefined
        ? translate("repairIssueFolderParentMissing", { item })
        : translate("repairIssueFolderParentMissingReserved", {
            item,
            segment: issue.reservedSegment,
          });
    }
    case "folderSlugMissing": {
      return translate("repairIssueFolderSlugMissing", {
        item: itemLabel(issue.item, "folder", translate),
      });
    }
    case "pageSegment": {
      return translate(issue.fixable ? "repairIssuePageSegment" : "repairIssuePageSegmentHeld", {
        drifts: segmentDrifts(issue.segments, translate),
        item: itemLabel(issue.item, "page", translate),
      });
    }
    case "invalidSegment": {
      const item = itemLabel(issue.item, "page", translate);
      const line =
        issue.fixable && issue.fixedSegment !== null
          ? translate("repairIssueInvalidSegmentFixed", {
              fixed: issue.fixedSegment,
              item,
              segment: issue.segment,
            })
          : translate("repairIssueInvalidSegment", { item, segment: issue.segment });

      return `${line}${localeSuffix(issue.locale, translate)}`;
    }
    case "duplicatePath": {
      return `${translate("repairIssueDuplicate", {
        count: issue.count,
        items: itemList(issue.items, issue.count, translate),
        path: issue.path,
      })}${localeSuffix(issue.locale, translate)}`;
    }
    case "multipleRootPages": {
      return translate("repairIssueRootPages", {
        count: issue.count,
        folder: folderPlace(issue.folder, issue.folderTitle, translate),
        items: itemList(issue.items, issue.count, translate),
      });
    }
    case "orderKeyMissing":
    case "orderKeyEqual":
    case "orderKeyInvalid": {
      const keyByKind = {
        orderKeyEqual: "repairIssueOrderKeyEqual",
        orderKeyInvalid: "repairIssueOrderKeyInvalid",
        orderKeyMissing: "repairIssueOrderKeyMissing",
      } as const;

      return translate(keyByKind[issue.kind], {
        count: issue.count,
        place: folderPlace(issue.parent, issue.parentTitle, translate),
      });
    }
    case "staleVersion": {
      return translate("repairIssueStaleVersion", {
        fields: issue.fields.map((field) => translate(staleFieldNames[field])).join(", "),
        item: itemLabel(issue.item, "page", translate),
      });
    }
    case "danglingRedirect": {
      return `${translate("repairIssueDanglingRedirect", { path: issue.fromPath })}${localeSuffix(issue.locale, translate)}`;
    }
    case "mirrorSlashForm": {
      return issue.expectedFrom === issue.from && issue.url !== null
        ? translate("repairIssueMirrorSlashFormTarget", {
            path: issue.from,
            to: issue.expectedUrl ?? issue.url,
            url: issue.url,
          })
        : translate("repairIssueMirrorSlashForm", { path: issue.from, to: issue.expectedFrom });
    }
    case "treeStateRows": {
      return translate("repairIssueTreeStateRows", { count: issue.ids.length });
    }
    default: {
      return (issue as TreeIssue).message;
    }
  }
};
