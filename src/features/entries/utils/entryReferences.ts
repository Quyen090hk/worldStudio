export function getReferencedEntryIds(content: string) {
  const ids = new Set<string>();
  const linkPattern = /href\s*=\s*(["'])\/entries\/([^"'?#]+)(?:[?#][^"']*)?\1/giu;

  for (const match of content.matchAll(linkPattern)) {
    const encodedId = match[2];
    if (!encodedId) continue;

    try {
      ids.add(decodeURIComponent(encodedId));
    } catch {
      ids.add(encodedId);
    }
  }

  return ids;
}
