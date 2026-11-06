const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The SDK is linked via `file:../..` and its `react-native` field points at the
// TypeScript source (`src/index.ts`), so Metro bundles it directly — no build
// step while developing. We watch the repo root for that source.
//
// The linked SDK has `react` / `react-native` in its own `node_modules` (as
// devDependencies). Metro's hierarchical lookup would otherwise load a SECOND
// copy of React when bundling SDK source, causing the classic
// "Invalid hook call / Cannot read property 'useRef' of null" error. To force a
// single copy we (1) map the singletons (and other peers) to this app's
// node_modules and (2) block the SDK's copies of React.
//
// Optional media peer deps also need mapping: resolution from `../../src/...`
// walks up from the SDK folder and never reaches this app's `node_modules`.
const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, '..', '..');
const appModules = path.join(projectRoot, 'node_modules');

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
  'react-native-vector-icons',
  'react-native-safe-area-context',
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = {
  watchFolders: [sdkRoot],
  resolver: {
    nodeModulesPaths: [appModules, path.join(sdkRoot, 'node_modules')],
    extraNodeModules: fromApp.reduce((acc, name) => {
      acc[name] = path.join(appModules, name);
      return acc;
    }, {}),
    blockList: ['react', 'react-native'].map(
      (name) =>
        new RegExp(
          `^${escape(path.join(sdkRoot, 'node_modules', name))}\\${path.sep}.*$`,
        ),
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
