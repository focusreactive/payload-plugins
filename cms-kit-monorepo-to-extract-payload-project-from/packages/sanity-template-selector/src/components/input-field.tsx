"use client";

import { AddIcon } from "@sanity/icons";
import { Button, Card, Popover, Stack, Text } from "@sanity/ui";
import React from "react";

import type { InputFieldProps } from "../types";
import { TemplatesBrowser } from "./templates-browser";

function ArrayFunctions(props: InputFieldProps) {
  const [isOpen, setOpenStatus] = React.useState(false);

  const toggle = () => setOpenStatus((v) => !v);

  return (
    <>
      <Popover
        style={{
          maxWidth: "700px",
          width: "calc(100% - 48px)",
        }}
        content={
          <TemplatesBrowser
            onClose={toggle}
            onItemAppend={props.inputProps.onItemAppend}
            presets={props.presets}
          />
        }
        padding={2}
        placement="top"
        portal
        open={isOpen}
      >
        <div>
          <Button
            style={{
              width: "100%",
            }}
            mode="ghost"
            text="Add Block..."
            icon={AddIcon}
            onClick={toggle}
            disabled={window.location.pathname.startsWith("/presentation/")}
          />
        </div>
      </Popover>
    </>
  );
}

export function InputField(props: InputFieldProps) {
  return (
    <Stack space={4}>
      <Card>
        <Text>{props.title}</Text>
      </Card>
      {props.inputProps.renderInput({
        ...props.inputProps,
        // @ts-expect-error
        arrayFunctions: () => <ArrayFunctions {...props} />,
      })}
    </Stack>
  );
}
