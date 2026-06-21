import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/styles/theme';

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
    if (v === 0) return '';
    if (v >= 10) return `${Math.floor(v)}h`;
    if (v < 1) return `${Math.round(v * 60)}m`;
    const hrs = Math.floor(v);
    const min = Math.round((v - hrs) * 60);
    return min > 0 ? `${hrs}h${min}` : `${hrs}h`;
  }
  return v > 0 ? String(Math.round(v)) : '';
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
      <View style={[styles.chartArea, { height: height + 24 }]}>
        {data.map((item, i) => {
          const ratio = max > 0 ? item.value / max : 0;
          const barH = Math.max(ratio * height, item.value > 0 ? 4 : 0);
          const isHighlight = i === highlight;
          const color = item.color ?? barColor;
          const label = formatValue(item.value, unit);

          return (
            <View key={i} style={styles.barColumn}>
              <View style={styles.labelSpace}>
                {label ? (
                  <Text style={[styles.valueLabel, isHighlight && styles.valueLabelHighlight]}>
                    {label}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.barWrapper, { height }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barH,
                      backgroundColor: color,
                      opacity: isHighlight ? 1 : 0.65,
                    },
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
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  labelSpace: {
    height: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    textAlign: 'center',
  },
  valueLabelHighlight: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '75%',
    borderRadius: radius.sm,
    minHeight: 2,
  },
  labels: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: spacing.xs,
  },
  labelText: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelTextHighlight: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
