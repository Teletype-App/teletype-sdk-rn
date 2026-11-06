import React from 'react';
import { StyleProp, Text, TextStyle, ViewStyle } from 'react-native';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, global-require */

type IconComponent = React.ComponentType<{
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}>;

type Cache = { value: IconComponent | null; loaded: boolean };

function cached(slot: Cache, load: () => IconComponent | null): IconComponent | null {
  if (!slot.loaded) {
    try {
      slot.value = load();
    } catch {
      slot.value = null;
    }
    slot.loaded = true;
  }
  return slot.value;
}

function fromModule(mod: any): IconComponent | null {
  const comp = mod?.default ?? mod;
  return typeof comp === 'function' || (comp && typeof comp === 'object')
    ? (comp as IconComponent)
    : null;
}

const antDesignSlot: Cache = { value: null, loaded: false };
const materialCommunitySlot: Cache = { value: null, loaded: false };
const fontAwesome5Slot: Cache = { value: null, loaded: false };
const simpleLineSlot: Cache = { value: null, loaded: false };
const octiconsSlot: Cache = { value: null, loaded: false };
const ioniconsSlot: Cache = { value: null, loaded: false };

/**
 * Icon families used by media bubbles / fullscreen controls.
 * Same surface as teletype-mobile's `src/components/Icons`.
 *
 * Uses `react-native-vector-icons` (string-literal `require`s — Metro forbids
 * `require(variable)`). Expo apps typically alias that package to
 * `@expo/vector-icons` (see the Expo example `metro.config.js`).
 */
export const Icons = {
  get AntDesign(): IconComponent | null {
    return cached(antDesignSlot, () => {
      try {
        return fromModule(require('react-native-vector-icons/AntDesign'));
      } catch {
        return null;
      }
    });
  },
  get MaterialCommunityIcons(): IconComponent | null {
    return cached(materialCommunitySlot, () => {
      try {
        return fromModule(
          require('react-native-vector-icons/MaterialCommunityIcons'),
        );
      } catch {
        return null;
      }
    });
  },
  get FontAwesome5(): IconComponent | null {
    return cached(fontAwesome5Slot, () => {
      try {
        return fromModule(require('react-native-vector-icons/FontAwesome5'));
      } catch {
        return null;
      }
    });
  },
  get SimpleLineIcons(): IconComponent | null {
    return cached(simpleLineSlot, () => {
      try {
        return fromModule(require('react-native-vector-icons/SimpleLineIcons'));
      } catch {
        return null;
      }
    });
  },
  get Octicons(): IconComponent | null {
    return cached(octiconsSlot, () => {
      try {
        return fromModule(require('react-native-vector-icons/Octicons'));
      } catch {
        return null;
      }
    });
  },
  get Ionicons(): IconComponent | null {
    return cached(ioniconsSlot, () => {
      try {
        return fromModule(require('react-native-vector-icons/Ionicons'));
      } catch {
        return null;
      }
    });
  },
};

export interface IconProps {
  type: IconComponent | null | undefined;
  name: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle | TextStyle>;
  /** Shown only when the vector-icon package is not installed. */
  fallback?: string;
}

/**
 * Thin wrapper matching teletype-mobile's `<Icon name type size color />`.
 * Renders a unicode fallback when the icon package is not available.
 */
export function Icon({
  type,
  name,
  color,
  size = 24,
  style,
  fallback,
}: IconProps): React.ReactElement | null {
  if (type && name) {
    const Tag = type;
    return <Tag name={name} size={size} color={color} style={style} />;
  }
  if (fallback) {
    return (
      <Text
        style={[{ color, fontSize: size * 0.75, fontWeight: '600' }, style as any]}
      >
        {fallback}
      </Text>
    );
  }
  return null;
}

export default Icon;
