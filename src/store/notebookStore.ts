import { create } from 'zustand';
import { useGoalStore } from '@/store/goalStore';
import { useGamificationStore } from '@/store/gamificationStore';
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

const pendingTopicToggles = new Set<string>();

async function syncDependentGoals() {
  await useGoalStore.getState().fetchGoals(true);
}

interface NotebookState {
  notebooks: Notebook[];
  loading: boolean;
  lastFetchedAt: number;
  fetchNotebooks: (force?: boolean) => Promise<void>;
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
  lastFetchedAt: 0,

  fetchNotebooks: async (force = false) => {
    if (!force && Date.now() - get().lastFetchedAt < 10000) return;
    set({ loading: true });
    try {
      set({ notebooks: await getAllNotebooks(), loading: false, lastFetchedAt: Date.now() });
    } catch {
      set({ loading: false });
    }
  },

  addNotebook: async (title) => {
    const notebook = await createNotebook(title);
    set((state) => ({ notebooks: [...state.notebooks, notebook], lastFetchedAt: Date.now() }));
    await syncDependentGoals();
    return notebook;
  },

  editNotebook: async (id, title) => {
    await updateNotebook(id, title);
    set((state) => ({
      lastFetchedAt: Date.now(),
      notebooks: state.notebooks.map((n) =>
        n.id === id ? { ...n, title: title.trim(), updatedAt: new Date().toISOString() } : n,
      ),
    }));
    await syncDependentGoals();
  },

  removeNotebook: async (id) => {
    await deleteNotebook(id);
    set((state) => ({
      notebooks: state.notebooks.filter((n) => n.id !== id),
      lastFetchedAt: Date.now(),
    }));
    await syncDependentGoals();
  },

  addTopics: async (notebookId, input) => {
    const titles = parseTopicInput(input);
    if (!titles.length) return 0;
    const created = await addTopics(notebookId, titles);
    set((state) => ({
      notebooks: state.notebooks.map((notebook) => {
        if (notebook.id !== notebookId) return notebook;
        const topics = [...notebook.topics, ...created];
        return {
          ...notebook,
          topics,
          totalTopics: topics.length,
          updatedAt: new Date().toISOString(),
        };
      }),
      lastFetchedAt: Date.now(),
    }));
    await syncDependentGoals();
    return created.length;
  },

  editTopic: async (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const previous = get().notebooks;
    set((state) => ({
      notebooks: state.notebooks.map((notebook) => ({
        ...notebook,
        topics: notebook.topics.map((topic) =>
          topic.id === id ? { ...topic, title: trimmed } : topic,
        ),
      })),
      lastFetchedAt: Date.now(),
    }));
    try {
      await updateTopic(id, trimmed);
      await syncDependentGoals();
    } catch (error) {
      set({ notebooks: previous });
      throw error;
    }
  },

  removeTopic: async (id) => {
    const previous = get().notebooks;
    set((state) => ({
      notebooks: state.notebooks.map((notebook) => {
        const removed = notebook.topics.some((topic) => topic.id === id);
        if (!removed) return notebook;
        const topics = notebook.topics.filter((topic) => topic.id !== id);
        const completedTopics = topics.filter((topic) => topic.completed).length;
        return {
          ...notebook,
          topics,
          totalTopics: topics.length,
          completedTopics,
          progress: topics.length ? completedTopics / topics.length : 0,
        };
      }),
      lastFetchedAt: Date.now(),
    }));
    try {
      await deleteTopic(id);
      await syncDependentGoals();
    } catch (error) {
      set({ notebooks: previous });
      throw error;
    }
  },

  toggleTopic: async (id, completed) => {
    if (pendingTopicToggles.has(id)) return;
    const stateBefore = get();
    const before = stateBefore.notebooks.flatMap((n) => n.topics).find((t) => t.id === id);
    if (!before || before.completed === completed) return;
    const notebookBefore = stateBefore.notebooks.find((n) => n.id === before.notebookId);
    const previous = stateBefore.notebooks;
    pendingTopicToggles.add(id);

    set((state) => ({
      notebooks: state.notebooks.map((notebook) => {
        if (notebook.id !== before.notebookId) return notebook;
        const topics = notebook.topics.map((topic) =>
          topic.id === id ? { ...topic, completed, updatedAt: new Date().toISOString() } : topic,
        );
        const completedTopics = topics.filter((topic) => topic.completed).length;
        return {
          ...notebook,
          topics,
          completedTopics,
          totalTopics: topics.length,
          progress: topics.length ? completedTopics / topics.length : 0,
          updatedAt: new Date().toISOString(),
        };
      }),
      lastFetchedAt: Date.now(),
    }));

    try {
      await setTopicCompleted(id, completed);

      if (completed && !before.completed) {
        const config = await getGamificationConfig();
        await awardProductiveAction('topic_completion', id, config.topicPoints, {
          metadata: { notebookId: before.notebookId },
        });

        const notebook = get().notebooks.find((n) => n.id === before.notebookId);
        if (notebook?.progress === 1 && notebookBefore?.progress !== 1) {
          await grantUniqueAchievement(
            'notebook_completion',
            notebook.id,
            config.notebookCompletionPoints,
          );
        }
        await useGamificationStore.getState().refreshSummary();
      } else if (!completed && before.completed) {
        await reverseLatestProductiveAction('topic_completion', id);
        await useGamificationStore.getState().refreshSummary();
      }
      await syncDependentGoals();
    } catch (error) {
      set({ notebooks: previous });
      throw error;
    } finally {
      pendingTopicToggles.delete(id);
    }
  },

  reorderTopics: async (notebookId, orderedIds) => {
    const previous = get().notebooks;
    set((state) => ({
      notebooks: state.notebooks.map((notebook) => {
        if (notebook.id !== notebookId) return notebook;
        const byId = new Map(notebook.topics.map((topic) => [topic.id, topic]));
        const ordered = orderedIds
          .map((id, index) => {
            const topic = byId.get(id);
            return topic ? { ...topic, sortOrder: index } : null;
          })
          .filter((topic): topic is (typeof notebook.topics)[number] => topic !== null);
        const untouched = notebook.topics.filter((topic) => !orderedIds.includes(topic.id));
        return { ...notebook, topics: [...ordered, ...untouched] };
      }),
      lastFetchedAt: Date.now(),
    }));
    try {
      await reorderTopics(notebookId, orderedIds);
    } catch (error) {
      set({ notebooks: previous });
      throw error;
    }
  },

  reorderNotebooks: async (orderedIds) => {
    const previous = get().notebooks;
    set((state) => {
      const byId = new Map(state.notebooks.map((notebook) => [notebook.id, notebook]));
      const ordered = orderedIds
        .map((id, index) => {
          const notebook = byId.get(id);
          return notebook ? { ...notebook, sortOrder: index } : null;
        })
        .filter((notebook): notebook is (typeof state.notebooks)[number] => notebook !== null);
      const untouched = state.notebooks.filter((notebook) => !orderedIds.includes(notebook.id));
      return { notebooks: [...ordered, ...untouched], lastFetchedAt: Date.now() };
    });
    try {
      await reorderNotebooks(orderedIds);
    } catch (error) {
      set({ notebooks: previous });
      throw error;
    }
  },
}));
