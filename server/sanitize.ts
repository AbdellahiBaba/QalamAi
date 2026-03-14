import sanitizeHtml from "sanitize-html";

export function sanitizeText(input: string | undefined | null): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape",
  }).trim();
}

export function sanitizeRichText(input: string | undefined | null): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: ["p", "br", "b", "i", "u", "strong", "em", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "a", "div", "span"],
    allowedAttributes: {
      "a": ["href", "target", "rel"],
    },
    disallowedTagsMode: "recursiveEscape",
  }).trim();
}
