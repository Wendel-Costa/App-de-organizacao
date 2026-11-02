# FocoMais

Aplicativo Android de organização pessoal que reúne tarefas, sessões de foco, metas, hábitos, cadernos de estudo e acompanhamento da produtividade. A proposta é ajudar o usuário a planejar a rotina, manter consistência e visualizar o próprio progresso em uma experiência local, sem exigir criação de conta.

> **Plataforma documentada:** Android. A configuração Expo do projeto declara `platforms: ["android"]`.

## Visão geral

O FocoMais organiza o trabalho diário em cinco áreas principais: **Início**, **Tarefas**, **Foco**, **Metas** e **Conquistas**. Relatórios e configurações são acessados a partir da experiência da tela inicial.

### Funcionalidades

#### Tarefas

- Cadastro de tarefas livres, agendadas e recorrentes.
- Título, descrição, nível de pontuação, data agendada, prazo e associação a tema de foco ou meta, conforme o tipo de tarefa.
- Recorrência por dias da semana ou intervalo de dias (`A cada X dias`), incluindo opções diárias e dias específicos.
- Subtarefas, acompanhamento de conclusão e filtros na lista.
- Registro de conclusões em um histórico próprio, com cópia dos dados relevantes da tarefa no momento da conclusão. Isso permite consultar o registro mesmo quando a tarefa original não está mais cadastrada.
- Opção para pular uma ocorrência de tarefa recorrente, com registro da data ignorada.

#### Foco e Pomodoro

- Sessão em modo **Livre**, sem duração pré-definida.
- Sessão em modo **Pomodoro**, com duração de foco ajustável entre 5 e 90 minutos e pausa entre 1 e 30 minutos.
- Temas de foco personalizados, com possibilidade de selecionar um tema para categorizar sessões.
- Sessões cronometradas, restauração do estado de uma sessão ativa na inicialização e registro manual de sessões anteriores.
- Histórico de sessões com duração, tema, modo e opção de edição/exclusão conforme a interface.

#### Metas e hábitos

- Metas com título, descrição, período, cor, arquivamento e opções de cálculo de progresso.
- Fatores de meta de diferentes tipos: hábito, horas de foco, item curinga e caderno.
- Recorrência dos fatores: diária, quantidade de vezes por semana ou mês, dias específicos e intervalo de dias.
- Associação de fatores a um ou mais temas de foco ou a um caderno, conforme o tipo.
- Registro de conclusões por data, acompanhamento diário e cálculo do progresso agregado da meta.
- Margem de tolerância configurável no cálculo de progresso. A configuração também permite controlar extrapolação do progresso, quando habilitada.

#### Cadernos de estudo

- Criação, edição e exclusão de cadernos.
- Inclusão de vários tópicos a partir de uma lista colada, com um tópico por linha.
- Edição, exclusão, reordenação e marcação de tópicos como concluídos.
- Progresso calculado a partir da quantidade de tópicos concluídos.
- Associação de cadernos a fatores de meta do tipo `notebook`.

#### Conquistas, pontos, moedas e loja

- Pontos e moedas registrados em eventos e transações locais.
- Pontuação por tempo de foco e por atividades como conclusão de tarefas (quando a pontuação de tarefas está habilitada), tópicos, cadernos e metas.
- Configuração dos valores de pontuação na tela de Configurações.
- Níveis calculados a partir do total de pontos. Os primeiros limiares são 0, 100, 250, 500, 850, 1.300, 1.850, 2.500, 3.250 e 4.100 pontos; os níveis seguintes usam uma progressão crescente definida no serviço de gamificação.
- Recompensas configuráveis com condições relacionadas a horas de foco, quantidade de tarefas concluídas, tarefas específicas ou conclusão de metas. As condições podem considerar dia, semana, mês, período desde a criação ou intervalo personalizado, conforme o tipo.
- Loja de recompensas pessoais: o usuário cadastra itens com custo em moedas e pode registrar compras quando possui saldo suficiente. Compras ficam disponíveis no histórico e podem ser arquivadas.
- Reversões de eventos de pontuação quando determinadas ações são desfeitas, respeitando o saldo de moedas disponível.

#### Relatórios

