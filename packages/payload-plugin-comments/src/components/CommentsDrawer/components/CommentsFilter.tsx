"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FilterIcon, CheckIcon } from "lucide-react";
import { IconButton } from "../../IconButton";
import { useCommentsFilter } from "../../../providers/CommentsFilterProvider";
import { useTranslation } from "@payloadcms/ui";

export function CommentsFilter() {
  const { filters, setFilter, isAnyFilterActive } = useCommentsFilter();
  const { t } = useTranslation();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton title={t("comments:filterComments" as never)} variant={"neutral"} isActive={isAnyFilterActive}>
          <FilterIcon width={16} height={16} />
        </IconButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        onEscapeKeyDown={(e) => e.stopPropagation()}
        className={`
            flex flex-col min-w-55
            z-50 bg-(--theme-bg) border border-(--theme-border-color) rounded shadow-lg p-2
          `}>
        <DropdownMenu.CheckboxItem
          className="flex items-center gap-2 cursor-pointer text-lg px-3 py-1.5 rounded outline-none hover:bg-(--theme-elevation-100) data-highlighted:bg-(--theme-elevation-100) select-none"
          checked={filters.showResolved}
          onCheckedChange={(checked) => setFilter("showResolved", checked)}
          onSelect={(e) => e.preventDefault()}>
          <DropdownMenu.ItemIndicator className="w-5 h-5 flex items-center justify-center text-(--theme-text)">
            <CheckIcon className="w-5 h-5" />
          </DropdownMenu.ItemIndicator>

          <span className={filters.showResolved ? "" : "pl-7"}>{t("comments:showResolved" as never)}</span>
        </DropdownMenu.CheckboxItem>

        <DropdownMenu.CheckboxItem
          className="flex items-center gap-2 cursor-pointer text-lg px-3 py-1.5 rounded outline-none hover:bg-(--theme-elevation-100) data-highlighted:bg-(--theme-elevation-100) select-none"
          checked={filters.onlyMyThreads}
          onCheckedChange={(checked) => setFilter("onlyMyThreads", checked)}
          onSelect={(e) => e.preventDefault()}>
          <DropdownMenu.ItemIndicator className="w-5 h-5 flex items-center justify-center text-(--theme-text)">
            <CheckIcon className="w-5 h-5" />
          </DropdownMenu.ItemIndicator>

          <span className={filters.onlyMyThreads ? "" : "pl-7"}>{t("comments:onlyMyThreads" as never)}</span>
        </DropdownMenu.CheckboxItem>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
