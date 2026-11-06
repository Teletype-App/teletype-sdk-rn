# teletype-sdk-rn

Native **React Native SDK** for embedding the [Teletype](https://teletype.app) online chat into iOS and Android apps.

It reuses the exact same backend protocol as the Teletype **web widget** (`/widget`) — REST API + `socket.io` (v2) — but renders a **native** chat UI (no WebView). The public surface mirrors the web widget's `_teletypeWidget.*` API so migrating from web is straightforward.

> 🇷🇺 Документация на русском: [README_RUS.md](./README_RUS.md)

---

## Features

- 💬 Real-time messaging over `socket.io` (bidirectional, typing indicators, seen/received receipts)
- 🧩 Drop-in `<ChatWidget />` (floating button) **and** `<ChatScreen />` as a regular host / navigation screen
- 🪝 Headless core (`TeletypeClient`) + React hooks for fully custom UIs
- 🔁 Message history, offline pending queue, auto-reconnect
- ⭐ Operator rating form, service/bot messages, rich attachments (image zoom, video with generated preview, in-bubble audio player, file open/download)
- 🔔 Unread badge, event system equivalent to the web `teletype.*` events
- 🗂 Persisted session (person id + appeal id) via AsyncStorage
- 📦 TypeScript-first, zero-DOM, works on Expo and bare RN

---

## Installation

```bash
npm install teletype-sdk-rn socket.io-client@^2
# recommended for cross-launch session persistence:
npm install @react-native-async-storage/async-storage
```

`react` and `react-native` are peer dependencies. `@react-native-async-storage/async-storage` is optional — without it the SDK falls back to an in-memory store (session won't survive app restarts).

> ⚠️ The Teletype backend runs **socket.io v2**, so `socket.io-client` **must** be a `2.x` release for wire compatibility.

---

## Quick start

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
      teletypeExternalId="YOUR_EXTERNAL_ID"
      title="Онлайн чат"
      primaryColor="#0084ff"
    >
      <Root />
    </TeletypeProvider>
  );
}
```

`teletypeExternalId` is the widget external id — copy it from the channel's install snippet in the Teletype dashboard (the same value assigned to `teletypeExternalId` on the web).

---

## Components

### `<ChatWidget />`
Floating launcher button with an unread badge. It does **not** present the chat — mount `<ChatScreen />` as a regular screen when `state.opened` is true (or when `openChanged` fires). That way document pickers and other native sheets are not blocked by a React Native `<Modal>`.

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

#### Sending files

The composer shows a 📎 button. Because file picking needs a native module (and apps differ on whether they want documents, the photo library, or the camera), the SDK stays picker-agnostic: pass an `onAttachmentPress` handler that **picks a file and returns it**. The SDK then shows a send-confirmation modal with a **local preview** (Cancel / Send). After Send, the file is uploaded and delivered the same way as the web widget: a local preview appears in the chat, the file is posted to `widget-attachment/<channel_id>`, then the attachment is sent over the socket.

The example below uses [`@react-native-documents/picker`](https://github.com/react-native-documents/document-picker), a plain React Native library (no Expo dependency), but any picker works:

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
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return; // user dismissed
    throw e;
  }
};

<ChatScreen onAttachmentPress={handleAttachment} />
```

Without an `onAttachmentPress` handler the 📎 button is shown but disabled. Files larger than 20 MB, or types the web widget does not allow, are rejected (`fileSizeError` / `fileFormatNotAllowed`). To send a file programmatically without the confirmation modal, call `client.uploadFile(...)`.

#### Viewing media attachments

The chat UI renders rich bubbles for images, video, audio and generic files (layout aligned with the Teletype mobile app). None of these depend on Expo — they use plain React Native libraries loaded optionally at runtime:

| Feature | Library |
|---|---|
| Pinch-to-zoom fullscreen images | `react-native-image-zoom-viewer` |
| In-chat video + audio playback | `react-native-video` |
| Video preview thumbnails (generated on device) | `react-native-create-thumbnail` |
| Download / cache files | `react-native-blob-util` |
| Open text/docs with a system app | `@react-native-documents/viewer` |
| Audio seek bar | `@react-native-community/slider` |
| Media bubble icons (play / file / download) | `react-native-vector-icons` (Expo: alias to `@expo/vector-icons`) |

