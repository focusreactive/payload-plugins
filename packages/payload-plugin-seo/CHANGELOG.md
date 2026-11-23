# @focus-reactive/payload-plugin-seo [3.0.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@2.0.0...@focus-reactive/payload-plugin-seo@3.0.0) (2026-11-17)


* feat(seo)!: replace the seven analysis tabs with an overview and one fix list ([0643353](https://github.com/focusreactive/payload-plugins/commit/06433539737b745d909a572daf95b5acf6fef3ab))


### Bug Fixes

* **seo:** score the SEO title width and advise on keyphrase overuse correctly ([7bc269a](https://github.com/focusreactive/payload-plugins/commit/7bc269a7411c2410482c68cdf705907b5855e09d))
* **seo:** style the drawer close button like the comments drawer ([ba7d92d](https://github.com/focusreactive/payload-plugins/commit/ba7d92d572d9a62e7ddb725fe6f6491c5c626839))


### Features

* **seo:** put problems first and collapse passed checks ([371922c](https://github.com/focusreactive/payload-plugins/commit/371922cd72afc59f9013757c5ef1c0cf1421333a))


### BREAKING CHANGES

* the drawer tabs onpage, readability, inclusive, vitals and serp
were removed; tab.keyphrase and tab.vitals now read Keyphrases and Content.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0166RzeQmSr5hMBDP9ZbQNAZ

# @focus-reactive/payload-plugin-seo [2.0.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.12.1...@focus-reactive/payload-plugin-seo@2.0.0) (2026-11-17)


* feat(seo)!: store keyphrases on the server by default ([7a11270](https://github.com/focusreactive/payload-plugins/commit/7a11270625add98109a96c018b28c326364cbbf4))


### Bug Fixes

* **seo:** band the meta description and title width gauges like Yoast ([d86c14b](https://github.com/focusreactive/payload-plugins/commit/d86c14b8a2b8d63b70ef0926d423ea970a8455d5))
* **seo:** hide the transition words gauge where Yoast does not score it ([1bbbf90](https://github.com/focusreactive/payload-plugins/commit/1bbbf9010091f951dfe724f910cd5efb54aa301e))
* **seo:** keep the language bands valid when a threshold is configured ([aa6d534](https://github.com/focusreactive/payload-plugins/commit/aa6d534b5b5abdda3b85decc01721786437e5f3e))
* **seo:** keep the over-maximum density band for a configured maximum ([28b20fd](https://github.com/focusreactive/payload-plugins/commit/28b20fd7954dccb0b46c3d58d6d6160c03b1acc1))
* **seo:** let configured thresholds win over Yoast language settings ([56ac134](https://github.com/focusreactive/payload-plugins/commit/56ac134d6e4f45e8cbde878c5b6b4890853d81d7))
* **seo:** make SEO field meters follow the configured thresholds ([5064264](https://github.com/focusreactive/payload-plugins/commit/5064264a9e107e86bf3f8d83f0f3f2d394709cd5))
* **seo:** measure the SEO title width for the title width check ([10b793c](https://github.com/focusreactive/payload-plugins/commit/10b793cb9edf620f6a4451907ece565d45d0d1ef))
* **seo:** never round a gauge value across a band edge ([8d69293](https://github.com/focusreactive/payload-plugins/commit/8d69293fed2a3ce7ef90192434b9fd9eac42e745))
* **seo:** open already-used keyphrase links in the current locale ([80fbae8](https://github.com/focusreactive/payload-plugins/commit/80fbae8f67721ef875e15be7014bd23438033b22))
* **seo:** open internal link admin links in the current locale ([59b7c17](https://github.com/focusreactive/payload-plugins/commit/59b7c17f413931d5d8f3c18295af94c564a3e7cb))
* **seo:** reject zero where a threshold needs a positive number ([3f07b08](https://github.com/focusreactive/payload-plugins/commit/3f07b08aea451ce5c82975c42d1b52602e545ef9))
* **seo:** respect a field's own title minimum and validate field ranges ([1d03ed8](https://github.com/focusreactive/payload-plugins/commit/1d03ed8be34dfc0f2ee6f9f07423dd448997e145))
* **seo:** retry unsaved keyphrases when the browser comes back online ([a4f608e](https://github.com/focusreactive/payload-plugins/commit/a4f608e28043d99e0d4dc1b6818bd23c987716ba))
* **seo:** score the SEO field meters like the drawer ([a2646ea](https://github.com/focusreactive/payload-plugins/commit/a2646ea6bb86c62cf958c25846d61fc3b64e3b27))
* **seo:** show minimum-only gauges without an upper bound ([689b4e1](https://github.com/focusreactive/payload-plugins/commit/689b4e1ba3d3136833cefbcd18b4782c5b6ca73a))
* **seo:** show the keyphrase density Yoast scores in its gauge ([b893eb5](https://github.com/focusreactive/payload-plugins/commit/b893eb5c1a6ac216181efe192a24c19f0fa6c527))
* **seo:** show the numbers of the analysis language ([4d032dc](https://github.com/focusreactive/payload-plugins/commit/4d032dc4096e6f3cf10009723b1e1d90d71b9295))
* **seo:** show the subheading keyphrase bar when there are no subheadings ([a045fb9](https://github.com/focusreactive/payload-plugins/commit/a045fb908547b89e668cbfff7efedc4a887d01d9))
* **seo:** unwrap CommonJS defaults of the threshold assessments under webpack ([307f043](https://github.com/focusreactive/payload-plugins/commit/307f043ae2716a96a670244cfa72151c3a0ccb96))
* **seo:** word recommendations by the side of the band ([c09fe54](https://github.com/focusreactive/payload-plugins/commit/c09fe540b9a8ef57c1164c69a5c132212645813e))


### Features

* **seo:** configurable analysis thresholds ([3aee676](https://github.com/focusreactive/payload-plugins/commit/3aee6763fa0d6f13d8069903ea2d6f43988138ad))
* **seo:** list already linked documents in the internal links tab ([f3c84c4](https://github.com/focusreactive/payload-plugins/commit/f3c84c4d60d7c0ed0d07d663bb0cf5447f04f6d1))


### BREAKING CHANGES

* consumers that never set keyphraseIndex now get the
hidden seo-keyphrases collection. On SQL adapters run
`payload migrate:create` and `payload migrate`, or set
`keyphraseIndex: false` to keep the previous behavior.

## @focus-reactive/payload-plugin-seo [1.12.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.12.0...@focus-reactive/payload-plugin-seo@1.12.1) (2026-11-16)


### Bug Fixes

* **seo:** unwrap yoastseo CommonJS default exports under webpack ([bdd7191](https://github.com/focusreactive/payload-plugins/commit/bdd71910ba7698d5013641425340cd676a40950a))

# @focus-reactive/payload-plugin-seo [1.12.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.11.0...@focus-reactive/payload-plugin-seo@1.12.0) (2026-11-12)


### Features

* **seo:** opt-in keyphrase index with usage notice and internal link suggestions ([#230](https://github.com/focusreactive/payload-plugins/issues/230)) ([dd1a3a9](https://github.com/focusreactive/payload-plugins/commit/dd1a3a9d88e9b23496b8e149889858f53710fc53))

# @focus-reactive/payload-plugin-seo [1.11.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.10.2...@focus-reactive/payload-plugin-seo@1.11.0) (2026-11-12)


### Bug Fixes

* **seo:** analyse non-English locales with their own Yoast researcher ([3394753](https://github.com/focusreactive/payload-plugins/commit/33947536b4c61f50d1a81d99d85ee288f389c590))
* **seo:** keep the inclusive subtitle grammatical for any count ([17fe209](https://github.com/focusreactive/payload-plugins/commit/17fe2097ac4b02107e7d40fc2c85bcba9349293e))


### Features

* **seo:** translate the admin UI and ship Czech ([ffe098b](https://github.com/focusreactive/payload-plugins/commit/ffe098b215b92b7e67be38fac93bf31def080183))
* **seo:** type the translations option and let bundled languages fall back to English ([85534e1](https://github.com/focusreactive/payload-plugins/commit/85534e104a28e6ab6aae5b532e3abe88d33d59dc))

## @focus-reactive/payload-plugin-seo [1.10.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.10.1...@focus-reactive/payload-plugin-seo@1.10.2) (2026-10-23)


### Bug Fixes

* **seo:** add bottom spacing between generated seo fields ([13c100c](https://github.com/focusreactive/payload-plugins/commit/13c100c5f3d51f20109c67d54b747e86bf5d44d0))
* **seo:** define meter fill colors as cva variants ([57b8391](https://github.com/focusreactive/payload-plugins/commit/57b839159225b96fd8e867ab7db3f749bcf6213e))

## @focus-reactive/payload-plugin-seo [1.10.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.10.0...@focus-reactive/payload-plugin-seo@1.10.1) (2026-07-04)


### Bug Fixes

* **seo:** stop add-synonym button flashing idle style when disabled under jank ([eb6f6be](https://github.com/focusreactive/payload-plugins/commit/eb6f6beac7372db2acff882c7996db9d4e3e8c07))

# @focus-reactive/payload-plugin-seo [1.10.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.9.0...@focus-reactive/payload-plugin-seo@1.10.0) (2026-07-04)


### Bug Fixes

* **seo:** compile admin styles with frseo prefix to isolate from consumer css ([40da2f7](https://github.com/focusreactive/payload-plugins/commit/40da2f76f20d0e573fd6c9e8bb80d20a23db3ea1))


### Features

* **seo:** add AST codemod that prefixes class literals in compiled JS ([7f03de0](https://github.com/focusreactive/payload-plugins/commit/7f03de073f3688715b053240dbd860e394af5787))
* **seo:** add dist output isolation verifier ([79f25c7](https://github.com/focusreactive/payload-plugins/commit/79f25c7a2a2bf5f8682bf92bed243fbb38df3d21))
* **seo:** configure tailwind-merge for the frseo prefix ([c5c5e78](https://github.com/focusreactive/payload-plugins/commit/c5c5e78bf26fa724d4764b39ae34b32b369e5dc6))
* **seo:** route standalone class-string constants through cn() ([eb9f472](https://github.com/focusreactive/payload-plugins/commit/eb9f472fb66ccbcbc2d428c7949ff5d8a41f4024))

# @focus-reactive/payload-plugin-seo [1.9.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.8.0...@focus-reactive/payload-plugin-seo@1.9.0) (2026-07-02)


### Bug Fixes

* **seo:** make drawer tab panel fill available height with flex layout ([fee777c](https://github.com/focusreactive/payload-plugins/commit/fee777c009dc6eb4f18c31e8cee87abe2a93ea6e))


### Features

* **seo:** protect focus keyphrase from removal and allow multiple empty entries ([2d44752](https://github.com/focusreactive/payload-plugins/commit/2d447524029d0ff9bdbd3b434e6a1ac280c3ba75))

# @focus-reactive/payload-plugin-seo [1.8.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.7.0...@focus-reactive/payload-plugin-seo@1.8.0) (2026-07-01)


### Features

* **seo:** flag missing/multiple H1 and skipped heading levels in analysis ([5dc34f9](https://github.com/focusreactive/payload-plugins/commit/5dc34f9e95843da0d745a327ce1632c81d0e9063))

# @focus-reactive/payload-plugin-seo [1.7.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.6.1...@focus-reactive/payload-plugin-seo@1.7.0) (2026-07-01)


### Features

* **seo:** add related keyphrases with per-keyphrase synonyms ([0419e94](https://github.com/focusreactive/payload-plugins/commit/0419e9416efa64a40fc2241c03807a55c9bedb88))

## @focus-reactive/payload-plugin-seo [1.6.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.6.0...@focus-reactive/payload-plugin-seo@1.6.1) (2026-06-30)


### Bug Fixes

* **seo:** align description length good range to 120-156 chars ([4c9d98e](https://github.com/focusreactive/payload-plugins/commit/4c9d98e4fc1d03733529e48dfed53d84ea46cb00))

# @focus-reactive/payload-plugin-seo [1.6.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.5.0...@focus-reactive/payload-plugin-seo@1.6.0) (2026-06-28)


### Features

* **seo:** add AI generation for SEO title and description fields ([bb8bc36](https://github.com/focusreactive/payload-plugins/commit/bb8bc36453a07aa4fbbd84946982479cda4030b2))

# @focus-reactive/payload-plugin-seo [1.5.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-seo@1.4.0...@focus-reactive/payload-plugin-seo@1.5.0) (2026-06-25)


### Features

* **seo:** add resolveDocs parallel doc-fetch utility and compact intermediate representation helper for the content-extraction toolkit ([528aef0](https://github.com/focusreactive/payload-plugins/commit/528aef09f3b89d419746848748d58472dd32c7de))
* **seo:** remove built-in content extractor; extractors now receive raw values plus an injected resolveDocs + helpers toolkit ([31cad54](https://github.com/focusreactive/payload-plugins/commit/31cad5462609e19e8e366467e2fdaebbbe2665f5))

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
