/**
 * Lazy access to the optional native libraries used by the rich media message
 * components (image zoom, video, audio, file open/download).
 *
 * None of these are hard dependencies of the SDK: they are declared as optional
 * peer dependencies. Each `require('…')` uses a **string literal** (Metro
 * forbids `require(variable)`), wrapped in try/catch so a missing package
 * degrades that feature instead of crashing at runtime. Install the matching
 * peer dependency to enable the feature — see README "Viewing media attachments".
 *
 * Every library here is a plain React Native package — none of them depend on
 * Expo.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, global-require */

type Cache = { value: any; loaded: boolean };

function cached(slot: Cache, load: () => any): any {
  if (!slot.loaded) {
    try {
      slot.value = load();
    } catch {
      slot.value = null;
    }
    slot.loaded = true;
  }
  return slot.value;
}

const videoSlot: Cache = { value: null, loaded: false };
const thumbSlot: Cache = { value: null, loaded: false };
const viewerSlot: Cache = { value: null, loaded: false };
const blobSlot: Cache = { value: null, loaded: false };
const sliderSlot: Cache = { value: null, loaded: false };
const imageViewerSlot: Cache = { value: null, loaded: false };

/** `react-native-video` — the `<Video>` component (audio + video playback). */
export function getVideoComponent(): any {
  const mod = cached(videoSlot, () => require('react-native-video'));
  return mod?.default ?? mod ?? null;
}

/** `react-native-create-thumbnail` — `createThumbnail({ url })`. */
export function getCreateThumbnail(): ((opts: any) => Promise<any>) | null {
  const mod = cached(thumbSlot, () => require('react-native-create-thumbnail'));
  const fn = mod?.createThumbnail ?? mod?.default?.createThumbnail;
  return typeof fn === 'function' ? fn : null;
}

/** `@react-native-documents/viewer` — `viewDocument({ uri })` (open with app). */
export function getViewDocument(): ((opts: any) => Promise<any>) | null {
  const mod = cached(viewerSlot, () => require('@react-native-documents/viewer'));
  const fn = mod?.viewDocument ?? mod?.default?.viewDocument;
  return typeof fn === 'function' ? fn : null;
}

/** `react-native-blob-util` — file system + downloads. */
export function getBlobUtil(): any {
  const mod = cached(blobSlot, () => require('react-native-blob-util'));
  return mod?.default ?? mod ?? null;
}

/** `@react-native-community/slider` — the `<Slider>` component. */
export function getSlider(): any {
  const mod = cached(sliderSlot, () => require('@react-native-community/slider'));
  return mod?.default ?? mod ?? null;
}

/** `react-native-image-zoom-viewer` — pinch-to-zoom fullscreen image viewer. */
export function getImageViewer(): any {
  const mod = cached(imageViewerSlot, () =>
    require('react-native-image-zoom-viewer'),
  );
  return mod?.default ?? mod ?? null;
}
