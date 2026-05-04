## @focus-reactive/payload-plugin-ab [2.4.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-ab@2.4.1...@focus-reactive/payload-plugin-ab@2.4.2) (2026-05-04)


### Bug Fixes

* **payload-plugin-ab:** redistribute variant percentages atomically on duplicate ([0b85744](https://github.com/focusreactive/payload-plugins/commit/0b85744af9950bd1d72b3706de4ad4551d410ee7))

## @focus-reactive/payload-plugin-ab [2.4.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-ab@2.4.0...@focus-reactive/payload-plugin-ab@2.4.1) (2026-05-04)


### Bug Fixes

* **payload-plugin-ab:** populate parent doc relationships in manifest recompute ([fdb0b28](https://github.com/focusreactive/payload-plugins/commit/fdb0b28bac336b87d33b63a50f865459a25c9b50))

# @focus-reactive/payload-plugin-ab [2.4.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-ab@2.3.2...@focus-reactive/payload-plugin-ab@2.4.0) (2026-03-31)


### Bug Fixes

* remove redundant isolatedModules and align [@types](https://github.com/types) versions ([96ebfc7](https://github.com/focusreactive/payload-plugins/commit/96ebfc770c4668a3c52f85206b72754d42d38817))


### Features

* **payload-plugin-ab:** improve variant management UX ([b96fe1a](https://github.com/focusreactive/payload-plugins/commit/b96fe1a77cc9a7e48482d8296bf50ac5b7ec67c8))
* **payload-plugin-ab:** pin dependency versions ([95ea257](https://github.com/focusreactive/payload-plugins/commit/95ea2576e05c836c9c032483dce79242a46ca3d9))
* **payload-plugin-ab:** redesign variant row UI and improve input behavior ([f6ceb3e](https://github.com/focusreactive/payload-plugins/commit/f6ceb3ef6fc397f0d7c87cb224cdd19bc20f770f))

## @focus-reactive/payload-plugin-ab [2.3.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-ab@2.3.1...@focus-reactive/payload-plugin-ab@2.3.2) (2026-03-12)

## [1.1.2](https://github.com/focusreactive/payload-plugin-ab/compare/v1.1.1...v1.1.2) (2026-03-02)


### Bug Fixes

* remove emoji from readme ([2e929a1](https://github.com/focusreactive/payload-plugin-ab/commit/2e929a1a5733f065589a8bbae79e3cdc868d0c05))

## [1.1.1](https://github.com/focusreactive/payload-plugin-ab/compare/v1.1.0...v1.1.1) (2026-03-02)


### Bug Fixes

* add emoji to readme ([2afb3aa](https://github.com/focusreactive/payload-plugin-ab/commit/2afb3aa226159c351f59a4157a495f16a54e1fbd))

# [1.1.0](https://github.com/focusreactive/payload-plugin-ab/compare/v1.0.2...v1.1.0) (2026-03-02)


### Bug Fixes

* add "use client" directive to analytics client barrel file ([289bff7](https://github.com/focusreactive/payload-plugin-ab/commit/289bff77bfddffb1526183829502f2b5db9db5f3))
* scope bucket cookie to manifestKey for tenant isolation ([f545b60](https://github.com/focusreactive/payload-plugin-ab/commit/f545b60acf922b1d89255bbd698ba6f7db82d8a0))
* use parent field path to extract parent document ([0f102f0](https://github.com/focusreactive/payload-plugin-ab/commit/0f102f0daee6f1e1f6ebbe56b92c24d39000350e))
* wait for Gtag initialization to track impression event ([96385cc](https://github.com/focusreactive/payload-plugin-ab/commit/96385cc53e7bfc2b4b88c7d64b36378fb1a5f05b))


### Features

* add getPassPercentage support ([b07de35](https://github.com/focusreactive/payload-plugin-ab/commit/b07de3500d9ceeb03a21fe7092d7063f2293c91a))
* add resolveAbCookieNames utility to derive cookie config for Client Components ([a0d6bcc](https://github.com/focusreactive/payload-plugin-ab/commit/a0d6bcc5069298762dfd8c50e5c218f9b16032e3))
* bundle client analytics entities ([4e8eee9](https://github.com/focusreactive/payload-plugin-ab/commit/4e8eee95dda5f5dacfbdc3fe7e3b41fca4ceb575))
* bundle core analytics types ([cd31ff1](https://github.com/focusreactive/payload-plugin-ab/commit/cd31ff1303843b415692e58e9140ff16553827ea))
* create ABAnalyticsProvider component ([afca22a](https://github.com/focusreactive/payload-plugin-ab/commit/afca22a674c39dea8c7d179aefc02337b43037aa))
* create client event trackers ([155a8ad](https://github.com/focusreactive/payload-plugin-ab/commit/155a8adedc91f370a45b5919b53b6b5a1fdd3b2c))
* create ExperimentTracker component ([c70bcf7](https://github.com/focusreactive/payload-plugin-ab/commit/c70bcf7f8edad690ff8210b55203ff91a9f7f80e))
* create getCookie utility ([e53434f](https://github.com/focusreactive/payload-plugin-ab/commit/e53434f5168752435fe5865af6c76f112bb23327))
* create getExperimentStats service ([edb069d](https://github.com/focusreactive/payload-plugin-ab/commit/edb069dbb9a8c51b2b237c39894b60984dc296db))
* create googleAnalyticsAdapter ([2f365d4](https://github.com/focusreactive/payload-plugin-ab/commit/2f365d409ceca0e23815b60519856f2b2ad5f766))
* create isFieldPathExists utility ([7e06345](https://github.com/focusreactive/payload-plugin-ab/commit/7e06345d11088d0c64af73b8b7536e37e822e9cf))
* create pick variant bucket utils ([13a2c31](https://github.com/focusreactive/payload-plugin-ab/commit/13a2c312f64fdac2371442453f0bd13fae2186aa))
* create resolve a/b write factory ([6da3879](https://github.com/focusreactive/payload-plugin-ab/commit/6da3879d9b44f6075e52c239f0f474112d8ebf0f))
* create trackImpressionServer service ([f1d97d8](https://github.com/focusreactive/payload-plugin-ab/commit/f1d97d846151d94808ab9ff88531208a25db73e8))
* create useABConversion hook ([e4287c8](https://github.com/focusreactive/payload-plugin-ab/commit/e4287c8a988dec211705accc31987b2393be0318))
* design core analytics types ([c6b2cae](https://github.com/focusreactive/payload-plugin-ab/commit/c6b2cae32c282f1698ea06b0562798017e4fc569))
* design core types ([7621ec2](https://github.com/focusreactive/payload-plugin-ab/commit/7621ec254d41da95ecf8001dccc53c6aec8f7935))
* extract getNestedValue to separate utility ([ceb305c](https://github.com/focusreactive/payload-plugin-ab/commit/ceb305c7c766b4ba5045012b7cd90334ba52ff8e))
* introduce shared AbCookieConfig to link cookie names across utilities ([f60fdae](https://github.com/focusreactive/payload-plugin-ab/commit/f60fdae05df03811dc78fb055aa091d5ed01e0e6))
* provide passPercentage, parent and tenant fields and embed variant percentage sum validation ([b30dbbe](https://github.com/focusreactive/payload-plugin-ab/commit/b30dbbed74e582cdc52348f73ae8f40ed62f109b))
* support react and resolve analytics paths ([5fca12f](https://github.com/focusreactive/payload-plugin-ab/commit/5fca12f5b3a4f45912ff05b62b6dc721e8e4653b))
* typify google analytics adapter config ([0bd489f](https://github.com/focusreactive/payload-plugin-ab/commit/0bd489f3cf3abb6f71156f0d84dd5f9d09796cb8))
* validate variant percentage sum according to parent document tenant field ([c8810b3](https://github.com/focusreactive/payload-plugin-ab/commit/c8810b31b1404e13e65aada38f910cdb70a3727e))
