import React, { memo, useEffect, useRef } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Icon, Icons } from './icons';

export interface ScrollButtonProps {
  action?: () => void;
  style?: StyleProp<ViewStyle>;
  buttonContent?: React.ReactNode;
  direct?: 'up' | 'down' | null;
  forceVisible?: boolean;
  width?: number;
  height?: number;
  bColor?: string;
  iconColor?: string;
}

/**
 * Floating chevron that slides in/out with the scroll direction.
 * Ported from teletype-mobile `src/components/ScrollButton`.
 *
 * `direct === 'up'` → visible (user is heading toward the latest messages).
 * `direct === 'down'` → hidden (at the bottom, or scrolling to older messages).
 * `forceVisible` keeps it on screen (unread badge).
 */
export function ScrollButton({
  action,
  style,
  buttonContent,
  direct,
  forceVisible = false,
  width = 38,
  height = 38,
  bColor = '#f7f7f7d9',
  iconColor = '#00000054',
}: ScrollButtonProps): React.ReactElement {
  const translation = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (forceVisible) {
      Animated.parallel([
        Animated.timing(translation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (direct !== null) {
      Animated.parallel([
        Animated.timing(translation, {
          toValue: direct === 'down' ? 50 : 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: direct === 'down' ? 0 : 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [direct, forceVisible, translation, opacity]);

  return (
    <Animated.View
      style={[
        styles.scrollButtonBox,
        style,
        {
          width,
          height,
          opacity,
          transform: [{ translateY: translation }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.scrollButton, { backgroundColor: bColor, width, height }]}
        activeOpacity={1}
        onPress={action}
        accessibilityRole="button"
      >
        {buttonContent ?? <ChevronDownIcon color={iconColor} size={22} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ChevronDownIcon({
  color,
  size,
}: {
  color: string;
  size: number;
}): React.ReactElement {
  if (Icons.Octicons) {
    return (
      <Icon
        name="chevron-down"
        type={Icons.Octicons}
        size={size}
        color={color}
        fallback="▾"
      />
    );
  }
  return (
    <View
      style={{
        width: size * 0.42,
        height: size * 0.42,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.12,
      }}
    />
  );
}

const styles = StyleSheet.create({
  scrollButtonBox: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollButton: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0000000f',
  },
});

export default memo(ScrollButton);
