/**
 * The `req.context` flag the translator sets on its OWN document writes so the auto-translate
 * `afterChange` hook skips them — the loop guard's second barrier (#51 D5). A single exported constant
 * shared by the setter (`TranslateDocumentHandler.saveTranslatedDocument`) and the reader (the
 * auto-translate hook), so the set-side and honor-side keys can never diverge.
 *
 * Lives in `types/` (a leaf contract) so both `server/features/translate-document` and
 * `server/modules/auto-translate` import it without creating a cross-module edge.
 */
export const AUTO_TRANSLATE_SKIP_CONTEXT_KEY = "translatorSkipAutoTranslate";
