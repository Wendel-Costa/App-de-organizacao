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
import { ScrollView } from 'react-native-gesture-handler';
import { localDateStr, dateOf } from '@/utils/date';

interface FocusHistoryScreenProps {
  onBack: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getCurrentWeekRange() {
  const now = new Date();

  const startOfWeek = new Date(now);
  const day = now.getDay();
  startOfWeek.setDate(now.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

export function FocusHistoryScreen({ onBack }: FocusHistoryScreenProps) {
  const { sessions, themes, fetchSessions, fetchThemes, removeSession, editSessionTheme } =
    useFocusStore();
  const [showManual, setShowManual] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(localDateStr());

  useEffect(() => {
    fetchSessions();
    fetchThemes();
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

  const daySessions = sessions.filter((s) => dateOf(s.startTime) === selectedDate);

  const totalMinutes = daySessions.reduce((acc, s) => acc + s.duration, 0);

  const { startOfWeek, endOfWeek } = getCurrentWeekRange();
  const weekSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime);
    return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
  });

  const weeklyTotalMinutes = weekSessions.reduce((acc, s) => acc + s.duration, 0);
  const weeklySessionsCount = weekSessions.length;

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
          data={daySessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <Card style={styles.summaryCard}>
                <View style={globalStyles.rowBetween}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{weeklySessionsCount}</Text>
                    <Text style={styles.summaryLabel}>Sessões da semana</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{formatDuration(weeklyTotalMinutes)}</Text>
                    <Text style={styles.summaryLabel}>Tempo da semana</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.timelineCard}>
                <TimelineBar
                  sessions={sessions}
                  themes={themes}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              </Card>

              <View style={styles.dayHeader}>
                <Text style={styles.sectionTitle}>Sessões do dia</Text>
                {daySessions.length > 0 && (
                  <Text style={styles.dayTotal}>{formatDuration(totalMinutes)}</Text>
                )}
              </View>
            </>
          }
          ListEmptyComponent={<Text style={styles.emptyDayText}>Nenhuma sessão neste dia</Text>}
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
                    onPress={() => setEditingSession(editingSession === item.id ? null : item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="tag-outline"
                      size={16}
                      color={editingSession === item.id ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>

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

              {editingSession === item.id && (
                <View style={styles.themeSelector}>
                  <Text style={styles.themeSelectorLabel}>Alterar tema:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.themeSelectorRow}
                  >
                    <TouchableOpacity
                      style={[styles.themeChip, !item.themeId && styles.themeChipActive]}
                      onPress={async () => {
                        await editSessionTheme(item.id, undefined, undefined);
                        setEditingSession(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.themeChipLabel,
                          !item.themeId && styles.themeChipLabelActive,
                        ]}
                      >
                        Geral
                      </Text>
                    </TouchableOpacity>

                    {themes.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.themeChip, item.themeId === t.id && styles.themeChipActive]}
                        onPress={async () => {
                          await editSessionTheme(item.id, t.id, t.name);
                          setEditingSession(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.themeChipLabel,
                            item.themeId === t.id && styles.themeChipLabelActive,
                          ]}
                        >
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
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
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dayTotal: {
    ...typography.label,
    color: colors.primaryDark,
  },
  emptyDayText: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.lg,
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
  themeSelector: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  themeSelectorLabel: { ...typography.xs, color: colors.textSecondary },
  themeSelectorRow: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs },
  themeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  themeChipLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  themeChipLabelActive: { color: colors.textOnPrimary },
});
