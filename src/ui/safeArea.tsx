import React, { createContext, useContext } from 'react';
import { Platform, StatusBar } from 'react-native';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, global-require */

export type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const fallbackInsets = (): EdgeInsets => ({
  top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 47,
  // Home-indicator devices; older iPhones report 0 via the real SafeArea API.
  bottom: Platform.OS === 'ios' ? 34 : 0,
  left: 0,
  right: 0,
});

const InsetsContext = createContext<EdgeInsets | null>(null);

type SafeAreaLib = {
  SafeAreaProvider: React.ComponentType<{ children?: React.ReactNode }>;
  useSafeAreaInsets: () => EdgeInsets;
};

let libSlot: { value: SafeAreaLib | null; loaded: boolean } = {
  value: null,
  loaded: false,
};

function getSafeAreaLib(): SafeAreaLib | null {
  if (!libSlot.loaded) {
    try {
      const mod = require('react-native-safe-area-context');
      if (mod?.SafeAreaProvider && typeof mod.useSafeAreaInsets === 'function') {
        libSlot.value = {
          SafeAreaProvider: mod.SafeAreaProvider,
          useSafeAreaInsets: mod.useSafeAreaInsets,
        };
      } else {
        libSlot.value = null;
      }
    } catch {
      libSlot.value = null;
    }
    libSlot.loaded = true;
  }
  return libSlot.value;
}

function LibInsetsBridge({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  const lib = getSafeAreaLib()!;
  const insets = lib.useSafeAreaInsets();
  return (
    <InsetsContext.Provider value={insets}>{children}</InsetsContext.Provider>
  );
}

/**
 * Provides safe-area insets for chat UI / media overlays.
 * Uses `react-native-safe-area-context` when installed; otherwise falls back to
 * approximate notch / home-indicator insets.
 */
export function ChatSafeAreaProvider({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  const lib = getSafeAreaLib();
  if (lib) {
    return (
      <lib.SafeAreaProvider>
        <LibInsetsBridge>{children}</LibInsetsBridge>
      </lib.SafeAreaProvider>
    );
  }
  return (
    <InsetsContext.Provider value={fallbackInsets()}>
      {children}
    </InsetsContext.Provider>
  );
}

/** Safe-area insets for chat chrome and fullscreen media controls. */
export function useChatSafeAreaInsets(): EdgeInsets {
  return useContext(InsetsContext) ?? fallbackInsets();
}
