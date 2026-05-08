import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/styles/theme';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  maxValue?: number;
  height?: number;
  unit?: string;
  barColor?: string;
  highlight?: number;
}

function formatValue(v: number, unit: string): string {
  if (unit === 'h') {
    if (v === 0) return '0h';
    if (v < 1) return `${Math.round(v * 60)}m`;
    return `${v.toFixed(1)}h`;
  }
  return String(Math.round(v));
}

export function BarChart({
  data,
  maxValue,
  height = 140,
  unit = '',
  barColor = colors.primary,
  highlight,
}: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 0.1);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.chartArea, { height }]}>
        {data.map((item, i) => {
          const ratio = max > 0 ? item.value / max : 0;
          const barH = Math.max(ratio * height, item.value > 0 ? 4 : 0);
          const isHighlight = i === highlight;
          const color = item.color ?? barColor;

          return (
            <View key={i} style={styles.barColumn}>
              {item.value > 0 && (
                <Text style={styles.valueLabel}>{formatValue(item.value, unit)}</Text>
              )}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barH,
                      backgroundColor: color,
                      opacity: isHighlight ? 1 : 0.7,
                      borderRadius: radius.sm,
                    },
                    isHighlight && styles.barHighlight,
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.labels}>
        {data.map((item, i) => (
          <Text key={i} style={[styles.labelText, i === highlight && styles.labelTextHighlight]}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: spacing.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  valueLabel: {
    ...typography.xs,
    color: colors.textDisabled,
    fontSize: 9,
    textAlign: 'center',
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    minHeight: 2,
  },
  barHighlight: {
    opacity: 1,
    elevation: 2,
  },
  labels: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: spacing.xs,
  },
  labelText: {
    flex: 1,
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  labelTextHighlight: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
