export interface NotebookTopic {
  id: string;
  notebookId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  totalTopics: number;
  completedTopics: number;
  progress: number;
  topics: NotebookTopic[];
}

export interface NotebookProgress {
  totalTopics: number;
  completedTopics: number;
  progress: number;
}
