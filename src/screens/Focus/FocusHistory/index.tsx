import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusStore } from '@/store/focusStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { TimelineBar } from '@/components/TimelineBar';
import { ManualRegisterScreen } from '../ActiveFocus/ManualRegister';

interface FocusHistoryScreenProps {
  onBack: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function FocusHistoryScreen({ onBack }: FocusHistoryScreenProps) {
  const { sessions, fetchSessions, removeSession } = useFocusStore();
  const [showManual, setShowManual] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchSessions();
  }, []);

  if (showManual) {
    return (
      <ManualRegisterScreen
        onBack={() => setShowManual(false)}
        onSuccess={() => {
          setShowManual(false);
          fetchSessions();
        }}
      />
    );
  }

  function handleDelete(id: string) {
    Alert.alert('Excluir sessão', 'Deseja excluir este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removeSession(id) },
    ]);
  }

  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Histórico de foco"
        onBack={onBack}
        rightAction={{ icon: 'plus', onPress: () => setShowManual(true) }}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon="timer-outline"
          title="Nenhuma sessão ainda"
          description="Complete uma sessão ou registre manualmente"
          actionLabel="Registrar manualmente"
          onAction={() => setShowManual(true)}
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <Card style={styles.summaryCard}>
                <View style={globalStyles.rowBetween}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{sessions.length}</Text>
                    <Text style={styles.summaryLabel}>Sessões</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {formatDuration(Math.round(totalMinutes / sessions.length))}
                    </Text>
                    <Text style={styles.summaryLabel}>Média</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.timelineCard}>
                <TimelineBar sessions={sessions} date={todayStr} />
              </Card>

              <Text style={styles.sectionTitle}>Todas as sessões</Text>
            </>
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Card style={styles.sessionCard}>
              <View style={globalStyles.rowBetween}>
                <View style={styles.sessionLeft}>
                  <MaterialCommunityIcons
                    name={item.mode === 'pomodoro' ? 'timer-outline' : 'infinity'}
                    size={20}
                    color={colors.primary}
                  />
                  <View>
                    <Text style={styles.sessionTheme}>{item.themeName ?? 'Foco geral'}</Text>
                    <Text style={styles.sessionTime}>
                      {new Date(item.startTime).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      ·{' '}
                      {new Date(item.startTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' — '}
                      {new Date(item.endTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionRight}>
                  <Text style={styles.sessionDuration}>{formatDuration(item.duration)}</Text>
                  {item.isManual && <Text style={styles.manualBadge}>manual</Text>}
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={16}
                      color={colors.textDisabled}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
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
  summaryCard: {
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  timelineCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  sessionCard: {
    paddingVertical: spacing.sm,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sessionTheme: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sessionTime: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionDuration: {
    ...typography.label,
    color: colors.primaryDark,
  },
  manualBadge: {
    ...typography.xs,
    color: colors.textDisabled,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
