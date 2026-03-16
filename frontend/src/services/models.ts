import api, { getErrorMessage } from './api'
import type { Model } from '../types'

type OpenAIModel = {
  id: string
  created: number
  object: 'model'
  owned_by: string
}

type OpenAIModelListResponse = {
  object: 'list'
  data: OpenAIModel[]
}

const isLikelyChatModel = (modelId: string) => {
  const id = modelId.toLowerCase()
  const includePrefixes = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt-']
  const excludeTokens = ['embedding', 'tts', 'transcribe', 'whisper', 'moderation', 'image', 'audio']

  if (!includePrefixes.some((prefix) => id.startsWith(prefix))) {
    return false
  }

  return !excludeTokens.some((token) => id.includes(token))
}

const prettifyModelName = (modelId: string) =>
  modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const getAvailableModels = async (): Promise<Model[]> => {
  try {
    const response = await api.get<OpenAIModelListResponse>('/models')

    const models = response.data.data
      .filter((model) => isLikelyChatModel(model.id))
      .sort((a, b) => b.created - a.created)
      .map((model) => ({
        id: model.id,
        name: prettifyModelName(model.id),
        category: model.owned_by || 'OpenAI',
      }))

    return models
  } catch (error) {
    throw new Error(`Failed to list models: ${getErrorMessage(error as any)}`)
  }
}
