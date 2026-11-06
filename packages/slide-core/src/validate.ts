import { BlockLayout, DeckLayout, SlideLayout, type DeckNode } from "@yadeck/slide-schema";
import type { Binding, Container } from "./container.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((i) => `${i.path}: ${i.message}`).join("\n"));
  }
}

/**
 * 各段で tags から Layout を解決し、その type で自分のフィールドを検証する。
 * children は次の段で再帰的に検証するので、ここでは除いて渡す。
 */
export function validateDeck(container: Container, deck: DeckNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const check = (binding: { schema: Binding["schema"] }, node: Record<string, unknown>, path: string) => {
    const r = binding.schema.strict().safeParse(node);
    if (r.success) return;
    for (const i of r.error.issues) {
      issues.push({ path: [path, ...i.path.map(String)].join("."), message: i.message });
    }
  };

  const { slides, ...deckFields } = deck;
  check(container.resolve(DeckLayout, deck.tags), deckFields, "deck");
  for (const slide of slides) {
    const { items, ...slideFields } = slide;
    check(container.resolve(SlideLayout, slide.tags), slideFields, slide.id);
    for (const block of items) {
      check(container.resolve(BlockLayout, block.tags), block, block.id);
    }
  }
  return issues;
}

export function assertValidDeck(container: Container, deck: DeckNode): void {
  const issues = validateDeck(container, deck);
  if (issues.length > 0) throw new ValidationError(issues);
}
