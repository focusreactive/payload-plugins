"use client";

import { useState } from "react";
import { TabComponent } from "@payloadcms/ui";
import type { ClientTab } from "payload";
import { JsonFields, labelOf } from "./JsonNode.js";
import type { Container, TypedNode } from "../field/typedJson.js";

export const JsonTabs = ({
  faults,
  node,
  id,
  onChange,
}: {
  faults?: boolean;
  node: Container;
  id: string;
  onChange: (node: TypedNode) => void;
}) => {
  const [active, setActive] = useState(0);
  const tabs = node.fields.filter((tab): tab is Container => "fields" in tab);
  const current = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className="tabs-field tabs-field--within-collapsible">
      <div className="tabs-field__tabs-wrap">
        <div className="tabs-field__tabs">
          {tabs.map((tab, index) => (
            <TabComponent
              isActive={tab === current}
              key={tab.name ?? index}
              parentPath={id}
              setIsActive={() => setActive(index)}
              tab={{ name: tab.name, label: labelOf(tab), fields: [] } as unknown as ClientTab}
            />
          ))}
        </div>
      </div>
      {current && (
        <div className="tabs-field__content-wrap">
          <JsonFields
            faults={faults}
            fields={current.fields}
            id={`${id}.${current.name}`}
            onChange={(fields) =>
              onChange({
                ...node,
                fields: node.fields.map((tab) => (tab === current ? { ...current, fields } : tab)),
              })
            }
          />
        </div>
      )}
    </div>
  );
};
