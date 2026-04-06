import { StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from './theme';

export const globalStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  textH1: {
    ...typography.h1,
    color: colors.textPrimary,
  },

  textH2: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  textH3: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  textBody: {
    ...typography.body,
    color: colors.textPrimary,
  },

  textSm: {
    ...typography.sm,
    color: colors.textSecondary,
  },

  textXs: {
    ...typography.xs,
    color: colors.textSecondary,
  },

  textLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  
  textMuted: {
    ...typography.body,
    color: colors.textDisabled,
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },

  mt_sm: { marginTop: spacing.sm },
  mt_md: { marginTop: spacing.md },
  mt_lg: { marginTop: spacing.lg },
  mb_sm: { marginBottom: spacing.sm },
  mb_md: { marginBottom: spacing.md },
  mb_lg: { marginBottom: spacing.lg },
  ph_md: { paddingHorizontal: spacing.md },
  pv_md: { paddingVertical: spacing.md },
});