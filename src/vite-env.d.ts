/// <reference types="vite/client" />

declare module "*.css?inline" {
  const styles: string;
  export default styles;
}
