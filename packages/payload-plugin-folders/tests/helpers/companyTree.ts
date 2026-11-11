import type { Payload } from "payload";

/**
 * The rename from the agent trial: Company / Unternehmen holds three pages that are published in
 * both languages (About Us, Contact, Our Team).
 */
export type CompanyTree = {
  aboutUs: { id: number };
  company: { id: number };
  contact: { id: number };
  ourTeam: { id: number };
};

type Row = { id: number };

const createPage = (
  payload: Payload,
  folder: number,
  slugs: { de: string; en: string },
  titles: { de: string; en: string }
) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug: slugs, title: titles } as never,
    depth: 0,
    locale: "all",
    overrideAccess: true,
  }) as unknown as Promise<Row>;

export const seedCompanyTree = async (payload: Payload): Promise<CompanyTree> => {
  const company = (await payload.create({
    collection: "folders",
    data: {
      name: { de: "Unternehmen", en: "Company" },
      slug: { de: "unternehmen", en: "company" },
    },
    depth: 0,
    locale: "all",
    overrideAccess: true,
  })) as unknown as Row;

  return {
    aboutUs: await createPage(
      payload,
      company.id,
      { de: "ueber-uns", en: "about-us" },
      { de: "Ueber uns", en: "About Us" }
    ),
    company,
    contact: await createPage(
      payload,
      company.id,
      { de: "kontakt", en: "contact" },
      { de: "Kontakt", en: "Contact" }
    ),
    ourTeam: await createPage(
      payload,
      company.id,
      { de: "unser-team", en: "our-team" },
      { de: "Unser Team", en: "Our Team" }
    ),
  };
};
