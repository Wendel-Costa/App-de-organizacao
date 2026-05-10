import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface FocoWidgetProps {
  pendingTasks: number;
  focusMinutes: number;
  userName: string;
}

function formatFocus(minutes: number): string {
  if (minutes === 0) return '0h';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function FocoWidget({ pendingTasks, focusMinutes, userName }: FocoWidgetProps) {
  const greeting = userName ? `Olá, ${userName}!` : 'Bom foco!';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget
          text="FocoMais"
          style={{ fontSize: 16, fontFamily: 'sans-serif-medium', color: '#2A2318' }}
        />
      </FlexWidget>

      <TextWidget text={greeting} style={{ fontSize: 13, color: '#7A6E5F' }} />

      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={`${pendingTasks} tarefa${pendingTasks !== 1 ? 's' : ''} pendente${pendingTasks !== 1 ? 's' : ''} hoje`}
          style={{ fontSize: 13, color: '#2A2318', fontFamily: 'sans-serif' }}
        />
        <TextWidget
          text={`${formatFocus(focusMinutes)} de foco hoje`}
          style={{ fontSize: 13, color: '#2A2318', fontFamily: 'sans-serif' }}
        />
      </FlexWidget>

      <FlexWidget
        style={{ flexDirection: 'row', justifyContent: 'flex-end' }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Abrir app →"
          style={{
            fontSize: 12,
            color: '#C49A00',
            fontFamily: 'sans-serif-medium',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
