declare module '*.scss' {
  const content: { readonly [key: string]: string }
  export default content
}

declare module '*.module.scss' {
  const content: { readonly [key: string]: string }
  export default content
}
