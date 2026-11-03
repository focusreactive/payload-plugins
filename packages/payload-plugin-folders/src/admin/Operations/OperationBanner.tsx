import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { FolderId } from "../../types.js";
import type { Translate } from "../compat.js";
import { bannerKeyOf, kindKeyOf, percentOf } from "./operationLogic.js";
import type { OperationView } from "./operationLogic.js";

export type OperationBannerProps = {
  /** Opens the progress dialog of an operation. */
  onShow: (id: FolderId) => void;
  /** Gives up on a failed operation. */
  onAbandon: (id: FolderId) => void;
  /** Steps a failed operation again. */
  onRetry: (id: FolderId) => void;
  /** The operations that are not done and are not shown in the progress dialog. */
  operations: readonly OperationView[];
  translate: Translate;
};

/**
 * What the tree shows for an operation whose dialog was closed (spec section 5.8): "Publishing: 400
 * of 980", with a bar. It goes on stepping behind the banner, and after a reload it comes back from
 * the operation's record. The banners share one strip (`fr-folders-banners`) with the drift banner,
 * which the view draws.
 */
export const OperationBanner = ({
  onAbandon,
  onRetry,
  onShow,
  operations,
  translate,
}: OperationBannerProps): ReactNode => {
  if (operations.length === 0) {
    return null;
  }

  return (
    <>
      {operations.map((operation) => {
        const isFailed = operation.status === "failed";
        const counts = { done: operation.done, total: operation.total };

        return (
          <div
            className="fr-folders-operation-banner"
            data-kind={operation.kind}
            data-status={operation.status}
            data-testid="operation-banner"
            key={String(operation.id)}
            role="status"
          >
            <span
              className={isFailed ? "fr-folders-error" : undefined}
              data-testid="operation-banner-text"
              title={operation.error}
            >
              {isFailed
                ? translate("operationBannerFailed", {
                    ...counts,
                    kind: translate(kindKeyOf(operation.kind)),
                  })
                : translate(bannerKeyOf(operation.kind), counts)}
            </span>
            <progress
              aria-label={translate("progressLabel")}
              className="fr-folders-progress__bar fr-folders-operation-banner__bar"
              max={100}
              value={percentOf(operation)}
            />
            {isFailed ? (
              <Button
                buttonStyle="secondary"
                margin={false}
                onClick={() => onRetry(operation.id)}
                size="medium"
              >
                {translate("retry")}
              </Button>
            ) : null}
            {isFailed ? (
              <Button
                buttonStyle="secondary"
                margin={false}
                onClick={() => onAbandon(operation.id)}
                size="medium"
              >
                {translate("operationStop")}
              </Button>
            ) : null}
            <Button
              buttonStyle="secondary"
              margin={false}
              onClick={() => onShow(operation.id)}
              size="medium"
            >
              {translate("operationShow")}
            </Button>
          </div>
        );
      })}
    </>
  );
};
