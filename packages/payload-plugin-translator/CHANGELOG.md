## @focus-reactive/payload-plugin-translator [0.8.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.8.1...@focus-reactive/payload-plugin-translator@0.8.2) (2026-07-15)


### Bug Fixes

* **translator:** keep status rows in a stable source->target order ([b91a296](https://github.com/focusreactive/payload-plugins/commit/b91a2964057786409484a4ec51de230af99120fc))
* **translator:** track concurrent per-locale translations independently ([15788b6](https://github.com/focusreactive/payload-plugins/commit/15788b6fdff3d48c0dc2ff88be68ece3d945094a)), closes [#50](https://github.com/focusreactive/payload-plugins/issues/50)

## @focus-reactive/payload-plugin-translator [0.8.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.8.0...@focus-reactive/payload-plugin-translator@0.8.1) (2026-07-15)

# @focus-reactive/payload-plugin-translator [0.8.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.7.2...@focus-reactive/payload-plugin-translator@0.8.0) (2026-07-14)


### Bug Fixes

* **translator:** don't leak provider error details to the client outside development ([5f63d6d](https://github.com/focusreactive/payload-plugins/commit/5f63d6dbdba8678e0bb41599a03008958c22ac04))


### Features

* **translator:** stale-translation detection with a unified status panel ([d14ab90](https://github.com/focusreactive/payload-plugins/commit/d14ab90da05e5839d459ad8a4cab220aa886e94f))

## @focus-reactive/payload-plugin-translator [0.7.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.7.1...@focus-reactive/payload-plugin-translator@0.7.2) (2026-07-09)


### Bug Fixes

* **translator:** keep block/array id for shared rows to stop source wipe ([c0a49d1](https://github.com/focusreactive/payload-plugins/commit/c0a49d1b036a74dcd70f216e16e9cdc02532b83e))

## @focus-reactive/payload-plugin-translator [0.7.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.7.0...@focus-reactive/payload-plugin-translator@0.7.1) (2026-07-07)

# @focus-reactive/payload-plugin-translator [0.7.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.6.2...@focus-reactive/payload-plugin-translator@0.7.0) (2026-07-07)


### Features

* **translator:** translation provenance & lifecycle events ([#47](https://github.com/focusreactive/payload-plugins/issues/47)) ([#61](https://github.com/focusreactive/payload-plugins/issues/61)) ([ff2dec0](https://github.com/focusreactive/payload-plugins/commit/ff2dec030cf5768e89a36f99f7c509dd37cda4b6)), closes [50/#51](https://github.com/focusreactive/payload-plugins/issues/51) [#50](https://github.com/focusreactive/payload-plugins/issues/50) [49/#50](https://github.com/focusreactive/payload-plugins/issues/50)

## @focus-reactive/payload-plugin-translator [0.6.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.6.1...@focus-reactive/payload-plugin-translator@0.6.2) (2026-07-02)

## @focus-reactive/payload-plugin-translator [0.6.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.6.0...@focus-reactive/payload-plugin-translator@0.6.1) (2026-06-15)

# @focus-reactive/payload-plugin-translator [0.6.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-translator@0.5.1...@focus-reactive/payload-plugin-translator@0.6.0) (2026-06-15)


### Bug Fixes

* **translator:** guard empty OpenAI choices and expose client timeout/maxRetries ([475540c](https://github.com/focusreactive/payload-plugins/commit/475540c0ba17c12f0f57b0bfe831264824ae0003))
* **translator:** native, muted translate controls (outlined-light + send icon) ([e4cb54e](https://github.com/focusreactive/payload-plugins/commit/e4cb54e19648aed78005a0d978d3edfc70087016))
* **translator:** pair localized blocks/arrays by id across locales ([af1be76](https://github.com/focusreactive/payload-plugins/commit/af1be764bcc91ec702bdf5a6f4e8f83c7ac04c27))


### Features

* **translator:** per-field translation control (field level) ([dd0e52c](https://github.com/focusreactive/payload-plugins/commit/dd0e52cb0291ac7d2a11cf42c06fcb4db4adfdb3))

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
