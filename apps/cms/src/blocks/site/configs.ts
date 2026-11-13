import type { Block } from "payload";

import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import {
  backgroundField,
  imageField,
  rowTitle,
  sectionEyebrow,
  sectionHeading,
  siteBlock,
} from "./shared";

const sectionText = (description = "The text under the heading.") =>
  bodyRichText({ description, label: "Text", name: "text" });

export const HeroVideoBlock: Block = siteBlock({
  fields: [
    headingRichText({
      description: "The page's main heading. Set words in italics to give them the accent style.",
      label: "Heading",
      name: "heading",
      required: true,
    }),
    sectionText("The paragraph under the heading."),
    siteButton(),
    {
      admin: {
        description:
          "The phone number under the button, for example 888-555-0100. Empty hides the line.",
      },
      label: "Phone",
      name: "phone",
      type: "text",
    },
    {
      admin: {
        description: "The words before the phone number, for example Or Call:.",
      },
      label: "Phone line text",
      name: "phoneLabel",
      type: "text",
    },
    {
      admin: {
        description:
          "The full URL of the looping video beside the heading (an .mp4 file). After the migration this becomes a video stored in the CMS.",
      },
      label: "Video URL",
      name: "videoUrl",
      type: "text",
    },
    imageField(
      "poster",
      "Video still",
      "Shown while the video loads, and instead of it when no video is set."
    ),
  ],
  interfaceName: "HeroVideoBlock",
  label: "Hero with video",
  slug: "heroVideo",
});

export const LogoStripBlock: Block = siteBlock({
  fields: [
    sectionEyebrow,
    {
      admin: { ...rowTitle("image.filename", "Logo"), description: "The logos, left to right." },
      fields: [imageField("image", "Logo", "A logo on a transparent or white background.", true)],
      label: "Logos",
      labels: { plural: "Logos", singular: "Logo" },
      name: "logos",
      type: "array",
    },
    backgroundField(),
  ],
  interfaceName: "LogoStripBlock",
  label: "Logo strip",
  slug: "logoStrip",
});

export const IconListBlock: Block = siteBlock({
  fields: [
    sectionEyebrow,
    sectionHeading("The section's heading. Underline a word to give it the accent style."),
    siteButton(),
    {
      admin: {
        ...rowTitle("title", "Point"),
        description: "The points listed beside the heading.",
      },
      fields: [
        imageField("icon", "Icon", "The round drawing beside the point."),
        {
          admin: { description: "The point's name, for example Patient-Centered Care." },
          label: "Title",
          name: "title",
          required: true,
          type: "text",
        },
        {
          admin: { description: "One or two sentences under the title." },
          label: "Text",
          name: "text",
          type: "textarea",
        },
      ],
      label: "Points",
      labels: { plural: "Points", singular: "Point" },
      name: "items",
      type: "array",
    },
  ],
  interfaceName: "IconListBlock",
  label: "Icon list",
  slug: "iconList",
});

export const MediaTextBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      fields: [
        {
          admin: { description: "Which side the picture or video sits on.", width: "50%" },
          defaultValue: "left",
          label: "Text side",
          name: "side",
          options: [
            { label: "Text on the left", value: "left" },
            { label: "Text on the right", value: "right" },
          ],
          type: "select",
        },
        {
          admin: { description: "How much room the section takes.", width: "50%" },
          defaultValue: "regular",
          label: "Size",
          name: "size",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Full width", value: "full" },
            { label: "Small", value: "small" },
          ],
          type: "select",
        },
      ],
      type: "row",
    },
    backgroundField(),
    imageField(
      "image",
      "Picture",
      "The picture beside the text. With a video set, it is the still shown before play."
    ),
    {
      admin: {
        description:
          "The full URL of a video (an .mp4 file) played when the picture is clicked. Empty shows the picture only. After the migration this becomes a video stored in the CMS.",
      },
      label: "Video URL",
      name: "videoUrl",
      type: "text",
    },
  ],
  interfaceName: "MediaTextBlock",
  label: "Media and text",
  slug: "mediaText",
});

export const InsuranceBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      admin: {
        ...rowTitle("image.filename", "Logo"),
        description: "The insurance plan logos shown beside the text.",
      },
      fields: [imageField("image", "Logo", "The plan's logo.", true)],
      label: "Plan logos",
      labels: { plural: "Logos", singular: "Logo" },
      name: "logos",
      type: "array",
    },
  ],
  interfaceName: "InsuranceBlock",
  label: "Insurance plans",
  slug: "insurance",
});

export const DoctorSliderBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      admin: {
        description:
          "The words on the last slide, which links where the button does, for example See All Reviews. Empty leaves that slide out.",
      },
      label: "Last slide text",
      name: "seeAllText",
      type: "text",
    },
    siteButton({
      description: "The button under the slider. Empty text hides it.",
      label: "Button under the slider",
      name: "bottomButton",
    }),
    imageField("image", "Background picture", "The wide picture behind the section."),
    {
      admin: {
        description:
          "The doctors in the slider, in this order. Empty shows the doctors of the page's own clinic or state, or every doctor on other pages.",
      },
      hasMany: true,
      label: "Doctors",
      name: "doctors",
      relationTo: "doctors",
      type: "relationship",
    },
  ],
  interfaceName: "DoctorSliderBlock",
  label: "Doctors slider",
  slug: "docSlider",
});

