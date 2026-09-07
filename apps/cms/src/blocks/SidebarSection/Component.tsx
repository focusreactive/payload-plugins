import NextLink from "next/link";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

import { SectionHeader } from "@/components/SectionHeader";
import { RichText, SectionContainer } from "@/components/shared";
import type { ISectionData } from "@/components/shared/SectionContainer/types";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";

interface SidebarLinkRow {
  id?: string | null;
  type?: "reference" | "custom" | "customPage" | null;
  newTab?: boolean | null;
  reference?: { relationTo: string; value: unknown } | null;
  url?: string | null;
  customPage?: string | null;
  label?: string | null;
}

/**
 * The shape stands in for the generated `SidebarSectionBlock` interface until the next
 * `payload generate:types` run, which is owned centrally rather than by this block.
 */
interface Props {
  id?: string | null;
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  body?: SerializedEditorState | null;
  sidebarHeading?: string | null;
  sidebarLinks?: SidebarLinkRow[] | null;
  sidebarPosition?: "left" | "right" | null;
  section?: ISectionData | null;
}

const SIDEBAR_BREAKPOINT = "900px";

/**
 * A breakpoint and a hover state are the two things the inline `style` attribute cannot express,
 * so they are the only rules that live here - everything else stays inline next to its element.
 * React dedupes this by `href`, so several of these blocks on one page emit one stylesheet.
 *
 * The prose column is always first in the document, whichever side the rail is shown on: a reader
 * or a crawler should reach the section's substance before a list of onward links. On a left-hand
 * rail the two are swapped visually by explicit grid placement rather than by reordering markup.
 */
const layoutStyles = `
.sidebar-section-layout {
  display: grid;
  gap: 40px;
  grid-template-columns: minmax(0, 1fr);
}
.sidebar-section-rail a:hover {
  opacity: 0.7;
}
@media (min-width: ${SIDEBAR_BREAKPOINT}) {
  .sidebar-section-layout--sidebar-right {
    grid-template-columns: minmax(0, 1fr) minmax(0, 300px);
  }
  .sidebar-section-layout--sidebar-left {
    grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  }
  .sidebar-section-layout--sidebar-left > .sidebar-section-body {
    grid-column: 2;
    grid-row: 1;
  }
  .sidebar-section-layout--sidebar-left > .sidebar-section-rail {
    grid-column: 1;
    grid-row: 1;
  }
}
`;

export async function SidebarSectionBlockComponent({
  body,
  description,
  eyebrow,
  heading,
  id,
  section,
  sidebarHeading,
  sidebarLinks,
  sidebarPosition,
}: Props) {
  const locale = await resolveLocale();
  const header = prepareSectionHeaderProps({ description, eyebrow, heading });

  const railLinks = (sidebarLinks ?? [])
    .map((sidebarLink, rowIndex) => {
      // The shared adapter is the only place that knows how to turn each of the three link types -
      // internal reference, custom URL, custom page - into a locale-correct href.
      const prepared = prepareLinkProps(sidebarLink, locale);

      return {
        href: prepared.href,
        key: sidebarLink.id ?? `${prepared.href}-${rowIndex}`,
        newTab: sidebarLink.newTab ?? false,
        // A row can be saved with a target and no label, because none of the link sub-fields are
        // required. Falling back to the destination keeps the entry clickable and named instead of
        // rendering an anchor with no accessible name.
        text: prepared.text.trim() || prepared.href,
      };
    })
    // A row whose target was never filled in resolves to an empty href, which would render as a
    // dead anchor.
    .filter((railLink) => railLink.href);

  // With nothing to put in the rail there is no second column at all, so the prose runs the full
  // width. The sidebar heading goes with it - a titled empty column reads as a broken layout.
  const hasSidebar = railLinks.length > 0;

  const sidebarSide = sidebarPosition === "left" ? "left" : "right";
  const layoutClassName = hasSidebar
    ? `sidebar-section-layout sidebar-section-layout--sidebar-${sidebarSide}`
    : "sidebar-section-layout";

  return (
    <SectionContainer sectionData={{ ...(section ?? {}), id }}>
      <style href="sidebar-section-layout" precedence="default">
        {layoutStyles}
      </style>

      {header ? (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader {...header} />
        </div>
      ) : null}

      <div className={layoutClassName}>
        <div className="sidebar-section-body">
          {body ? <RichText content={body} variant="content" /> : null}
        </div>

        {hasSidebar ? (
          <aside className="sidebar-section-rail" style={{ alignSelf: "start" }}>
            {sidebarHeading ? (
              <h3
                style={{
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  margin: "0 0 16px",
                  opacity: 0.6,
                  textTransform: "uppercase",
                }}
              >
                {sidebarHeading}
              </h3>
            ) : null}

            {/* Colours come from `currentColor` and opacity so the rail follows whichever theme
                the section tab picked, instead of hardcoding a palette that inverts badly. */}
            <div
              aria-hidden
              style={{ background: "currentColor", height: 1, marginBottom: 16, opacity: 0.15 }}
            />

            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {railLinks.map((railLink) => (
                <li key={railLink.key}>
                  <NextLink
                    href={railLink.href}
                    style={{
                      color: "inherit",
                      display: "inline-block",
                      fontSize: 15,
                      lineHeight: 1.4,
                      textDecoration: "underline",
                      textDecorationThickness: 1,
                      textUnderlineOffset: 3,
                    }}
                    {...(railLink.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {})}
                  >
                    {railLink.text}
                  </NextLink>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </SectionContainer>
  );
}
