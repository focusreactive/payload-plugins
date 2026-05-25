declare module "*.scss" {
  const content: Readonly<Record<string, string>>;
  export default content;
}

declare module "*.module.scss" {
  const content: Readonly<Record<string, string>>;
  export default content;
}
