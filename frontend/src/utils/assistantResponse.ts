export type ParsedAssistantResponse = {
  content: string
  sources: string[]
}

const SOURCE_PUNCTUATION_SUFFIX = /[),.;:]+$/

function normalizeSourceValue(source: string): string {
  const trimmed = source.trim().replace(SOURCE_PUNCTUATION_SUFFIX, '')
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      url.hash = ''
      const normalizedUrl = url.toString().replace(/\/+$/, '')
      return normalizedUrl.toLowerCase()
    } catch {
      return trimmed.toLowerCase()
    }
  }

  return trimmed.replace(/\s+/g, ' ').toLowerCase()
}

export function dedupeSources(sources: string[]): string[] {
  const seen = new Set<string>()
  const uniqueSources: string[] = []

  for (const source of sources) {
    const normalized = normalizeSourceValue(source)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    uniqueSources.push(source.trim().replace(SOURCE_PUNCTUATION_SUFFIX, ''))
  }

  return uniqueSources
}

export function getSourceHref(source: string): string | null {
  const normalized = source.trim().replace(SOURCE_PUNCTUATION_SUFFIX, '')
  if (!/^https?:\/\//i.test(normalized)) {
    return null
  }

  try {
    return new URL(normalized).toString()
  } catch {
    return null
  }
}

/**
 * Parses a raw LLM response into structured content and sources.
 * 
 * The function looks for a "Sources:" header to separate the main content from the sources list.
 * @param raw a LLM's Result
 * @returns Parsed Response
 */
export function parseAssistantResponse(raw: string): ParsedAssistantResponse {
  const text = (raw ?? '').trim()
  if (!text) {
    return { content: '', sources: [] }
  }

  const sourcesHeaderMatch = /\n\s*Sources\s*:\s*/i.exec(text)

  let contentPart = text
  let sourcesPart = ''

  if (sourcesHeaderMatch && sourcesHeaderMatch.index >= 0) {
    contentPart = text.slice(0, sourcesHeaderMatch.index)
    sourcesPart = text.slice(sourcesHeaderMatch.index + sourcesHeaderMatch[0].length)
  }

  // Remove wrappers like "Question:" and keep only answer section if present.
  const answerMatch = /Answer\s*:\s*([\s\S]*)$/i.exec(contentPart)
  const contentCandidate = answerMatch ? answerMatch[1] : contentPart

  // Remove inline citation markers such as [1], [2], etc.
  const cleanedContent = contentCandidate
    .replace(/\s*\[\d+\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^Question\s*:\s*.*$/gim, '')
    .replace(/^Answer\s*:\s*/gim, '')
    .trim()

  if (!sourcesPart) {
    return { content: cleanedContent, sources: [] }
  }

  const sources = sourcesPart
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bullet = line.match(/^[-*]\s*(.+)$/)
      return bullet ? bullet[1].trim() : line
    })
    .map((line) => {
      const numbered = line.match(/^\[?\d+\]?\s*[:.)-]?\s*(.+)$/)
      return numbered ? numbered[1].trim() : line
    })
    .filter((line) => {
      if (line.length === 0) {
        return false
      }

      // Ignore placeholders/non-sources such as "None" or "None [1]"
      if (/^none(\s*\[\d+\])?$/i.test(line)) {
        return false
      }

      return true
    })

  return {
    content: cleanedContent,
    sources: dedupeSources(sources),
  }
}