- Resumos semanal e mensal com totais de foco, tarefas e sessões, além de gráficos e indicadores calculados a partir dos registros locais.
- Histórico em duas visualizações: **Visão geral**, com filtros para tudo, foco ou tarefas; e **Calendário**, que permite selecionar um dia e consultar os registros daquela data.
- A visão de histórico reúne conclusões de tarefas, sessões de foco e fatores de metas no calendário.

#### Notificações e lembretes

- Permissão de notificações solicitada no dispositivo físico.
- Lembrete de tarefa agendada no horário configurado (o serviço usa 08:00 como valor padrão quando não é informado outro horário).
- Aviso de prazo no dia anterior, às 20:00.
- Lembretes diários de hábitos e de foco com horário configurável.
- Cancelamento de lembretes individuais e de todas as notificações agendadas.
- No Android, o serviço configura um canal de notificações chamado **FocoMais**, com importância alta, vibração e luz de notificação amarela.

#### Configurações e transferência de dados

- Nome do usuário salvo localmente e utilizado na saudação.
- Preferências para notificações e parâmetros da gamificação.
- Exportação de dados para um arquivo TXT com conteúdo JSON; o serviço de transferência também aceita JSON na importação.
- Importação com validação da estrutura atual e dos relacionamentos básicos entre registros. A restauração substitui os dados locais existentes.
- Dados de tabelas e preferências locais são incluídos no backup.

## Tecnologias

Versões abaixo obtidas dos manifests e versões efetivamente resolvidas no `package-lock.json` incluído no projeto. As versões declaradas com `^` ou `~` em `package.json` são faixas; a versão da coluna **Resolvida** é a registrada no lockfile.

| Tecnologia / pacote          | Versão declarada | Versão resolvida | Finalidade                                          |
| ---------------------------- | ---------------: | ---------------: | --------------------------------------------------- |
| Expo SDK (`expo`)            |       `^57.0.20` |        `57.0.20` | Plataforma, ferramentas e integração nativa         |
| React                        |         `19.2.3` |         `19.2.3` | Interface                                           |
| React Native                 |         `0.86.3` |         `0.86.3` | Aplicativo mobile                                   |
| TypeScript                   |         `~6.0.3` |          `6.0.3` | Tipagem estática                                    |
| React Navigation Native      |         `^7.2.2` |          `7.3.4` | Navegação                                           |
| React Navigation Bottom Tabs |        `^7.15.9` |         `7.18.3` | Navegação por abas                                  |
| Zustand                      |        `^5.0.12` |         `5.0.14` | Estado compartilhado                                |
| Expo SQLite                  |        `~57.0.2` |         `57.0.2` | Persistência SQLite local                           |
| Drizzle ORM                  |        `^0.45.2` |         `0.45.2` | Schema e consultas tipadas                          |
| React Native Reanimated      |          `4.5.1` |          `4.5.1` | Animações                                           |
| React Native Worklets        |         `0.10.1` |         `0.10.1` | Runtime utilizado pelo Reanimated                   |
| Expo Notifications           |       `~57.0.17` |        `57.0.17` | Notificações locais                                 |
| Expo Font                    |        `~57.0.3` |         `57.0.3` | Carregamento de fontes e ícones                     |
| Expo Build Properties        |       `~57.0.22` |        `57.0.22` | Configuração Android persistente durante o Prebuild |
| Expo Dev Client              |       `~57.0.18` |        `57.0.18` | Cliente de desenvolvimento                          |
| EAS CLI                      |        `^23.2.0` |         `23.2.0` | Builds remotos; versão também fixada em `eas.json`  |

Outros pacotes nativos e de interface utilizados incluem `@expo/vector-icons` (MaterialCommunityIcons), `@react-native-async-storage/async-storage`, `@react-native-community/datetimepicker`, `expo-device`, `expo-document-picker`, `expo-file-system`, `expo-haptics`, `expo-sharing`, `expo-splash-screen`, `expo-status-bar`, `react-native-gesture-handler`, `react-native-safe-area-context` e `react-native-screens`.

Os componentes de ícones importam diretamente `@expo/vector-icons/MaterialCommunityIcons`, em vez do barrel de todas as famílias. `@expo/ngrok` é mantido para iniciar o Expo em modo tunnel (`npx expo start --tunnel`) e `expo-dev-client` atende ao perfil `development`; ambos são ferramentas de desenvolvimento, não funcionalidades que devam ser removidas da configuração de desenvolvimento.

