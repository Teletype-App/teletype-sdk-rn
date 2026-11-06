import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { getSlider, getVideoComponent } from './nativeModules';
import { canDownloadLocally, ensureCachedFile } from './download';
import { formatBytes } from '../../core/utils';
import {
  attachmentName,
  attachmentUrl,
  formatDuration,
} from './fileUtils';

interface Props {
  message: Message;
  theme: TeletypeTheme;
  strings: TeletypeStrings;
  isOwn: boolean;
}

type VideoRef = {
  seek?: (t: number) => void;
};

/**
 * In-bubble audio player. Uses `react-native-video` with `audioOnly` (no Expo)
 * so the same library covers both video and audio formats. Downloads the file
 * into the SDK cache on first play for reliable seeking across formats.
 * Layout matches teletype-mobile's MessageTypeAudio (play button + slider, no
 * trailing download arrow).
 */
export function MessageTypeAudio({
  message,
  theme,
  strings,
  isOwn,
}: Props): React.ReactElement | null {
  const url = attachmentUrl(message);
  const name = attachmentName(message);
  const Video = getVideoComponent();
  const Slider = getSlider();
  const videoRef = useRef<VideoRef | null>(null);

  const [localPath, setLocalPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!url || !canDownloadLocally()) {
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const path = await ensureCachedFile({
          url,
          fileName: name,
          id: message.attachmentId || message.tempId,
        });
        if (!cancelled) {
          setLocalPath(path);
        }
      } catch {
        // Fall back to streaming the remote URL.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, name, message.attachmentId, message.tempId]);

  if (!url) {
    return null;
  }

  const sourceUri = localPath
    ? localPath.startsWith('file://')
      ? localPath
      : `file://${localPath}`
    : url;

  const accent = isOwn ? '#ffffff' : theme.primaryColor;
  const trackBg = isOwn ? 'rgba(255,255,255,0.35)' : '#C2C2C3';
  const textColor = isOwn ? theme.ownTextColor : theme.operatorTextColor;
  const iconBg = isOwn ? 'rgba(255,255,255,0.95)' : theme.primaryColor;
  const iconColor = isOwn ? theme.primaryColor : '#ffffff';

  const onToggle = () => {
    if (loading) {
      return;
    }
    setPlaying((p) => !p);
  };

  const renderPlayIcon = () => {
    if (loading) {
      return <ActivityIndicator size={24} color={iconColor} />;
    }
    return (
      <Icon
        name={playing ? 'pause' : 'play'}
        type={Icons.MaterialCommunityIcons}
        size={24}
        color={iconColor}
        fallback={playing ? '❚❚' : '▶'}
      />
    );
  };

  const subInfo =
    position > 0 || seeking
      ? `${formatDuration(position)} / ${formatDuration(duration)}`
      : [duration > 0 ? formatDuration(duration) : null, formatBytes(message.size, 2, strings)]
          .filter(Boolean)
          .join(', ') || strings.mediaAudio;

  return (
    <View style={styles.fileContainer}>
      <View style={styles.fileContainerBox}>
        <TouchableOpacity
          style={styles.iconBox}
          onPress={onToggle}
          disabled={loading || !Video}
        >
          <View style={[styles.fileImage, { backgroundColor: iconBg }]}>
            {renderPlayIcon()}
          </View>
        </TouchableOpacity>

        <View style={styles.playerContainer}>
          {Slider ? (
            <Slider
              style={styles.container}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={Math.min(position, duration || 1)}
              disabled={loading || duration <= 0}
              minimumTrackTintColor={accent}
              maximumTrackTintColor={trackBg}
              thumbTintColor={accent}
              onSlidingStart={() => setSeeking(true)}
              onValueChange={(v: number) => setPosition(v)}
              onSlidingComplete={(v: number) => {
                setSeeking(false);
                setPosition(v);
                try {
                  videoRef.current?.seek?.(v);
                } catch {
                  // ignore
                }
              }}
            />
          ) : (
            <View style={styles.sliderFallback} />
          )}
          <Text style={[styles.fileInfo, { color: textColor }]} numberOfLines={1}>
            {subInfo}
          </Text>
        </View>
      </View>

      {Video ? (
        <Video
          ref={videoRef}
          source={{ uri: sourceUri }}
          audioOnly
          playInBackground={false}
          playWhenInactive={false}
          paused={!playing}
          ignoreSilentSwitch="ignore"
          onLoad={(meta: { duration?: number }) => {
            if (meta?.duration) {
              setDuration(meta.duration);
            }
          }}
          onProgress={(p: { currentTime?: number }) => {
            if (!seeking && typeof p?.currentTime === 'number') {
              setPosition(p.currentTime);
            }
          }}
          onEnd={() => {
            setPlaying(false);
            setPosition(0);
            try {
              videoRef.current?.seek?.(0);
            } catch {
              // ignore
            }
          }}
          style={styles.hiddenVideo}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fileContainer: {
    padding: 10,
    minWidth: 220,
    position: 'relative',
  },
  fileContainerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: { width: 38 },
  fileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContainer: { flex: 1, minWidth: 140 },
  container: {
    width: Platform.OS === 'ios' ? '180%' : '100%',
    marginLeft: Platform.OS === 'ios' ? '-40%' : 0,
    height: 40,
    transform: [
      {
        scale: Platform.OS === 'ios' ? 0.5 : 1,
      },
    ],
  },
  sliderFallback: { height: 8 },
  fileInfo: {
    paddingLeft: 10,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: 'GraphikLCG-Regular',
    fontWeight: '400',
  },
  hiddenVideo: { width: 0, height: 0, opacity: 0 },
});