export const ReviewSliderBlock: Block = siteBlock({
  fields: [
    sectionEyebrow,
    sectionHeading(),
    siteButton(),
    {
      admin: {
        description:
          "The words on the last slide, which links where the button does, for example See All Reviews. Empty leaves that slide out.",
      },
      label: "Last slide text",
      name: "seeAllText",
      type: "text",
    },
    {
      admin: {
        description:
          "The reviews in the slider, in this order. Empty shows the reviews of the page's own clinic, or the newest reviews on other pages.",
      },
      hasMany: true,
      label: "Reviews",
      name: "reviews",
      relationTo: "testimonials",
      type: "relationship",
    },
  ],
  interfaceName: "ReviewSliderBlock",
  label: "Reviews slider",
  slug: "revSlider",
});

export const ConditionGridBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    {
      admin: {
        description: "The small heading above the conditions, for example Symptoms We Treat.",
      },
      label: "List heading",
      name: "listHeading",
      type: "text",
    },
    {
      admin: {
        description: "The conditions shown, in this order. Empty shows every condition.",
      },
      hasMany: true,
      label: "Conditions",
      name: "conditions",
      relationTo: "conditions",
      type: "relationship",
    },
    {
      admin: {
        description:
          "The words shown when a visitor points at a condition, for example Learn More.",
      },
      label: "Link text",
      name: "linkText",
      type: "text",
    },
    siteButton({ description: "The button under the list. Empty text hides it." }),
    backgroundField("white"),
  ],
  interfaceName: "ConditionGridBlock",
  label: "Conditions grid",
  slug: "condGrid",
});

export const BeforeAfterBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      admin: {
        description:
          "The words on the last slide, which links where the button does, for example See All Reviews. Empty leaves that slide out.",
      },
      label: "Last slide text",
      name: "seeAllText",
      type: "text",
    },
    {
      fields: [
        {
          admin: {
            description: "The label on the first picture, for example Before.",
            width: "50%",
          },
          label: "Before label",
          name: "beforeLabel",
          type: "text",
        },
        {
          admin: {
            description: "The label on the second picture, for example After.",
            width: "50%",
          },
          label: "After label",
          name: "afterLabel",
          type: "text",
        },
      ],
      type: "row",
    },
    {
      admin: {
        ...rowTitle("before.filename", "Result"),
        description: "One row per patient result.",
      },
      fields: [
        imageField("before", "Before picture", "The picture taken before treatment.", true),
        imageField("after", "After picture", "The picture taken after treatment.", true),
      ],
      label: "Results",
      labels: { plural: "Results", singular: "Result" },
      name: "pairs",
      type: "array",
    },
  ],
  interfaceName: "BeforeAfterBlock",
  label: "Before and after slider",
  slug: "beforeAfter",
});

export const TreatmentCardsBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    {
      admin: {
        description:
          "Short selling points shown with a tick, one per entry, for example FDA-Approved.",
      },
      hasMany: true,
      label: "Checklist",
      name: "checklist",
      type: "text",
    },
    {
      admin: {
        description: "The treatments shown, in this order. Empty shows every treatment.",
      },
      hasMany: true,
      label: "Treatments",
      name: "treatments",
      relationTo: "treatments",
      type: "relationship",
    },
    {
      admin: { description: "The words on each card's button, for example Learn More." },
      label: "Card button text",
      name: "linkText",
      type: "text",
    },
    siteButton({ description: "The button under the cards. Empty text hides it." }),
  ],
  interfaceName: "TreatmentCardsBlock",
  label: "Treatment cards",
  slug: "treatCards",
});

export const PostSliderBlock: Block = siteBlock({
  fields: [
    imageField("logo", "Blog logo", "The small logo above the heading. Empty hides it."),
    sectionHeading(),
    siteButton(),
    {
      admin: {
        description: "The articles shown, in this order. Empty shows the newest articles.",
      },
      hasMany: true,
      label: "Articles",
      name: "posts",
      relationTo: "posts",
      type: "relationship",
    },
    {
      admin: { description: "How many of the newest articles to show when none are picked." },
      defaultValue: 6,
      label: "Number of articles",
      max: 12,
      min: 1,
      name: "limit",
      type: "number",
    },
  ],
  interfaceName: "PostSliderBlock",
  label: "Articles slider",
  slug: "postSlider",
});

export const SiteCtaBlock: Block = siteBlock({
  fields: [
    {
      admin: { description: "The large line, for example Take the Vein Health Quiz." },
      label: "Title",
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: { description: "One sentence under the title." },
      label: "Text",
      name: "text",
      type: "text",
    },
    siteButton(),
  ],
  interfaceName: "SiteCtaBlock",
  label: "Call to action band",
  slug: "siteCta",
});

export const HeroBannerBlock: Block = siteBlock({
  fields: [
    headingRichText({
      description: "The page's main heading.",
      label: "Heading",
      name: "heading",
      required: true,
    }),
    {
      admin: { description: "The smaller line under the heading. Empty hides it." },
      label: "Subheading",
      name: "subheading",
      type: "text",
    },
    sectionText("The paragraph under the heading."),
    siteButton(),
    imageField(
      "image",
      "Picture",
      "The picture beside the heading. Empty shows the heading on a plain band."
    ),
  ],
  interfaceName: "HeroBannerBlock",
  label: "Hero with picture",
  slug: "heroBanner",
});

/** The top sections a page can open with, in the site's own design. */
export const siteHeroBlocks: Block[] = [HeroVideoBlock, HeroBannerBlock];
