import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { globalStyles } from '@/styles/global';
import { colors, spacing } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { GoalCard } from '@/components/GoalCard';
import { EmptyState } from '@/components/EmptyState';
import { CreateGoalScreen } from './CreateGoal';
import { GoalDetailScreen } from './GoalDetail';
import type { Goal } from '@/types/goal.types';

type Screen = 'list' | 'create' | 'detail';

export function GoalsScreen() {
  const { goals, loading, fetchGoals, removeGoal } = useGoalStore();
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  function handlePress(goal: Goal) {
    setSelectedGoal(goal);
    setScreen('detail');
  }

  if (screen === 'create') {
    return (
      <CreateGoalScreen
        onBack={() => setScreen('list')}
        onSuccess={() => {
          fetchGoals();
          setScreen('list');
        }}
      />
    );
  }

  if (screen === 'detail' && selectedGoal) {
    const current = goals.find((g) => g.id === selectedGoal.id) ?? selectedGoal;
    return (
      <GoalDetailScreen
        goal={current}
        onBack={() => setScreen('list')}
        onDeleted={() => setScreen('list')}
      />
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Metas" rightAction={{ icon: 'plus', onPress: () => setScreen('create') }} />

      {loading ? (
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : goals.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          title="Nenhuma meta criada"
          description="Defina metas com período e tarefas para acompanhar seu progresso"
          actionLabel="Criar meta"
          onAction={() => setScreen('create')}
        />
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <GoalCard goal={item} onPress={handlePress} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
