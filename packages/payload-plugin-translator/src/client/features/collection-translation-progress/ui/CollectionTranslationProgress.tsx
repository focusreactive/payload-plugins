"use client";

import { ShimmerEffect } from "@payloadcms/ui";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";

import type { GroupedCollectionTranslationStatus } from "../../../entities/translation";
import { TranslationsApi } from "../../../entities/translation";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon";
import Button from "../../../shared/ui/Button";
import StatusIndicator from "../../../shared/ui/StatusIndicator";
import Tooltip from "../../../shared/ui/Tooltip";

import styles from "./styles.module.scss";

interface CollectionTranslationProgressProps {
  collection: string;
  data: GroupedCollectionTranslationStatus | undefined;
  isPending: boolean;
}

export function CollectionTranslationProgress({
  collection,
  data,
  isPending,
}: CollectionTranslationProgressProps) {
  const cancelPendingTranslations =
    TranslationsApi.useCancelCollectionTranslations();

  return (
    <div className={styles.container}>
      {isPending && (
        <>
          <ShimmerEffect width="100%" height={32}></ShimmerEffect>
          <ShimmerEffect width="100%" height={32}></ShimmerEffect>
          <ShimmerEffect width="100%" height={32}></ShimmerEffect>
          <ShimmerEffect width="100%" height={32}></ShimmerEffect>
        </>
      )}

      {data && (
        <>
          <StatusIndicator
            className={styles["status-indicator"]}
            title="Completed"
            key="completed"
            $color="green"
          >
            <LanguageTranslateIcon />
            <b>{data.completed.length}</b>
          </StatusIndicator>

          <StatusIndicator
            className={styles["status-indicator"]}
            title="Failed"
            key="failed"
            $color="red"
          >
            <LanguageTranslateIcon />
            <b>{data.failed.length}</b>
          </StatusIndicator>

          <StatusIndicator
            className={styles["status-indicator"]}
            title="In progress"
            $animated={data.running.length > 0}
            key="running"
            $color="blue"
          >
            <LanguageTranslateIcon />
            <b>{data.running.length}</b>
          </StatusIndicator>

          <StatusIndicator
            className={styles["status-indicator"]}
            title="Pending"
            $animated={data.pending.length > 0}
            key="pending"
            $color="gray"
          >
            <LanguageTranslateIcon />
            <b>{data.pending.length}</b>
            <Tooltip
              sideOffset={12}
              side="bottom"
              content="Cancel translations"
            >
              <Button
                $variant="light"
                $size="sm"
                $isIconButton
                aria-label="Cancel all queued translation"
                type="button"
                onClick={() =>
                  cancelPendingTranslations.mutateAsync({ collection })
                }
                disabled={
                  cancelPendingTranslations.isPending || !data.pending.length
                }
                $isLoading={cancelPendingTranslations.isPending}
              >
                <TrashIcon />
              </Button>
            </Tooltip>
          </StatusIndicator>
        </>
      )}
    </div>
  );
}
