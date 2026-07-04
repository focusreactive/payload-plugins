## @focus-reactive/payload-plugin-analytics [1.2.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.2.0...@focus-reactive/payload-plugin-analytics@1.2.1) (2026-07-04)


### Bug Fixes

* **analytics:** compile admin styles with franalytics prefix to isolate from consumer css ([4a9f23e](https://github.com/focusreactive/payload-plugins/commit/4a9f23e8b49c928b981842f1cc5cc124a63d20d4))

# @focus-reactive/payload-plugin-analytics [1.2.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.1.2...@focus-reactive/payload-plugin-analytics@1.2.0) (2026-07-03)


### Bug Fixes

* **analytics:** switch admin tabs and filters instantly via shallow history updates ([23ddaf0](https://github.com/focusreactive/payload-plugins/commit/23ddaf0aba3e9f2ec50b5b16e2a80ef05baea907))


### Features

* **analytics:** dim stale block data while fresh results load ([ebc323a](https://github.com/focusreactive/payload-plugins/commit/ebc323a74ea59bb02f2c2f91aba6581639f269e3))
* **analytics:** keep previous data visible while range and filter refetches run ([744fab1](https://github.com/focusreactive/payload-plugins/commit/744fab14ac484fc746a9cc3c38d177e4547643cd))

## @focus-reactive/payload-plugin-analytics [1.1.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.1.1...@focus-reactive/payload-plugin-analytics@1.1.2) (2026-06-18)

## @focus-reactive/payload-plugin-analytics [1.1.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.1.0...@focus-reactive/payload-plugin-analytics@1.1.1) (2026-06-18)


### Bug Fixes

* add button with AI prompt, make analytics token optional ([2ef2ff9](https://github.com/focusreactive/payload-plugins/commit/2ef2ff9390850bcde8c2bbbacb4caf388d61b944))

# @focus-reactive/payload-plugin-analytics [1.1.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.0.3...@focus-reactive/payload-plugin-analytics@1.1.0) (2026-06-17)


### Bug Fixes

* **analytics:** resolve sessions landing page to current CMS path ([3790437](https://github.com/focusreactive/payload-plugins/commit/3790437b02e111e200b394220a46cbe17c2ec6b6))


### Features

* **analytics:** resolve landing paths and scope mocks to page_ref ([922c829](https://github.com/focusreactive/payload-plugins/commit/922c8295a064325fd8b1f203e556b27e02a506d7))
* **analytics:** resolve page titles and paths for page_ref labels ([8cd86a7](https://github.com/focusreactive/payload-plugins/commit/8cd86a74f40321839d466e60048162a279283260))
* **analytics:** scope all views to existing pages via page_ref identity ([21d04be](https://github.com/focusreactive/payload-plugins/commit/21d04be1cf9168bcf28a5e111fc26162d9597129))

## @focus-reactive/payload-plugin-analytics [1.0.3](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.0.2...@focus-reactive/payload-plugin-analytics@1.0.3) (2026-06-17)


### Bug Fixes

* **analytics:** truncate long text in table rows ([5726e30](https://github.com/focusreactive/payload-plugins/commit/5726e3076ae341c695ba7fb86f1c2899a02949e1))

## @focus-reactive/payload-plugin-analytics [1.0.2](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.0.1...@focus-reactive/payload-plugin-analytics@1.0.2) (2026-06-16)


### Bug Fixes

* **plugins:** keep Tailwind .table utility from shrinking Payload collection lists ([c943245](https://github.com/focusreactive/payload-plugins/commit/c943245cc29251859530b88c9d137fbe317889e6))

## @focus-reactive/payload-plugin-analytics [1.0.1](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-analytics@1.0.0...@focus-reactive/payload-plugin-analytics@1.0.1) (2026-06-15)


### Bug Fixes

* **analytics:** make Track tolerate null and multiple children ([127a8d2](https://github.com/focusreactive/payload-plugins/commit/127a8d297d7e897cf6e2e61712289924ec40bb1d))

# @focus-reactive/payload-plugin-analytics 1.0.0 (2026-06-04)


### Bug Fixes

* **analytics:** add more descriptive column name for top events table ([d2d3bfd](https://github.com/focusreactive/payload-plugins/commit/d2d3bfd2bad029ff9163a9db69fecd086cc0c7db))
* **analytics:** add reset styles to the analytics page ([8837f0e](https://github.com/focusreactive/payload-plugins/commit/8837f0ecb60603325710ff668162848e61f44fea))
* **analytics:** allow partial layout overrides by typing plugin config with new *Input types ([e0d34c2](https://github.com/focusreactive/payload-plugins/commit/e0d34c2e36aa4d74688c4cf8f5f5444c9d1fddd6))
* **analytics:** arrange title and filter bar from different sides in analytics shell ([a006c95](https://github.com/focusreactive/payload-plugins/commit/a006c95da3cdde9d537c3fcfe429d88da60cd821))
* **analytics:** format conversion rate for lead actions in a chain list ([9c71d1b](https://github.com/focusreactive/payload-plugins/commit/9c71d1b4649816d71f56c0a4cb3104e0d61594ea))
* **analytics:** remove explicit dateRange dimension from all GA4 queries to avoid a GA4 data API validation error ([c93d554](https://github.com/focusreactive/payload-plugins/commit/c93d5542da8b865400a8a4182e5b89e01ce8750c))
* **analytics:** resolve custom block components server-side and pass React components through the renderer tree ([f62c39b](https://github.com/focusreactive/payload-plugins/commit/f62c39b3693bbb84ca967dbb3ede464199665b7a))
* **analytics:** reverse and drop self-link in analytics view header actions to match default page button order ([dabc009](https://github.com/focusreactive/payload-plugins/commit/dabc00944bf88ac8bf8d942f4c76eeb473d741e0))
* **analytics:** set up tsconfigRootDir in ESLint configuration ([0d92ea9](https://github.com/focusreactive/payload-plugins/commit/0d92ea9adcad035da73b09f4ba7a828f4373f317))
* **analytics:** wrap RouteChangeTracker in Suspense to fix static prerender ([d1bdc1a](https://github.com/focusreactive/payload-plugins/commit/d1bdc1a4750ae5213b13d8edb2dab1fada67ab6c))


### Features

* **analytics:** add A/B config block, constants and type contracts ([2c9860b](https://github.com/focusreactive/payload-plugins/commit/2c9860bbbdf1048614a3d4b8cab0a6206a97b2a3))
* **analytics:** add A/B query hooks ([5b8238b](https://github.com/focusreactive/payload-plugins/commit/5b8238b1dbe3da201b17c6c200efed3f6ed9024a))
* **analytics:** add A/B testing components and functionality ([906cbfe](https://github.com/focusreactive/payload-plugins/commit/906cbfe4e0215b4eda75c54263a11aa4ba9ab0de))
* **analytics:** add ab testing params layer to useAnalyticsParams ([de3ef2a](https://github.com/focusreactive/payload-plugins/commit/de3ef2a450025c718be657aeef5cce4c6b34b87e))
* **analytics:** add ab testing service queries ([0bf4a32](https://github.com/focusreactive/payload-plugins/commit/0bf4a32a0a66958371c9dcdabc2679a47daabb3b))
* **analytics:** add bounce rate and average session duration metrics to the trend chart ([d58f694](https://github.com/focusreactive/payload-plugins/commit/d58f69426196f2aca62f7450d9193975f53769bf))
* **analytics:** add custom-block server pipeline (scoped GA4 client, endpoint factory, React Query hook, renderer auto-wiring) ([ee2d851](https://github.com/focusreactive/payload-plugins/commit/ee2d851a5df16c3be408f7c21aa513ea6203e9a8))
* **analytics:** add default layout, block registry, and layout resolver ([fbadeda](https://github.com/focusreactive/payload-plugins/commit/fbadeda960b4b9b1f5c88f6261adbc0fba683687))
* **analytics:** add default padding at the bottom of the custom page ([4bde30b](https://github.com/focusreactive/payload-plugins/commit/4bde30be9747f66e2600528f445b0d3eb34f138d))
* **analytics:** add empty tile to LeadActionsPerPageTable ([e28f4db](https://github.com/focusreactive/payload-plugins/commit/e28f4db6b937da0df7ea60c6b75fabb886b08be6))
* **analytics:** add in-house A/B stats engine + win-rate and confidence helpers ([1e9ce00](https://github.com/focusreactive/payload-plugins/commit/1e9ce00b674af750d37799a1aa6e114a3f88d1f3))
* **analytics:** add layout merge and validation services for extension system ([589c1b3](https://github.com/focusreactive/payload-plugins/commit/589c1b379f385ae425a807c934c97d753ca2ba19))
* **analytics:** add layout types and built-in ID constants ([83252c7](https://github.com/focusreactive/payload-plugins/commit/83252c71ce2102fef69b824e5e0b18dafa551464))
* **analytics:** add mock data logic for testing in a dev mode ([82b0878](https://github.com/focusreactive/payload-plugins/commit/82b08785cf2a3e88d03739ca880da354e7774149))
* **analytics:** add previous data to DonutChart ([635c137](https://github.com/focusreactive/payload-plugins/commit/635c1375f0c15eeaf045344c328fefa16ee708e0))
* **analytics:** add Tab/Row/Block renderers for layout-driven analytics view ([1a5a293](https://github.com/focusreactive/payload-plugins/commit/1a5a293780efdf2c9b5d36dc543b2fc3796c51ad))
* **analytics:** add Tooltip to confidence variant column with a mixed soft and precise description ([3f27753](https://github.com/focusreactive/payload-plugins/commit/3f277535deeae5e2dba2a23e63e3646de5cc568c))
* **analytics:** add Tooltip to significance variant column with a mixed soft and precise description ([33d5291](https://github.com/focusreactive/payload-plugins/commit/33d529139484c5394ef39cfb427153becb286b3b))
* **analytics:** build and register ab endpoints ([c4aecb5](https://github.com/focusreactive/payload-plugins/commit/c4aecb52934b0e90041f885d1583f1407851eca7))
* **analytics:** config tailwind css ([81b9c2c](https://github.com/focusreactive/payload-plugins/commit/81b9c2c4f803e6b40b9a7240e16234cf72927b19))
* **analytics:** create all tabs ([6feb6cc](https://github.com/focusreactive/payload-plugins/commit/6feb6cce575143986234469d45b76f8a0df28ec8))
* **analytics:** create analytics shell ([8e5626d](https://github.com/focusreactive/payload-plugins/commit/8e5626d011c7e848ef8096c39f7b7390f26faf95))
* **analytics:** create filter bar for the admin view ([991c159](https://github.com/focusreactive/payload-plugins/commit/991c1591c366f5a55a753a106316e85d8140d4c6))
* **analytics:** create icon mapping helpers ([c44d8c0](https://github.com/focusreactive/payload-plugins/commit/c44d8c0d9319bc337a74aaebe4551f0c2dcec856))
* **analytics:** create Metric component ([fbce5be](https://github.com/focusreactive/payload-plugins/commit/fbce5be410b95de28542d918c6b8afc47d98b7f7))
* **analytics:** create number formatters ([3a9a6c8](https://github.com/focusreactive/payload-plugins/commit/3a9a6c84ca2615d7d25f2834f4a90f2bc68e3277))
* **analytics:** create UI primitives for the admin view ([82da6cc](https://github.com/focusreactive/payload-plugins/commit/82da6ccb1ecd88044459bf315d649205b517b627))
* **analytics:** create url-state hooks for the admin view ([4f7cebc](https://github.com/focusreactive/payload-plugins/commit/4f7cebcd083e0872743bfbe40511796b545fbcb5))
* **analytics:** declare color vars for ab testing analytics ([1f0bfff](https://github.com/focusreactive/payload-plugins/commit/1f0bfffa76d3f25bc5b8c19795cdab18c4b0336f))
* **analytics:** design an event collection layer on the client and send events to GA4 ([3a7556d](https://github.com/focusreactive/payload-plugins/commit/3a7556d737cf92d13b0a5504b5af873022faa1fa))
* **analytics:** design an event retrieval layer on the server using custom api endpoints ([3f79b06](https://github.com/focusreactive/payload-plugins/commit/3f79b06dc18d3df952056f5abf7247cf91321f7d))
* **analytics:** enhance session detail queries to include fr_lead_type ([72d4cd2](https://github.com/focusreactive/payload-plugins/commit/72d4cd2c2f5d479a41b160865fb23c39ebc28507))
* **analytics:** enhance session reporting with lead action tracking and batch processing ([05cd01a](https://github.com/focusreactive/payload-plugins/commit/05cd01a1c3c411738ffa3eb239ee689b61f7ef4c))
* **analytics:** expose layout types, builtin ID constants, and a ./client/blocks barrel for custom-block authors ([ee89ad9](https://github.com/focusreactive/payload-plugins/commit/ee89ad988ae4e0f67ba5f8ae0d686d000319fc37))
* **analytics:** extract per-block components and add built-in registry ([9d7ed93](https://github.com/focusreactive/payload-plugins/commit/9d7ed931e33991b6bbda95fcef07b1171dec4bd8))
* **analytics:** format average session time for the top pages analysis ([e2d2d13](https://github.com/focusreactive/payload-plugins/commit/e2d2d137326001ac96f33d5e85a7f51bd4855280))
* **analytics:** implement top countries and cities query with dimension switching ([38004ec](https://github.com/focusreactive/payload-plugins/commit/38004ec67368cf86ba6b3924cf40622800a2955a))
* **analytics:** improved readability and functionality for SessionDrawer and EventTimeline components ([229a8b6](https://github.com/focusreactive/payload-plugins/commit/229a8b681aee7a3f82fd910f272435c76e764488))
* **analytics:** inject analytics header link and mount an analytics view scaffold in Payload admin ([98f94e0](https://github.com/focusreactive/payload-plugins/commit/98f94e05e94c06ffd7a1c632bbcc3914ece40463))
* **analytics:** introduce typed-event foundation for lead actions ([9c0e8e6](https://github.com/focusreactive/payload-plugins/commit/9c0e8e65b7c33f7f98fbb8565f48aef38af58bcd))
* **analytics:** migrate GA4 lead-action queries to single event + fr_lead_type dimension ([d888d9e](https://github.com/focusreactive/payload-plugins/commit/d888d9ef13a5968164309d2837669871af4858a4))
* **analytics:** pass className from BlockRenderer through every built-in block so all cells stretch to row height ([f54c4a3](https://github.com/focusreactive/payload-plugins/commit/f54c4a3aebd935adbec70c4f996e40dd60ca3b87))
* **analytics:** pass previous data from LeadActionsTabView and OverviewTabView components to consumer components ([665ac54](https://github.com/focusreactive/payload-plugins/commit/665ac5405c19b860017057d981cf0a4a514faaa8))
* **analytics:** provide default template for analytics view ([1e113b1](https://github.com/focusreactive/payload-plugins/commit/1e113b1faa14c82d56a67ebfab41ad74e71b18c1))
* **analytics:** provide real session identity, sub-minute event ordering, accurate avgTimeToAction and user journey map endpoint ([f02b80e](https://github.com/focusreactive/payload-plugins/commit/f02b80e8b8853879c08efae72a6d2cd3b6753579))
* **analytics:** push fr_session_start ISO on every event ([fbc76c0](https://github.com/focusreactive/payload-plugins/commit/fbc76c02c7c057f6dfc2a9556382c57487ca0f82))
* **analytics:** refresh top-level exports and invariants test ([3ef3feb](https://github.com/focusreactive/payload-plugins/commit/3ef3feb2e6438d4ff09a28111b827e4119f5f019))
* **analytics:** return one row per session with device/country arrays in listSessions ([a3e0643](https://github.com/focusreactive/payload-plugins/commit/a3e0643e4eabf7d98a0adbd14912a39ae10b7c88))
* **analytics:** return previous-period KPI series from getKpis ([62f5ea8](https://github.com/focusreactive/payload-plugins/commit/62f5ea889b6e4695dc4a771e39369d1f5d1badfb))
* **analytics:** route admin lead-action labels and icons through the registry hook ([78b8fe3](https://github.com/focusreactive/payload-plugins/commit/78b8fe3cf09aa4f89826cfabd3e013f3749c1a08))
* **analytics:** route lead actions through lead_action+fr_lead_type on the client ([eaafe53](https://github.com/focusreactive/payload-plugins/commit/eaafe53bc5a76b8c5c193d02d9f8bf8463221212))
* **analytics:** scaffold payload-plugin-analytics package ([fa3f9f0](https://github.com/focusreactive/payload-plugins/commit/fa3f9f0bf4bda92177d1437419d3f354b1cf4025))
* **analytics:** update BarList component to display previous value ([6523f6c](https://github.com/focusreactive/payload-plugins/commit/6523f6c49a5b4186a9ceb687677052ba4bcded22))
* **analytics:** update label for Minimum Detectable Effect in AbDrawer component ([417890a](https://github.com/focusreactive/payload-plugins/commit/417890a936dec2595159e246f3d1ffed4145c787))
* **analytics:** update LeadActionsPerPageTable component to display previous value ([994462b](https://github.com/focusreactive/payload-plugins/commit/994462b15c2320a38323675a05527c40001264ef))
* **analytics:** update sample ratio labels for clarity in AbDrawer component ([5c33008](https://github.com/focusreactive/payload-plugins/commit/5c3300807ae784b492057627cc849b09076b5707))
* **analytics:** update TopNTable component to display previous value ([d969231](https://github.com/focusreactive/payload-plugins/commit/d9692310b56aa8347315305721323932560c9649))
* **analytics:** wire /admin/analytics to live data via TanStack Query ([8d2e693](https://github.com/focusreactive/payload-plugins/commit/8d2e69376d2056dfe704768408d5399e323cbd81))
* **analytics:** wire admin lead-action registry context and adminRegistry importMap provider injection ([ff6aeac](https://github.com/focusreactive/payload-plugins/commit/ff6aeacbf4d257fec1a59d412b002da8bd2aeafe))
* **analytics:** wire layout resolution at plugin init and inject custom block paths into admin providers and endpoints ([235838c](https://github.com/focusreactive/payload-plugins/commit/235838c0dfff28d559186ed4c260f5b668894998))
* **dev:** exercise TrackLeadAction + custom adminRegistry end-to-end and re-export registry primitives via the /client subpath ([f5b9a59](https://github.com/focusreactive/payload-plugins/commit/f5b9a59fcb86791029d30b936180d1478da8f4f4))
