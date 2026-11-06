import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Message } from '../../types/message';
import { TeletypeTheme } from '../theme';
import { TeletypeStrings } from '../../i18n/strings';
import { ChatSafeAreaProvider } from '../safeArea';
import { getImageViewer } from './nativeModules';
import { MediaControl } from './MediaControl';
import {
  canDownloadLocally,
  ensureCachedFile,
  saveFileToDevice,
} from './download';
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

export function MessageTypeImage({
  message,
  theme,
  strings,
  isOwn,
}: Props): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(
    message.width && message.height
      ? { width: message.width, height: message.height }
      : null,
  );
  const url = attachmentUrl(message);
  const preview = message.attachmentPreviewUrl || url;
  const name = attachmentName(message);
  const ImageViewer = getImageViewer();
  const size = fitMediaSize(natural?.width, natural?.height);

  useEffect(() => {
    if (natural || !preview) {
      return;
    }
    let cancelled = false;
    Image.getSize(
      preview,
      (width, height) => {
        if (!cancelled) {
          setNatural({ width, height });
        }
      },
      () => {
        if (!cancelled) {
          setNatural({ width: MEDIA_MAX_SIDE, height: MEDIA_MAX_SIDE });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [preview, natural]);

  if (!url && !preview) {
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

  const borderColor = isOwn ? theme.ownBubbleColor : '#f6f6f6';

  return (
    <>
      <TouchableOpacity
        style={[styles.buttonImageBox, { borderColor, width: size.width, height: size.height }]}
        activeOpacity={0.9}
        onPress={() => setOpen(true)}
      >
        <Image
          style={[
            styles.imageOnlyMessage,
            {
              borderColor,
              width: size.width,
              height: size.height,
            },
          ]}
          source={{ uri: preview }}
          resizeMode="cover"
        />
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
            {ImageViewer ? (
              <ImageViewer
                enableSwipeDown
                useNativeDriver
                onSwipeDown={() => setOpen(false)}
                imageUrls={[{ url }]}
                renderIndicator={() => <View />}
                renderHeader={() => (
                  <MediaControl
                    title={name}
                    onClose={() => setOpen(false)}
                    onDownload={saving ? undefined : handleDownload}
                    downloadLabel={strings.mediaSave}
                    closeLabel={strings.mediaClose}
                  />
                )}
              />
            ) : (
              <>
                <Image
                  source={{ uri: url }}
                  style={styles.fallbackFull}
                  resizeMode="contain"
                />
                <MediaControl
                  title={name}
                  onClose={() => setOpen(false)}
                  onDownload={saving ? undefined : handleDownload}
                  downloadLabel={strings.mediaSave}
                  closeLabel={strings.mediaClose}
                />
              </>
            )}
          </View>
        </ChatSafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  buttonImageBox: {
    position: 'relative',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  imageOnlyMessage: {
    borderWidth: 1,
    borderColor: '#f6f6f6',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  viewerContainer: {
    position: 'relative',
    flex: 1,
    backgroundColor: '#000',
  },
  fallbackFull: {
    flex: 1,
    width: '100%',
  },
});
