import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTeletype, useTeletypeState } from '../react/hooks';
import { TeletypeTheme, mergeTheme } from './theme';
import { ChatButtonSvg } from './svg';
import { DEFAULT_PRIMARY_COLOR } from '../config/constants';

/** Allowed launcher sizes, matching the web widget's buttonScale. */
export const CHAT_BUTTON_SCALES = [70, 80, 90, 100] as const;
export type ChatButtonScale = (typeof CHAT_BUTTON_SCALES)[number];
export type ChatButtonPosition = 'left' | 'right';

export const DEFAULT_BUTTON_COLOR = DEFAULT_PRIMARY_COLOR;

const BASE_BUTTON_SIZE = 60;
const BASE_ICON_WIDTH = 38;
const BASE_ICON_HEIGHT = 41;

export interface ChatButtonProps {
  theme?: Partial<TeletypeTheme>;
  /** Corner to pin the button to. Defaults to the config position or 'right'. */
  position?: ChatButtonPosition;
  /**
   * Launcher size as a percent of the base button (theme.buttonSize, 60 by
   * default). Allowed values: 70, 80, 90, 100. Default 100.
   */
  scale?: ChatButtonScale;
  /**
   * Circle fill behind the icon. Overrides the provider `primaryColor`.
   */
  backgroundColor?: string;
  /** Distance from the bottom edge. Default 24. */
  bottom?: number;
  /** Distance from the side edge. Default 20. */
  side?: number;
  /** Custom press handler. Defaults to `client.toggle()`. */
  onPress?: () => void;
  /** Custom icon element. */
  icon?: React.ReactNode;
  style?: ViewStyle;
}

function resolveScale(scale?: ChatButtonScale): number {
  if (scale && (CHAT_BUTTON_SCALES as readonly number[]).includes(scale)) {
    return scale / 100;
  }
  return 1;
}

/**
 * Floating launcher button with an unread badge. Mirrors the web widget's
 * bubble button. Place it once near the root of your app.
 */
export function ChatButton(props: ChatButtonProps): React.ReactElement {
  const client = useTeletype();
  const state = useTeletypeState();
  const theme = useMemo(
    () => mergeTheme(props.theme, state.primaryColor),
    [props.theme, state.primaryColor],
  );

  const pos: ChatButtonPosition =
    props.position ||
    (state.config?.position === 'left' ? 'left' : 'right');
  const bottom = props.bottom ?? 24;
  const side = props.side ?? 20;
  const factor = resolveScale(props.scale);
  const size = theme.buttonSize * factor;
  const iconScale = size / BASE_BUTTON_SIZE;
  const buttonColor = props.backgroundColor || state.primaryColor;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom },
        pos === 'left' ? { left: side } : { right: side },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={props.onPress || (() => client.toggle())}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: buttonColor,
            shadowColor: buttonColor,
          },
          props.style,
        ]}
      >
        {props.icon ?? (
          <ChatButtonSvg
            width={BASE_ICON_WIDTH * iconScale}
            height={BASE_ICON_HEIGHT * iconScale}
          />
        )}
      </TouchableOpacity>

      {state.unreadCount > 0 && !state.opened ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.badgeColor,
              transform: [{ scale: factor }],
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.badgeTextColor }]}>
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
