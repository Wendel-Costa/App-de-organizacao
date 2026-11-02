import { useMemo } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '@/styles/theme';

export interface MultiSelectItem {
  id: string;
  title: string;
  meta?: string;
  disabled?: boolean;
}

interface MultiSelectModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  items: MultiSelectItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function MultiSelectModal({
  visible,
  title,
  subtitle,
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onConfirm,
  onCancel,
  confirmLabel = 'Concluir',
}: MultiSelectModalProps) {
  const selectableCount = useMemo(() => items.filter((item) => !item.disabled).length, [items]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onCancel} hitSlop={8} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={onSelectAll}
              disabled={selectableCount === 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.bulkButtonText,
                  selectableCount === 0 && styles.bulkButtonTextDisabled,
                ]}
              >
                Selecionar todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={onDeselectAll}
              disabled={selectedCount === 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.bulkButtonText,
                  selectedCount === 0 && styles.bulkButtonTextDisabled,
                ]}
              >
                Desmarcar todos
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={items.length > 8}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            renderItem={({ item }) => {
              const selected = selectedIdSet.has(item.id);
              const disabled = item.disabled === true;

              return (
                <TouchableOpacity
                  style={[
                    styles.item,
                    selected && styles.itemSelected,
                    disabled && styles.itemDisabled,
                  ]}
                  onPress={() => !disabled && onToggle(item.id)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIcon}>
                    <MaterialCommunityIcons
                      name="book-open-outline"
                      size={18}
                      color={
                        disabled
                          ? colors.textDisabled
                          : selected
                            ? colors.info
                            : colors.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text
                      style={[styles.itemTitle, disabled && styles.itemTitleDisabled]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {item.meta ? <Text style={styles.itemMeta}>{item.meta}</Text> : null}
                  </View>
                  <MaterialCommunityIcons
                    name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={21}
                    color={
                      disabled ? colors.textDisabled : selected ? colors.info : colors.textDisabled
                    }
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma opção disponível.</Text>}
          />

          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.78}>
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    minHeight: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.xs, color: colors.textSecondary },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bulkButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  bulkButtonText: { ...typography.xs, color: colors.primaryDark, fontWeight: '700' },
  bulkButtonTextDisabled: { color: colors.textDisabled },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 360,
    minHeight: 0,
  },
  listContent: { gap: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.info + '66',
  },
  itemDisabled: { opacity: 0.6 },
  itemIcon: { width: 26, alignItems: 'center' },
  itemCopy: { flex: 1, minWidth: 0, gap: 1 },
  itemTitle: { ...typography.body, color: colors.textPrimary },
  itemTitleDisabled: { color: colors.textSecondary },
  itemMeta: { ...typography.xs, color: colors.textSecondary },
  emptyText: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  confirmButton: {
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  confirmButtonText: { ...typography.label, color: colors.textOnPrimary },
});