```bash
npm install react-native-video react-native-create-thumbnail \
  react-native-blob-util react-native-image-zoom-viewer \
  @react-native-documents/viewer @react-native-community/slider \
  react-native-vector-icons
# Expo alternative: `npx expo install @expo/vector-icons` and alias
# `react-native-vector-icons` → `@expo/vector-icons` in metro.config.js
# iOS
cd ios && pod install
```

Without a given library the matching feature degrades gracefully (e.g. image still opens fullscreen without pinch-zoom; files fall back to `Linking.openURL`; icons fall back to simple glyphs).

- **Images** — tap to open fullscreen, pinch to zoom, swipe down to close, download button in the overlay.
- **Video** — thumbnail is generated inside the SDK; tap opens a built-in player with native controls + download.
- **Audio** — built-in player in the bubble (play/pause, seek, duration).
- **Files / text** — tap the icon or name to download (first time) and open with a system app that can handle the type (text editors, PDF viewers, …).

### `<ChatScreen />`
The full chat surface (header + messages + composer). Open it as a **regular host / navigation screen** — not inside a React Native `<Modal>`.

```tsx
import { ChatScreen, useTeletype, useTeletypeState } from 'teletype-sdk-rn';

function Root() {
  const client = useTeletype();
  const { opened } = useTeletypeState();
  if (opened) {
    return (
      <ChatScreen
        placeholder="Message…"
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

With React Navigation, push the screen on `openChanged` and call `client.hide()` when leaving:

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
Just the floating launcher (with unread badge). Useful when you present the chat yourself.

```tsx
<ChatButton
  position="right"          // 'left' | 'right' — also follows the channel config
  scale={100}               // 70 | 80 | 90 | 100, default 100
/>
```

Color comes from `<TeletypeProvider primaryColor="…" />`.

---

## Public API

Access the client via the `useTeletype()` hook or the `onReady` callback on the provider. These mirror the web widget's `_teletypeWidget` methods.

| Method | Web equivalent | Description |
| --- | --- | --- |
| `client.show()` | `_teletypeWidget.show()` | Open the chat UI |
| `client.hide()` | `_teletypeWidget.hide()` | Close the chat UI |
| `client.toggle()` | — | Toggle the chat UI |
| `client.setMessage(text)` | `_teletypeWidget.setMessage()` | Prefill the composer |
| `client.setPersonData(info)` | `_teletypeWidget.setPersonData()` | Attach visitor data |
| `client.greetingMessages([...])` | `_teletypeWidget.greetingMessages()` | Inject bot greeting messages |
| `client.sendMessage(text)` | — | Send a message programmatically |
| `client.uploadAttachment({uri,name,type,size?})` | — | Upload a file without sending it (returns `{ attachment, attachmentId, attachmentUrl, type }`) |
| `client.sendAttachment(...)` | — | Send an already-uploaded attachment |
| `client.uploadFile({uri,name,type,size?})` | — | Upload + send an attachment, skipping the confirmation modal (rejects files over 20 MB / disallowed types) |
| `client.rateAppeal(value, tempId?)` | — | Submit a conversation rating |
| `client.markSeen()` | — | Mark inbound messages as seen |
| `client.setTitle(text)` | — | Change the chat header title |
| `client.setPrimaryColor(color)` | — | Change the shared button + header color |

```tsx
import { useTeletype } from 'teletype-sdk-rn';

function OpenChatButton() {
  const client = useTeletype();
  return (
    <Button
      title="Need help?"
      onPress={() => {
        client.setPersonData({ name: 'John', email: 'john@acme.com' });
        client.setMessage('I have a billing question');
        client.show();
      }}
    />
  );
}
```

---

## Events

Equivalent to the web `teletype.*` DOM events. Subscribe with `client.on(...)` (returns an unsubscribe function) or the `useTeletypeEvent` hook.

| Event | Payload | Web equivalent |
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
  console.log('New message from operator:', msg.message);
});
```

