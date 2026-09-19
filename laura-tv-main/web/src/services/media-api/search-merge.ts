const numericTmdbId = (query: string) => {
  const normalized = query.trim()
  if (!/^[1-9]\d{0,9}$/.test(normalized)) return undefined
  const id = Number(normalized)
  return Number.isSafeInteger(id) ? id : undefined
}

export async function searchWithExactId<T extends { id?: unknown }>(
  query: string,
  textSearch: () => Promise<T[]>,
  exactLookup: (id: number) => Promise<T>,
) {
  const id = numericTmdbId(query)
  if (id === undefined) return textSearch()

  const [results, exact] = await Promise.all([
    textSearch(),
    exactLookup(id).catch(() => undefined),
  ])
  if (!exact || exact.id !== id) return results
  return [exact, ...results.filter((result) => result.id !== id)]
}