O Android está configurado explicitamente com **Hermes** (`jsEngine: "hermes"`) e **Nova Arquitetura** (`newArchEnabled: true`) em `app.json`. Essas opções são mantidas; não foram desabilitadas como tentativa de reduzir o tamanho do APK.

## Arquitetura da aplicação

A implementação está organizada em camadas, sem backend remoto identificado no código:

1. **Telas (`src/screens`)** apresentam os fluxos e interações.
2. **Componentes (`src/components`)** concentram elementos reutilizáveis de interface.
3. **Stores (`src/store`)** mantêm o estado compartilhado com Zustand e coordenam atualizações das telas.
4. **Queries (`src/database/queries`)** realizam operações de leitura e escrita por meio do Drizzle ORM.
5. **Serviços (`src/services`)** concentram regras de domínio, recorrência, relatórios, notificações, gamificação, metas e transferência de dados.
6. **Tipos (`src/types`)** descrevem as entidades e contratos utilizados pelo TypeScript.

Na inicialização, `App.tsx` executa `runMigrations()`, restaura uma sessão de foco ativa e só então renderiza a navegação. A tela de navegação carrega o nome e as preferências locais antes de mostrar as abas; quando não há nome cadastrado, apresenta o onboarding.

## Estrutura do projeto

Árvore reconstruída a partir dos diretórios e arquivos existentes no projeto:

```text
FocoMais/
├── assets/
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash.png
├── src/
│   ├── components/
│   │   ├── BarChart/index.tsx
│   │   ├── Button/index.tsx
│   │   ├── Card/index.tsx
│   │   ├── DatePicker/index.tsx
│   │   ├── DraggableList/index.tsx
│   │   ├── EmptyState/index.tsx
│   │   ├── GoalCard/index.tsx
│   │   ├── Header/index.tsx
│   │   ├── MultiSelectModal/index.tsx
│   │   ├── ProgressRing/index.tsx
│   │   ├── RewardCard/index.tsx
│   │   ├── TaskItem/index.tsx
│   │   ├── TextInputModal/index.tsx
│   │   ├── TimePicker/index.tsx
│   │   └── TimelineBar/index.tsx
│   ├── database/
│   │   ├── migrations/index.ts
│   │   ├── queries/
│   │   │   ├── focus.queries.ts
│   │   │   ├── goals.queries.ts
│   │   │   ├── notebooks.queries.ts
│   │   │   ├── rewards.queries.ts
│   │   │   ├── taskHistory.queries.ts
│   │   │   └── tasks.queries.ts
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── hooks/useTimer.ts
│   ├── navigation/
│   │   ├── BottomTabNavigator.tsx
│   │   └── index.tsx
│   ├── screens/
│   │   ├── Focus/
│   │   │   ├── ActiveFocus/
│   │   │   │   ├── ManualRegister/index.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── FocusHistory/index.tsx
│   │   │   └── index.tsx
│   │   ├── Goals/
│   │   │   ├── CreateGoal/index.tsx
│   │   │   ├── GoalDetail/index.tsx
│   │   │   ├── NotebooksScreen/index.tsx
│   │   │   └── index.tsx
│   │   ├── Home/index.tsx
│   │   ├── Onboarding/index.tsx
│   │   ├── Reports/index.tsx
│   │   ├── Rewards/
│   │   │   ├── RewardDetail/index.tsx
│   │   │   └── index.tsx
│   │   ├── Settings/index.tsx
│   │   └── Tasks/
│   │       ├── CreateTask/index.tsx
│   │       ├── TaskDetail/index.tsx
│   │       └── index.tsx
│   ├── services/
│   │   ├── dataSync.service.ts
│   │   ├── dataTransfer.service.ts
│   │   ├── gamification.service.ts
│   │   ├── goals.service.ts
│   │   ├── notifications.service.ts
│   │   ├── recurrence.service.ts
│   │   ├── reports.service.ts
│   │   └── rewards.service.ts
│   ├── store/
│   │   ├── focusStore.ts
│   │   ├── gamificationStore.ts
│   │   ├── goalStore.ts
│   │   ├── notebookStore.ts
│   │   ├── rewardStore.ts
│   │   ├── settingsStore.ts
│   │   └── taskStore.ts
│   ├── styles/
│   │   ├── global.ts
│   │   └── theme.ts
│   ├── types/
│   │   ├── focus.types.ts
│   │   ├── gamification.types.ts
│   │   ├── goal.types.ts
│   │   ├── notebook.types.ts
│   │   ├── reward.types.ts
│   │   ├── task.types.ts
│   │   └── taskHistory.types.ts
│   └── utils/
│       ├── date.ts
│       ├── number.ts
│       └── time.ts
├── .gitignore
├── .prettierignore
├── .prettierrc
├── App.tsx
├── README.md
├── app.json
├── babel.config.js
├── drizzle.config.ts
├── eas.json
├── index.ts
├── package-lock.json
├── package.json
└── tsconfig.json
```

