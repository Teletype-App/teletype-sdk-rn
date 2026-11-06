import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  canDownloadLocally,
  ensureCachedFile,
  getCachedFilePath,
  openWithSystemApp,
} from './download';
import { formatBytes } from '../../core/utils';
import { attachmentName, attachmentUrl, getExt } from './fileUtils';

interface Props {
  message: Message;
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  isOwn: boolean;
}

/**
 * Generic file bubble (documents, text, archives…). Tap the icon / name to
 * download (first time) or open with a system app that can handle the type —
 * for text files this surfaces the device's text viewer chooser.
 * Layout matches teletype-mobile's MessageTypeFile (left circular icon only).
 */
export function MessageTypeFile({
  message,
  theme,
  strings,
  isOwn,
}: Props): React.ReactElement | null {
  const url = attachmentUrl(message);
  const name = attachmentName(message);
  const ext = getExt(name).toUpperCase();
  const id = message.attachmentId || message.tempId;

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedFilePath({ fileName: name, id });
      if (!cancelled && cached) {
        setLocalPath(cached);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, id]);

  const download = useCallback(async (): Promise<string> => {
    if (!canDownloadLocally()) {
      throw new Error('blob-util missing');
    }
    setLoading(true);
    setProgress(null);
    try {
      const path = await ensureCachedFile({
        url,
        fileName: name,
        id,
        onProgress: ({ received, total }) => {
          if (total > 0) {
            setProgress(`${formatBytes(received, 2, strings)} / ${formatBytes(total, 2, strings)}`);
          } else {
            setProgress(formatBytes(received, 2, strings));
          }
        },
      });
      setLocalPath(path);
      return path;
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [url, name, id, strings]);

  const open = async () => {
    try {
      const path = localPath || (await download());
      await openWithSystemApp({ localPath: path, remoteUrl: url });
    } catch {
      Alert.alert(strings.mediaCannotOpen);
    }
  };

  if (!url && !name) {
    return null;
  }

  const textColor = isOwn ? theme.ownTextColor : theme.operatorTextColor;
  const iconBg = isOwn ? 'rgba(255,255,255,0.95)' : theme.primaryColor;
  const iconColor = isOwn ? theme.primaryColor : '#ffffff';
  const needDownload = !localPath;

  const subInfo =
    progress ||
    [formatBytes(message.size, 2, strings), ext].filter(Boolean).join(' ') ||
    strings.attachmentFallback;

  const renderFileIcon = () => {
    if (loading) {
      return <ActivityIndicator size={24} color={iconColor} />;
    }
    return (
      <Icon
        name={needDownload ? 'arrowdown' : 'file'}
        type={needDownload ? Icons.AntDesign : Icons.MaterialCommunityIcons}
        size={24}
        color={iconColor}
        fallback={needDownload ? '↓' : '▤'}
      />
    );
  };

  return (
    <View style={styles.fileContainer}>
      <View style={styles.fileContainerBox}>
        <TouchableOpacity style={styles.iconBox} onPress={open} disabled={loading}>
          <View style={[styles.fileImage, { backgroundColor: iconBg }]}>
            {renderFileIcon()}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fileContentBox}
          onPress={open}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.fileTitle, { color: textColor }]} numberOfLines={2}>
            {name || strings.attachmentFallback}
          </Text>
          <Text style={[styles.fileInfo, { color: textColor }]} numberOfLines={1}>
            {loading ? strings.mediaDownloading : subInfo}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mainFontWeight = Platform.OS === 'android' ? '500' : 'normal';

const styles = StyleSheet.create({
  fileContainer: {
    padding: 10,
    position: 'relative',
    flex: 1,
    width: '100%',
    minWidth: 200,
    maxWidth: 280,
  },
  fileContainerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: { width: 38 },
  fileImage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  fileContentBox: {
    flex: 1,
    paddingHorizontal: 10,
    minWidth: 140,
  },
  fileTitle: {
    paddingTop: 0,
    paddingBottom: 3,
    paddingRight: 10,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 17,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: mainFontWeight,
  },
  fileInfo: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: '400',
  },
});
