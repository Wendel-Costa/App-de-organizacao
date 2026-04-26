import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/styles/theme';

interface TimePickerProps {
  label?: string;
  value: string; // "HH:MM"
  onChange: (time: string) => void;
}

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [show, setShow] = useState(false);

  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    setShow(Platform.OS === 'ios');
    if (selected) {
      const h = String(selected.getHours()).padStart(2, '0');
      const m = String(selected.getMinutes()).padStart(2, '0');
      onChange(`${h}:${m}`);
    }
  }

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.button} onPress={() => setShow(true)} activeOpacity={0.7}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primaryDark} />
        <Text style={styles.text}>{value}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
