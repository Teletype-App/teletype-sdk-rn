import React, { memo } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import icon from './icon.png';

export interface ChatButtonSvgProps {
  width?: number | string;
  height?: number | string;
  style?: StyleProp<ImageStyle>;
}

/**
 * Launcher icon: white chat bubble with a smile (web widget `icon.svg`).
 * Rendered as a PNG so the host app does not need `react-native-svg`.
 * The smile is a transparent hole — the button's background color shows through.
 */
const ChatButtonSvg: React.FC<ChatButtonSvgProps> = ({
  width = 38,
  height = 41,
  style,
}) => {
  const w = typeof width === 'number' ? width : Number(width) || 38;
  const h = typeof height === 'number' ? height : Number(height) || 41;

  return (
    <Image
      source={icon}
      style={[{ width: w, height: h }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
};

export default memo(ChatButtonSvg);
