export function fakeResearcherAnswering(lang: string) {
  return function FakeResearcher() {
    return { getResearch: () => lang };
  };
}

export const fakeEnglish = fakeResearcherAnswering("en");
