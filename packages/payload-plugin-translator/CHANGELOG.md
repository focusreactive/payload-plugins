## @focus-reactive/payload-plugin-translator [0.5.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.5.0...@focus-reactive/payload-plugin-translator@0.5.1) (2026-06-12)


### Bug Fixes

* **translator:** tidy shared UI primitives (Button/Select/Popup) ([19b1f65](https://github.com/focusreactive/payload-plugins/commit/19b1f655fdf2eeebb5b7972b0ed108bb20bf94ac))

# @focus-reactive/payload-plugin-translator [0.5.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.4.0...@focus-reactive/payload-plugin-translator@0.5.0) (2026-06-10)


### Features

* **translator:** add configurable translation levels ([888fb4a](https://github.com/focusreactive/payload-plugins/commit/888fb4a3efbaf16a622be30d0de819219fbfedfc))

# @focus-reactive/payload-plugin-translator [0.4.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.3.0...@focus-reactive/payload-plugin-translator@0.4.0) (2026-06-08)


### Bug Fixes

* **translator:** use ZodError.issues instead of removed .errors (zod v4) ([bcc85f7](https://github.com/focusreactive/payload-plugins/commit/bcc85f7366753169db7402a3fcfa7125e9b74049))


### Features

* **translator:** reliable manual job run + stale-lock recovery ([d61acc5](https://github.com/focusreactive/payload-plugins/commit/d61acc5a7c898a0619f04a970a41a26d05c8fb9d))

# @focus-reactive/payload-plugin-translator [0.3.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.2.1...@focus-reactive/payload-plugin-translator@0.3.0) (2026-06-08)


### Features

* **translator:** make job document references ID-agnostic ([81cb463](https://github.com/focusreactive/payload-plugins/commit/81cb46383ad37eabf1453f7657677c0903fedba4)), closes [docs/DEPRECATIONS.md#jobs-input-collection-field](https://github.com/docs/DEPRECATIONS.md/issues/jobs-input-collection-field)

## @focus-reactive/payload-plugin-translator [0.2.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.2.0...@focus-reactive/payload-plugin-translator@0.2.1) (2026-06-04)


### Bug Fixes

* **translator:** cast zod schema to resolver param type to fix build ([5d4fbe0](https://github.com/focusreactive/payload-plugins/commit/5d4fbe01362224924a63b5ed87234be889ff0c54))

# @focus-reactive/payload-plugin-translator [0.2.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.1.6...@focus-reactive/payload-plugin-translator@0.2.0) (2026-05-25)


### Features

* **cms:** import payload CMS app from cms-kit into monorepo ([f1a423c](https://github.com/focusreactive/payload-plugins/commit/f1a423c65ae39bdeb1e47702637c1cb4b92415e5))


### Reverts

* **format:** undo ultracite mass reformat on existing plugins ([d608685](https://github.com/focusreactive/payload-plugins/commit/d6086859295f006db109fa07acf2020652713a39)), closes [#12](https://github.com/focusreactive/payload-plugins/issues/12)

## @focus-reactive/payload-plugin-translator [0.1.6](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.1.5...@focus-reactive/payload-plugin-translator@0.1.6) (2026-05-12)


### Bug Fixes

* **translator:** work around Payload's broken JSON-where on SQLite for job lookup ([675b34a](https://github.com/focusreactive/payload-plugins/commit/675b34a89563b1d9fb5ef363f18ee9c65d314942))

## @focus-reactive/payload-plugin-translator [0.1.5](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.1.4...@focus-reactive/payload-plugin-translator@0.1.5) (2026-05-12)


### Bug Fixes

* **translator:** migrate plugin into payload-plugins monorepo ([9a81362](https://github.com/focusreactive/payload-plugins/commit/9a8136285c7a61600c173922f5d6f24eee689de0))
