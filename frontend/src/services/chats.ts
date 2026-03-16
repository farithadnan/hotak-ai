import api, { getErrorMessage } from './api';
import type { Chat, ChatCreate, ChatUpdate, Message } from '../types/models';

/**
 * Create a new chat session
 */
export const createChat = async (data: ChatCreate): Promise<Chat> => {
  try {
    const response = await api.post<Chat>('/chats', data);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create chat: ${getErrorMessage(error as any)}`);
  }
};

/**
 * Get all chat sessions
 */
export const getChats = async (): Promise<Chat[]> => {
  try {
    const response = await api.get<Chat[]>('/chats');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch chats: ${getErrorMessage(error as any)}`);
  }
};

/**
 * Get a specific chat session
 */
export const getChat = async (id: string): Promise<Chat> => {
  try {
    const response = await api.get<Chat>(`/chats/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch chat: ${getErrorMessage(error as any)}`);
  }
};

/**
 * Update chat metadata (title/template)
 */
export const updateChat = async (id: string, data: ChatUpdate): Promise<Chat> => {
  try {
    const response = await api.put<Chat>(`/chats/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update chat: ${getErrorMessage(error as any)}`);
  }
};

/**
 * Delete a chat session
 */
export const deleteChat = async (id: string): Promise<void> => {
  try {
    await api.delete(`/chats/${id}`);
  } catch (error) {
    throw new Error(`Failed to delete chat: ${getErrorMessage(error as any)}`);
  }
};

/**
 * Add a message to a chat session
 */
export const addMessage = async (chatId: string, message: Message): Promise<Chat> => {
  try {
    const response = await api.post<Chat>(`/chats/${chatId}/messages`, message);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to add message: ${getErrorMessage(error as any)}`);
  }
};

/**
 * Generate and persist title from chat content
 */
export const generateChatTitle = async (chatId: string): Promise<Chat> => {
  try {
    const response = await api.post<Chat>(`/chats/${chatId}/generate-title`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to generate chat title: ${getErrorMessage(error as any)}`);
  }
};
