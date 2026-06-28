export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isFavorite: boolean;
  categoryId: string | null;
  category: Category | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  name: string;
  description: string;
  content: string;
  isFavorite: boolean;
  categoryId: string | null;
  categoryName: string | null;
  tagIds: string[];
  tagNames: string[];
  createdAt: string;
}

export interface PromptPayload {
  name: string;
  description: string;
  content: string;
  categoryId: string | null;
  tagIds: string[];
  isFavorite: boolean;
}

export interface PromptQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  tagIds?: string[];
  tag?: string;
  favorite?: boolean;
}

export interface PromptPage {
  items: Prompt[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Solution {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SolutionPayload {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
}

export interface SolutionFilters {
  search: string;
  category: string;
}
