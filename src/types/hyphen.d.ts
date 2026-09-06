declare module "hyphen" {
  type Hyphenator = (
    text: string,
    options?: { hyphenChar?: string },
  ) => string;

  export default function createHyphenator(
    patterns: unknown,
    options?: { sync?: boolean },
  ): Hyphenator;
}

declare module "hyphen/patterns/en-us" {
  const patterns: unknown;
  export default patterns;
}
