import type { Payload, PayloadComponent } from "payload";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { PresetActionsButton } from "./PresetActionsButton.js";

interface Props {
  payload: Payload;
  userLabel: PayloadComponent;
  [key: string]: unknown;
}

export function BlockLabelServerWrapper(props: Props) {
  const { payload, userLabel, ...rest } = props;

  return (
    <>
      {RenderServerComponent({
        Component: userLabel,
        importMap: payload.importMap,
        serverProps: rest,
      })}
      <PresetActionsButton />
    </>
  );
}
