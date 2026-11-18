# @focus-reactive/payload-plugin-visual-editing [1.5.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.4.0...@focus-reactive/payload-plugin-visual-editing@1.5.0) (2026-11-18)


### Features

* **visual-editing:** announce opened fields with a cancelable payload:open-field event ([8a82382](https://github.com/focusreactive/payload-plugins/commit/8a82382b7d876e09a9cf5b7813e7b4f3b54c2bc9))

# @focus-reactive/payload-plugin-visual-editing [1.4.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.3.0...@focus-reactive/payload-plugin-visual-editing@1.4.0) (2026-11-17)


### Features

* **visual-editing:** frame targets as one box, move the toggle to the top and let it be dragged, reveal the admin field by its own border ([f17e341](https://github.com/focusreactive/payload-plugins/commit/f17e34120c48ffe06cb2a03c828c49bd74494ea6))
* **visual-editing:** restyle the mode toggle and edit badge to match the Payload admin ([125d67c](https://github.com/focusreactive/payload-plugins/commit/125d67c2b22c3dfaf4a5e27775681e4c1644e403))
* **visual-editing:** violet accent by default, configurable with accentColor ([1215730](https://github.com/focusreactive/payload-plugins/commit/1215730a7f4714d8abd3dc345612f4253428b806))

# @focus-reactive/payload-plugin-visual-editing [1.3.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.2.0...@focus-reactive/payload-plugin-visual-editing@1.3.0) (2026-11-17)


### Bug Fixes

* **visual-editing:** clean dist before a build ([f431ca5](https://github.com/focusreactive/payload-plugins/commit/f431ca505a1b17ad8ba0bffc95e494ba40e3c617))
* **visual-editing:** clean markers from every attribute, head and pages without an overlay ([55c1877](https://github.com/focusreactive/payload-plugins/commit/55c1877105511626114e9c7c73c56f43530ae6e6))
* **visual-editing:** keep a field on an element whose text a site script splits ([24b8ff2](https://github.com/focusreactive/payload-plugins/commit/24b8ff2dacd39dfbc407453dfc34a96cb2560c82))
* **visual-editing:** mark number ranges and text that starts with a hash ([fd7301f](https://github.com/focusreactive/payload-plugins/commit/fd7301f900dd6b46bd558eb81fd63f2e22761292)), closes [#1](https://github.com/focusreactive/payload-plugins/issues/1) [#1](https://github.com/focusreactive/payload-plugins/issues/1)
* **visual-editing:** move through the mode toggle with the arrow keys ([a172a39](https://github.com/focusreactive/payload-plugins/commit/a172a399f11bfbbf2d2995e987264bfb2f8bc220))
* **visual-editing:** open veFocus links on the admin origin, wait for the field to render ([4c10f96](https://github.com/focusreactive/payload-plugins/commit/4c10f96be837aaeb8570298fa6ed6923e13fe60c))
* **visual-editing:** run in the window Payload opens for live preview ([04221e1](https://github.com/focusreactive/payload-plugins/commit/04221e1ca54a6ffa9e7318ba9fc40ef0b76addd0))


### Features

* **visual-editing:** add a ./dom entry for pages without React ([a5d55e6](https://github.com/focusreactive/payload-plugins/commit/a5d55e6822290c8fcf94f56edbdda5f733a325e2))
* **visual-editing:** default page instantPreview to true and payloadApi to adminOrigin/api ([c70b8ac](https://github.com/focusreactive/payload-plugins/commit/c70b8ac0e560c5e26c93ef39a739bd454617c6ab))
* **visual-editing:** render unsaved rich text for pages on another origin ([6687aa9](https://github.com/focusreactive/payload-plugins/commit/6687aa98f38d863c1e366855070ec40ac472fa43))
* **visual-editing:** show an unsaved rich text structure before the server answers ([8c200e2](https://github.com/focusreactive/payload-plugins/commit/8c200e2d90a89908c3fa74fe35ec2278e917e25f))
* **visual-editing:** take clicks from another origin, mark REST and GraphQL draft reads ([bac3611](https://github.com/focusreactive/payload-plugins/commit/bac3611bfbad335bafe9a082e11e8e56b1383606))


### Performance Improvements

* **visual-editing:** write a marker as a short list instead of a named object ([473856d](https://github.com/focusreactive/payload-plugins/commit/473856dc6cefe639b6c6809b256d40d74d2f27b2))

# @focus-reactive/payload-plugin-visual-editing [1.2.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.1.1...@focus-reactive/payload-plugin-visual-editing@1.2.0) (2026-11-12)


### Features

* **visual-editing:** instant live preview of text and rich text structure ([ed31d04](https://github.com/focusreactive/payload-plugins/commit/ed31d04da6a5948b4aacdb1315aaccfa301b283f))

## @focus-reactive/payload-plugin-visual-editing [1.1.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.1.0...@focus-reactive/payload-plugin-visual-editing@1.1.1) (2026-11-12)


### Bug Fixes

* **visual-editing:** keep double-clicks on highlighted links in the preview ([2d30946](https://github.com/focusreactive/payload-plugins/commit/2d30946d5f7cbe616979a1dd61f69305b3d4e2b6))
* **visual-editing:** keep text selection working on highlighted elements ([423ad57](https://github.com/focusreactive/payload-plugins/commit/423ad57208e094c26eed91c0a26af0829b2a60fc))
* **visual-editing:** open the field on a click on the highlighted element ([b743a5b](https://github.com/focusreactive/payload-plugins/commit/b743a5bae75c8f442473b20b8aed0b732d67ef5f))

# @focus-reactive/payload-plugin-visual-editing [1.1.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.0.0...@focus-reactive/payload-plugin-visual-editing@1.1.0) (2026-10-05)


### Features

* **visual-editing:** let visual editing stega only the reads that ask for it ([cae953e](https://github.com/focusreactive/payload-plugins/commit/cae953e3e904c62909d9c4836ba7a0ec9d72116a))
