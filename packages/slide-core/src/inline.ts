/** 改行を含まないテキストはインライン(段落で包まない)として扱う */
export function isInline(text: string): boolean {
  return !text.includes("\n");
}
