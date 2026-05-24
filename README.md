# FocoMais

Aplicativo mobile de organização pessoal focado em produtividade, hábitos e metas. Reúne gerenciamento de tarefas, sessões de foco cronometradas, acompanhamento de metas com hábitos recorrentes e um sistema de recompensas para manter a motivação, tudo funcionando 100% offline, sem necessidade de conta ou internet.

---

## Funcionalidades

### Tarefas
- Criação de tarefas com três tipos: **Livre** (sem data), **Agendada** (data específica) e **Recorrente** (dias da semana)
- Definição de **prioridade** (alta, média, baixa) e **data limite**
- **Subtarefas** com barra de progresso individual
- Associação de tarefas a um **tema de foco**
- Registro automático de data e hora de conclusão
- Filtros por tipo (todas, hoje, livre, rotina)
- Tarefas concluídas ordenadas pelas mais recentes, com botão "Mostrar mais" a partir de 10 itens
- Edição e exclusão com confirmação
- Pull-to-refresh para atualizar a lista

### Foco
- **Modo Livre:** cronômetro sem tempo definido
- **Modo Pomodoro:** ciclos de foco e pausa configuráveis (5 a 90 min de foco, 1 a 30 min de pausa)
- **Temas de foco** personalizados para categorizar sessões (ex: Matemática, Leitura)
- Visualização das tarefas do tema ativo durante a sessão, com marcação direta na tela
- Adição rápida de tarefas durante o foco
- Timer continua contando mesmo com o app em background
- **Histórico de sessões** com filtro por dia, linha do tempo visual e resumo semanal
- Edição do tema de sessões já registradas
- Registro manual de sessões com horário de início e fim
- Exclusão de sessões

### Metas
- Criação de metas com título, descrição, período (início e fim) e cor de destaque
- **Hábitos e tarefas vinculados** a cada meta com cinco tipos de recorrência:
  - Diário
  - N vezes por semana
  - N vezes por mês
  - Dias específicos da semana
  - Total no período
- **Margem de tolerância** configurável (0% a 50%) para calcular progresso de forma justa
- Anel de progresso por meta e barra de progresso por hábito/tarefa
- Seção "Hoje" com os hábitos devidos no dia, botão de conclusão e desfazer
- Edição de metas (título, descrição, datas, cor, tolerância)
- Exclusão de metas e de hábitos/tarefas individuais
- Pull-to-refresh

### Recompensas
- Criação de recompensas vinculadas a condições mensuráveis:
  - **Horas de foco** acumuladas (com filtro por tema)
  - **N tarefas concluídas** em um período
  - **Tarefas específicas** todas concluídas
  - **Meta completada**
- Períodos configuráveis: dia, semana, mês, desde a criação ou intervalo personalizado
- Barra de progresso em tempo real para cada recompensa
- Desbloqueio automático ao atingir a condição
- Tela de detalhe com informações, progresso e data de desbloqueio
- Edição e exclusão de recompensas
- Pull-to-refresh com re-verificação de conquistas

### Relatórios
- **Visão semanal:** horas de foco e tarefas concluídas por dia (gráfico de barras), streak de dias ativos e melhor dia da semana
- **Visão mensal:** total de foco, tarefas e sessões; média diária; foco por tema (barras horizontais); progresso das metas ativas (anéis)

### Configurações e Perfil
- Nome do usuário persistido e exibido na saudação da Home
- Notificações configuráveis:
  - Lembrete de tarefas agendadas (horário customizável)
  - Aviso de data limite (um dia antes)
  - Lembrete diário de hábitos (horário customizável)
  - Lembrete diário de foco (horário customizável)
- Configurações salvas localmente e restauradas entre sessões
- Tela "Sobre" com informações do app

### Home
- Saudação personalizada com nome do usuário e horário do dia
- Cards de resumo: tarefas do dia, tempo de foco e metas ativas
- Atalhos para iniciar foco (livre ou Pomodoro) diretamente da home
- Lista de tarefas do dia com tarefas recorrentes resetando automaticamente no dia seguinte
- Acesso rápido a Relatórios e Configurações

### Onboarding
- Tela de boas-vindas exibida apenas na primeira abertura
- Captura do nome do usuário para personalização

