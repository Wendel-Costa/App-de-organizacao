import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '@/styles/theme';
import { shadow } from '@/styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export default function Card({ children, style, elevated = false }: CardProps) {
  return <View style={[styles.card, elevated && shadow.sm, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
