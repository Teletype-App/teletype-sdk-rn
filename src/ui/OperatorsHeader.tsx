import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Operator } from '../types/operator';
import { TeletypeTheme } from './theme';

interface Props {
  operators: Operator[];
  theme: TeletypeTheme;
}

const AVATAR_PALETTE = [
  '#f2849e', '#f4a259', '#5b8def', '#57c084', '#b884f0', '#4fc3d9',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function OperatorAvatar({
  operator,
  theme,
}: {
  operator: Operator;
  theme: TeletypeTheme;
}): React.ReactElement {
  const online = !!operator.isOnline;
  const avatar = operator.avatar || operator.avatarDefault;
  return (
    <View style={[styles.cell, !online && styles.cellOffline]}>
      <View>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[styles.avatar, { backgroundColor: colorFor(operator.name) }]}
          >
            <Text style={styles.initials}>{initials(operator.name)}</Text>
          </View>
        )}
        <View
          style={[
            styles.dot,
            { backgroundColor: online ? '#3ac569' : '#c7ccd1' },
          ]}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.name, { color: theme.headerTextColor }]}
      >
        {operator.name}
      </Text>
    </View>
  );
}

/**
 * Row of operator avatars (with online status + name) shown on the gradient at
 * the top of the conversation. Scrolls away as the visitor reads new messages.
 */
export function OperatorsHeader({
  operators,
  theme,
}: Props): React.ReactElement | null {
  const list = operators.filter((o) => o && o.name && o.name.trim());
  if (list.length === 0) {
    return null;
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.primaryColor }]}>
      <View style={styles.row}>
        {list.slice(0, 4).map((op, i) => (
          <OperatorAvatar key={op.id || `${op.name}-${i}`} operator={op} theme={theme} />
        ))}
      </View>
    </View>
  );
}

const AV = 66;

const styles = StyleSheet.create({
  container: { paddingTop: 6, paddingBottom: 22 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  cell: { alignItems: 'center', marginHorizontal: 12, width: AV + 12 },
  cellOffline: { opacity: 0.6 },
  avatar: {
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  name: { marginTop: 8, fontSize: 14, fontWeight: '600', maxWidth: AV + 10 },
});
