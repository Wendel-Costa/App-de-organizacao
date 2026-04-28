import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/styles/theme';

interface ProgressRingProps {
  progress: number; // 0 a 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 6,
  color = colors.primary,
  label,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const percentage = Math.round(clamped * 100);
  const radius = (size - strokeWidth) / 2;
  const segments = 32;
  const filled = Math.round(clamped * segments);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const isFilled = i < filled;
        const x = size / 2 + radius * Math.cos(angle) - strokeWidth / 2;
        const y = size / 2 + radius * Math.sin(angle) - strokeWidth / 2;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: strokeWidth,
                height: strokeWidth,
                borderRadius: strokeWidth / 2,
                backgroundColor: isFilled ? color : colors.border,
                position: 'absolute',
                left: x,
                top: y,
              },
            ]}
          />
        );
      })}

      {/* Texto central */}
      <View style={styles.center}>
        <Text style={[styles.percentage, { fontSize: size * 0.22 }]}>{percentage}%</Text>
        {label && (
          <Text style={[styles.label, { fontSize: size * 0.12 }]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    color: colors.textSecondary,
  },
});
