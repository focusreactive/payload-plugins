"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { LinksTab } from "../tabs/LinksTab";
import { useLinkSuggestions } from "./useLinkSuggestions";
import type { LinkSuggestions } from "./useLinkSuggestions";

type LinkSuggestionsProviderProps = Parameters<typeof useLinkSuggestions>[0] & {
  children: ReactNode;
};

const LinkSuggestionsContext = createContext<LinkSuggestions | null>(null);

export function LinkSuggestionsProvider({ children, ...options }: LinkSuggestionsProviderProps) {
  const links = useLinkSuggestions(options);

  return (
    <LinkSuggestionsContext.Provider value={links}>{children}</LinkSuggestionsContext.Provider>
  );
}

function LinksPanel() {
  const links = useContext(LinkSuggestionsContext);
  if (!links) return null;

  return <LinksTab onFind={links.find} state={links.state} />;
}

export function renderLinksPanel(): ReactNode {
  return <LinksPanel />;
}
