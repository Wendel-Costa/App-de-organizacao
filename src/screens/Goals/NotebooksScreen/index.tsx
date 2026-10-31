import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SectionList,
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
import { TextInputModal } from '@/components/TextInputModal';
import { colors, radius, spacing, typography } from '@/styles/theme';
import { globalStyles } from '@/styles/global';
import { useNotebookStore } from '@/store/notebookStore';
import { parseTopicInput } from '@/database/queries/notebooks.queries';

export function NotebooksScreen({
  onBack,
  openCreateOnMount = false,
}: {
  onBack: () => void;
  openCreateOnMount?: boolean;
}) {
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
  const [collapsedNotebooks, setCollapsedNotebooks] = useState<Set<string>>(new Set());
  const [editingTopic, setEditingTopic] = useState<{ id: string; title: string } | null>(null);

  function toggleNotebook(notebookId: string) {
    setCollapsedNotebooks((current) => {
      const next = new Set(current);
      if (next.has(notebookId)) next.delete(notebookId);
      else next.add(notebookId);
      return next;
    });
  }

  useEffect(() => {
    if (openCreateOnMount) {
      setEditingNotebookId(null);
      setNotebookTitle('');
      setShowNotebookForm(true);
    }
  }, [openCreateOnMount]);

  useEffect(() => {
    const validNotebookIds = new Set(notebooks.map((notebook) => notebook.id));
    setCollapsedNotebooks((current) => {
      const next = new Set([...current].filter((id) => validNotebookIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [notebooks]);

  const activeNotebooks = notebooks.filter((notebook) => notebook.progress < 1);
  const completedNotebooks = notebooks.filter((notebook) => notebook.progress >= 1);

  function expandAllNotebooks() {
    setCollapsedNotebooks(new Set());
  }

  function collapseAllNotebooks() {
    setCollapsedNotebooks(new Set(notebooks.map((notebook) => notebook.id)));
  }

  const sections = [
    { key: 'active', data: activeNotebooks },
    { key: 'completed', data: showCompleted ? completedNotebooks : [] },
  ];

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

        <TouchableOpacity
          style={styles.sectionToggle}
          onPress={() => toggleNotebook(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionToggleText}>Tópicos ({item.totalTopics})</Text>
          <MaterialCommunityIcons
            name={collapsedNotebooks.has(item.id) ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {!collapsedNotebooks.has(item.id) && (
          <>
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
                    onPress={() => setEditingTopic({ id: topic.id, title: topic.title })}
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
                        {
                          text: 'Excluir',
                          style: 'destructive',
                          onPress: () => removeTopic(topic.id),
                        },
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
          </>
        )}
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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={renderNotebook}
        renderSectionHeader={({ section }) =>
          section.key === 'completed' && completedNotebooks.length > 0 ? (
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
          ) : null
        }
        ListHeaderComponent={
          notebooks.length > 0 ? (
            <View style={styles.expansionControls}>
              <Text style={styles.expansionLabel}>Tópicos</Text>
              <View style={styles.expansionActions}>
                <TouchableOpacity onPress={expandAllNotebooks} hitSlop={6} activeOpacity={0.7}>
                  <Text style={styles.expansionActionText}>Expandir todos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={collapseAllNotebooks} hitSlop={6} activeOpacity={0.7}>
                  <Text style={styles.expansionActionText}>Recolher todos</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          completedNotebooks.length === 0 ? (
            <EmptyState
              icon="book-open-outline"
              title="Nenhum caderno"
              description="Crie um caderno e cole sua lista de tópicos de uma só vez."
              actionLabel="Criar caderno"
              onAction={() => setShowNotebookForm(true)}
            />
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

      <TextInputModal
        visible={editingTopic !== null}
        title="Editar tópico"
        placeholder="Nome do tópico"
        initialValue={editingTopic?.title ?? ''}
        confirmLabel="Salvar"
        onCancel={() => setEditingTopic(null)}
        onConfirm={async (value) => {
          if (!editingTopic) return;
          try {
            await editTopic(editingTopic.id, value);
            setEditingTopic(null);
          } catch {
            Alert.alert('Erro', 'Não foi possível salvar o tópico.');
          }
        }}
      />

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
  list: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  expansionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  expansionLabel: { ...typography.xs, color: colors.textSecondary },
  expansionActions: { flexDirection: 'row', gap: spacing.md },
  expansionActionText: { ...typography.xs, color: colors.primaryDark, fontWeight: '700' },
  notebookCard: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  titleWrap: { flex: 1, gap: 2, minWidth: 0 },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  progressText: { ...typography.xs, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, paddingTop: 2 },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionToggleText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  topics: { gap: 4 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 34 },
  topicCheck: { width: 26 },
  topicTitle: { ...typography.body, color: colors.textPrimary, flex: 1 },
  topicCompleted: { color: colors.textSecondary, textDecorationLine: 'line-through' },
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
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalHint: { ...typography.xs, color: colors.textSecondary },
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
  multiline: { minHeight: 160 },
  countText: { ...typography.xs, color: colors.textSecondary },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
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
