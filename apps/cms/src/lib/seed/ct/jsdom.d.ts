// jsdom ships no types and @types/jsdom is not installed; the seed only needs the parsed document.
declare module "jsdom" {
  export class JSDOM {
    constructor(html: string);
    readonly window: { readonly document: Document };
  }
}
