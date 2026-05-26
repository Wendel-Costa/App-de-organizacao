import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/styles/theme';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

function getOverflowColor(progress: number): string {
  if (progress <= 2.0) return '#FFD700';
  if (progress <= 3.0) return '#FF8C00';
  return '#FF4500';
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 6,
  color = colors.primary,
  label,
}: ProgressRingProps) {
  const segments = 32;
  const isBeyond = progress > 1;
  const firstLap = Math.min(progress, 1);
  const secondLap = Math.max(0, progress - 1);
  const overflowColor = getOverflowColor(progress);

  const filledFirst = Math.round(firstLap * segments);
  const filledSecond = Math.round(Math.min(secondLap, 1) * segments);

  const radius = (size - strokeWidth) / 2;
  const percent = Math.round(progress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + radius * Math.cos(angle) - strokeWidth / 2;
        const y = size / 2 + radius * Math.sin(angle) - strokeWidth / 2;

        let dotColor = colors.border;
        if (i < filledFirst) dotColor = color;
        if (isBeyond && i < filledSecond) dotColor = overflowColor;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: strokeWidth,
                height: strokeWidth,
                borderRadius: strokeWidth / 2,
                backgroundColor: dotColor,
                position: 'absolute',
                left: x,
                top: y,
              },
            ]}
          />
        );
      })}

      <View style={styles.center}>
        <Text
          style={[
            styles.percentage,
            { fontSize: size * 0.22, color: isBeyond ? overflowColor : colors.textPrimary },
          ]}
        >
          {percent}%
        </Text>
        {label && (
          <Text style={[styles.label, { fontSize: size * 0.12 }]} numberOfLines={1}>
            {label}
          </Text>
        )}
        {isBeyond && <Text style={[styles.star, { fontSize: size * 0.15 }]}>✨</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  percentage: { fontWeight: '700' },
  label: { color: colors.textSecondary },
  star: { lineHeight: undefined },
});
