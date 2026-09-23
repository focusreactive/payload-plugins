import type { Person } from "@/payload-types";
import { getPayloadClient } from "@/lib/dal/payload-client";
import { ingestInsightFromPassle } from "@/lib/passle/ingestInsightFromPassle";

import { passleFixturesByShortcode } from "@/lib/passle/fixtures";

/**
 * Prerequisite CMS data, not Passle data: the real webhook never creates a
 * Person, it only ever matches an incoming author email against one that
 * already exists. Seeded first, and separately from the ingest path, so a
 * rehearsal can also exercise the "no match" branch by leaving one out.
 *
 * Names, job titles and emails are real (public bylines); markets are
 * inferred from each person's office, since the source site does not carry
 * a market field at all.
 */
const seedPeople: Array<{
  email: string;
  jobTitle: string;
  markets: NonNullable<Person["markets"]>;
  name: string;
  office: string;
}> = [
  {
    email: "zsu@example.com",
    jobTitle: "Partner",
    markets: ["greater-china"],
    name: "Zephyr Su",
    office: "Hong Kong",
  },
  {
    email: "xhuang@example.com",
    jobTitle: "Partner | Head of the Trade Mark team & Legal Representative",
    markets: ["greater-china"],
    name: "Xuefang Huang",
    office: "Hong Kong",
  },
  {
    email: "awilson@example.com",
    jobTitle: "Senior Associate",
    markets: ["uk-europe"],
    name: "Adam Wilson",
    office: "London",
  },
  {
    email: "lmansion-bowen@example.com",
    jobTitle: "Associate",
    markets: ["uk-europe"],
    name: "Louise Mansion-Bowen",
    office: "London",
  },
  {
    email: "mshaw@example.com",
    jobTitle: "Partner",
    markets: ["uk-europe"],
    name: "Michael Shaw",
    office: "London",
  },
  {
    email: "mchu@example.com",
    jobTitle: "Office Managing Partner",
    markets: ["greater-china"],
    name: "Monique Chu",
    office: "Hong Kong",
  },
  {
    email: "npearson@example.com",
    jobTitle: "Partner",
    markets: ["uk-europe"],
    name: "Noëlle Pearson",
    office: "London",
  },
  {
    email: "amorris@example.com",
    jobTitle: "Associate",
    markets: ["uk-europe"],
    name: "Amy Morris",
    office: "London",
  },
  {
    email: "ecant@example.com",
    jobTitle: "Associate",
    markets: ["uk-europe"],
    name: "Elise Cant",
    office: "London",
  },
  {
    email: "tprock@example.com",
    jobTitle: "Partner",
    markets: ["uk-europe"],
    name: "Thomas Prock",
    office: "London",
  },
  {
    email: "atiberia@example.com",
    jobTitle: "Trainee Patent Attorney",
    markets: ["uk-europe"],
    name: "Andrew Tiberia",
    office: "London",
  },
  {
    email: "mparr@example.com",
    jobTitle: "Associate",
    markets: ["uk-europe"],
    name: "Matthew Parr",
    office: "London",
  },
  {
    email: "fphillips@example.com",
    jobTitle: "Partner",
    markets: ["uk-europe"],
    name: "Fiona Phillips",
    office: "London",
  },
  {
    email: "tkarger@example.com",
    jobTitle: "Partner",
    markets: ["uk-europe"],
    name: "Tomas Karger",
    office: "London",
  },
  {
    email: "kbassi@example.com",
    jobTitle: "Associate",
    markets: ["uk-europe"],
    name: "Kameel Kaur Bassi",
    office: "London",
  },
  {
    email: "eduhs@example.com",
    jobTitle: "Partner",
    markets: ["uk-europe"],
    name: "Eleonor Duhs",
    office: "London",
  },
  {
    email: "kchen@example.com",
    jobTitle: "Associate",
    markets: ["se-asia"],
    name: "Kimberly Chen",
    office: "Singapore",
  },
  {
    email: "vguuk@example.com",
    jobTitle: "Associate",
    markets: ["se-asia"],
    name: "Veronica Guuk",
    office: "Kuala Lumpur",
  },
  {
    email: "clovrics@example.com",
    jobTitle: "Partner | Head of Trademarks and Copyright (Canada)",
    markets: ["canada"],
    name: "Cat Lovrics",
    office: "Toronto",
  },
  {
    email: "rmcnaughton@example.com",
    jobTitle: "Associate",
    markets: ["canada"],
    name: "Robert A. McNaughton",
    office: "Toronto",
  },
  {
    email: "jgregoire@example.com",
    jobTitle: "Partner",
    markets: ["canada"],
    name: "Jean-Charles Grégoire",
    office: "Toronto",
  },
  // Deliberately left out of this list: exercises the ingest's "author email
  // matches no Person" branch on whichever fixture cites Elena Sadovnikova.
];

export async function seedPeopleRecords(payload: Awaited<ReturnType<typeof getPayloadClient>>) {
  for (const person of seedPeople) {
    const existingPerson = await payload.find({
      collection: "person",
      limit: 1,
      overrideAccess: true,
      where: {
        email: { equals: person.email },
      },
    });

    const existingId = existingPerson.docs[0]?.id;
    if (existingId) {
      await payload.update({
        id: existingId,
        collection: "person",
        data: person,
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "person",
        data: person,
        overrideAccess: true,
      });
    }
  }
}

export async function seedInsightsFromFixtures(
  payload: Awaited<ReturnType<typeof getPayloadClient>>
) {
  const fixtureFileNames = Object.keys(passleFixturesByShortcode).map(
    (shortcode) => `${shortcode}.json`
  );

  for (const fixtureFileName of fixtureFileNames) {
    const postShortcode = fixtureFileName.replace(/\.json$/, "");

    const result = await ingestInsightFromPassle({
      // Rehearsal seeding creates or updates twenty documents in one run;
      // nothing here should block on twenty OpenAI round trips for an
      // embedding index. `Posts` does not check this flag today either
      // (there is no shared skip-embedding convention yet in this
      // codebase), so this is forward-compatible rather than load-bearing.
      context: { skipEmbedding: true },
      payload,
      postShortcode,
    });

    const authorStatus = result.authorMatched
      ? "author matched"
      : `author NOT matched (${result.unmatchedAuthorEmail ?? "no author email on the post"})`;

    // eslint-disable-next-line no-console
    console.log(`${postShortcode}: ${result.created ? "created" : "updated"}, ${authorStatus}`);
  }
}

// No CLI entry point here on purpose: the demo-seed route calls both functions, so one reset
// rebuilds pages, people and insights together instead of leaving the Passle half to a script
// nobody remembers to run.
