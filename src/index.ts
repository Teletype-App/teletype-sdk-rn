/**
 * teletype-react-native-sdk
 *
 * Native React Native SDK for embedding the Teletype online chat into iOS and
 * Android apps. Reuses the Teletype web widget's backend protocol (REST +
 * socket.io v2) — no WebView required.
 *
 * Quick start:
 * ```tsx
 * import { TeletypeProvider, ChatWidget } from 'teletype-react-native-sdk';
 *
 * export default function App() {
 *   return (
 *     <TeletypeProvider
 *       teletypeExternalId="YOUR_EXTERNAL_ID"
 *       title="Онлайн чат"
 *       primaryColor="#0084ff"
 *     >
 *       <MyApp />
 *       <ChatWidget />
 *     </TeletypeProvider>
 *   );
 * }
 * ```
 */

// Core (headless engine)
export * from './core';

// React bindings
export * from './react';

// UI components
export * from './ui';

// Types
export * from './types';

// Config
export { WsEvent, DEFAULT_PRIMARY_COLOR, DEFAULT_CHAT_TITLE } from './config/constants';
export {
  DEFAULT_ENVIRONMENT,
  DEV_ENVIRONMENT,
  PROD_ENVIRONMENT,
  DEFAULT_MODE,
  getEnvironment,
} from './config/environment';
export type { TeletypeEnvironment, TeletypeMode } from './config/environment';

// Localization (i18n)
export * from './i18n';
