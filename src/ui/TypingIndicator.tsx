import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import { TeletypeTheme } from './theme';

interface Props {
  theme: TeletypeTheme;
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, opacity, transform: [{ translateY }] },
      ]}
    />
  );
}

export function TypingIndicator({ theme }: Props): React.ReactElement {
  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.operatorBubbleColor,
          borderRadius: theme.bubbleRadius,
        },
      ]}
    >
      <Dot delay={0} color={theme.mutedColor} />
      <Dot delay={150} color={theme.mutedColor} />
      <Dot delay={300} color={theme.mutedColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 4,
    marginHorizontal: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 2,
  },
});