---

## Hooks

| Hook | Returns |
| --- | --- |
| `useTeletype()` | The `TeletypeClient` instance |
| `useTeletypeState()` | Full reactive state snapshot |
| `useMessages()` | `Message[]` |
| `useUnreadCount()` | `number` |
| `useTeletypeEvent(name, cb)` | Subscribes to one event |
| `useTeletypeActions()` | Stable action callbacks (`send`, `show`, `hide`, …) |

### Custom UI example

```tsx
import { useMessages, useTeletypeActions } from 'teletype-sdk-rn';

function MyChat() {
  const messages = useMessages();
  const { send } = useTeletypeActions();
  // render your own bubbles + input, call send(text)
}
```

---

## Using the client without React

The engine is framework-agnostic — handy for push-notification handling in the background:

```ts
import { TeletypeClient } from 'teletype-sdk-rn';

const client = new TeletypeClient({ teletypeExternalId: 'YOUR_EXTERNAL_ID' });
await client.init();
client.on('messageReceived', showLocalNotification);

// later, pass it to the provider:
<TeletypeProvider client={client}>…</TeletypeProvider>
```

---

## Theming

The launcher button and chat header share `primaryColor` on `<TeletypeProvider>` (default `#0084ff`). Pass a partial `TeletypeTheme` to `<ChatWidget>` / `<ChatScreen>` for the rest of the palette.

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

## Clusters: `dev` vs `prod`

The SDK ships with two endpoint presets, mirroring the web widget's `.env.dev` / `.env.prod`. Pick one with `mode`; both the REST API **and** the socket.io connection follow it, so messages always reach the right host.

| `mode` | apiUrl | wsUrl | assetsUrl |
| --- | --- | --- | --- |
| `dev` | `https://api.teletypeapp.com/` | `https://websocket-widget.teletypeapp.com` | `https://widget.teletypeapp.com/` |
| `prod` (default) | `https://api.teletype.app/` | `https://websocket-widget.teletype.app/` | `https://widget.teletype.app/` |

```tsx
// Account on the dev cluster (teletypeapp.com):
<TeletypeProvider teletypeExternalId="…" mode="dev">…</TeletypeProvider>

// Account on production (teletype.app) — the default:
<TeletypeProvider teletypeExternalId="…" mode="prod">…</TeletypeProvider>
```

## Self-hosted / custom cluster

Override individual endpoints via the `environment` prop (applied on top of the selected `mode`):

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

## Configuration reference (`TeletypeConfig`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `teletypeExternalId` | `string` | — | **Required.** Widget external id |
| `mode` | `'dev' \| 'prod'` | `'prod'` | Cluster preset: `dev` → `teletypeapp.com`, `prod` → `teletype.app`. REST **and** sockets follow it |
| `environment` | `Partial<TeletypeEnvironment>` | from `mode` | Fine-grained endpoint overrides on top of `mode` |
| `storage` | `KeyValueStore` | AsyncStorage → memory | Custom persistence backend |
| `soundEnabled` | `boolean` | `false` | Emit incoming-message hint |
| `locale` | `string` | system language | UI language (`'ru'`, `'en-US'`, …). Omit to follow the device |
| `title` | `string` | `'Онлайн чат'` | Chat header title (a back button sits to its left) |
| `primaryColor` | `string` | `'#0084ff'` | Shared accent for the launcher button **and** the chat header. Falls back to the channel's dashboard color if omitted |
| `translations` | `TeletypeTranslations` | `{}` | Custom / override strings, keyed by language code |
| `device` | `Record<string,string>` | `{}` | Static device metadata sent with person data |
| `socketOptions` | `Record<string,unknown>` | `{ transports: ['websocket'], forceNew: true }` | Extra `socket.io-client` v2 options, merged over defaults |

> On mobile the SDK forces the **websocket** transport by default (the xhr-polling
> fallback is unreliable on cellular/flaky networks). Override via `socketOptions`
> if you need polling or extra options (`reconnectionAttempts`, `query`, …).