---

## Tecnologias

### Core
| Tecnologia | Versão | Uso |
|---|---|---|
| React Native | — | Framework mobile |
| Expo SDK | 54 | Plataforma e ferramentas |
| TypeScript | — | Tipagem estática |

### Navegação
| Tecnologia | Uso |
|---|---|
| React Navigation v6 | Navegação por abas (Bottom Tabs) |

### Estado e Dados
| Tecnologia | Uso |
|---|---|
| Zustand | Gerenciamento de estado global |
| expo-sqlite | Banco de dados SQLite local |
| Drizzle ORM | Queries e schema tipado sobre SQLite |

### UI e UX
| Tecnologia | Uso |
|---|---|
| @expo/vector-icons (MaterialCommunityIcons) | Ícones |
| expo-haptics | Feedback tátil |
| react-native-gesture-handler | Gestos |
| react-native-safe-area-context | Áreas seguras |

### Recursos Nativos
| Tecnologia | Uso |
|---|---|
| expo-notifications | Notificações locais agendadas |
| @react-native-community/datetimepicker | Seletor de data/hora nativo Android |
| @react-native-async-storage/async-storage | Persistência de preferências do usuário |
| date-fns | Manipulação de datas |

### Build e Deploy
| Tecnologia | Uso |
|---|---|
| EAS Build (Expo Application Services) | Build de APK e AAB na nuvem |

---

## Estrutura do Projeto

```
FocoMais/
├── assets/                     # Ícones, splash screen e imagens
├── src/
│   ├── components/             # Componentes reutilizáveis
│   │   ├── BarChart/           # Gráfico de barras nativo
│   │   ├── Button/             # Botão com variantes e loading
│   │   ├── Card/               # Container com sombra
│   │   ├── DatePicker/         # Seletor de data nativo Android
│   │   ├── EmptyState/         # Tela vazia com ação opcional
│   │   ├── GoalCard/           # Card de meta com progresso
│   │   ├── Header/             # Cabeçalho com ações
│   │   ├── PriorityBadge/      # Badge de prioridade colorido
│   │   ├── ProgressRing/       # Anel de progresso SVG
│   │   ├── RewardCard/         # Card de recompensa com progresso
│   │   ├── TaskItem/           # Item de tarefa com swipe e badge
│   │   ├── TextInputModal/     # Modal com campo de texto (substitui Alert.prompt)
│   │   ├── TimePicker/         # Seletor de hora nativo Android
│   │   └── TimelineBar/        # Linha do tempo de sessões por dia
│   ├── database/
│   │   ├── index.ts            # Inicialização do SQLite + Drizzle
│   │   ├── schema.ts           # Definição de todas as tabelas
│   │   ├── migrations/
│   │   │   └── index.ts        # runMigrations() com criação e upgrades
│   │   └── queries/
│   │       ├── tasks.queries.ts
│   │       ├── focus.queries.ts
│   │       ├── goals.queries.ts
│   │       └── rewards.queries.ts
│   ├── hooks/
│   │   └── useTimer.ts         # Hook do cronômetro com suporte a background
│   ├── navigation/
│   │   ├── index.tsx           # NavigationContainer + onboarding
│   │   └── BottomTabNavigator.tsx
│   ├── screens/
│   │   ├── Focus/
│   │   │   ├── index.tsx           # Seleção de modo e tema
│   │   │   ├── ActiveFocus/        # Timer ativo + tarefas do tema
│   │   │   │   ├── index.tsx
│   │   │   │   └── ManualRegister/ # Registro manual de sessão
│   │   │   └── FocusHistory/       # Histórico com timeline
│   │   ├── Goals/
│   │   │   ├── index.tsx           # Lista + hábitos do dia
│   │   │   ├── CreateGoal/
│   │   │   ├── GoalDetail/         # Detalhe com progresso por hábito
│   │   │   └── EditGoal/
│   │   ├── Home/
│   │   ├── Onboarding/
│   │   ├── Reports/
│   │   ├── Rewards/
│   │   │   └── RewardDetail/
│   │   ├── Settings/
│   │   └── Tasks/
│   │       ├── index.tsx           # Lista com filtros
│   │       ├── CreateTask/
│   │       └── TaskDetail/
│   ├── services/
│   │   ├── focus.service.ts        # Lógica de sessões de foco
│   │   ├── goals.service.ts        # Cálculo de progresso com tolerância
│   │   ├── notifications.service.ts
│   │   ├── recurrence.service.ts   # Filtros de tarefas por data/recorrência
│   │   ├── reports.service.ts      # Agregações para relatórios
│   │   └── rewards.service.ts      # Verificação e progresso de condições
│   ├── store/
│   │   ├── focusStore.ts
│   │   ├── goalStore.ts
│   │   ├── rewardStore.ts
│   │   ├── settingsStore.ts        # Nome + preferências de notificação
│   │   └── taskStore.ts
│   ├── styles/
│   │   ├── global.ts               # Estilos compartilhados
│   │   └── theme.ts                # Paleta de cores e tipografia
│   └── types/
│       ├── focus.types.ts
│       ├── goal.types.ts
│       ├── reward.types.ts
│       └── task.types.ts
├── App.tsx                     # Entry point
├── app.json                    # Configuração Expo
├── eas.json                    # Perfis de build EAS
└── tsconfig.json
```

