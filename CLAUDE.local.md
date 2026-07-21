# CLAUDE.local.md — личные правила (не коммитится)

Персональные правила Siarhei для этого репозитория. Дополняет корневой
[CLAUDE.md](./CLAUDE.md), не заменяет его. Файл в `.gitignore`.

## JSDoc для публичных интерфейсов

Любой публичный интерфейс (всё, что реэкспортируется из `src/index.ts` пакета —
типы, функции, классы, опции плагина) должен иметь соответствующий JSDoc.

Существующая конвенция уже описана в
[packages/payload-plugin-translator/CLAUDE.md](./packages/payload-plugin-translator/CLAUDE.md#L6-L28):

- `@since x.y.z` на каждом новом элементе публичного API + пометка `Since vX.Y.Z`
  в `README.md` рядом с фичей.
- Версия определяется детерминированно от последнего опубликованного тега + самого
  крупного bump'а в изменении (`feat` на `0.4.0` → `0.5.0`); при сомнении —
  `bun run multi-semantic-release --dry-run`.
- Не бэкфиллить `@since` на уже существующий API.
- Deprecation'ы — `@deprecated` + `next major`, см.
  [docs/DEPRECATIONS.md](./packages/payload-plugin-translator/docs/DEPRECATIONS.md).

Применять этот же формат JSDoc ко всем публичным интерфейсам во всех пакетах, а не
только в translator.

**Теги (важно для oxlint):** oxlint отклоняет TSDoc-теги. Использовать `@template`
вместо `@typeParam`, не использовать `@remarks`.