---

## Localization

The SDK ships with **English** and **Russian** and, by default, **follows the
device's system language** (falling back to English for anything else).

> **Reliable device-language detection (recommended):** install the optional
> peer [`react-native-localize`](https://github.com/zoontek/react-native-localize).
> The SDK picks it up automatically. Without it, detection relies on `Intl`,
> which **on iOS returns the app's effective language** — capped by the
> localizations the app itself declares (usually just English) — so a Russian
> device may report English. `react-native-localize` reads the real device
> preference and fixes this. Alternatively, pass `locale` explicitly.
>
> ```sh
> npm install react-native-localize && cd ios && pod install
> ```

Every user-facing string lives in a dictionary — nothing is hard-coded in the
components — so each one always has both a Russian and an English value. The
built-in tables are plain JSON files (`src/i18n/en.json`, `src/i18n/ru.json`),
type-checked against the `TeletypeStrings` interface, mirroring the layout used
by the `teletype-mobile` app.

Force a specific language with the `locale` prop:

```tsx
<TeletypeProvider teletypeExternalId="…" locale="ru">
```

### Adding / overriding strings

Pass a `translations` table keyed by two-letter language code. Use it to add a
brand-new language or tweak individual built-in strings — any key you omit falls
back to English, so partial tables are safe. Keep it in its own file:

```ts
// localization.ts
import type { TeletypeTranslations } from 'teletype-sdk-rn';

export const translations: TeletypeTranslations = {
  ru: { statusOffline: 'Мы онлайн — ответим сразу' }, // override one string
  es: {                                               // add a new language
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

The full list of keys is the `TeletypeStrings` interface (exported from the
package).

### Changing language at runtime

```tsx
const client = useTeletype();
client.setLocale('en');          // switch language (UI re-renders)
client.setLocale();              // re-read the system language
```

### Localizing your own UI

```tsx
import { useTeletypeStrings, useLocale } from 'teletype-sdk-rn';

const strings = useTeletypeStrings(); // resolved strings for the active language
const locale = useLocale();           // 'ru' | 'en' | …
```

---

## Example apps

Two runnable demos live under [`/example`](./example), both wired to the SDK via
a local `file:` link and both defaulting to `mode="dev"`:

### `example/demo-teletype-sdk-expo` — Expo

Built on **Expo SDK 57** (React Native 0.86, React 19.2). Uses a dev client
(prebuild) because it pulls in native modules (`@react-native-documents/picker`).

```bash
cd example/demo-teletype-sdk-expo
npm install
# set EXTERNAL_ID in App.tsx
npm run ios   # or: npm run android
```

### `example/demo-teletype-sdk` — bare React Native (no Expo)

A plain **React Native 0.86** app created with the React Native Community CLI.

```bash
cd example/demo-teletype-sdk
npm install
# iOS: install pods once
cd ios && bundle install && bundle exec pod install && cd ..
# set EXTERNAL_ID in App.tsx
npm run ios   # or: npm run android
```

Both demos show file attachments (📎 → device file picker via
`@react-native-documents/picker`) and a runtime language switcher (EN / RU / ES).

---

## Protocol notes

This SDK reimplements the web widget's protocol:

- **REST** (`{apiUrl}api/v1/…`, host depends on `mode`): `widget/{id}/config`, `widget/ip`, `history/{id}/{appeal}/messages`, `POST widget-attachment/{channelId}` (multipart `file` + `externalId`, no auth), `collect`, `widget/error`, `widget/{id}/url`.
- **WebSocket** (`socket.io` v2, `{wsUrl}` host depends on `mode`): emits `web widget message from person`, `auth person`, `set person data`, `seen`, `person typing`, `person opened widget`, `person rate appeal`, `person click widget channel`; listens for `init data to person`, `message from client`, `received`, `seen`, `operator typing`, `operator status change`, `appeal status change`.

Payload keys are `snake_case` on the wire and normalized to `camelCase` when parsed.

---

## License

MIT
