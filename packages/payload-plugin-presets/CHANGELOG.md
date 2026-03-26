## @focus-reactive/payload-plugin-presets [0.4.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-presets@0.4.1...@focus-reactive/payload-plugin-presets@0.4.2) (2026-03-26)


### Bug Fixes

* **payload-plugin-presets:** move save as preset button to the top of the menu lis ([8e23f47](https://github.com/focusreactive/payload-plugins/commit/8e23f47f9c166937e2814ec70ae814104e3ce363))
* **payload-plugin-resets:** replace custom skeleton animation components with ShimmerEffect ([ca1a54e](https://github.com/focusreactive/payload-plugins/commit/ca1a54e757be7669de8648af6b84e2679df63758))

## @focus-reactive/payload-plugin-presets [0.4.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-presets@0.4.0...@focus-reactive/payload-plugin-presets@0.4.1) (2026-03-26)


### Bug Fixes

* **payload-plugin-presets:** hide source collection on debug false ([b7cbbe2](https://github.com/focusreactive/payload-plugins/commit/b7cbbe23e37d25404f83892982ce5a8a8d986503))

# @focus-reactive/payload-plugin-presets [0.4.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-presets@0.3.2...@focus-reactive/payload-plugin-presets@0.4.0) (2026-03-26)


### Bug Fixes

* **payload-plugin-presets:** adapt popups ([9f5140d](https://github.com/focusreactive/payload-plugins/commit/9f5140d4e80eda469751a14bd51b86fc747d1399))
* **payload-plugin-presets:** check for right media while fetching preview ([f5a33a6](https://github.com/focusreactive/payload-plugins/commit/f5a33a6e2d988de9a2b6473f9a17895cc28b9b08))
* **payload-plugin-presets:** correct z-index to --z-popup and remove redundant thumbnail-card styles in popover content ([9e4b4f6](https://github.com/focusreactive/payload-plugins/commit/9e4b4f602c17a76e9222d6cd1dd55e3b8a6bcc3a))
* **payload-plugin-presets:** move save as preset button to the top of the menu list ([cb7bc0e](https://github.com/focusreactive/payload-plugins/commit/cb7bc0e9ebf9cf72b273abc21b58add67cad40e6))
* **payload-plugin-presets:** remove redundant onClose call and revert unrelated SaveAsPreset changes ([fefa187](https://github.com/focusreactive/payload-plugins/commit/fefa187f6427138f121f2fe35cb7106f171212d6))
* **payload-plugin-presets:** replace add block title ([21ec362](https://github.com/focusreactive/payload-plugins/commit/21ec362a21b8c87bf5624288ba57ea4ad291d62e))
* **payload-plugin-presets:** simplify redundant preset count filter in BlockCard ([1fe0bbb](https://github.com/focusreactive/payload-plugins/commit/1fe0bbbdc54367e6f32a48dafa607c3d833cc7e4))


### Features

* **payload-plugin-presets:** replace Payload Popup with Radix Popover in BlockCard ([3a6c5fe](https://github.com/focusreactive/payload-plugins/commit/3a6c5fe7714431eab98a023ccb4b817509518ccf))

## @focus-reactive/payload-plugin-presets [0.3.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-presets@0.3.1...@focus-reactive/payload-plugin-presets@0.3.2) (2026-03-26)


### Bug Fixes

* **payload-plugin-presets:** replace the fragile class-based query with a proper ref attached inside the render prop ([5d83f71](https://github.com/focusreactive/payload-plugins/commit/5d83f710cef0f8f4def10296a27f865bfc94c6cc))

## @focus-reactive/payload-plugin-presets [0.3.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-presets@0.3.0...@focus-reactive/payload-plugin-presets@0.3.1) (2026-03-26)


### Bug Fixes

* **payload-plugin-presets:** show add block with preset button in any case ([b67aa71](https://github.com/focusreactive/payload-plugins/commit/b67aa713ce6500068017098014b21279458346eb))

# @focus-reactive/payload-plugin-presets [0.3.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-presets@0.2.0...@focus-reactive/payload-plugin-presets@0.3.0) (2026-03-26)


### Bug Fixes

* **payload-plugin-presets:** fix image loading animation ([f52ddf8](https://github.com/focusreactive/payload-plugins/commit/f52ddf8510c1ae27391be1e437acca2c40f9edad))
* **payload-plugin-presets:** replace default "Add Block" button with "Add block with preset" button ([f6beb8c](https://github.com/focusreactive/payload-plugins/commit/f6beb8cf5ee76b642b459e6d180546c2264e418d))


### Features

* **payload-plugin-presets:** add chevron icon to block card that supports presets ([b931b8c](https://github.com/focusreactive/payload-plugins/commit/b931b8cde9f39b6c00d3cf39ed6268ee48f00f99))
* **payload-plugin-presets:** add debug property to hide/show preset collection ([27e0544](https://github.com/focusreactive/payload-plugins/commit/27e05442ed27a04f9d6ea952c5a0abf5c82310ed))
* **payload-plugin-presets:** add delete preset functionality from blocks drawer ([66f28af](https://github.com/focusreactive/payload-plugins/commit/66f28afcd2f42d6e2abe45d5ca3bf6332f6d4dcf))
* **payload-plugin-presets:** display image preview on hover ([15d1cd6](https://github.com/focusreactive/payload-plugins/commit/15d1cd60bdbc6fefca104841476adf52c402126f))
* **payload-plugin-presets:** inject "Save as Preset" into block actions dropdown ([e018820](https://github.com/focusreactive/payload-plugins/commit/e018820697c4ac6c1f81683b5f7bd5c57b85825b))

# Changelog

## 0.1.1

- Added `BeforeOpenDrawerContext` — allows setting a `beforeOpenDrawer` callback to validate or prevent opening the "Add block with preset" drawer

## 0.1.0

- Initial release
- Save block configurations as reusable presets
- Apply presets to blocks with one click
- Preview images for presets in admin panel
- Custom blocks drawer with preset selection
- Multi-language support (EN/ES)
