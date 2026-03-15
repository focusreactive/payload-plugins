"use client";

import { useState, useRef, useImperativeHandle, type RefObject, startTransition } from "react";
import { useAuth, useLocale, useTranslation } from "@payloadcms/ui";
import { useComments } from "../../providers/CommentsProvider";
import { MentionDropdown } from "../MentionDropdown";
import { MentionLabel } from "../MentionLabel";
import { serializeEditor } from "../../utils/comment/serializeEditor";
import { isSelfMention } from "../../utils/mention/isSelfMention";
import { createRoot } from "react-dom/client";
import type { User } from "../../types";
import { FALLBACK_USERNAME } from "../../constants";
import { resolveUsername } from "../../utils/user/resolveUsername";
import { ActionPanel } from "./ActionPanel";
import { Avatar } from "../Avatar";

export interface CommentEditorHandle {
  getValue: () => string;
  clear: () => void;
  focus: () => void;
  insertAt: () => void;
}

interface CommentEditorProps {
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  ref?: RefObject<CommentEditorHandle | null>;
  fieldPath?: string | null;
  documentId?: number;
  collectionSlug?: string;
  globalSlug?: string;
  onSuccessAddComment?: () => void;
  onEnterPress?: () => void;
  onEscapePress?: () => void;
}

export function CommentEditor({
  disabled,
  autoFocus,
  placeholder: placeholderProp,
  ref,
  fieldPath,
  documentId,
  collectionSlug,
  globalSlug,
  onSuccessAddComment,
  onEnterPress,
  onEscapePress,
}: CommentEditorProps) {
  const { mentionUsers: users, addComment } = useComments();
  const { code: locale } = useLocale();
  const { user } = useAuth();

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [triggerRange, setTriggerRange] = useState<Range | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { usernameFieldPath } = useComments();
  const { t } = useTranslation();

  const editorRef = useRef<HTMLDivElement>(null);

  const unknownLabel = t("comments:unknownAuthor" as never) ?? FALLBACK_USERNAME;
  const currentUserId = user?.id;
  const placeholder = placeholderProp ?? t("comments:writeComment" as never) ?? "Add a comment";

  // Methods
  const detectMention = () => {
    const sel = window.getSelection();

    if (!sel || !sel.rangeCount) {
      setMentionQuery(null);

      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType !== Node.TEXT_NODE) {
      setMentionQuery(null);

      return;
    }

    const text = node.textContent ?? "";
    const offset = range.startOffset;

    let i = offset - 1;
    while (i >= 0 && text[i] !== " " && text[i] !== "\n") {
      if (text[i] === "@") {
        const query = text.slice(i + 1, offset);
        if (query.includes(" ")) {
          setMentionQuery(null);
          return;
        }

        const atRange = document.createRange();
        atRange.setStart(node, i);
        atRange.setEnd(node, offset);
        setTriggerRange(atRange.cloneRange());
        setMentionQuery(query);
        setFilteredUsers(
          users.filter((u) =>
            resolveUsername(u, usernameFieldPath, unknownLabel).toLowerCase().includes(query.toLowerCase()),
          ),
        );
        setSelectedIndex(0);

        return;
      }

      i--;
    }

    setMentionQuery(null);
  };

  const insertMention = (user: User) => {
    if (!triggerRange || !editorRef.current) return;

    const sel = window.getSelection();
    if (!sel) return;

    sel.removeAllRanges();
    sel.addRange(triggerRange);
    sel.deleteFromDocument();

    const { id: userId } = user;

    const mentionLabelContainer = document.createElement("span");
    const mentionLabelContainerRoot = createRoot(mentionLabelContainer);

    mentionLabelContainerRoot.render(
      <MentionLabel
        name={resolveUsername(user, usernameFieldPath, unknownLabel)}
        isSelf={isSelfMention(currentUserId, userId)}
      />,
    );

    mentionLabelContainer.contentEditable = "false";
    mentionLabelContainer.dataset.mentionId = String(userId);

    const range2 = sel.getRangeAt(0);
    range2.insertNode(mentionLabelContainer);

    const zws = document.createTextNode("\u200b");
    mentionLabelContainer.after(zws);

    const newRange = document.createRange();
    newRange.setStartAfter(zws);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setMentionQuery(null);
    setTriggerRange(null);
  };

  const insertAt = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    document.execCommand("insertText", false, "@");
    detectMention();
  };

  const updateEmptyClass = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const isEmpty = editor.innerHTML === "" || editor.innerHTML === "<br>";

    editor.classList.toggle("is-empty", isEmpty);
  };

  // Editor API
  const getEditorValue = () => {
    if (!editorRef.current) return "";

    return serializeEditor(editorRef.current).trim();
  };

  const clearEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.classList.add("is-empty");
    }
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    getValue: getEditorValue,
    clear: clearEditor,
    focus: focusEditor,
    insertAt,
  }));

  // Handlers
  const handleAddComment = () => {
    const serialized = getEditorValue();
    if (!serialized) return;

    clearEditor();

    startTransition(async () => {
      const res = await addComment(serialized, fieldPath, documentId, collectionSlug, locale, globalSlug);

      if (res.success) {
        onSuccessAddComment?.();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === "Enter" && filteredUsers.length > 0) {
        e.preventDefault();
        const selectedUser = filteredUsers[selectedIndex];
        if (selectedUser) insertMention(selectedUser);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        setTriggerRange(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      handleAddComment();
      onEnterPress?.();
    } else if (e.key === "Escape") {
      onEscapePress?.();
    }
  };

  const handleInput = () => {
    detectMention();
    updateEmptyClass();
  };

  return (
    <div className="relative">
      <div className="flex gap-2.5 items-start">
        <Avatar className="shrink-0" user={user} usernameFieldPath={usernameFieldPath} fallbackName={unknownLabel} />

        <div className="flex-1 group px-2.5 py-2 rounded-md border border-transparent focus-within:border-(--theme-elevation-150) bg-transparent transition-colors">
          <div
            className={`
              is-empty relative w-full min-h-5 leading-5
              text-(--theme-text) text-[13px] outline-none box-border
              [&.is-empty]:before:content-[attr(data-placeholder)] [&.is-empty]:before:text-(--theme-elevation-450)
              [&.is-empty]:before:pointer-events-none [&.is-empty]:before:absolute
            `}
            ref={editorRef}
            contentEditable={!disabled}
            autoFocus={autoFocus}
            role="textbox"
            aria-multiline="true"
            aria-label={placeholder}
            data-placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
          />

          <ActionPanel
            className="hidden group-focus-within:flex"
            onMention={() => insertAt()}
            onAddComment={handleAddComment}
          />
        </div>
      </div>

      {mentionQuery !== null && filteredUsers.length > 0 && (
        <MentionDropdown users={filteredUsers} selectedIndex={selectedIndex} onSelect={insertMention} />
      )}
    </div>
  );
}
