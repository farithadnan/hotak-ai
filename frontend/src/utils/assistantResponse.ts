export type ParsedAssistantResponse = {
  content: string
  sources: string[]
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

  // Remove inline citation markers such as [1], [2], etc.
  const cleanedContent = contentPart
    .replace(/\s*\[\d+\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
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
    .filter((line) => line.length > 0 && !/^none$/i.test(line))

  return {
    content: cleanedContent,
    sources,
  }
}