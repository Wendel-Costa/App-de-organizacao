import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { TaskItem } from '@/components/TaskItem';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { CreateTaskScreen } from './CreateTask';
import type { Task } from '@/types/task.types';

type Filter = 'all' | 'today' | 'anytime' | 'recurring';
type Screen = 'list' | 'create';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoje' },
  { key: 'anytime', label: 'Livre' },
  { key: 'recurring', label: 'Rotina' },
];

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export function TasksScreen() {
  const { tasks, loading, fetchTasks, toggleComplete, removeTask } = useTaskStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [screen, setScreen] = useState<Screen>('list');

  useEffect(() => {
    fetchTasks();
  }, []);

  const filtered = tasks.filter((t) => {
    if (filter === 'today') return t.scheduledDate === getTodayString();
    if (filter === 'anytime') return t.type === 'anytime';
    if (filter === 'recurring') return t.type === 'recurring';
    return true;
  });

  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  function handlePress(_task: Task) {
    // em breve
  }

  if (screen === 'create') {
    return (
      <CreateTaskScreen onBack={() => setScreen('list')} onSuccess={() => setScreen('list')} />
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Tarefas" rightAction={{ icon: 'plus', onPress: () => setScreen('create') }} />

      <View style={styles.filtersWrapper}>
        <View style={styles.filters}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="playlist-check"
          title="Nenhuma tarefa aqui"
          description="Toque no + para adicionar uma nova tarefa"
        />
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            completed.length > 0 && pending.length > 0 ? (
              <Text style={styles.sectionLabel}>Pendentes ({pending.length})</Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const showCompletedHeader = index === pending.length && completed.length > 0;

            return (
              <>
                {showCompletedHeader && (
                  <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                    Concluídas ({completed.length})
                  </Text>
                )}
                <TaskItem
                  task={item}
                  onToggle={toggleComplete}
                  onPress={handlePress}
                  onDelete={removeTask}
                />
              </>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filtersWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  filterLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  filterLabelActive: {
    color: colors.textOnPrimary,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
});
