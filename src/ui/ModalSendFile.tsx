import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatBytes } from '../core/utils';
import { messageTypeFromFile } from '../config/fileTypes';
import { LocalFile } from '../types/file';
import { TeletypeStrings } from '../i18n/strings';
import { TeletypeTheme } from './theme';
import { Icon, Icons } from './icons';
import { getExt } from './media/fileUtils';
import { createVideoThumbnail } from './media/thumbnail';

interface Props {
  file: LocalFile;
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  onClose: () => void;
  onSend: (file: LocalFile) => void;
}

function titleFor(
  type: ReturnType<typeof messageTypeFromFile>,
  strings: TeletypeStrings,
): string {
  switch (type) {
    case 'image':
      return strings.sendImage;
    case 'video':
      return strings.sendVideo;
    case 'audio':
      return strings.sendAudio;
    default:
      return strings.sendFile;
  }
}

/**
 * Confirmation dialog shown after a file is picked and before it is sent.
 * Only previews the **local** file (no upload). Layout follows
 * teletype-mobile's `ModalSendFile`. Actual upload + delivery happens after
 * Send, the same way as the web widget.
 */
export function ModalSendFile({
  file,
  theme,
  strings,
  onClose,
  onSend,
}: Props): React.ReactElement {
  const kind = messageTypeFromFile(file);
  const [thumb, setThumb] = useState<string | null>(
    kind === 'image' ? file.uri : file.previewUri || null,
  );
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(
    file.width && file.height
      ? { width: file.width, height: file.height }
      : null,
  );

  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    if (kind !== 'image' || !file.uri) {
      return;
    }
    Image.getSize(
      file.uri,
      (width, height) => setImageSize({ width, height }),
      () => undefined,
    );
  }, [kind, file.uri]);

  useEffect(() => {
    if (kind !== 'video' || !file.uri) {
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await createVideoThumbnail(file.uri);
      if (cancelled || !result) {
        return;
      }
      setThumb(result.uri);
      if (result.width && result.height) {
        setImageSize({ width: result.width, height: result.height });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, file.uri]);

  const send = useCallback(() => {
    onSend({
      ...file,
      width: imageSize?.width,
      height: imageSize?.height,
      previewUri: kind === 'video' ? thumb || file.previewUri : file.previewUri,
    });
  }, [file, imageSize, onSend, kind, thumb]);

  const isMedia = kind === 'image' || kind === 'video';
  const ext = getExt(file.name).toUpperCase();
  const sizeLabel = formatBytes(file.size, 2, strings);

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundColor,
            height: isMedia ? '50%' : 280,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: theme.primaryColor }]}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: theme.headerTextColor }]}
          >
            {titleFor(kind, strings)}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={strings.cancel}
          >
            <Text style={[styles.headerClose, { color: theme.headerTextColor }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.fileBox, { borderColor: theme.borderColor }]}>
          {kind === 'image' ? (
            <View style={styles.mediaFill}>
              {file.uri ? (
                <Image
                  style={styles.img}
                  source={{ uri: file.uri }}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.img, styles.placeholder]} />
              )}
            </View>
          ) : kind === 'video' ? (
            <View style={styles.mediaFill}>
              {thumb ? (
                <Image
                  style={styles.img}
                  source={{ uri: thumb }}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.img, styles.placeholder]} />
              )}
              <View style={styles.fileSizeBox}>
                <Text numberOfLines={1} style={styles.fileSizeText}>
                  {sizeLabel}
                </Text>
              </View>
              <View style={styles.playIconBox}>
                <View style={styles.playIconContainer}>
                  <Icon
                    name="play"
                    type={Icons.FontAwesome5}
                    size={15}
                    color="#fff"
                    fallback="▶"
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.fileRow}>
              <View
                style={[styles.fileIcon, { borderColor: theme.borderColor }]}
              >
                <Text style={[styles.extTitle, { color: theme.inputTextColor }]}>
                  {ext || 'FILE'}
                </Text>
              </View>
              <View style={styles.fileMeta}>
                <Text
                  numberOfLines={1}
                  style={[styles.fileName, { color: theme.inputTextColor }]}
                >
                  {file.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.fileInfo, { color: theme.mutedColor }]}
                >
                  {[sizeLabel, ext].filter(Boolean).join(' ')}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.button, styles.cancelButton]}
          >
            <Icon
              name="cancel"
              type={Icons.MaterialCommunityIcons}
              size={14}
              color="#fff"
              fallback="✕"
            />
            <Text style={styles.buttonText}>{strings.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={send}
            style={[
              styles.button,
              styles.sendButton,
              { backgroundColor: theme.primaryColor },
            ]}
          >
            <Icon
              name="send"
              type={Icons.Ionicons}
              size={14}
              color="#fff"
              fallback="➤"
            />
            <Text style={styles.buttonText}>{strings.send}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const mainFontWeight = Platform.OS === 'android' ? '500' : 'normal';

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  card: {
    width: '90%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  headerClose: {
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: 12,
  },
  fileBox: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  mediaFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#e9e9e9',
  },
  fileSizeBox: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingRight: 9,
    paddingLeft: 7,
    paddingBottom: 2,
    backgroundColor: '#00000080',
    borderRadius: 18,
  },
  fileSizeText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: mainFontWeight,
    color: '#fff',
  },
  playIconBox: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#00000080',
    borderRadius: 100,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  fileMeta: {
    flex: 1,
    paddingLeft: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
  },
  fileInfo: {
    marginTop: 2,
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  button: {
    flex: 1,
    minHeight: 35,
    marginHorizontal: 4,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: '#bab7b7',
  },
  sendButton: {},
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
