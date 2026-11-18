type Measured = { getBoundingClientRect?: () => DOMRect };

const emptyRect = (): DOMRect => new DOMRect(0, 0, 0, 0);

const measureAsEmpty = (prototype: Measured): void => {
  prototype.getBoundingClientRect ??= emptyRect;
};

export const measureSelectionsAsEmpty = (): void => {
  measureAsEmpty(Range.prototype);
  measureAsEmpty(Text.prototype as Measured);
};
