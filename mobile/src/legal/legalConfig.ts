/**
 * Where the published privacy policy and terms live. Leave a value empty until the page is published;
 * the in-app reader then shows the text without an "Open online" link. Fill these in before release
 * (docs/RELEASE.md) with the same URLs given to Google Play.
 */
export const LEGAL_URLS = {
  privacy: "https://ormma-prod.web.app/privacy",
  terms: "https://ormma-prod.web.app/terms",
} as const;

export type LegalDocName = "privacy" | "terms";
