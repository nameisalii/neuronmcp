import { Pinecone } from '@pinecone-database/pinecone'

const apiKey = process.env.PINECONE_API_KEY
const indexName = process.env.PINECONE_INDEX
if (!apiKey) throw new Error('PINECONE_API_KEY is not configured')
if (!indexName) throw new Error('PINECONE_INDEX is not configured')

console.log('[pinecone] using index:', indexName)
const pinecone = new Pinecone({ apiKey })
export const index = pinecone.index(indexName)

export async function upsertEmbedding(
  id: string,
  embedding: number[],
  metadata: Record<string, string>
): Promise<void> {
  await index.upsert([{ id, values: embedding, metadata }])
}

export async function deleteEmbedding(id: string): Promise<void> {
  await index.deleteOne(id)
}

export async function deleteEmbeddings(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await index.deleteMany(ids)
}

// Wipes every vector in the index regardless of metadata.
// Only safe in single-workspace dev environments.
export async function deleteAllEmbeddings(): Promise<void> {
  await index.deleteAll()
}

export async function searchSimilar(
  embedding: number[],
  workspaceId: string,
  topK = 5,
  minScore = 0.5
): Promise<Array<{ id: string; score: number }>> {
  const results = await index.query({
    vector: embedding,
    topK,
    filter: { workspaceId: { $eq: workspaceId } },
    includeMetadata: false,
  })

  const raw = results.matches ?? []
  console.log(
    '[pinecone] raw matches before score filter:',
    raw.length,
    raw.map((m) => ({ id: m.id, score: m.score }))
  )

  return raw
    .filter((m) => (m.score ?? 0) >= minScore)
    .map((m) => ({ id: m.id, score: m.score ?? 0 }))
}
