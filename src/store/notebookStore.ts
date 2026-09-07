import { create } from 'zustand';
import type { Notebook } from '@/types/notebook.types';
import {
  addTopics,
  createNotebook,
  deleteNotebook,
  deleteTopic,
  getAllNotebooks,
  parseTopicInput,
  reorderNotebooks,
  reorderTopics,
  setTopicCompleted,
  updateNotebook,
  updateTopic,
} from '@/database/queries/notebooks.queries';
import {
  awardProductiveAction,
  getGamificationConfig,
  grantUniqueAchievement,
  reverseLatestProductiveAction,
} from '@/services/gamification.service';

interface NotebookState {
  notebooks: Notebook[];
  loading: boolean;
  fetchNotebooks: () => Promise<void>;
  addNotebook: (title: string) => Promise<Notebook>;
  editNotebook: (id: string, title: string) => Promise<void>;
  removeNotebook: (id: string) => Promise<void>;
  addTopics: (notebookId: string, input: string) => Promise<number>;
  editTopic: (id: string, title: string) => Promise<void>;
  removeTopic: (id: string) => Promise<void>;
  toggleTopic: (id: string, completed: boolean) => Promise<void>;
  reorderTopics: (notebookId: string, orderedIds: string[]) => Promise<void>;
  reorderNotebooks: (orderedIds: string[]) => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  loading: false,

  fetchNotebooks: async () => {
    set({ loading: true });
    try {
      set({ notebooks: await getAllNotebooks(), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addNotebook: async (title) => {
    const notebook = await createNotebook(title);
    set((state) => ({ notebooks: [...state.notebooks, notebook] }));
    return notebook;
  },

  editNotebook: async (id, title) => {
    await updateNotebook(id, title);
    set((state) => ({
      notebooks: state.notebooks.map((n) =>
        n.id === id ? { ...n, title: title.trim(), updatedAt: new Date().toISOString() } : n,
      ),
    }));
  },

  removeNotebook: async (id) => {
    await deleteNotebook(id);
    set((state) => ({ notebooks: state.notebooks.filter((n) => n.id !== id) }));
  },

  addTopics: async (notebookId, input) => {
    const titles = parseTopicInput(input);
    if (!titles.length) return 0;
    const created = await addTopics(notebookId, titles);
    await get().fetchNotebooks();
    return created.length;
  },

  editTopic: async (id, title) => {
    await updateTopic(id, title);
    await get().fetchNotebooks();
  },

  removeTopic: async (id) => {
    await deleteTopic(id);
    await get().fetchNotebooks();
  },

  toggleTopic: async (id, completed) => {
    const before = get()
      .notebooks.flatMap((n) => n.topics)
      .find((t) => t.id === id);
    const notebookBefore = get().notebooks.find((n) => n.id === before?.notebookId);
    await setTopicCompleted(id, completed);

    if (completed && !before?.completed) {
      const config = await getGamificationConfig();
      await awardProductiveAction('topic_completion', id, config.topicPoints, {
        metadata: { notebookId: before?.notebookId },
      });

      const notebook = (await getAllNotebooks()).find((n) => n.id === before?.notebookId);
      if (notebook?.progress === 1 && notebookBefore?.progress !== 1) {
        await grantUniqueAchievement(
          'notebook_completion',
          notebook.id,
          config.notebookCompletionPoints,
        );
      }
    } else if (!completed && before?.completed) {
      await reverseLatestProductiveAction('topic_completion', id);
    }

    await get().fetchNotebooks();
  },

  reorderTopics: async (notebookId, orderedIds) => {
    await reorderTopics(notebookId, orderedIds);
    await get().fetchNotebooks();
  },

  reorderNotebooks: async (orderedIds) => {
    await reorderNotebooks(orderedIds);
    await get().fetchNotebooks();
  },
}));
