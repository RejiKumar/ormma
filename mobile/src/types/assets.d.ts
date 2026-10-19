// Bundled font files resolve to a Metro asset id.
declare module "*.ttf" {
  const asset: number;
  export default asset;
}
