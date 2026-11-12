import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AuditActionCell,
  AuditActionField,
  AuditActorTypeCell,
  AuditActorTypeField,
} from "../../src/components/AuditPill";

const { formValues } = vi.hoisted(() => ({ formValues: new Map<string, unknown>() }));

vi.mock("@payloadcms/ui", () => ({
  FieldLabel: ({ label, path }: { label: string; path: string }) => (
    <label htmlFor={path}>{label}</label>
  ),
  Pill: ({ pillStyle, children }: { pillStyle: string; children: ReactNode }) => (
    <span className={`pill--style-${pillStyle}`}>{children}</span>
  ),
  useField: ({ path }: { path: string }) => ({ value: formValues.get(path) }),
}));

type CellProps = Parameters<typeof AuditActionCell>[0];
type ActionFieldProps = Parameters<typeof AuditActionField>[0];
type ActorTypeFieldProps = Parameters<typeof AuditActorTypeField>[0];

const cellProps = (cellData: unknown) => ({ cellData }) as CellProps;

describe("audit pills", () => {
  it("renders an action cell as a labelled pill with the raw code as its tooltip", () => {
    expect(renderToStaticMarkup(<AuditActionCell {...cellProps("doc.delete")} />)).toBe(
      '<div style="display:inline-flex" title="doc.delete"><span class="pill--style-error">Deleted</span></div>'
    );
  });

  it("renders an actor type cell so agents stand out", () => {
    expect(renderToStaticMarkup(<AuditActorTypeCell {...cellProps("agent")} />)).toBe(
      '<div style="display:inline-flex" title="agent"><span class="pill--style-warning">AI agent</span></div>'
    );
  });

  it("falls back to the raw code for an action it does not know", () => {
    expect(renderToStaticMarkup(<AuditActionCell {...cellProps("doc.archive")} />)).toBe(
      '<div style="display:inline-flex" title="doc.archive"><span class="pill--style-light">doc.archive</span></div>'
    );
  });

  it("renders nothing for an empty cell", () => {
    expect(renderToStaticMarkup(<AuditActionCell {...cellProps(undefined)} />)).toBe("");
  });

  it("renders the action field read-only as its label and pill", () => {
    formValues.set("action", "auth.login_failed");
    const props = {
      path: "action",
      field: { name: "action", label: "Action" },
    } as ActionFieldProps;
    expect(renderToStaticMarkup(<AuditActionField {...props} />)).toBe(
      '<div class="field-type"><label for="action">Action</label>' +
        '<div style="display:inline-flex" title="auth.login_failed"><span class="pill--style-warning">Sign-in failed</span></div></div>'
    );
  });

  it("renders the actor type field from the form value at its path", () => {
    formValues.set("actor.type", "system");
    const props = {
      path: "actor.type",
      field: { name: "type", label: "Type" },
    } as ActorTypeFieldProps;
    expect(renderToStaticMarkup(<AuditActorTypeField {...props} />)).toContain(
      '<span class="pill--style-dark">System</span>'
    );
  });
});
