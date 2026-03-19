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

export const prettifyModelName = (modelId: string) =>
  modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const getAvailableModels = async (): Promise<Model[]> => {
  try {
    const response = await api.get<OpenAIModelListResponse>('/models')

    // Backend already filters to accessible chat models only — just sort and shape.
    const models = response.data.data
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
