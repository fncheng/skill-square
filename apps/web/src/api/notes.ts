import { http } from './request';
import type { Note, NotePayload } from '@/types/domain';

export interface NoteQuery {
  search?: string;
  category?: string;
}

export async function getNotes(query: NoteQuery = {}) {
  const response = await http.get<Note[]>('/notes', { params: query });
  return response.data;
}

export async function getNote(id: string) {
  const response = await http.get<Note>(`/notes/${id}`);
  return response.data;
}

export async function createNote(payload: NotePayload) {
  const response = await http.post<Note>('/notes', payload);
  return response.data;
}

export async function updateNote(id: string, payload: NotePayload) {
  const response = await http.put<Note>(`/notes/${id}`, payload);
  return response.data;
}

export async function deleteNote(id: string) {
  await http.delete(`/notes/${id}`);
}
