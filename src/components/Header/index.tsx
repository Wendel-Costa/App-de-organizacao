import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/styles/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
}

export function Header({ title, subtitle, onBack, rightAction }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {/* Botão esquerdo */}
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.sideButton} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sideButton} />
        )}

        {/* Título centralizado com position absolute */}
        <View style={styles.titleWrapper} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Botão direito */}
        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.sideButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={rightAction.icon as any}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.sideButton} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