## Banco de dados e armazenamento local

### SQLite

O banco é aberto em `src/database/index.ts` por `expo-sqlite` com o arquivo `focomais.db`. O Drizzle ORM utiliza o schema tipado de `src/database/schema.ts`. A inicialização ativa `journal_mode=WAL` e `synchronous=NORMAL`.

O schema SQLite atual contém as seguintes tabelas. O `PRAGMA user_version = 4` é apenas um marcador interno para verificar a estrutura do banco instalado; ele não é incluído nos arquivos de backup nem define versões de importação/exportação:

| Tabela                         | Conteúdo                                     |
| ------------------------------ | -------------------------------------------- |
| `tasks`                        | Tarefas atuais                               |
| `subtasks`                     | Subtarefas                                   |
| `focus_themes`                 | Temas de foco                                |
| `focus_sessions`               | Sessões de foco registradas                  |
| `goals`                        | Metas                                        |
| `goal_tasks`                   | Hábitos e fatores de meta                    |
| `goal_task_completions`        | Conclusões datadas dos fatores de meta       |
| `rewards`                      | Recompensas por condição                     |
| `task_skips`                   | Ocorrências de tarefas recorrentes ignoradas |
| `task_completions`             | Histórico/snapshot de tarefas concluídas     |
| `gamification_settings`        | Configuração de pontuação                    |
| `point_events`                 | Eventos de pontos e reversões                |
| `coin_transactions`            | Créditos, gastos e reversões de moedas       |
| `achievements`                 | Conquistas únicas já concedidas              |
| `notebooks`                    | Cadernos de estudo                           |
| `notebook_topics`              | Tópicos dos cadernos                         |
| `purchasable_rewards`          | Itens cadastrados na loja                    |
| `purchasable_reward_purchases` | Compras realizadas na loja                   |

As preferências e o nome do usuário também são persistidos no `AsyncStorage`; não são tabelas SQLite. O estado de interface é mantido em stores Zustand e sincronizado com as consultas locais.

### Inicialização e compatibilidade do schema

`runMigrations()` cria o conjunto atual de tabelas e índices em um banco novo (`user_version = 0`). Quando encontra o marcador atual (`user_version = 4`), executa `PRAGMA optimize`. O código não contém uma sequência de migrações incrementais: um banco com outro marcador é considerado incompatível e a inicialização é interrompida. Esse controle é independente dos arquivos de backup. Faça uma cópia dos dados antes de trocar entre builds que possam ter schemas incompatíveis.

## Exportação e importação

A transferência é implementada em `src/services/dataTransfer.service.ts`:

- O arquivo exportado contém a data da exportação, os dados das tabelas SQLite e as preferências locais selecionadas. Não há campo nem identificação de versão no arquivo de backup.
- A exportação gera JSON em arquivo `.txt` ou `.json`. Na interface Android, o usuário escolhe a pasta de destino e o arquivo é salvo com extensão `.txt`.
- A importação usa o seletor de documentos e aceita arquivos de texto/JSON.
- O serviço valida a estrutura, as colunas, os tipos dos campos e os relacionamentos essenciais antes da restauração.
- A gravação das tabelas é feita em uma transação SQLite exclusiva. A importação substitui os registros locais atuais pelos registros do backup.
- A importação valida diretamente a estrutura e os tipos dos dados esperados pelo schema atual do aplicativo. Não há seleção de versão nem conversão entre formatos antigos; arquivos que não correspondam à estrutura atual são rejeitados.

**Atenção:** a importação substitui os dados existentes no aparelho. Exporte os dados atuais antes de restaurar outro backup.

## Executar o projeto

### Requisitos

