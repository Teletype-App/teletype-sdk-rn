// Metro config for the example app.
//
// The SDK is linked via `file:../..`, and its `react-native` field points at the
// TypeScript source (`src/index.ts`) so Metro bundles it directly — no build
// step needed while developing. We watch the parent folder for that.
//
// Because the linked SDK has `react` / `react-native` in its own
// `../node_modules` (as devDependencies), Metro's hierarchical lookup would
// otherwise load a SECOND copy of React when bundling SDK source files, causing
// the classic "Invalid hook call / Cannot read property 'useRef' of null"
// runtime error. To guarantee a single copy we:
//   1. map `react` / `react-native` (and other peers) to the example's
//      node_modules, and
//   2. block the parent's copies of the React singletons so they can never be
//      resolved.
//
// Optional media peer deps of the SDK (`react-native-video`, …) also need to be
// mapped: hierarchical lookup from `../../src/...` only walks up from the SDK
// folder and never reaches this app's `node_modules`.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
// The SDK lives two levels up now: example/demo-teletype-sdk-expo → repo root.
const sdkRoot = path.resolve(projectRoot, '..', '..');
const appModules = path.join(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sdkRoot];

// Resolve these from the app — never from the SDK's own node_modules.
const fromApp = [
  'react',
  'react-native',
  'socket.io-client',
  '@react-native-async-storage/async-storage',
  'react-native-localize',
  // Optional media peers used by teletype-react-native-sdk
  'react-native-video',
  'react-native-create-thumbnail',
  'react-native-blob-util',
  'react-native-image-zoom-viewer',
  '@react-native-documents/viewer',
  '@react-native-community/slider',
  '@expo/vector-icons',
  'react-native-safe-area-context',
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ...fromApp.reduce((acc, name) => {
    acc[name] = path.join(appModules, name);
    return acc;
  }, {}),
};

config.resolver.nodeModulesPaths = [
  appModules,
  path.join(sdkRoot, 'node_modules'),
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockParentCopies = ['react', 'react-native'].map(
  (name) =>
    new RegExp(`^${escape(path.join(sdkRoot, 'node_modules', name))}\\${path.sep}.*$`),
);

const current = config.resolver.blockList;
config.resolver.blockList = Array.isArray(current)
  ? [...current, ...blockParentCopies]
  : current
    ? [current, ...blockParentCopies]
    : blockParentCopies;

// SDK icons import `react-native-vector-icons/*` (same as teletype-mobile).
// Expo ships the fonts via `@expo/vector-icons` — rewrite the module id.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react-native-vector-icons' ||
    moduleName.startsWith('react-native-vector-icons/')
  ) {
    const target = moduleName.replace(
      'react-native-vector-icons',
      '@expo/vector-icons',
    );
    return context.resolveRequest(context, target, platform);
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
