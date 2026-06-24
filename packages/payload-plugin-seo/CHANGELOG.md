# @focus-reactive/payload-plugin-seo [1.4.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.3.0...@focus-reactive/payload-plugin-seo@1.4.0) (2026-06-24)


### Features

* **seo:** add depth-aware doc resolver and ref types for generalized content extraction ([438a5d9](https://github.com/focusreactive/payload-plugins/commit/438a5d98f837f4ece2981797c8dd489125176563))
* **seo:** add per-collection resolveDepth config  threaded to client props ([c139388](https://github.com/focusreactive/payload-plugins/commit/c1393885e809e3b153aeb180ac673aae00ee5fcf))
* **seo:** add schema field traversal and generalized ref collection (uploads + relationships, mono + poly, lexical) ([f7add90](https://github.com/focusreactive/payload-plugins/commit/f7add90b5630423aa9bb1872a7ee93ff6ae0f8ff))
* **seo:** add schema-aware content extractor with depth-bounded relation recursion and selection pruning ([3b7644b](https://github.com/focusreactive/payload-plugins/commit/3b7644b7d9bc1cac72dba74e92884dc81512ce49))
* **seo:** extract document content via a serializable content schema ([fd59e02](https://github.com/focusreactive/payload-plugins/commit/fd59e02acf340829c666d598075bb5647f6f4733))
* **seo:** pass locale and apiRoute context to content extractors ([490726e](https://github.com/focusreactive/payload-plugins/commit/490726e6f6ff875d56c80ceba440ca0879d10ae2))
* **seo:** remove the legacy image-only extractor ([2662232](https://github.com/focusreactive/payload-plugins/commit/266223250bed8614e5a7b352806f41cf88ce2ef9))
* **seo:** resolve inline lexical uploads and internal links during content extraction ([386252e](https://github.com/focusreactive/payload-plugins/commit/386252eedd75f7cf44b85c31170e413e64f1d794))
* **seo:** wire generalized resolve+extract pipeline through the drawer ([2008d90](https://github.com/focusreactive/payload-plugins/commit/2008d906bc855353a52d429611418c529459b20d))

# @focus-reactive/payload-plugin-seo [1.3.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.2.0...@focus-reactive/payload-plugin-seo@1.3.0) (2026-06-18)


### Features

* **seo:** warn and disable instead of throwing on empty collections ([86e9084](https://github.com/focusreactive/payload-plugins/commit/86e90842ab56e2cee428caa2271188847294d5cc))

# @focus-reactive/payload-plugin-seo [1.2.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.1.0...@focus-reactive/payload-plugin-seo@1.2.0) (2026-06-18)


### Features

* **seo:** extract heading outline into the vitals result ([3d6b5f5](https://github.com/focusreactive/payload-plugins/commit/3d6b5f57245478643c720c4f4b9b0a1fe7e998b1))
* **seo:** render headings section in content vitals tab ([fefaeac](https://github.com/focusreactive/payload-plugins/commit/fefaeacbe4697f24b8e5ddb71ae494af324d6eee))

# @focus-reactive/payload-plugin-seo [1.1.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.0.2...@focus-reactive/payload-plugin-seo@1.1.0) (2026-06-18)


### Features

* **seo:** add isExistingDocument gate predicate ([08d1ca4](https://github.com/focusreactive/payload-plugins/commit/08d1ca4e96acd5b51e82bd0c6c5ec7f54f2b6b14))
* **seo:** auto-run analysis on saved docs, hide button on create view ([e7c8c14](https://github.com/focusreactive/payload-plugins/commit/e7c8c14057f20a6871049676add4be1a20de3508))
* **seo:** show score badge on doc button instead of status dot ([4a91c85](https://github.com/focusreactive/payload-plugins/commit/4a91c857899828c981cfb993bb85af4d80659aad))

## @focus-reactive/payload-plugin-seo [1.0.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.0.1...@focus-reactive/payload-plugin-seo@1.0.2) (2026-06-17)


### Bug Fixes

* **seo:** add 0 threshold to meta description length check ([78f29d5](https://github.com/focusreactive/payload-plugins/commit/78f29d525dea78a198078588d8d01bd3f8f5ebe6))

## @focus-reactive/payload-plugin-seo [1.0.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.0.0...@focus-reactive/payload-plugin-seo@1.0.1) (2026-06-16)


### Bug Fixes

* **plugins:** keep Tailwind .table utility from shrinking Payload collection lists ([c943245](https://github.com/focusreactive/payload-plugins/commit/c943245cc29251859530b88c9d137fbe317889e6))
