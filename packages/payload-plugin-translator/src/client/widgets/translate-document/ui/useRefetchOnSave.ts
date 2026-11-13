import { useEffect, useRef } from "react";

import { useDocumentSaveTime } from "../../../shared/lib/payload/hooks/useDocumentSaveTime.js";

/** Reads again each time Payload saves the open document; the first render is not a save. */
export function useRefetchOnSave(refetch: () => unknown): void {
  const saveTime = useDocumentSaveTime();
  const seen = useRef(saveTime);
  useEffect(() => {
    if (seen.current === saveTime) return;
    seen.current = saveTime;
    refetch();
  }, [saveTime, refetch]);
}
