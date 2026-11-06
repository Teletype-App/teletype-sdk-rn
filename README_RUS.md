# teletype-sdk-rn

Нативный **React Native SDK** для встраивания онлайн-чата [Teletype](https://teletype.app) в мобильные приложения iOS и Android.

SDK использует тот же backend-протокол, что и **веб-виджет** Teletype (`/widget`) — REST API + `socket.io` (v2) — но рендерит **нативный** интерфейс чата (без WebView). Публичный API повторяет методы веб-виджета `_teletypeWidget.*`, поэтому переход с веб-версии максимально простой.

> 🇬🇧 English docs: [README.md](./README.md)

---

## Возможности

- 💬 Обмен сообщениями в реальном времени по `socket.io` (индикатор набора, статусы «доставлено»/«прочитано»)
- 🧩 Готовый `<ChatWidget />` (плавающая кнопка) **и** `<ChatScreen />` как обычный экран хоста / навигации
- 🪝 Headless-ядро (`TeletypeClient`) + React-хуки для полностью кастомного UI
- 🔁 История сообщений, офлайн-очередь неотправленных, авто-переподключение
- ⭐ Форма оценки оператора, сервисные/бот-сообщения, медиа-вложения (зум изображений, видео с превью, аудиоплеер, открытие/скачивание файлов)
- 🔔 Бейдж непрочитанных, система событий как у веб-событий `teletype.*`
- 🗂 Сохранение сессии (person id + appeal id) через AsyncStorage
- 📦 TypeScript, без DOM, работает на Expo и bare RN

---

## Установка

```bash
npm install teletype-sdk-rn socket.io-client@^2
# рекомендуется для сохранения сессии между запусками:
npm install @react-native-async-storage/async-storage
```

`react` и `react-native` — peer-зависимости. `@react-native-async-storage/async-storage` опционален: без него SDK использует хранилище в памяти (сессия не переживёт перезапуск приложения).

> ⚠️ Backend Teletype работает на **socket.io v2**, поэтому `socket.io-client` **обязательно** должен быть версии `2.x`.

---

## Быстрый старт

```tsx
import {
  TeletypeProvider,
  ChatWidget,
  ChatScreen,
  useTeletype,
  useTeletypeState,
} from 'teletype-sdk-rn';

function Root() {
  const client = useTeletype();
  const { opened } = useTeletypeState();

  if (opened) {
    return <ChatScreen onClose={() => client.hide()} />;
  }

  return (
    <>
      <YourApp />
      <ChatWidget />
    </>
  );
}

export default function App() {
  return (
    <TeletypeProvider
      teletypeExternalId="ВАШ_EXTERNAL_ID"
      title="Онлайн чат"
      primaryColor="#0084ff"
    >
      <Root />
    </TeletypeProvider>
  );
}
```

`teletypeExternalId` — это external id виджета. Скопируйте его из скрипта установки канала в панели Teletype (то же значение, что присваивается `teletypeExternalId` на вебе).

---

## Компоненты

### `<ChatWidget />`
Плавающая кнопка с бейджем непрочитанных. Чат она **не** открывает — смонтируйте `<ChatScreen />` как обычный экран, когда `state.opened === true` (или по событию `openChanged`). Так пикер файлов и другие системные окна не упираются в React Native `<Modal>`.

```tsx
<ChatWidget
  hideButton={false}
  buttonProps={{
    position: 'right', // 'left' | 'right'
    scale: 100, // 70 | 80 | 90 | 100
    bottom: 32,
  }}
/>
```

#### Отправка файлов

В поле ввода есть кнопка 📎. Выбор файла требует нативного модуля (и приложения по-разному выбирают документы, фотогалерею или камеру), поэтому SDK не навязывает конкретный пикер: передайте обработчик `onAttachmentPress`, который **выбирает файл и возвращает его**. Дальше SDK показывает окно подтверждения с **локальным превью** (Отмена / Отправить). После «Отправить» файл загружается и доставляется так же, как в веб-виджете: в чате появляется локальное превью, файл уходит на `widget-attachment/<channel_id>`, затем вложение отправляется по сокету.

В примере ниже используется [`@react-native-documents/picker`](https://github.com/react-native-documents/document-picker) — обычная React Native библиотека (без зависимости от Expo), но подойдёт любой пикер:

```tsx
import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';

const handleAttachment = async () => {
  try {
    const [file] = await pick();
    if (!file) return;
    return {
      uri: file.uri,
      name: file.name ?? 'file',
      type: file.type ?? 'application/octet-stream',
      size: file.size ?? undefined,
    };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return; // пользователь закрыл выбор
    throw e;
  }
};

<ChatScreen onAttachmentPress={handleAttachment} />
```

Без обработчика `onAttachmentPress` кнопка 📎 показывается, но неактивна. Файлы больше 20 МБ и типы, которые веб-виджет не принимает, отклоняются (`fileSizeError` / `fileFormatNotAllowed`). Чтобы отправить файл программно без окна подтверждения, вызовите `client.uploadFile(...)`.

#### Просмотр медиа-вложений

Чат показывает отдельные пузыри для изображений, видео, аудио и обычных файлов (вёрстка как в приложении Teletype Mobile). Компоненты **не зависят от Expo** — подключаются обычные React Native библиотеки (опционально, через `require`):

| Возможность | Библиотека |
|---|---|
| Полноэкранный зум изображений (pinch) | `react-native-image-zoom-viewer` |
| Встроенный плеер видео и аудио | `react-native-video` |
| Превью видео (генерируется на устройстве) | `react-native-create-thumbnail` |
| Скачивание / кэш файлов | `react-native-blob-util` |
| Открытие текста/документов системным приложением | `@react-native-documents/viewer` |
| Ползунок перемотки аудио | `@react-native-community/slider` |
| Иконки медиа-пузырей (play / file / download) | `react-native-vector-icons` (Expo: алиас на `@expo/vector-icons`) |

```bash
npm install react-native-video react-native-create-thumbnail \
  react-native-blob-util react-native-image-zoom-viewer \
  @react-native-documents/viewer @react-native-community/slider \
  react-native-vector-icons
# Expo: `npx expo install @expo/vector-icons` и алиас
# `react-native-vector-icons` → `@expo/vector-icons` в metro.config.js
# iOS
cd ios && pod install
```

Без конкретной библиотеки соответствующая функция деградирует (изображение откроется без pinch-zoom, файл — через `Linking.openURL`, иконки — простыми глифами).

- **Изображения** — тап → полный экран, pinch-zoom, свайп вниз закрывает, кнопка скачивания.
- **Видео** — превью генерируется внутри SDK; тап открывает встроенный плеер + скачивание.
- **Аудио** — встроенный плеер в пузыре (play/pause, seek).
- **Файлы / текст** — тап по иконке или имени скачивает (первый раз) и открывает системным приложением.

### `<ChatScreen />`
Полный экран чата (шапка + сообщения + поле ввода). Открывайте его как **обычный экран хоста / навигации** — не внутри React Native `<Modal>`.

```tsx
import { ChatScreen, useTeletype, useTeletypeState } from 'teletype-sdk-rn';

function Root() {
  const client = useTeletype();
  const { opened } = useTeletypeState();
  if (opened) {
    return (
      <ChatScreen
        placeholder="Сообщение…"
        onAttachmentPress={handleAttachment}
        onClose={() => client.hide()}
      />
    );
  }
  return (
    <>
      <Home />
      <ChatWidget />
    </>
  );
}
```

С React Navigation пушьте экран по `openChanged` и вызывайте `client.hide()` при выходе:

```tsx
function Home({ navigation }) {
  useTeletypeEvent('openChanged', (opened) => {
    if (opened) navigation.navigate('Chat');
  });
  return (
    <>
      <HomeContent />
      <ChatWidget />
    </>
  );
}

function ChatRoute({ navigation }) {
  const client = useTeletype();
  return (
    <ChatScreen
      onAttachmentPress={handleAttachment}
      onClose={() => {
        client.hide();
        navigation.goBack();
      }}
    />
  );
}
```

### `<ChatButton />`
Только плавающая кнопка (с бейджем). Полезно, если чат вы открываете сами.

```tsx
<ChatButton
  position="right"          // 'left' | 'right' — также берётся из конфига канала
  scale={100}               // 70 | 80 | 90 | 100, по умолчанию 100
/>
```

Цвет задаётся через `<TeletypeProvider primaryColor="…" />`.

---

## Публичный API

Доступ к клиенту — через хук `useTeletype()` или колбэк `onReady` у провайдера. Методы повторяют `_teletypeWidget` из веб-виджета.

| Метод | Аналог на вебе | Описание |
| --- | --- | --- |
| `client.show()` | `_teletypeWidget.show()` | Открыть чат |
| `client.hide()` | `_teletypeWidget.hide()` | Закрыть чат |
| `client.toggle()` | — | Переключить чат |
| `client.setMessage(text)` | `_teletypeWidget.setMessage()` | Предзаполнить поле ввода |
| `client.setPersonData(info)` | `_teletypeWidget.setPersonData()` | Передать данные персоны |
| `client.greetingMessages([...])` | `_teletypeWidget.greetingMessages()` | Приветственные сообщения бота |
| `client.sendMessage(text)` | — | Отправить сообщение программно |
| `client.uploadAttachment({uri,name,type,size?})` | — | Загрузить файл без отправки (возвращает `{ attachment, attachmentId, attachmentUrl, type }`) |
| `client.sendAttachment(...)` | — | Отправить уже загруженное вложение |
| `client.uploadFile({uri,name,type,size?})` | — | Загрузить и отправить вложение без окна подтверждения (файлы больше 20 МБ / запрещённые типы отклоняются) |
| `client.rateAppeal(value, tempId?)` | — | Отправить оценку диалога |
| `client.markSeen()` | — | Пометить входящие как прочитанные |
| `client.setTitle(text)` | — | Сменить заголовок хедера чата |
| `client.setPrimaryColor(color)` | — | Сменить общий цвет кнопки и хедера |

```tsx
import { useTeletype } from 'teletype-sdk-rn';

function OpenChatButton() {
  const client = useTeletype();
  return (
    <Button
      title="Нужна помощь?"
      onPress={() => {
        client.setPersonData({ name: 'Иван', email: 'ivan@acme.com' });
        client.setMessage('Вопрос по оплате');
        client.show();
      }}
    />
  );
}
```

Интерфейс данных персоны:

```ts
interface AdditionalPersonInfo {
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  payload?: { [key: string]: string };
}
```

---

## События

Аналог веб-событий `teletype.*`. Подписка через `client.on(...)` (возвращает функцию отписки) или хук `useTeletypeEvent`.

| Событие | Данные | Аналог на вебе |
| --- | --- | --- |
| `ready` | `void` | `teletype.ready` |
| `opened` / `closed` | `void` | `teletype.opened` / `teletype.closed` |
| `dialogStarted` | `Message` | `teletype.dialogStarted` |
| `appealStarted` | `Message` | `teletype.appealStarted` |
| `messageSent` | `Message` | `teletype.messageSent` |
| `messageReceived` | `Message` | `teletype.messageReceived` |
| `dialogClosed` | `{ status }` | `teletype.dialogClosed` |
| `dialogRated` | `{ id, formValue }` | `teletype.dialogRated` |
| `channelClicked` | `ChannelMessenger` | `teletype.channelClicked` |
| `messagesChanged` | `Message[]` | — |
| `unreadCountChanged` | `number` | — |
| `operatorTyping` | `boolean` | — |
| `connectionChanged` | `'connected' \| 'disconnected'` | — |

```tsx
useTeletypeEvent('messageReceived', (msg) => {
  console.log('Новое сообщение от оператора:', msg.message);
});
```

---

## Хуки

| Хук | Возвращает |
| --- | --- |
| `useTeletype()` | Экземпляр `TeletypeClient` |
| `useTeletypeState()` | Полный реактивный снимок состояния |
| `useMessages()` | `Message[]` |
| `useUnreadCount()` | `number` |
| `useTeletypeEvent(name, cb)` | Подписка на одно событие |
| `useTeletypeActions()` | Стабильные колбэки (`send`, `show`, `hide`, …) |

### Пример кастомного UI

```tsx
import { useMessages, useTeletypeActions } from 'teletype-sdk-rn';

function MyChat() {
  const messages = useMessages();
  const { send } = useTeletypeActions();
  // рисуете свои пузыри + поле ввода, вызываете send(text)
}
```

---

## Использование без React

Ядро не зависит от фреймворка — удобно для обработки push-уведомлений в фоне:

```ts
import { TeletypeClient } from 'teletype-sdk-rn';

const client = new TeletypeClient({ teletypeExternalId: 'ВАШ_EXTERNAL_ID' });
await client.init();
client.on('messageReceived', showLocalNotification);

// позже передайте его в провайдер:
<TeletypeProvider client={client}>…</TeletypeProvider>
```

---

## Оформление (темизация)

Цвет кнопки и хедера чата — это одна переменная `primaryColor` на `<TeletypeProvider>` (по умолчанию `#0084ff`). Остальную палитру можно передать частичным `TeletypeTheme` в `<ChatWidget>` / `<ChatScreen>`.

```tsx
<TeletypeProvider
  teletypeExternalId="…"
  title="Онлайн чат"
  primaryColor="#0084ff"
>
  <ChatScreen
    theme={{
      backgroundColor: '#f8fafc',
      bubbleRadius: 20,
    }}
  />
</TeletypeProvider>
```

---

## Кластеры: `dev` и `prod`

В SDK встроены два пресета эндпоинтов, повторяющие `.env.dev` / `.env.prod` веб-виджета. Выбирается через `mode`; и REST API, и socket.io-соединение следуют ему — сообщения всегда идут на нужный хост.

| `mode` | apiUrl | wsUrl | assetsUrl |
| --- | --- | --- | --- |
| `dev` | `https://api.teletypeapp.com/` | `https://websocket-widget.teletypeapp.com` | `https://widget.teletypeapp.com/` |
| `prod` (по умолчанию) | `https://api.teletype.app/` | `https://websocket-widget.teletype.app/` | `https://widget.teletype.app/` |

```tsx
// Аккаунт на dev-кластере (teletypeapp.com):
<TeletypeProvider teletypeExternalId="…" mode="dev">…</TeletypeProvider>

// Аккаунт на проде (teletype.app) — по умолчанию:
<TeletypeProvider teletypeExternalId="…" mode="prod">…</TeletypeProvider>
```

## Self-hosted / свой кластер

Переопределите отдельные endpoints через проп `environment` (поверх выбранного `mode`):

```tsx
<TeletypeProvider
  teletypeExternalId="…"
  environment={{
    apiUrl: 'https://api.your-teletype.com/',
    wsUrl: 'https://ws.your-teletype.com',
    apiVersion: '1',
  }}
>
```

---

## Параметры конфигурации (`TeletypeConfig`)

| Опция | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `teletypeExternalId` | `string` | — | **Обязательно.** External id виджета |
| `mode` | `'dev' \| 'prod'` | `'prod'` | Пресет кластера: `dev` → `teletypeapp.com`, `prod` → `teletype.app`. REST **и** сокеты следуют ему |
| `environment` | `Partial<TeletypeEnvironment>` | из `mode` | Точечное переопределение endpoints поверх `mode` |
| `storage` | `KeyValueStore` | AsyncStorage → память | Своё хранилище |
| `soundEnabled` | `boolean` | `false` | Подсказка о входящем сообщении |
| `locale` | `string` | язык системы | Язык интерфейса (`'ru'`, `'en-US'`, …). Не задавайте, чтобы следовать языку устройства |
| `title` | `string` | `'Онлайн чат'` | Заголовок хедера чата (слева от него — кнопка «назад») |
| `primaryColor` | `string` | `'#0084ff'` | Общий цвет кнопки **и** хедера чата. Если не задан — цвет канала из панели |
| `translations` | `TeletypeTranslations` | `{}` | Свои / переопределяющие строки по коду языка |
| `device` | `Record<string,string>` | `{}` | Метаданные устройства для данных персоны |
| `socketOptions` | `Record<string,unknown>` | `{ transports: ['websocket'], forceNew: true }` | Доп. опции `socket.io-client` v2 поверх дефолтов |

> На мобильных SDK по умолчанию форсирует транспорт **websocket** (fallback на
> xhr-polling ненадёжен в сотовых/нестабильных сетях). Переопределите через
> `socketOptions`, если нужен polling или доп. опции (`reconnectionAttempts`, `query`, …).

---

## Локализация

SDK поставляется с **английским** и **русским** языками и по умолчанию
**следует языку системы** устройства (для остальных языков — откат на
английский).

> **Надёжное определение языка устройства (рекомендуется):** установите
> опциональную зависимость [`react-native-localize`](https://github.com/zoontek/react-native-localize).
> SDK подхватит её автоматически. Без неё определение опирается на `Intl`,
> который **на iOS возвращает эффективный язык приложения** — ограниченный
> локализациями, которые само приложение объявляет (обычно только английский),
> поэтому на русском устройстве может вернуться английский.
> `react-native-localize` читает реальную настройку устройства и решает эту
> проблему. Как альтернатива — передайте `locale` явно.
>
> ```sh
> npm install react-native-localize && cd ios && pod install
> ```

Каждая отображаемая строка хранится в словаре — в компонентах нет захардкоженного
текста — поэтому у каждой всегда есть и русская, и английская версия. Встроенные
таблицы — это обычные JSON-файлы (`src/i18n/en.json`, `src/i18n/ru.json`),
проверяемые по типу `TeletypeStrings`, по образцу приложения `teletype-mobile`.

Принудительно задать язык — проп `locale`:

```tsx
<TeletypeProvider teletypeExternalId="…" locale="ru">
```

### Добавление / переопределение строк

Передайте таблицу `translations` с ключами — двухбуквенными кодами языков. Так
можно добавить новый язык или изменить отдельные встроенные строки. Любой
пропущенный ключ берётся из английского, поэтому частичные таблицы безопасны.
Удобно держать её в отдельном файле:

```ts
// localization.ts
import type { TeletypeTranslations } from 'teletype-sdk-rn';

export const translations: TeletypeTranslations = {
  ru: { statusOffline: 'Мы онлайн — ответим сразу' }, // переопределяем одну строку
  es: {                                               // добавляем новый язык
    composerPlaceholder: 'Escribe un mensaje…',
    statusOnline: 'En línea',
    // …
  },
};
```

```tsx
import { translations } from './localization';

<TeletypeProvider teletypeExternalId="…" translations={translations} />
```

Полный список ключей — интерфейс `TeletypeStrings` (экспортируется из пакета).

### Смена языка во время работы

```tsx
const client = useTeletype();
client.setLocale('en');          // сменить язык (UI перерисуется)
client.setLocale();              // перечитать язык системы
```

### Локализация своего UI

```tsx
import { useTeletypeStrings, useLocale } from 'teletype-sdk-rn';

const strings = useTeletypeStrings(); // строки для активного языка
const locale = useLocale();           // 'ru' | 'en' | …
```

---

## Примеры-приложения

В [`/example`](./example) лежат два запускаемых демо; оба подключают SDK через
локальную `file:`-ссылку и по умолчанию используют `mode="dev"`:

### `example/demo-teletype-sdk-expo` — Expo

На **Expo SDK 57** (React Native 0.86, React 19.2). Использует dev-client
(prebuild), т.к. подключены нативные модули (`@react-native-documents/picker`).

```bash
cd example/demo-teletype-sdk-expo
npm install
# укажите EXTERNAL_ID в App.tsx
npm run ios   # или: npm run android
```

### `example/demo-teletype-sdk` — чистый React Native (без Expo)

Обычное приложение **React Native 0.86**, созданное через React Native Community CLI.

```bash
cd example/demo-teletype-sdk
npm install
# iOS: один раз установить поды
cd ios && bundle install && bundle exec pod install && cd ..
# укажите EXTERNAL_ID в App.tsx
npm run ios   # или: npm run android
```

Оба демо показывают отправку файлов (📎 → системный выбор файла через
`@react-native-documents/picker`) и переключение языка в рантайме (EN / RU / ES).

---

## О протоколе

SDK повторяет протокол веб-виджета:

- **REST** (`{apiUrl}api/v1/…`, хост зависит от `mode`): `widget/{id}/config`, `widget/ip`, `history/{id}/{appeal}/messages`, `POST widget-attachment/{channelId}` (multipart `file` + `externalId`, без авторизации), `collect`, `widget/error`, `widget/{id}/url`.
- **WebSocket** (`socket.io` v2, `{wsUrl}` хост зависит от `mode`): отправляет `web widget message from person`, `auth person`, `set person data`, `seen`, `person typing`, `person opened widget`, `person rate appeal`, `person click widget channel`; слушает `init data to person`, `message from client`, `received`, `seen`, `operator typing`, `operator status change`, `appeal status change`.

Ключи полезной нагрузки на проводе — `snake_case`, при разборе приводятся к `camelCase`.

---

## Лицензия

MIT