---

## Design

O app utiliza uma paleta de cores coesa baseada em amarelo dourado como cor primária, com pastéis análogos para categorias, sobre um fundo off-white.

| Token | Cor | Uso |
|---|---|---|
| `primary` | `#F5C518` | Ações principais, destaques |
| `primaryDark` | `#C49A00` | Bordas e textos sobre primário |
| `mint` | `#A8DABD` | Tarefas concluídas, metas |
| `sky` | `#A8C8E8` | Sessões de foco |
| `peach` | `#F4C5A0` | Metas, alertas suaves |
| `rose` | `#F4A0B0` | Sessões, destaques secundários |
| `background` | `#FAFAF5` | Fundo geral do app |

---

## Banco de Dados

O app usa SQLite local via `expo-sqlite` com Drizzle ORM. Todas as tabelas são criadas na primeira execução pelo `runMigrations()`.

```
tasks                    # Tarefas (livre, agendada, recorrente)
subtasks                 # Subtarefas vinculadas a tasks
focus_themes             # Temas de foco personalizados
focus_sessions           # Histórico de sessões de foco
goals                    # Metas com período e cor
goal_tasks               # Hábitos/tarefas vinculados a metas
goal_task_completions    # Registro de conclusões por data (SRS de hábitos)
rewards                  # Recompensas com condições configuráveis
```

---

## Rodando Localmente (Expo Go)

### Pré-requisitos
- Node.js 18+
- Expo Go instalado no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- PC e celular na mesma rede Wi-Fi

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Wendel-Costa/focomais.git
cd focomais

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npx expo start --lan
```

Escaneie o QR Code com o Expo Go para abrir o app.

> **Dica:** Prefira `--lan` a `--tunnel` para maior estabilidade. Com `--tunnel`, a conexão passa por um servidor externo e pode ser instável.

---

## Build para Instalação (APK)

O app usa **EAS Build** (Expo Application Services) para gerar APKs instaláveis sem precisar do Android Studio.

### Pré-requisitos
- Conta gratuita em [expo.dev](https://expo.dev)

```bash
# Instale o EAS CLI globalmente
npm install -g eas-cli

# Faça login na sua conta Expo
eas login

