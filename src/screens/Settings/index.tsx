import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { TimePicker } from '@/components/TimePicker';

interface SettingsScreenProps {
  onBack: () => void;
}

function timeToString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function stringToTime(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(':').map(Number);
  return { hour: h, minute: m };
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const {
    notificationsEnabled,
    taskReminderEnabled,
    taskReminderHour,
    dueDateWarningEnabled,
    habitsReminderEnabled,
    habitsReminderHour,
    habitsReminderMinute,
    focusReminderEnabled,
    focusReminderHour,
    focusReminderMinute,
    requestPermissions,
    setTaskReminder,
    setDueDateWarning,
    setHabitsReminder,
    setFocusReminder,
    disableAllNotifications,
  } = useSettingsStore();

  async function handleEnableNotifications(value: boolean) {
    if (value) {
      await requestPermissions();
    } else {
      Alert.alert('Desativar notificações', 'Todas as notificações agendadas serão canceladas.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', style: 'destructive', onPress: disableAllNotifications },
      ]);
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Configurações" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Notificações</Text>

        <Card style={styles.card}>
          <SettingRow
            icon="bell-outline"
            label="Ativar notificações"
            description={notificationsEnabled ? 'Notificações ativas' : 'Toque para permitir'}
          >
            <Switch
              value={notificationsEnabled}
              onValueChange={handleEnableNotifications}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </SettingRow>
        </Card>

        {notificationsEnabled && (
          <>
            <Text style={styles.sectionTitle}>Tarefas agendadas</Text>
            <Card style={styles.card}>
              <SettingRow
                icon="calendar-check-outline"
                label="Lembrete de tarefas do dia"
                description="Avisa no dia da tarefa agendada"
              >
                <Switch
                  value={taskReminderEnabled}
                  onValueChange={(v) => setTaskReminder(v)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </SettingRow>

              {taskReminderEnabled && (
                <View style={styles.subSetting}>
                  <Text style={styles.subSettingLabel}>Horário do lembrete</Text>
                  <TimePicker
                    value={timeToString(taskReminderHour, 0)}
                    onChange={(t) => {
                      const { hour } = stringToTime(t);
                      setTaskReminder(true, hour);
                    }}
                  />
                </View>
              )}

              <View style={styles.divider} />

              <SettingRow
                icon="calendar-clock"
                label="Aviso de data limite"
                description="Avisa um dia antes do prazo"
              >
                <Switch
                  value={dueDateWarningEnabled}
                  onValueChange={setDueDateWarning}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </SettingRow>
            </Card>

            <Text style={styles.sectionTitle}>Hábitos</Text>
            <Card style={styles.card}>
              <SettingRow
                icon="repeat"
                label="Lembrete diário de hábitos"
                description="Notifica todos os dias para marcar seus hábitos"
              >
                <Switch
                  value={habitsReminderEnabled}
                  onValueChange={(v) => setHabitsReminder(v)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </SettingRow>

              {habitsReminderEnabled && (
                <View style={styles.subSetting}>
                  <Text style={styles.subSettingLabel}>Horário</Text>
                  <TimePicker
                    value={timeToString(habitsReminderHour, habitsReminderMinute)}
                    onChange={(t) => {
                      const { hour, minute } = stringToTime(t);
                      setHabitsReminder(true, hour, minute);
                    }}
                  />
                </View>
              )}
            </Card>

            <Text style={styles.sectionTitle}>Foco</Text>
            <Card style={styles.card}>
              <SettingRow
                icon="timer-outline"
                label="Lembrete diário de foco"
                description="Notifica para iniciar uma sessão de estudo"
              >
                <Switch
                  value={focusReminderEnabled}
                  onValueChange={(v) => setFocusReminder(v)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </SettingRow>

              {focusReminderEnabled && (
                <View style={styles.subSetting}>
                  <Text style={styles.subSettingLabel}>Horário</Text>
                  <TimePicker
                    value={timeToString(focusReminderHour, focusReminderMinute)}
                    onChange={(t) => {
                      const { hour, minute } = stringToTime(t);
                      setFocusReminder(true, hour, minute);
                    }}
                  />
                </View>
              )}
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>Sobre</Text>
        <Card style={styles.card}>
          <SettingRow icon="information-outline" label="Versão" description="1.0.0">
            <Text style={styles.versionText}>1.0.0</Text>
          </SettingRow>
        </Card>
      </ScrollView>
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ icon, label, description, children }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  settingDescription: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  subSetting: {
    paddingLeft: spacing.xl + spacing.sm,
    gap: spacing.xs,
  },
  subSettingLabel: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  versionText: {
    ...typography.label,
    color: colors.textDisabled,
  },
});
