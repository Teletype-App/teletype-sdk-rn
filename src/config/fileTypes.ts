export const ImageMimeTypes = [
  'image/gif',
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  // 'image/svg+xml', // решили отправлять svg как файл
  // 'image/tiff', // т к браузеры не умеют отображать .tif пришлось убрать их из спикска изображений
  'image/vnd.microsoft.icon',
  'image/vnd.wap.wbmp',
  'image/webp',
  // Mobile cameras (not in the web widget; iOS photos are often HEIC).
  'image/heic',
  'image/heif',
];
export const AudioMimeTypes = [
  'audio/basic',
  'audio/L24',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/ogg',
  'audio/vorbis',
  'audio/x-ms-wma',
  'audio/x-ms-wax',
  'audio/vnd.rn-realaudio',
  'audio/vnd.wave',
  'audio/webm',
  'audio/mp3',
];
export const VideoMimeTypes = [
  'video/mpeg',
  'video/mp4',
  'video/ogg',
  'video/quicktime',
  'video/webm',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/3gpp',
  'video/3gpp2'
];
export const OtherTypes = [
  'video/3gp',
  'application/x-compressed',
  'audio/x-acc',
  'audio/ac3',
  'audio/x-aiff',
  'audio/aiff',
  'audio/x-au',
  'video/x-msvideo',
  'video/msvideo',
  'video/avi',
  'application/x-troff-msvideo',
  'image/bmp',
  'image/x-bmp',
  'image/x-bitmap',
  'image/x-xbitmap',
  'image/x-win-bitmap',
  'image/x-windows-bmp',
  'image/ms-bmp',
  'image/x-ms-bmp',
  'application/bmp',
  'application/x-bmp',
  'application/x-win-bitmap',
  'application/cdr',
  'application/coreldraw',
  'application/x-cdr',
  'application/x-coreldraw',
  'image/cdr',
  'image/x-cdr',
  'zz-application/zz-winassoc-cdr',
  'application/mac-compactpro',
  'application/pkix-crl',
  'application/pkcs-crl',
  'application/x-x509-ca-cert',
  'application/pkix-cert',
  'text/css',
  'text/x-comma-separated-values',
  'text/comma-separated-values',
  'application/vnd.msexcel',
  'application/x-director',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-dvi',
  'message/rfc822',
  'video/x-f4v',
  'audio/x-flac',
  'application/gpg-keys',
  'application/x-gtar',
  'application/x-gzip',
  'application/mac-binhex40',
  'application/mac-binhex',
  'application/x-binhex40',
  'application/x-mac-binhex40',
  'text/html',
  'image/x-icon',
  'image/x-ico',
  'text/calendar',
  'application/java-archive',
  'application/x-java-application',
  'application/x-jar',
  'image/jp2',
  'video/mj2',
  'image/jpx',
  'image/jpm',
  'application/json',
  'text/json',
  'application/vnd.google-earth.kml+xml',
  'application/vnd.google-earth.kmz',
  'text/x-log',
  'audio/x-m4a',
  'application/vnd.mpegurl',
  'audio/midi',
  'application/vnd.mif',
  'video/x-sgi-movie',
  'audio/mpg',
  'audio/mpeg3',
  'audio/mp3',
  'application/oda',
  'application/ogg',
  'application/x-pkcs10',
  'application/pkcs10',
  'application/x-pkcs12',
  'application/x-pkcs7-signature',
  'application/pkcs7-mime',
  'application/x-pkcs7-mime',
  'application/x-pkcs7-certreqresp',
  'application/pkcs7-signature',
  'application/pdf',
  'application/octet-stream',
  'application/x-x509-user-cert',
  'application/x-pem-file',
  'application/pgp',
  'image/x-png',
  'application/powerpoint',
  'application/vnd.ms-powerpoint',
  'application/vnd.ms-office',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/x-photoshop',
  'image/vnd.adobe.photoshop',
  'audio/x-realaudio',
  'audio/x-pn-realaudio',
  'application/x-rar',
  'application/rar',
  'application/x-rar-compressed',
  'audio/x-pn-realaudio-plugin',
  'application/x-pkcs7',
  'text/rtf',
  'text/richtext',
  'video/vnd.rn-realvideo',
  'application/x-stuffit',
  'application/smil',
  'text/srt',
  'application/x-shockwave-flash',
  'application/x-tar',
  'application/x-gzip-compressed',
  'text/plain',
  'text/x-vcard',
  'application/videolan',
  'text/vtt',
  'audio/x-wav',
  'audio/wave',
  'audio/wav',
  'application/wbxml',
  'application/wmlc',
  'video/x-ms-asf',
  'application/xhtml+xml',
  'application/excel',
  'application/msexcel',
  'application/x-msexcel',
  'application/x-ms-excel',
  'application/x-excel',
  'application/x-dos_ms_excel',
  'application/xls',
  'application/x-xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/xml',
  'text/xml',
  'text/xsl',
  'application/xspf+xml',
  'application/x-compress',
  'application/x-zip',
  'application/zip',
  'application/x-zip-compressed',
  'application/s-compressed',
  'multipart/x-zip'
];

