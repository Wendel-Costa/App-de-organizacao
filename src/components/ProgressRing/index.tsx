import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/styles/theme';

interface ProgressRingProps {
  progress: number;
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
  const segments = 32;

  const lap1 = Math.min(progress, 1);
  const lap2 = Math.min(Math.max(progress - 1, 0), 1);
  const lap3 = Math.min(Math.max(progress - 2, 0), 1);
  const lap4 = Math.min(Math.max(progress - 3, 0), 1);

  const filled1 = Math.round(lap1 * segments);
  const filled2 = Math.round(lap2 * segments);
  const filled3 = Math.round(lap3 * segments);
  const filled4 = Math.round(lap4 * segments);

  const radius = (size - strokeWidth) / 2;
  const percent = Math.round(progress * 100);

  let textColor = colors.textPrimary;

  if (progress > 3) {
    textColor = '#1a04c3';
  } else if (progress > 2) {
    textColor = '#03c2c5';
  } else if (progress > 1) {
    textColor = '#08d120';
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;

        const x = size / 2 + radius * Math.cos(angle) - strokeWidth / 2;

        const y = size / 2 + radius * Math.sin(angle) - strokeWidth / 2;

        let dotColor = colors.border;

        if (i < filled1) {
          dotColor = color;
        }

        if (filled2 > 0 && i < filled2) {
          dotColor = '#08d120';
        }

        if (filled3 > 0 && i < filled3) {
          dotColor = '#03c2c5';
        }

        if (filled4 > 0 && i < filled4) {
          dotColor = '#1a04c3';
        }

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
            {
              fontSize: size * 0.22,
              color: textColor,
            },
          ]}
        >
          {percent}%
        </Text>
        {label && (
          <Text
            style={[
              styles.label,
              {
                fontSize: size * 0.12,
              },
            ]}
            numberOfLines={1}
          >
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
  },
  label: {
    color: colors.textSecondary,
  },
  star: {
    lineHeight: undefined,
  },
});
