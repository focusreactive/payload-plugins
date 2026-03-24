export interface CommentsTranslations {
  label: string;
  openComments_one: string;
  openComments_other: string;
  add: string;
  writeComment: string;
  comment: string;
  cancel: string;
  posting: string;
  resolve: string;
  reopen: string;
  resolved: string;
  delete: string;
  general: string;
  close: string;
  syncingComments: string;
  openCommentsAria: string;
  failedToPost: string;
  failedToUpdate: string;
  failedToDelete: string;
  failedToAdd: string;
  unknownAuthor: string;
  deletedUser: string;
  noComments: string;
  noMentionMatches: string;
  loadingComments: string;
}

export type Translations = Record<string, Partial<CommentsTranslations>>;