- Node.js e npm compatíveis com as ferramentas Expo utilizadas pelo projeto.
- Acesso ao repositório e às dependências listadas no `package-lock.json`.
- Para executar no Android localmente: Android Studio/Android SDK, ferramentas de plataforma e um emulador ou dispositivo configurado.
- Para builds EAS: conta Expo, EAS CLI autenticado e acesso à internet.

### Instalação e desenvolvimento

```bash
npm ci
npx expo install --check
npx tsc --noEmit
npx expo start
```

Para iniciar o app em um emulador/dispositivo Android com ambiente nativo local configurado:

```bash
npm run android
```

O projeto utiliza aliases `@/*` para `src/*`, definidos em `tsconfig.json` e `babel.config.js`.

## Builds Android com EAS

O `eas.json` fixa a versão da CLI em `23.2.0` e utiliza `appVersionSource: "remote"`. Autentique-se antes da primeira compilação:

```bash
npx eas-cli@23.2.0 login
```

### Development — APK para desenvolvimento

```bash
npx eas-cli@23.2.0 build --platform android --profile development
```

Gera APK de distribuição interna com `developmentClient: true`. Esse perfil mantém a lista global de arquiteturas Android configurada no Gradle: `armeabi-v7a`, `arm64-v8a`, `x86` e `x86_64`, permitindo atender aparelhos ARM e emuladores x86.

### Preview — APK de instalação em celulares

```bash
npx eas-cli@23.2.0 build --platform android --profile preview
```

Gera APK de release. O perfil `preview` define o comando Gradle `:app:assembleRelease` com a propriedade `reactNativeArchitectures=armeabi-v7a,arm64-v8a`, incluindo ARM de 32 e 64 bits e omitindo as arquiteturas x86 usadas principalmente em emuladores. O perfil de desenvolvimento continua com as quatro arquiteturas.

### Production — Android App Bundle

```bash
npx eas-cli@23.2.0 build --platform android --profile production
```

Gera um **AAB** (`app-bundle`). O bundle contém os recursos/arquiteturas necessários para o processo de distribuição. Quando publicado no Google Play, a loja gera e entrega os APKs de configuração adequados ao dispositivo, em vez de distribuir necessariamente um APK universal com todas as arquiteturas. Um AAB não é instalado diretamente como um APK comum; para instalação fora da Play Store é necessário gerar APKs com uma ferramenta como `bundletool`.

### Configuração nativa de release

- Hermes e Nova Arquitetura permanecem habilitados.
- As opções nativas são declaradas em `app.json` pelo plugin `expo-build-properties` (`~57.0.22`). Isso é importante porque `/android` está no `.gitignore` e o EAS pode gerar novamente o projeto nativo durante o Prebuild.
- O plugin também mantém o Network Inspector habilitado e o empacotamento moderno de bibliotecas nativas (`useLegacyPackaging: false`). Hermes e Nova Arquitetura estão declarados explicitamente em `app.json`.
- R8/minificação e remoção de recursos Android são habilitados em release pelo plugin e usam o `proguard-android-optimize.txt`, além das regras de retenção para Reanimated e TurboModules. O comportamento ainda precisa ser validado em um APK release real.
- GIF e WebP de conteúdo foram desabilitados no Fresco porque o código e os assets de conteúdo do app não utilizam esses formatos. Os WebP gerados pelo Android para ícones do launcher são recursos Android estáticos e não dependem dos decoders GIF/WebP do Fresco.
- `buildArchs` no plugin preserva globalmente `armeabi-v7a`, `arm64-v8a`, `x86` e `x86_64`. O perfil Preview substitui a propriedade Gradle somente naquele build e inclui apenas `armeabi-v7a` e `arm64-v8a`; Development e Production mantêm os quatro ABIs.

## Manutenção e validações

Após alterar dependências ou configuração nativa, valide o projeto antes de gerar um novo artefato:

```bash
npm ci
npx expo install --check
npx tsc --noEmit
npx eas-cli@23.2.0 build --platform android --profile preview
```

Depois do build, instale o APK em pelo menos um aparelho ARM64 e, quando a compatibilidade ARM de 32 bits fizer parte dos dispositivos-alvo, em um aparelho `armeabi-v7a`. Verifique os fluxos de tarefas, foco/Pomodoro, metas, cadernos, recompensas, notificações, backup/restauração e relatórios. Uma compilação concluída, por si só, não substitui os testes de execução.
