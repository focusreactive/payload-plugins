# @focus-reactive/payload-plugin-visual-editing [1.7.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.6.0...@focus-reactive/payload-plugin-visual-editing@1.7.0) (2026-11-24)


### Bug Fixes

* **visual-editing:** add no empty line after a line break that ends a block of edited rich text ([c8f65e5](https://github.com/focusreactive/payload-plugins/commit/c8f65e5612871e14198e209f5a784a9d17ce046f))
* **visual-editing:** answer a request the field edit endpoint cannot read with a reason of its own ([6883ec2](https://github.com/focusreactive/payload-plugins/commit/6883ec23107897575a325f5f67f5c82f20853212))
* **visual-editing:** base every save of a field on what its last save stored, so the second pause of a later edit of a field on a page of its own is no longer refused as changed elsewhere ([7ec943a](https://github.com/focusreactive/payload-plugins/commit/7ec943adeb8492f50a2516d0b95fab33fa9baea7))
* **visual-editing:** decide in one module whether an edit goes to the admin or the endpoint, and keep a picked image on the route it began with, so its Retry never posts a media id to an admin window that appeared since ([c2bc078](https://github.com/focusreactive/payload-plugins/commit/c2bc0785c17d0a737dbfd3d939bdeec75f522cfc))
* **visual-editing:** draw the frames, badge, toolbar and toggle where content is drawn on a page with CSS zoom ([e22769a](https://github.com/focusreactive/payload-plugins/commit/e22769a772a2b878e166d5b42f3e71f1dd57f240))
* **visual-editing:** drop a rich text state the admin answers after its time limit, once the page opened the field instead ([ed334f1](https://github.com/focusreactive/payload-plugins/commit/ed334f13a76ace9b79e9e63d387963224d7be3b4))
* **visual-editing:** edit a line of text on a click anywhere in its block without moving its lines, leave a click beside the text of a control to the page, and save through the endpoint in a tab the admin opened but never talks to ([238ed01](https://github.com/focusreactive/payload-plugins/commit/238ed0126deafcad648cfbff776518863f0bce95))
* **visual-editing:** edit rich text in a copy of the chain of elements down to the one that holds the rendered nodes ([c607241](https://github.com/focusreactive/payload-plugins/commit/c607241e502c9328f44f27e7e67337d153d9f6ad))
* **visual-editing:** edit rich text in the direction of the site, not the one Lexical writes ([d0657a6](https://github.com/focusreactive/payload-plugins/commit/d0657a6134515738d9ce0dd905f73f5fe4880ac0))
* **visual-editing:** free an image whose pick the admin never answered ([31bf595](https://github.com/focusreactive/payload-plugins/commit/31bf595b4b948a9788680d910f1446e6ee14b9b0))
* **visual-editing:** give the _meta of an upload or a related document in a row the key of its field, so its image can be replaced on the page ([ff33695](https://github.com/focusreactive/payload-plugins/commit/ff33695841f36109711f11c697ef968d3303f6e0))
* **visual-editing:** keep a text or email field on one line while it is edited on the page ([ef6cd63](https://github.com/focusreactive/payload-plugins/commit/ef6cd63afcb9de60e81191775e87871f0bbcfdc4))
* **visual-editing:** keep an upload field with filter options off the page and count a hooked value as saved ([ead157b](https://github.com/focusreactive/payload-plugins/commit/ead157bb937861715d3561ff9f398787e0196aad))
* **visual-editing:** keep both of two saves of one top-level field, refuse an image replaced over a field changed elsewhere, and list no media for a user who may not update the document ([f86c5e1](https://github.com/focusreactive/payload-plugins/commit/f86c5e1b14dd7b21630189c6a9202958a5127a17))
* **visual-editing:** keep inline edits safe and saved ([271928e](https://github.com/focusreactive/payload-plugins/commit/271928ea1a0435c8643ee4eacb239c8177371b46))
* **visual-editing:** keep locks, locales and nested markup safe while text is edited on the page ([8f64fb4](https://github.com/focusreactive/payload-plugins/commit/8f64fb4849ba14553f776ad6da3542def11251c4))
* **visual-editing:** keep the focus inside the media picker after load more and an upload, and keep the size of the dialog ([20e2fc5](https://github.com/focusreactive/payload-plugins/commit/20e2fc5f380d4488b0d3eb21f0b6b2f87c2d5aa6))
* **visual-editing:** keep the list icons and italic of rich text while it is edited, show the toolbar for the whole edit and turn a markdown prefix into its block ([f4b8bf4](https://github.com/focusreactive/payload-plugins/commit/f4b8bf47609923faaac13f73a51ec6d2da636282))
* **visual-editing:** keep the nodes a page cannot edit as they are stored, validate every edited node and link, and compare a saved state by what it holds ([35fb02e](https://github.com/focusreactive/payload-plugins/commit/35fb02e251f10b072ce96e5a8dd0bf8de715a689))
* **visual-editing:** keep the Replace image button in the part of the image that is in the window ([c4d7b6f](https://github.com/focusreactive/payload-plugins/commit/c4d7b6f94c9722dbb616245622bbfcedfb1ef8a1))
* **visual-editing:** keep the route of an edit while the form holds it, so a Retry after the form refused it goes where the edit began ([c0c02b2](https://github.com/focusreactive/payload-plugins/commit/c0c02b2c447bdddf9623c78b9fb9bdacbb0bb34e))
* **visual-editing:** keep the save route an edit began with until it ends ([fb22169](https://github.com/focusreactive/payload-plugins/commit/fb22169c2524169c904a62feb0cb6b9036d8fb03))
* **visual-editing:** leave the admin form where it is when an edit on the page begins ([60eda9b](https://github.com/focusreactive/payload-plugins/commit/60eda9bfed6aefd4782b890f68b5c2e766273641))
* **visual-editing:** let Retry ask the admin again for a refused image pick, and show no status for a refused drawer ([c5b2786](https://github.com/focusreactive/payload-plugins/commit/c5b2786009b470f64454a11135d10731e718aa62))
* **visual-editing:** list the media of a collection without timestamps by id ([997cd39](https://github.com/focusreactive/payload-plugins/commit/997cd3905bd14f5234848c736f5e341ba4345834))
* **visual-editing:** name the value the form was given as sent before when the admin window closes during an edit, so its save through the endpoint is not refused as changed elsewhere ([7d9a62c](https://github.com/focusreactive/payload-plugins/commit/7d9a62c0380413aa292333e978ecfad6557898e8))
* **visual-editing:** never let an older save of a field land after a newer one when the page is hidden ([f837bb7](https://github.com/focusreactive/payload-plugins/commit/f837bb7ef846d974ca1c1a8cfddd7b62a62f01e5))
* **visual-editing:** open one media drawer at a time and tell the page when a pick is cancelled ([79b1815](https://github.com/focusreactive/payload-plugins/commit/79b1815346b1c79ba06fc818ef677f0e500765c7))
* **visual-editing:** outline the twin of an edited rich text in the accent also under the pointer ([a51af5b](https://github.com/focusreactive/payload-plugins/commit/a51af5b9d1656067612566f939c2a0ae6556ef64))
* **visual-editing:** put a failed image back, count a pick as an unsaved edit and keep the keys of the picker ([8a83559](https://github.com/focusreactive/payload-plugins/commit/8a83559558cc7126339cdaa81fc06c744086f36d))
* **visual-editing:** read the refusal of the media options endpoint by its reason, as field edits are read ([4a47d5a](https://github.com/focusreactive/payload-plugins/commit/4a47d5acf25ada91c2daea70358cee80d907e537))
* **visual-editing:** refuse a save from the page over a field that was changed elsewhere since the page showed it ([17071d1](https://github.com/focusreactive/payload-plugins/commit/17071d11d22f7dcd0be60f804eff8726af61bb77))
* **visual-editing:** release the admin window pinned for an edit once a new edit begins and nothing of its field is unsaved ([8cbf3bc](https://github.com/focusreactive/payload-plugins/commit/8cbf3bc888e6db36c74f7acf951370cebfbca279))
* **visual-editing:** release the route of an image once its pick in the drawer is cancelled or outlives its time limit ([1f5fb08](https://github.com/focusreactive/payload-plugins/commit/1f5fb0840c16abd6d508d579303e2faa5f2e67fb))
* **visual-editing:** save a global without its fallback locale, confirm the write and refuse a form that cannot change ([ccfac1b](https://github.com/focusreactive/payload-plugins/commit/ccfac1b6a26b5961479f0e78cfe779a786dc98ac))
* **visual-editing:** save an edit of a document whose drafts do not autosave once, when the edit ends ([376df55](https://github.com/focusreactive/payload-plugins/commit/376df55f494faeec8b1244048fa06da95513e908))
* **visual-editing:** save every kind of line break pasted into a single-line field as a space ([c979e5b](https://github.com/focusreactive/payload-plugins/commit/c979e5bb65b232d1ac653bfa6d69b2903ff1b7f9))
* **visual-editing:** say a picked image is unsaved only once it is on its way, so its Retry keeps the route the pick began with until the save starts ([60a149f](https://github.com/focusreactive/payload-plugins/commit/60a149fcdc3a6c55770661a4f550222bf4b65e6a))
* **visual-editing:** say saved once the endpoint saved a field the closed admin window never saved ([c6fe078](https://github.com/focusreactive/payload-plugins/commit/c6fe0786e461b19ef3347a288d9df5967c76b3c6))
* **visual-editing:** say why a save was refused, keep a failure on screen while another field is edited and save nothing on Escape before a text was sent ([8182af9](https://github.com/focusreactive/payload-plugins/commit/8182af92393b7bad3b8bd160e39175026ffb0aaf))
* **visual-editing:** send every save at once again when the page is left, now that the endpoint saves the edits of one document one after the other ([f1d076a](https://github.com/focusreactive/payload-plugins/commit/f1d076a4ac18274aac97bc06f9bdb2d7b03490ef))
* **visual-editing:** send the reason of a refusal from the admin and show it as the endpoint's ([1fefe2d](https://github.com/focusreactive/payload-plugins/commit/1fefe2dcc779445032169737e74a3a6586bfb4bc))
* **visual-editing:** show the spaces and line breaks of rich text as the site shows them while it is edited ([7f6b665](https://github.com/focusreactive/payload-plugins/commit/7f6b665638e747c8354f545489273b2d07ceb73f))
* **visual-editing:** take the origin of the window the page hears the admin in when no admin origin is given ([75f4d6f](https://github.com/focusreactive/payload-plugins/commit/75f4d6f29f447c9606d415d3096db45ecc547acf))
* **visual-editing:** wrap the toggle in a narrow window and show the switch of editing on the page by a dot, not by the colour of its text ([a89c121](https://github.com/focusreactive/payload-plugins/commit/a89c12137466696d83f5cfec92711370c27327eb))


### Features

* **visual-editing:** answer the draft state of a rich text field and save a state the page edited ([91230a2](https://github.com/focusreactive/payload-plugins/commit/91230a285e2875e767b4c7451a3c9f2290ff11bc))
* **visual-editing:** answer the rich text state of the open form and write an edited state into it ([f4d87f3](https://github.com/focusreactive/payload-plugins/commit/f4d87f31b2adf3c1b5c8035e85d8f3e61e47acc6))
* **visual-editing:** delete a fixed node of rich text on the page in two steps, save a page of its own when the edit ends, and show the twin and the caret as the site rendered them ([3e4c4d2](https://github.com/focusreactive/payload-plugins/commit/3e4c4d2584a2daa4c23819e890b2ec1917c114ef))
* **visual-editing:** document editing on the page and turn it on in the cms app ([4b7a661](https://github.com/focusreactive/payload-plugins/commit/4b7a6613912c5c81a5a85ff5051fe6c7314e90b3))
* **visual-editing:** edit on the page by default, without the Edit on page switch ([6b06c4f](https://github.com/focusreactive/payload-plugins/commit/6b06c4f9adbb0531d5b86c137c81c075368d575f))
* **visual-editing:** edit plain text on the page, with a switch in the toggle ([a02a78d](https://github.com/focusreactive/payload-plugins/commit/a02a78dcec98dc9bfa660566a9aa575764292e49))
* **visual-editing:** edit rich text on the page in a twin of its wrapper, with lexical loaded on the first edit ([02fcb1d](https://github.com/focusreactive/payload-plugins/commit/02fcb1d9a8eed5e21fcaae71f3317206bf1896ad))
* **visual-editing:** keep the state a rich text edit began with in the admin until the page says the edit ended ([db70556](https://github.com/focusreactive/payload-plugins/commit/db70556435b9834b1f2c2ac09dd3404c2da97dcd))
* **visual-editing:** load the rich text editor through an entry a site opts into, take the first click, keep fixed nodes and allowed formats on the page ([afcea99](https://github.com/focusreactive/payload-plugins/commit/afcea99359154701474db33acf201fce47ecf0f1))
* **visual-editing:** name the collection of an upload field that holds one document ([388dbc6](https://github.com/focusreactive/payload-plugins/commit/388dbc63f40199927fc688e2dfb2768d30b746ab))
* **visual-editing:** offer an action of a target as a button in the overlay layer ([e20e8ea](https://github.com/focusreactive/payload-plugins/commit/e20e8eaa2257d9abd993f1fdcc409a3f43f847b3))
* **visual-editing:** pick media in the admin for an image of the preview page ([50096c7](https://github.com/focusreactive/payload-plugins/commit/50096c7de733e42aa74e805e5a58844d7cc75286))
* **visual-editing:** replace an image from the page, through the admin or a picker of its own ([04d79cf](https://github.com/focusreactive/payload-plugins/commit/04d79cfdec814ee8e774a44d904ab71209ffaa86))
* **visual-editing:** save a media document into an upload field and list the media it can take ([146f47f](https://github.com/focusreactive/payload-plugins/commit/146f47f568f17a10bcd3d0fc191214a4c0a048f1))
* **visual-editing:** save a text edit of the page into the draft through an endpoint ([5d4cb52](https://github.com/focusreactive/payload-plugins/commit/5d4cb523c2e575d56d87f3a613ba67470a1327ec))
* **visual-editing:** show a selected placeholder, the formats of the first selected text and the link a toolbar field applied ([08b1145](https://github.com/focusreactive/payload-plugins/commit/08b1145ba52c5d2990897ed92b540e92923477b9))
* **visual-editing:** show the field in the form while it is edited on the page ([c07ffd7](https://github.com/focusreactive/payload-plugins/commit/c07ffd73521b7dbb7321459620e644e6ff6ffb5d))
* **visual-editing:** start the toggle on Hover where the site offers editing on the page ([851c39f](https://github.com/focusreactive/payload-plugins/commit/851c39f19203c379d5bceddee365658325e556df))
* **visual-editing:** take an edited rich text state that leaves out fixed nodes, matched to the shown ones as they serialise ([0b7f8d5](https://github.com/focusreactive/payload-plugins/commit/0b7f8d51f35ffb62124822164980c063bcc90d7a))
* **visual-editing:** tell which documents the admin holds a form of and which elements the page marked ([ad9f028](https://github.com/focusreactive/payload-plugins/commit/ad9f028eecbf4e2cb11cee8de08810e3c0052093))
* **visual-editing:** write a text edit of the preview page into the open form ([7eac8a0](https://github.com/focusreactive/payload-plugins/commit/7eac8a0d81108067643367bb5fdebc14bdbbd9d4))

# @focus-reactive/payload-plugin-visual-editing [1.6.0](https://github.com/focusreactive/payload-plugins/compare/@focus-reactive/payload-plugin-visual-editing@1.5.0...@focus-reactive/payload-plugin-visual-editing@1.6.0) (2026-11-18)


### Features

* **visual-editing:** keep frames and the edit badge under elements marked data-ve-cover ([d8b1ab9](https://github.com/focusreactive/payload-plugins/commit/d8b1ab930aeacadf2579ff29c53c577299ccc22c))

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
