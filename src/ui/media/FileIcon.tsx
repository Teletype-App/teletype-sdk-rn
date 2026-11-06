import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface Props {
  /** `true` until the file is in the local cache — show the download arrow. */
  needDownload: boolean;
  loading?: boolean;
  color: string;
  size?: number;
}

/**
 * File-bubble glyph. Same switch as teletype-mobile
 * `MessageTypeFile.renderFileIcon`:
 *   needDownload → AntDesign `arrowdown`
 *   cached       → MaterialCommunityIcons `file`
 *
 * Drawn with Views so the host app does not need those icon fonts linked
 * (unlinked `react-native-vector-icons` renders a "?" on iOS).
 */
export function FileIcon({
  needDownload,
  loading = false,
  color,
  size = 24,
}: Props): React.ReactElement {
  if (loading) {
    return <ActivityIndicator size={size} color={color} />;
  }
  return needDownload ? (
    <ArrowDownGlyph color={color} size={size} />
  ) : (
    <FileGlyph color={color} size={size} />
  );
}

function ArrowDownGlyph({
  color,
  size,
}: {
  color: string;
  size: number;
}): React.ReactElement {
  const stemW = Math.max(2, Math.round(size * 0.12));
  const stemH = size * 0.4;
  const head = size * 0.46;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: stemW,
          height: stemH,
          backgroundColor: color,
          borderRadius: stemW / 2,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -1,
          borderLeftWidth: head / 2,
          borderRightWidth: head / 2,
          borderTopWidth: head * 0.72,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
}

function FileGlyph({
  color,
  size,
}: {
  color: string;
  size: number;
}): React.ReactElement {
  const w = size * 0.58;
  const h = size * 0.74;
  const fold = size * 0.22;
  const stroke = Math.max(1.5, size * 0.08);
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: w,
          height: h,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: 2,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -stroke,
            right: -stroke,
            width: fold,
            height: fold,
            borderLeftWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: color,
            backgroundColor: 'transparent',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
