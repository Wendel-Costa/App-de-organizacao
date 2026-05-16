import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { TimePicker } from '@/components/TimePicker';
import { TextInput } from 'react-native-gesture-handler';
import { Linking } from 'react-native';

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
    name,
    requestPermissions,
    setTaskReminder,
    setDueDateWarning,
    setHabitsReminder,
    setFocusReminder,
    disableAllNotifications,
    setName,
  } = useSettingsStore();
  const [localName, setLocalName] = useState(name);
  const [showAbout, setShowAbout] = useState(false);

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
        <Text style={styles.sectionTitle}>Perfil</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="account-outline"
            label="Meu nome"
            description="Aparece na saudação da Home"
          >
            <View />
          </SettingRow>
          <View style={styles.nameInputRow}>
            <TextInput
              style={styles.nameInput}
              value={localName}
              onChangeText={setLocalName}
              placeholder="Seu nome..."
              placeholderTextColor={colors.textDisabled}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={() => setName(localName)}
              onBlur={() => setName(localName)}
            />
          </View>
        </Card>

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
          <TouchableOpacity onPress={() => setShowAbout(true)} activeOpacity={0.7}>
            <SettingRow
              icon="information-outline"
              label="Sobre o FocoMais"
              description="Versão 1.0.0"
            >
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textDisabled} />
            </SettingRow>
          </TouchableOpacity>
        </Card>

        <TouchableOpacity
          style={styles.watermark}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert(
              'Abrir repositório',
              'Você será direcionado ao repositório do projeto no GitHub, deseja continuar?',
              [
                {
                  text: 'Cancelar',
                  style: 'cancel',
                },
                {
                  text: 'Continuar',
                  onPress: async () => {
                    const url = 'https://github.com/Wendel-Costa/App-de-organizacao';

                    const supported = await Linking.canOpenURL(url);

                    if (supported) {
                      await Linking.openURL(url);
                    } else {
                      Alert.alert('Erro', 'Não foi possível abrir o link.');
                    }
                  },
                },
              ],
            );
          }}
        >
          <Text style={styles.watermarkText}>FocoMais © 2026</Text>
          <Text style={styles.watermarkSub}>Feito por Wendel Costa</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAbout} transparent animationType="fade">
        <View style={styles.aboutOverlay}>
          <View style={styles.aboutContainer}>
            <View style={styles.aboutLogo}>
              <MaterialCommunityIcons name="timer-outline" size={48} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.aboutAppName}>FocoMais</Text>
            <Text style={styles.aboutVersion}>Versão 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              App de organização pessoal com foco em produtividade, hábitos e metas.
            </Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutCredit}>Feito por Wendel Costa</Text>
            <Text style={styles.aboutYear}>© 2026</Text>
            <TouchableOpacity
              style={styles.aboutCloseBtn}
              onPress={() => setShowAbout(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.aboutCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: spacing.lg,
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

  nameInputRow: { paddingHorizontal: spacing.sm },
  nameInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  aboutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  aboutContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutAppName: { ...typography.h2, color: colors.textPrimary },
  aboutVersion: { ...typography.sm, color: colors.textSecondary },
  aboutDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  aboutDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  aboutCredit: { ...typography.label, color: colors.textPrimary },
  aboutYear: { ...typography.sm, color: colors.textDisabled },
  aboutCloseBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  aboutCloseText: { ...typography.label, color: colors.textOnPrimary },

  watermark: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: 2,
  },
  watermarkText: {
    ...typography.label,
    color: colors.textDisabled,
  },

  watermarkSub: {
    ...typography.xs,
    color: colors.textDisabled,
  },
});