export const FileTypesList = OtherTypes.concat(AudioMimeTypes.concat(VideoMimeTypes.concat(ImageMimeTypes)));

export const ExtensionFilesList = [
  '.jpeg',
  '.jpg',
  '.png',
  '.gif',
  '.pjpeg',
  '.svg',
  '.tif',
  '.tiff',
  '.wbmp',
  '.webp',
  '.heic',
  '.heif',
  '.au',
  '.mp4a',
  '.mpga',
  '.oga',
  '.wma',
  '.wax',
  '.weba',
  '.mpeg',
  '.mp4',
  '.ogv',
  '.qt',
  '.webm',
  '.wmv',
  '.flv',
  '.3gp',
  '.3g2',
  '.aif',
  '.avi',
  '.bmp',
  '.xbm',
  '.cpt',
  '.crl',
  '.der',
  '.cer',
  '.css',
  '.dir',
  '.docx',
  '.dvi',
  '.eml',
  '.f4v',
  '.gtar',
  '.hqx',
  '.html',
  '.ico',
  '.ics',
  '.jar',
  '.mj2',
  '.json',
  '.kml',
  '.kmz',
  '.mid',
  '.mif',
  '.movie',
  '.oda',
  '.ogx',
  '.p10',
  '.p12',
  '.p7m',
  '.p7r',
  '.p7s',
  '.pdf',
  '.bin',
  '.pgp',
  '.ppt',
  '.thmx',
  '.doc',
  '.pptx',
  '.ram',
  '.rar',
  '.rmp',
  '.rtx',
  '.sit',
  '.smi',
  '.tar',
  '.txt',
  '.vcf',
  '.wav',
  '.asf',
  '.xhtml',
  '.xlsx',
  '.dwg',
  '.xls',
  '.xml',
  '.xspf',
  '.zip',
  '.mov',
  '.m4v',
  '.m4a',
  '.aac',
  '.mp3',
  '.ogg',
  '.opus',
  '.amr',
  '.caf',
  '.flac',
  '.mkv',
];

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'bmp',
  'pjpeg',
]);
const VIDEO_EXTS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mkv',
  'avi',
  '3gp',
  '3g2',
  'ogv',
  'wmv',
  'flv',
]);
const AUDIO_EXTS = new Set([
  'mp3',
  'm4a',
  'aac',
  'wav',
  'ogg',
  'oga',
  'flac',
  'opus',
  'amr',
  'caf',
  'mpga',
  'mp4a',
  'weba',
]);

/** Extension including the leading dot, lowercased — matches the web widget. */
export function fileExtension(name = ''): string {
  const base = name.split('?')[0].split('#')[0];
  const idx = base.lastIndexOf('.');
  if (idx < 0 || idx === base.length - 1) {
    return '';
  }
  return base.substring(idx).toLowerCase();
}

/**
 * Same allow-list the web widget uses: MIME type *or* file extension.
 * An empty MIME (common from the iOS document picker) still passes if the
 * extension is on the list.
 */
export function isAllowedUploadFile(file: {
  name?: string;
  type?: string;
}): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = fileExtension(file.name || '');
  if (type && FileTypesList.includes(type)) {
    return true;
  }
  if (ext && ExtensionFilesList.includes(ext)) {
    return true;
  }
  return false;
}

export type UploadMessageType = 'image' | 'audio' | 'video' | 'attachment';

export function messageTypeFromFile(file: {
  name?: string;
  type?: string;
}): UploadMessageType {
  const type = (file.type || '').toLowerCase();
  if (
    ImageMimeTypes.includes(type) ||
    type.startsWith('image/')
  ) {
    return 'image';
  }
  if (
    AudioMimeTypes.includes(type) ||
    type.startsWith('audio/')
  ) {
    return 'audio';
  }
  if (
    VideoMimeTypes.includes(type) ||
    type.startsWith('video/')
  ) {
    return 'video';
  }
  const ext = fileExtension(file.name || '').replace(/^\./, '');
  if (IMAGE_EXTS.has(ext)) {
    return 'image';
  }
  if (VIDEO_EXTS.has(ext)) {
    return 'video';
  }
  if (AUDIO_EXTS.has(ext)) {
    return 'audio';
  }
  return 'attachment';
}
