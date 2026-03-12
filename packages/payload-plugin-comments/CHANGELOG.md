# [1.1.0](https://github.com/focusreactive/payload-plugin-comments/compare/v1.0.0...v1.1.0) (2026-03-11)


### Features

* detect plugin base path ([5a9e2ca](https://github.com/focusreactive/payload-plugin-comments/commit/5a9e2ca1faa62786db073d95cd2cc618ca6e5125))

# 1.0.0 (2026-03-11)


### Bug Fixes

* add cancel translation ([3dbfef9](https://github.com/focusreactive/payload-plugin-comments/commit/3dbfef9a5123cd76def54d77c66eb271f88dadc6))
* add placeholder when editor is empty ([4e4234b](https://github.com/focusreactive/payload-plugin-comments/commit/4e4234b470ad1b7b2258843de69d364135281f98))
* add type button with handleSubmit on click ([6d549ff](https://github.com/focusreactive/payload-plugin-comments/commit/6d549ff71d4a0495c65349ef8b6f921b68306c05))
* document LabelFunction guard in getCollectionLabels ([0871ca2](https://github.com/focusreactive/payload-plugin-comments/commit/0871ca200cfbf369916c417aa37c9359f908d348))
* fix detectPluginBasePath ([f9dd81b](https://github.com/focusreactive/payload-plugin-comments/commit/f9dd81bec6fd32985016b7e1d46973cbb642ae30))
* fix js docs ([80c2a6d](https://github.com/focusreactive/payload-plugin-comments/commit/80c2a6d03c4a771dd8a09e0b77399a4e5b49b661))
* fix providers data logic ([f75bd88](https://github.com/focusreactive/payload-plugin-comments/commit/f75bd88c22bdba1033da9081eab10687cd276242))
* remove getting Payload config from [@payload-config](https://github.com/payload-config) external path ([11e65b4](https://github.com/focusreactive/payload-plugin-comments/commit/11e65b45bf4d33bc95e2d5cdc808c5b6653b5f68))
* sort documents and collections by oldest comment like fields sorting ([853bee4](https://github.com/focusreactive/payload-plugin-comments/commit/853bee4c2c655108df216fda2e01447c6a2259f9))
* use lazy initializer for setting isCollapsed for CollapsibleGroup ([59226d3](https://github.com/focusreactive/payload-plugin-comments/commit/59226d381672106d24e42cd8eaa5c11570453eb8))


### Features

* accept locale prop in GlobalCommentsLoader ([5e950f0](https://github.com/focusreactive/payload-plugin-comments/commit/5e950f051866708fd0f633d1c4820dd33bed165a))
* add getCollectionLabels service ([b1ea114](https://github.com/focusreactive/payload-plugin-comments/commit/b1ea1147129155a44cd143b7bb82bdbca241aa60))
* add locale to BaseServiceOptions ([04cfddf](https://github.com/focusreactive/payload-plugin-comments/commit/04cfddf86ea26ca6f3da0949b9f4b849328973f7))
* add resolveCollectionLabel utility ([b34641d](https://github.com/focusreactive/payload-plugin-comments/commit/b34641d8e3cf6e1a0d2fb9051b5c662bdd9e58a6))
* add styles to comments drawer ([3e950c4](https://github.com/focusreactive/payload-plugin-comments/commit/3e950c4a19495cff992d0ece6095e1e6082ec970))
* add translations to all text in UI ([750a386](https://github.com/focusreactive/payload-plugin-comments/commit/750a3865c403f4b9262ff450b6305f81547b1718))
* create base plugin ([57841b1](https://github.com/focusreactive/payload-plugin-comments/commit/57841b154958387e4836d6aeb33751046717af92))
* create CollectionLabels type ([ef0cd79](https://github.com/focusreactive/payload-plugin-comments/commit/ef0cd7925aaba41c90e9a1e500a7a23a6b53ce53))
* create CommentEditor component ([04d9a7a](https://github.com/focusreactive/payload-plugin-comments/commit/04d9a7a3c0c7a257e9cedd35e910e0aa725e8d59))
* create extractPayload utility ([e5fb348](https://github.com/focusreactive/payload-plugin-comments/commit/e5fb348525f6c2a2171cb9af1d2dd5b1f10f816d))
* forward locale in getDocumentTitles ([a07d48c](https://github.com/focusreactive/payload-plugin-comments/commit/a07d48cbcf8da18a0e962dddb83c106f9741ae2d))
* forward locale through syncAllCommentsData ([f26e23e](https://github.com/focusreactive/payload-plugin-comments/commit/f26e23e0ec14a559c51a11d08b4ae056b30918c4))
* load collection labels ([b7d5ec7](https://github.com/focusreactive/payload-plugin-comments/commit/b7d5ec73e548f5e9aa9eb712a03f7bdb3dfe233f))
* pass currentLocale when re-syncing in CommentsProvider ([e41b5b7](https://github.com/focusreactive/payload-plugin-comments/commit/e41b5b73681d5e8d5c1916e5948f0835023dff38))
* provide payload as a prop to all services ([ce05a34](https://github.com/focusreactive/payload-plugin-comments/commit/ce05a342d1ee1990b45cd40ec38c64acd85918c0))
* provide translations for UI, merge translations ([8e312a8](https://github.com/focusreactive/payload-plugin-comments/commit/8e312a87e2f680fdf49c0cb02192f54c9e7237ff))
* remove passing just slug to CollectionEntry ([1271fab](https://github.com/focusreactive/payload-plugin-comments/commit/1271fab3841de97fac3be05c76e87c1d215235ad))
* resolve collection label in collapsible group ([81ce334](https://github.com/focusreactive/payload-plugin-comments/commit/81ce334337c45f5a07b4b07f6199274107fd3591))
* set payload config in GlobalCommentsLoader ([f01aca3](https://github.com/focusreactive/payload-plugin-comments/commit/f01aca3a19f6eadf7a61f1cdd9324027593fa428))
* set payload config to globalThis ([ab9343f](https://github.com/focusreactive/payload-plugin-comments/commit/ab9343f1ba1df3352fb0ed19b5a82df82814d038))
* split utils by domain folders ([30de5af](https://github.com/focusreactive/payload-plugin-comments/commit/30de5af5e687132863c1f77e40b3ca3e41ed14fa))
* store Payload config ([35ea924](https://github.com/focusreactive/payload-plugin-comments/commit/35ea924f8998a9852ab47c8c5ca5c2bfd246d9b0))
* use payload native drawer ([8996ba2](https://github.com/focusreactive/payload-plugin-comments/commit/8996ba2ac4285dde27b37456940c5d06484216a2))
* write js doc comments for plugin config types ([9a86d6a](https://github.com/focusreactive/payload-plugin-comments/commit/9a86d6a708c1ad6308e8a7aed456a045552af5d9))
