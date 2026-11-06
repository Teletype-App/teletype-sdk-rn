import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { TeletypeTheme } from './theme';

interface Props {
  theme: TeletypeTheme;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSend: (text: string) => void;
  onTyping?: (text: string) => void;
  onStopTyping?: () => void;
  /** When provided, shows an attachment (📎) button. */
  onAttachmentPress?: () => void | Promise<void>;
  /** Extra bottom padding for the home indicator / gesture bar. */
  bottomInset?: number;
}

export function Composer({
  theme,
  placeholder = 'Write here…',
  value,
  onChangeText,
  onSend,
  onTyping,
  onStopTyping,
  onAttachmentPress,
  bottomInset = 0,
}: Props): React.ReactElement {
  const [internal, setInternal] = useState('');
  const text = value !== undefined ? value : internal;

  useEffect(() => {
    if (value !== undefined) {
      setInternal(value);
    }
  }, [value]);

  const setText = (t: string) => {
    setInternal(t);
    onChangeText?.(t);
    if (t.trim()) {
      onTyping?.(t);
    } else {
      onStopTyping?.();
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setText('');
    onStopTyping?.();
  };

  const canSend = text.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.inputBackground,
          borderTopColor: theme.borderColor,
          paddingBottom: 8 + bottomInset,
        },
      ]}
    >
      <TextInput
        style={[styles.input, { color: theme.inputTextColor }]}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedColor}
        value={text}
        onChangeText={setText}
        multiline
        onSubmitEditing={submit}
        blurOnSubmit={false}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onAttachmentPress}
          disabled={!onAttachmentPress}
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.icon, { color: theme.mutedColor }]}>📎</Text>
        </TouchableOpacity>

        {canSend ? (
          <TouchableOpacity
            onPress={submit}
            style={[styles.sendButton, { backgroundColor: theme.primaryColor }]}
          >
            <Text style={[styles.sendIcon, { color: theme.onPrimaryColor }]}>
              ➤
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  iconButton: { paddingHorizontal: 6, paddingVertical: 6 },
  icon: { fontSize: 22 },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendIcon: { fontSize: 16 },
});