# Gere o APK (build de preview)
eas build --platform android --profile preview
```

Após alguns minutos, você receberá um link para baixar o `.apk`. Transfira para o celular e instale.

### Perfis de Build

| Perfil | Comando | Saída | Uso |
|---|---|---|---|
| `preview` | `eas build --profile preview` | `.apk` | Testes e uso pessoal |
| `production` | `eas build --profile production` | `.aab` | Publicação na Play Store |

> **Nota:** APKs instalados fora da Play Store exibem um aviso de segurança do Android. Toque em "Instalar mesmo assim" para prosseguir. Isso é esperado para apps distribuídos diretamente.

---

## Notificações

O app agenda notificações locais (sem servidor) para:

| Tipo | Descrição | Configurável |
|---|---|---|
| Lembrete de tarefa agendada | Avisa no horário definido no dia da tarefa | ✅ Horário |
| Aviso de data limite | Notifica um dia antes do prazo | ✅ On/Off |
| Lembrete de hábitos | Notificação diária para marcar os hábitos | ✅ Horário |
| Lembrete de foco | Notificação diária para iniciar uma sessão | ✅ Horário |

As configurações são salvas localmente com AsyncStorage e restauradas a cada abertura do app.

---

## Como Funciona o Progresso de Metas

Cada hábito/tarefa vinculado a uma meta tem seu progresso calculado individualmente com base no tipo de recorrência:

| Tipo | Cálculo do target |
|---|---|
| Diário | Dias entre início e fim |
| N vezes/semana | Semanas no período × N |
| N vezes/mês | Meses no período × N |
| Dias específicos | Ocorrências desses dias no período |
| Total no período | N direto |

O progresso da meta é a **média do progresso de todos os hábitos**, com suporte a uma **margem de tolerância** (0% a 50%) que permite atingir 100% sem cumprir absolutamente tudo.

---

## Tipos de Recompensa

| Condição | Exemplo |
|---|---|
| Horas de foco | "Estudar 10h de Matemática na semana" |
| N tarefas concluídas | "Concluir 20 tarefas no mês" |
| Tarefas específicas | "Terminar o projeto X e o projeto Y" |
| Meta completada | "Completar a meta de Janeiro" |

O desbloqueio é verificado automaticamente sempre que uma tarefa é concluída ou ao puxar para atualizar a tela de recompensas.

---

## Estrutura de Dados Principais

### Task
```ts
{
  id:             string;
  title:          string;
  description?:   string;
  type:           'anytime' | 'scheduled' | 'recurring';
  priority?:      'high' | 'medium' | 'low';
  completed:      boolean;
  scheduledDate?: string;       // YYYY-MM-DD
  dueDate?:       string;       // YYYY-MM-DD
  recurrenceDays?: RecurrenceDay[];
  themeId?:       string;
  subtasks?:      SubTask[];
  completedAt?:   string;       // ISO timestamp
  createdAt:      string;
  updatedAt:      string;
}
```

### FocusSession
```ts
{
  id:             string;
  themeId?:       string;
  themeName?:     string;
  mode:           'free' | 'pomodoro';
  startTime:      string;       // ISO timestamp
  endTime:        string;       // ISO timestamp
  duration:       number;       // em minutos
  isManual:       boolean;
  pomodoroRounds?: number;
  createdAt:      string;
}
```

### Goal
```ts
{
  id:          string;
  title:       string;
  description?: string;
  startDate:   string;          // YYYY-MM-DD
  endDate:     string;          // YYYY-MM-DD
  color?:      string;          // hex
  tolerance:   number;          // 0 a 0.5
  tasks:       GoalTask[];
  createdAt:   string;
  updatedAt:   string;
}
```

### Reward
```ts
{
  id:          string;
  title:       string;
  description?: string;
  condition: {
    type:             'focus_hours' | 'tasks_completed' | 'tasks_specific' | 'goal_completed';
    target:           number;
    period:           'day' | 'week' | 'month' | 'anytime' | 'custom';
    themeId?:         string;
    taskIds?:         string[];
    goalId?:          string;
    customStartDate?: string;
    customEndDate?:   string;
  };
  unlocked:    boolean;
  unlockedAt?: string;
  createdAt:   string;
}
```

---

## Privacidade

O FocoMais é **100% offline**. Todos os dados são armazenados exclusivamente no dispositivo do usuário via SQLite. Não há servidor, não há conta, não há envio de dados para nenhum serviço externo. Desinstalar o app remove todos os dados.

---

## Possíveis adições (no futuro)

- [ ] Exportação e importação de dados (backup JSON)
- [ ] Temas de cores (modo escuro)
- [ ] Widget Android com tarefas do dia
- [ ] Estatísticas de streak por hábito
- [ ] Publicação na Google Play Store

---

## Autor

**Wendel Costa**
- GitHub: [@Wendel-Costa](https://github.com/Wendel-Costa)
