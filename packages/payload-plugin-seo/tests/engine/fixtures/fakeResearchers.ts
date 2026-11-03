/** A stand-in Yoast Researcher constructor whose every research answers with its language. */
export function fakeResearcher(lang: string) {
  return function FakeResearcher() {
    return { getResearch: () => lang };
  };
}

export const fakeEnglish = fakeResearcher("en");
