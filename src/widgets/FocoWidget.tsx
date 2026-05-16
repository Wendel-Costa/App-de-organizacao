import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface FocoWidgetProps {
  pendingTasks: number;
  focusMinutes: number;
  userName: string;
  pendingTaskNames: string[];
}

function formatFocus(minutes: number): string {
  if (minutes === 0) return '0h';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function FocoWidget({
  pendingTasks,
  focusMinutes,
  userName,
  pendingTaskNames,
}: FocoWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <TextWidget
          text="FocoMais"
          style={{ fontSize: 15, fontFamily: 'sans-serif-medium', color: '#2A2318' }}
        />
        <TextWidget
          text={`${formatFocus(focusMinutes)}`}
          style={{ fontSize: 12, color: '#7A6E5F' }}
        />
      </FlexWidget>

      {userName ? (
        <TextWidget text={`Olá, ${userName}!`} style={{ fontSize: 12, color: '#7A6E5F' }} />
      ) : null}

      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={`${pendingTasks} pendente${pendingTasks !== 1 ? 's' : ''} hoje`}
          style={{ fontSize: 13, color: '#2A2318', fontFamily: 'sans-serif-medium' }}
        />

        {pendingTaskNames.slice(0, 3).map((name, i) => (
          <TextWidget
            key={i}
            text={`  · ${name.length > 28 ? name.slice(0, 28) + '...' : name}`}
            style={{ fontSize: 11, color: '#7A6E5F' }}
          />
        ))}

        {pendingTasks > 3 && (
          <TextWidget
            text={`  + ${pendingTasks - 3} mais...`}
            style={{ fontSize: 11, color: '#BFB8AB' }}
          />
        )}
      </FlexWidget>

      <FlexWidget
        style={{ flexDirection: 'row', justifyContent: 'flex-end' }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Abrir →"
          style={{ fontSize: 11, color: '#C49A00', fontFamily: 'sans-serif-medium' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
