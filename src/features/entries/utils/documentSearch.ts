type SearchableTextNode = { isText: boolean; text?: string | null };
type SearchableDocument = {
  descendants: (callback: (node: SearchableTextNode, position: number) => void) => void;
};

export type DocumentTextMatch = { from: number; to: number };

export function findDocumentTextMatches(
  document: SearchableDocument,
  query: string,
): DocumentTextMatch[] {
  const needle = query.toLocaleLowerCase();
  if (!needle) return [];
  const matches: DocumentTextMatch[] = [];
  document.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLocaleLowerCase();
    let offset = text.indexOf(needle);
    while (offset !== -1) {
      matches.push({ from: position + offset, to: position + offset + query.length });
      offset = text.indexOf(needle, offset + Math.max(1, needle.length));
    }
  });
  return matches;
}
