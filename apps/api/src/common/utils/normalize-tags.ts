export function normalizeTags(tags: readonly string[] | undefined): string[] {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
}

export function normalizeTagsInput(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  const normalized: unknown[] = [];
  const stringTags = new Set<string>();

  value.forEach((item) => {
    if (typeof item !== 'string') {
      normalized.push(item);
      return;
    }

    const tag = item.trim();
    if (tag && !stringTags.has(tag)) {
      stringTags.add(tag);
      normalized.push(tag);
    }
  });

  return normalized;
}
