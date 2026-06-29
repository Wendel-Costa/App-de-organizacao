import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface DraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  onReorder: (newData: T[]) => void;
  renderItem: (item: T, isActive: boolean) => React.ReactNode;
  gap?: number;
}

const MOVE_TRANSITION = LinearTransition.springify().damping(40).stiffness(300);

export function DraggableList<T>({
  data,
  keyExtractor,
  onReorder,
  renderItem,
  gap = 12,
}: DraggableListProps<T>) {
  const [order, setOrder] = useState<T[]>(data);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setOrder(data);
    setActiveId(null);
  }, [data]);

  function activate(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  function moveItem(id: string, direction: 'up' | 'down') {
    const idx = order.findIndex((item) => keyExtractor(item) === id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= order.length - 1) return;

    const next = [...order];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[target]] = [next[target], next[idx]];

    Haptics.selectionAsync().catch(() => {});
    setOrder(next);
    onReorder(next);
  }

  const canReorder = order.length > 1;

  return (
    <View style={{ gap }}>
      {order.map((item, index) => {
        const id = keyExtractor(item);
        const isActive = activeId === id;
        const isFirst = index === 0;
        const isLast = index === order.length - 1;

        const longPress = Gesture.LongPress()
          .enabled(canReorder)
          .minDuration(280)
          .onStart(() => {
            runOnJS(activate)(id);
          });

        return (
          <GestureDetector key={id} gesture={longPress}>
            <Animated.View
              layout={MOVE_TRANSITION}
              style={[styles.row, isActive && styles.rowActive]}
            >
              <View style={styles.cardWrapper}>{renderItem(item, isActive)}</View>

              {isActive && (
                <View style={styles.controls}>
                  <TouchableOpacity
                    style={[styles.btn, isFirst && styles.btnDisabled]}
                    onPress={() => moveItem(id, 'up')}
                    activeOpacity={isFirst ? 1 : 0.7}
                    hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="chevron-up"
                      size={22}
                      color={isFirst ? '#d0d0d0' : '#444'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => setActiveId(null)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="check" size={14} color="#444" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, isLast && styles.btnDisabled]}
                    onPress={() => moveItem(id, 'down')}
                    activeOpacity={isLast ? 1 : 0.7}
                    hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={22}
                      color={isLast ? '#d0d0d0' : '#444'}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowActive: {
    opacity: 0.92,
  },
  cardWrapper: {
    flex: 1,
  },
  controls: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btnDisabled: {
    backgroundColor: '#fafafa',
    borderColor: '#eeeeee',
  },
  doneBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
});
