import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Icons } from '../icons';
import { useChatSafeAreaInsets } from '../safeArea';

interface Props {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onDownload?: () => void;
  /** Extra top inset override (defaults to the device safe-area top). */
  topInset?: number;
  downloadLabel: string;
  closeLabel: string;
}

const OVERLAY_COLOR = '#00000080';
const FLAT_WHITE = '#FFFFFF';

/**
 * Overlay header for fullscreen image / video viewers — close on the left,
 * optional download on the right. Layout mirrors teletype-mobile's
 * `MediaContentControl` (positioned below the status-bar / notch).
 */
export function MediaControl({
  title,
  subtitle,
  onClose,
  onDownload,
  topInset,
  downloadLabel,
  closeLabel,
}: Props): React.ReactElement {
  const insets = useChatSafeAreaInsets();
  const top = topInset ?? insets.top;

  return (
    <View
      style={[styles.controlContainer, { top, paddingTop: 0 }]}
      pointerEvents="box-none"
    >
      <View style={styles.leftSec}>
        <TouchableOpacity
          style={styles.hbb}
          onPress={onClose}
          accessibilityLabel={closeLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.hbi}>
            <Icon
              name="arrow-left"
              type={Icons.SimpleLineIcons}
              size={24}
              color={FLAT_WHITE}
              fallback="←"
            />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.midSec}>
        <View style={styles.headerTitleContainer}>
          {title ? (
            <Text
              style={styles.title}
              numberOfLines={subtitle ? 1 : 2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {onDownload ? (
        <View style={styles.rightSec}>
          <TouchableOpacity
            style={styles.downloadIconWrapper}
            onPress={onDownload}
            accessibilityLabel={downloadLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name="download"
              type={Icons.Octicons}
              size={24}
              color={FLAT_WHITE}
              fallback="⇩"
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rightSec} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controlContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 54,
    backgroundColor: OVERLAY_COLOR,
    flexDirection: 'row',
    zIndex: 100000,
  },
  leftSec: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: Platform.OS === 'android' ? 'bold' : '500',
    color: FLAT_WHITE,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: Platform.OS === 'android' ? 'bold' : '500',
    color: FLAT_WHITE,
  },
  midSec: {
    flex: 4,
  },
  rightSec: {
    flex: 1.4,
  },
  hbb: {
    minWidth: '100%',
    flex: 1,
  },
  hbi: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 20,
  },
  downloadIconWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
