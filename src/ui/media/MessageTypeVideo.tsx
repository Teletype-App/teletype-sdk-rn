import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Message } from '../../types/message';
import { TeletypeTheme } from '../theme';
import { TeletypeStrings } from '../../i18n/strings';
import { Icon, Icons } from '../icons';
import { ChatSafeAreaProvider } from '../safeArea';
import { getCreateThumbnail, getVideoComponent } from './nativeModules';
import { MediaControl } from './MediaControl';
import {
  canDownloadLocally,
  ensureCachedFile,
  saveFileToDevice,
} from './download';
import { formatBytes } from '../../core/utils';
import {
  attachmentName,
  attachmentUrl,
  fitMediaSize,
  MEDIA_MAX_SIDE,
} from './fileUtils';

interface Props {
  message: Message;
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  isOwn: boolean;
}

export function MessageTypeVideo({
  message,
  theme,
  strings,
  isOwn,
}: Props): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [thumb, setThumb] = useState<string | null>(
    message.attachmentPreviewUrl || null,
  );
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(
    message.width && message.height
      ? { width: message.width, height: message.height }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<{ seek?: (t: number) => void } | null>(null);
  const url = attachmentUrl(message);
  const name = attachmentName(message);
  const Video = getVideoComponent();
  const createThumbnail = getCreateThumbnail();
  const size = fitMediaSize(natural?.width, natural?.height);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      return;
    }

    const applyNatural = (width?: number, height?: number) => {
      if (cancelled || natural || !width || !height) {
        return;
      }
      setNatural({ width, height });
    };

    (async () => {
      if (!thumb && createThumbnail) {
        try {
          const result = await createThumbnail({
            url,
            timeStamp: 1000,
            format: 'jpeg',
          });
          if (cancelled) {
            return;
          }
          if (result?.path) {
            const path = result.path.startsWith('file://')
              ? result.path
              : `file://${result.path}`;
            setThumb(path);
            applyNatural(result.width, result.height);
            if (!result.width || !result.height) {
              Image.getSize(
                path,
                (w, h) => applyNatural(w, h),
                () => undefined,
              );
            }
            return;
          }
        } catch {
          // Preview generation is best-effort.
        }
      }

      if (thumb && !natural) {
        Image.getSize(
          thumb,
          (w, h) => applyNatural(w, h),
          () => {
            if (!cancelled && !natural) {
              setNatural({ width: MEDIA_MAX_SIDE, height: MEDIA_MAX_SIDE });
            }
          },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, thumb, createThumbnail, natural]);

  if (!url) {
    return null;
  }

  const handleDownload = async () => {
    if (!canDownloadLocally()) {
      Alert.alert(strings.mediaDownloadError);
      return;
    }
    try {
      setSaving(true);
      const local = await ensureCachedFile({
        url,
        fileName: name,
        id: message.attachmentId || message.tempId,
      });
      await saveFileToDevice({ localPath: local, fileName: name });
      Alert.alert(strings.mediaSaved);
    } catch {
      Alert.alert(strings.mediaDownloadError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.buttonImageBox,
          {
            borderColor: isOwn ? theme.ownBubbleColor : '#f6f6f6',
            width: size.width,
            height: size.height,
          },
        ]}
        activeOpacity={0.9}
        onPress={() => setOpen(true)}
      >
        {thumb ? (
          <Image
            style={[
              styles.imageOnlyMessage,
              { width: size.width, height: size.height },
            ]}
            source={{ uri: thumb }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imageOnlyMessage,
              styles.thumbPlaceholder,
              { width: size.width, height: size.height },
            ]}
          >
            <Text style={styles.placeholderLabel}>{strings.mediaVideo}</Text>
          </View>
        )}
        {message.size ? (
          <View style={styles.fileSizeBox}>
            <Text style={styles.fileName}>
              {formatBytes(message.size, 2, strings)}
            </Text>
          </View>
        ) : null}
        <View style={styles.playIconBox} pointerEvents="none">
          <View style={styles.playIconContainer}>
            <Icon
              name="play"
              type={Icons.FontAwesome5}
              size={15}
              color="#ffffff"
              fallback="▶"
            />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        transparent
        statusBarTranslucent
        animationType="fade"
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <ChatSafeAreaProvider>
          <View style={styles.viewerContainer}>
            {Video ? (
              <Video
                ref={videoRef}
                source={{ uri: url }}
                style={styles.backgroundVideo}
                controls
                resizeMode="contain"
                paused={!open}
                onEnd={() => {
                  try {
                    videoRef.current?.seek?.(0);
                  } catch {
                    // ignore
                  }
                }}
              />
            ) : (
              <View style={styles.missingPlayer}>
                <Text style={styles.missingPlayerText}>{strings.mediaVideo}</Text>
              </View>
            )}
            <MediaControl
              title={name}
              onClose={() => setOpen(false)}
              onDownload={saving ? undefined : handleDownload}
              downloadLabel={strings.mediaSave}
              closeLabel={strings.mediaClose}
            />
          </View>
        </ChatSafeAreaProvider>
      </Modal>
    </>
  );
}

const OVERLAY_COLOR = '#00000080';
const FLAT_WHITE = '#FFFFFF';
const mainFontWeight = Platform.OS === 'android' ? '500' : 'normal';

const styles = StyleSheet.create({
  buttonImageBox: {
    position: 'relative',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
  },
  imageOnlyMessage: {
    borderWidth: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  thumbPlaceholder: {
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: {
    color: FLAT_WHITE,
    fontSize: 14,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: mainFontWeight,
  },
  fileSizeBox: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingRight: 9,
    paddingLeft: 7,
    paddingBottom: 2,
    backgroundColor: OVERLAY_COLOR,
    borderRadius: 18,
  },
  fileName: {
    fontFamily: 'GraphikLCG-Regular',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: mainFontWeight,
    color: FLAT_WHITE,
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
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
    backgroundColor: OVERLAY_COLOR,
    borderRadius: 100,
  },
  viewerContainer: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  missingPlayer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingPlayerText: {
    color: FLAT_WHITE,
    fontSize: 16,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: mainFontWeight,
  },
});
