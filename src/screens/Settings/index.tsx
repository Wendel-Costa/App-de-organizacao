import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  Image,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system/legacy';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { TimePicker } from '@/components/TimePicker';
import { TextInput } from 'react-native-gesture-handler';
import { Linking } from 'react-native';
import { useGamificationStore } from '@/store/gamificationStore';
import { buildExportPayload, importData, pickImportFile } from '@/services/dataTransfer.service';
import { refreshStoresAfterDataRestore } from '@/services/dataSync.service';
import { formatWholeNumber } from '@/utils/number';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const { config: gameConfig, updateConfig: updateGameConfig } = useGamificationStore();
  const [importing, setImporting] = useState(false);

  async function handleEnableNotifications(value: boolean) {
    if (value) {
      await requestPermissions();
    } else {
      Alert.alert('Desativar notificações', 'Todas as notificações agendadas serão canceladas.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: disableAllNotifications,
        },
      ]);
    }
  }

  async function handleExportFile() {
    setShowExportModal(false);

    try {
      const payload = await buildExportPayload();
      const content = JSON.stringify(payload, null, 2);

      if (Platform.OS === 'android') {
        const saf = (FileSystem as any).StorageAccessFramework;

        if (!saf) {
          Alert.alert('Erro', 'Não foi possível acessar o sistema de armazenamento do Android.');
          return;
        }

        Alert.alert(
          'Salvar backup',
          'Deseja abrir o gerenciador de arquivos para escolher onde salvar o backup?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir gerenciador',
              onPress: () => {
                void (async () => {
                  try {
                    const permissions = await saf.requestDirectoryPermissionsAsync();
                    if (!permissions.granted) return;

                    const fileName = `backup_focomais_${new Date().toISOString().slice(0, 10)}.txt`;
                    const fileUri = await saf.createFileAsync(
                      permissions.directoryUri,
                      fileName,
                      'text/plain',
                    );

                    await FileSystem.writeAsStringAsync(fileUri, content);

                    Alert.alert('Exportação concluída', `O backup foi salvo como ${fileName}.`);
                  } catch {
                    Alert.alert('Erro', 'Não foi possível salvar o backup.');
                  }
                })();
              },
            },
          ],
        );
        return;
      }

      const uri = `${FileSystem.cacheDirectory}backup_focomais_${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(uri, content);

      Alert.alert('Exportação concluída', 'O arquivo foi preparado para compartilhamento.', [
        {
          text: 'OK',
          onPress: async () => {
            try {
              const Sharing = await import('expo-sharing');

              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                  mimeType: 'text/plain',
                  dialogTitle: 'Exportar dados do FocoMais',
                  UTI: 'public.plain-text',
                });
              }
            } catch {
              Alert.alert(
                'Erro',
                'O arquivo foi criado, mas não foi possível abrir o compartilhamento.',
              );
            }
          },
        },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível preparar a exportação.');
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

        <Text style={styles.sectionTitle}>Gamificação</Text>
        <Card style={styles.card}>
          <Text style={styles.gameHint}>
            As alterações valem apenas para ações futuras. O histórico não é recalculado.
          </Text>
          <SettingRow icon="star-four-points-outline" label="Pontuação avançada de tarefas">
            <Switch
              value={gameConfig.taskScoringEnabled}
              onValueChange={(value) =>
                void updateGameConfig({ taskScoringEnabled: value }).catch(() => {
                  Alert.alert('Erro', 'Não foi possível salvar a configuração de gamificação.');
                })
              }
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </SettingRow>
          <GameSetting
            label="Pontos por hora de foco"
            value={gameConfig.pointsPerFocusHour}
            onChange={(n) => updateGameConfig({ pointsPerFocusHour: n })}
          />
          {gameConfig.taskScoringEnabled && (
            <>
              <GameSetting
                label="Nível 1 de tarefa"
                value={gameConfig.taskLevel1Points}
                onChange={(n) => updateGameConfig({ taskLevel1Points: n })}
              />
              <GameSetting
                label="Nível 2 de tarefa"
                value={gameConfig.taskLevel2Points}
                onChange={(n) => updateGameConfig({ taskLevel2Points: n })}
              />
              <GameSetting
                label="Nível 3 de tarefa"
                value={gameConfig.taskLevel3Points}
                onChange={(n) => updateGameConfig({ taskLevel3Points: n })}
              />
            </>
          )}
          <GameSetting
            label="Tópico concluído"
            value={gameConfig.topicPoints}
            onChange={(n) => updateGameConfig({ topicPoints: n })}
          />
          <GameSetting
            label="Caderno concluído"
            value={gameConfig.notebookCompletionPoints}
            onChange={(n) => updateGameConfig({ notebookCompletionPoints: n })}
          />
          <GameSetting
            label="Meta concluída"
            value={gameConfig.goalCompletionPoints}
            onChange={(n) => updateGameConfig({ goalCompletionPoints: n })}
          />
        </Card>

        <Text style={styles.sectionTitle}>Dados</Text>

        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.dataButton}
            onPress={() => setShowExportModal(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="export" size={19} color={colors.primary} />
            <Text style={styles.dataButtonText}>Exportar dados</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.dataButton}
            onPress={() =>
              Alert.alert(
                'Importar dados',
                'Os dados atuais serão substituídos. Faça um backup antes de continuar.',
                [
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                  {
                    text: 'Importar',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        setImporting(true);
                        try {
                          const payload = await pickImportFile();
                          if (!payload) return;
                          await importData(payload);
                          await refreshStoresAfterDataRestore();
                          Alert.alert(
                            'Importação concluída',
                            'Os dados foram restaurados e o aplicativo foi sincronizado.',
                          );
                        } catch (e) {
                          Alert.alert(
                            'Importação não realizada',
                            e instanceof Error
                              ? e.message === 'INVALID_JSON'
                                ? 'O arquivo selecionado não contém um JSON válido.'
                                : e.message === 'INVALID_STRUCTURE'
                                  ? 'O arquivo possui uma estrutura inválida ou não corresponde ao formato atual dos dados do FocoMais.'
                                  : e.message
                              : 'Não foi possível importar os dados.',
                          );
                        } finally {
                          setImporting(false);
                        }
                      })();
                    },
                  },
                ],
              )
            }
            disabled={importing}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="import" size={19} color={colors.primary} />

            <Text style={styles.dataButtonText}>
              {importing ? 'Importando…' : 'Importar dados'}
            </Text>
          </TouchableOpacity>
        </Card>

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

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Exportar dados</Text>

            <Text style={styles.dialogDescription}>
              O backup oficial do aplicativo é salvo em formato TXT.
            </Text>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => void handleExportFile()}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonText}>Salvar TXT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowExportModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAbout}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={styles.aboutOverlay}>
          <View style={styles.aboutContainer}>
            <ScrollView
              style={styles.aboutScroll}
              contentContainerStyle={styles.aboutContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.aboutHero}>
                <View style={styles.aboutLogoFrame}>
                  <Image source={require('../../../assets/icon.png')} style={styles.logo} />
                </View>
                <Text style={styles.aboutAppName}>FocoMais</Text>
                <View style={styles.aboutVersionPill}>
                  <Text style={styles.aboutVersion}>VERSÃO 1.0.0</Text>
                </View>
              </View>

              <Text style={styles.aboutDesc}>
                Organize sua rotina, transforme intenção em constância e acompanhe sua evolução.
              </Text>

              <View style={styles.aboutDivider} />
              <Text style={styles.aboutSectionTitle}>Tudo para manter o ritmo</Text>

              <View style={styles.aboutFeatures}>
                {[
                  {
                    icon: 'checkbox-marked-circle-outline',
                    title: 'Tarefas',
                  },
                  {
                    icon: 'timer-outline',
                    title: 'Foco e Pomodoro',
                  },
                  {
                    icon: 'flag-outline',
                    title: 'Metas e hábitos',
                  },
                  {
                    icon: 'notebook-outline',
                    title: 'Cadernos',
                  },
                  {
                    icon: 'chart-box-outline',
                    title: 'Histórico e relatórios',
                  },
                  {
                    icon: 'trophy-outline',
                    title: 'Conquistas',
                  },
                  {
                    icon: 'gift-outline',
                    title: 'Recompensas',
                  },
                  {
                    icon: 'bell-outline',
                    title: 'Lembretes',
                  },
                ].map((feature) => (
                  <View key={feature.title} style={styles.aboutFeature}>
                    <View style={styles.aboutFeatureIcon}>
                      <MaterialCommunityIcons
                        name={feature.icon as any}
                        size={19}
                        color={colors.primaryDark}
                      />
                    </View>
                    <View style={styles.aboutFeatureText}>
                      <Text style={styles.aboutFeatureTitle}>{feature.title}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.aboutLocalCard}>
                <View style={styles.aboutLocalText}>
                  <Text style={styles.aboutLocalTitle}>Seus dados no dispositivo</Text>
                  <Text style={styles.aboutLocalDescription}>
                    Tarefas, sessões, metas e demais registros são armazenados localmente. Você não
                    precisa criar uma conta para usar o aplicativo.
                  </Text>
                </View>
              </View>

              <View style={styles.aboutCreditBlock}>
                <Text style={styles.aboutCreditLabel}>DESENVOLVIDO POR</Text>
                <Text style={styles.aboutCredit}>Wendel Costa</Text>
                <Text style={styles.aboutCopyright}>FocoMais © 2026</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.aboutCloseBtn}
              onPress={() => setShowAbout(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.aboutCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GameSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(formatWholeNumber(value));
  return (
    <View style={styles.gameSettingRow}>
      <Text style={styles.dataButtonText}>{label}</Text>

      <TextInput
        style={styles.gameInput}
        keyboardType="decimal-pad"
        value={text}
        onChangeText={setText}
        onBlur={() => {
          const n = Math.max(0, Number(text.replace(',', '.')) || 0);
          setText(formatWholeNumber(n));
          onChange(n);
        }}
      />
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
  gameHint: {
    ...typography.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  gameSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  gameInput: {
    minWidth: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dataButtonText: {
    ...typography.body,
    color: colors.textPrimary,
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
  nameInputRow: {
    paddingHorizontal: spacing.sm,
  },
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
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dialogTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dialogDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dialogButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
  dialogButtonCancel: {
    backgroundColor: colors.surfaceAlt,
  },
  dialogButtonCancelText: {
    ...typography.label,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  aboutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 20, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  aboutContainer: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...{
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 12,
    },
  },
  aboutScroll: {
    flexShrink: 1,
  },
  aboutContent: {
    padding: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  aboutHero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  aboutLogoFrame: {
    width: 92,
    height: 92,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  aboutAppName: {
    ...typography.h1,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  aboutVersionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  aboutVersion: {
    ...typography.xs,
    color: colors.primaryDark,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  aboutDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: spacing.xs,
  },
  aboutDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.divider,
    marginTop: spacing.xs,
  },
  aboutSectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  aboutFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  aboutFeature: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutFeatureIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutFeatureText: {
    flex: 1,
    gap: 3,
  },
  aboutFeatureTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  aboutLocalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  aboutLocalText: {
    flex: 1,
    gap: spacing.xs,
  },
  aboutLocalTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  aboutLocalDescription: {
    ...typography.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  aboutCreditBlock: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  aboutCreditLabel: {
    ...typography.xs,
    color: colors.textDisabled,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  aboutCredit: {
    ...typography.label,
    color: colors.textPrimary,
  },
  aboutCopyright: {
    ...typography.xs,
    color: colors.textDisabled,
  },
  aboutCloseBtn: {
    minHeight: 46,
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCloseText: {
    ...typography.label,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },

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
