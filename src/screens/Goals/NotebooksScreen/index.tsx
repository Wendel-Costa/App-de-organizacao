import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/styles/theme';
import { globalStyles } from '@/styles/global';
import { useNotebookStore } from '@/store/notebookStore';
import { parseTopicInput } from '@/database/queries/notebooks.queries';

export function NotebooksScreen({ onBack }: { onBack: () => void }) {
  const {
    notebooks,
    fetchNotebooks,
    addNotebook,
    editNotebook,
    removeNotebook,
    addTopics,
    toggleTopic,
    editTopic,
    removeTopic,
  } = useNotebookStore();

  const [showNotebookForm, setShowNotebookForm] = useState(false);
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [notebookTitle, setNotebookTitle] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topicNotebookId, setTopicNotebookId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const activeNotebooks = notebooks.filter((notebook) => notebook.progress < 1);
  const completedNotebooks = notebooks.filter((notebook) => notebook.progress >= 1);

  useFocusEffect(
    useCallback(() => {
      fetchNotebooks();
    }, []),
  );

  async function saveNotebook() {
    const title = notebookTitle.trim();
    if (!title) return;
    if (editingNotebookId) await editNotebook(editingNotebookId, title);
    else await addNotebook(title);
    setNotebookTitle('');
    setEditingNotebookId(null);
    setShowNotebookForm(false);
  }

  function confirmDeleteNotebook(id: string, title: string) {
    Alert.alert(
      'Excluir caderno?',
      `"${title}" será excluído permanentemente, incluindo seus tópicos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeNotebook(id) },
      ],
    );
  }

  function renderNotebook({ item }: { item: (typeof notebooks)[number] }) {
    const percentage = Math.round(item.progress * 100);
    return (
      <Card style={styles.notebookCard}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.progressText}>
              {percentage}% · {item.completedTopics}/{item.totalTopics} tópicos
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => {
                setEditingNotebookId(item.id);
                setNotebookTitle(item.title);
                setShowNotebookForm(true);
              }}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={19}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDeleteNotebook(item.id, item.title)}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>

        <View style={styles.topics}>
          {item.topics.map((topic) => (
            <View key={topic.id} style={styles.topicRow}>
              <TouchableOpacity
                style={styles.topicCheck}
                onPress={async () => {
                  Haptics.selectionAsync().catch(() => {});
                  await toggleTopic(topic.id, !topic.completed);
                }}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={topic.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={topic.completed ? colors.primary : colors.textDisabled}
                />
              </TouchableOpacity>
              <Text style={[styles.topicTitle, topic.completed && styles.topicCompleted]}>
                {topic.title}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.prompt?.(
                    'Editar tópico',
                    undefined,
                    (value) => value?.trim() && editTopic(topic.id, value),
                    'plain-text',
                    topic.title,
                  )
                }
                hitSlop={7}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={17}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Excluir tópico?', 'Essa ação é permanente.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: () => removeTopic(topic.id) },
                  ])
                }
                hitSlop={7}
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.textDisabled} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Button
          label="Adicionar tópicos"
          variant="secondary"
          onPress={() => {
            setTopicNotebookId(item.id);
            setTopicInput('');
          }}
        />
      </Card>
    );
  }

  async function saveTopics() {
    if (!topicNotebookId) return;
    const count = parseTopicInput(topicInput).length;
    if (!count) return;
    await addTopics(topicNotebookId, topicInput);
    setTopicInput('');
    setTopicNotebookId(null);
  }

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Cadernos"
        onBack={onBack}
        rightAction={{
          icon: 'plus',
          onPress: () => {
            setEditingNotebookId(null);
            setNotebookTitle('');
            setShowNotebookForm(true);
          },
        }}
      />

      <FlatList
        data={activeNotebooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="book-open-outline"
            title="Nenhum caderno"
            description="Crie um caderno e cole sua lista de tópicos de uma só vez."
            actionLabel="Criar caderno"
            onAction={() => setShowNotebookForm(true)}
          />
        }
        renderItem={renderNotebook}
        ListFooterComponent={
          completedNotebooks.length > 0 ? (
            <View style={styles.completedSection}>
              <TouchableOpacity
                style={styles.completedHeader}
                onPress={() => setShowCompleted((value) => !value)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.completedHeaderText}>
                  Cadernos concluídos ({completedNotebooks.length})
                </Text>
                <MaterialCommunityIcons
                  name={showCompleted ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {showCompleted &&
                completedNotebooks.map((item) => (
                  <View key={item.id}>{renderNotebook({ item })}</View>
                ))}
            </View>
          ) : null
        }
      />

      <Modal
        visible={showNotebookForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotebookForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingNotebookId ? 'Editar caderno' : 'Novo caderno'}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={notebookTitle}
              onChangeText={setNotebookTitle}
              placeholder="Ex.: Cálculo"
              placeholderTextColor={colors.textDisabled}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={saveNotebook}
            />

            <View style={styles.modalButtons}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setShowNotebookForm(false)}
              />
              <Button label="Salvar" onPress={saveNotebook} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!topicNotebookId}
        transparent
        animationType="fade"
        onRequestClose={() => setTopicNotebookId(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adicionar tópicos</Text>

            <Text style={styles.modalHint}>
              Cada linha vira um tópico. Linhas vazias são ignoradas.
            </Text>

            <TextInput
              style={[styles.modalInput, styles.multiline]}
              value={topicInput}
              onChangeText={setTopicInput}
              placeholder={'Derivada\nIntegral\nLimites'}
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              autoFocus
            />

            <Text style={styles.countText}>
              {parseTopicInput(topicInput).length} tópicos serão adicionados
            </Text>

            <View style={styles.modalButtons}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setTopicNotebookId(null)}
              />

              <Button
                label={`Adicionar ${Math.max(0, parseTopicInput(topicInput).length)}`}
                onPress={saveTopics}
                disabled={!parseTopicInput(topicInput).length}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  notebookCard: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  progressText: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  topics: {
    gap: 4,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
  },
  topicCheck: {
    width: 26,
  },
  topicTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  topicCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalHint: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  modalInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  multiline: {
    minHeight: 160,
  },
  countText: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  completedSection: { marginTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedHeaderText: { ...typography.label, color: colors.textSecondary, flex: 1 },
});
