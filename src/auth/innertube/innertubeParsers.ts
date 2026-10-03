/**
 * YouTube Music Innertube Response Parsers
 *
 * Clean-room TypeScript port of BitChord's InnertubeParser.kt algorithms.
 * Recursively extracts accounts, playlists, tracks, and pagination tokens
 * from deeply nested Innertube JSON response trees.
 */

import { InnertubeAccount, InnertubePlaylist, InnertubeSong } from './types';

const DURATION_REGEX = /^\d+:\d{2}$/;
const TALLY_REGEX = /^[\d.,]+\s*[KMB]?\s+(plays|views|likes|songs|tracks|subscribers|hours?|minutes?|seconds?)\b/i;
const NOT_EDITABLE_PLAYLIST_PREFIXES = ['LM', 'SE', 'RD', 'OLAK', 'MPRE'];
const TYPE_WORDS = new Set([
  'song',
  'video',
  'album',
  'single',
  'ep',
  'artist',
  'playlist',
  'podcast',
  'episode',
]);

/**
 * Depth-first traversal collecting all occurrences of a named renderer key.
 */
export function collectRenderers(node: any, name: string): any[] {
  const results: any[] = [];
  function walk(current: any) {
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      for (const item of current) {
        walk(item);
      }
      return;
    }
    if (current[name] && typeof current[name] === 'object') {
      results.push(current[name]);
    }
    for (const key of Object.keys(current)) {
      walk(current[key]);
    }
  }
  walk(node);
  return results;
}

/**
 * Extracts concatenated text from YouTube's { runs: [...] } or { simpleText: ... } objects.
 */
export function runsText(node: any): string {
  if (!node) return '';
  if (Array.isArray(node.runs)) {
    return node.runs.map((r: any) => r?.text || '').join('');
  }
  if (typeof node.simpleText === 'string') {
    return node.simpleText;
  }
  return '';
}

/**
 * Picks the highest resolution thumbnail from a thumbnail array.
 */
export function bestThumbnail(
  thumbnails?: Array<{ url: string; width?: number; height?: number }>
): string | undefined {
  if (!thumbnails || !thumbnails.length) return undefined;
  // Last thumbnail is typically the highest quality
  return thumbnails[thumbnails.length - 1]?.url;
}

/**
 * Checks for presence of explicit badge inside renderer badges array or properties.
 */
function hasExplicitBadge(node: any): boolean {
  if (!node) return false;
  if (Array.isArray(node)) {
    return node.some(hasExplicitBadge);
  }
  if (typeof node === 'object') {
    if (
      node?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE' ||
      node?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) {
      return true;
    }
    return Object.values(node).some(hasExplicitBadge);
  }
  return false;
}

/**
 * Parses user profile and active channel header from `account/account_menu`.
 */
export function parseAccount(response: any): InnertubeAccount | null {
  if (!response) return null;
  const header = collectRenderers(response, 'activeAccountHeaderRenderer')[0];
  if (!header) return null;

  const name = runsText(header.accountName);
  if (!name) return null;

  const handle = runsText(header.channelHandle);
  let email = runsText(header.email);
  if (!email && typeof header.email?.simpleText === 'string') {
    email = header.email.simpleText;
  }
  if (!email) {
    email = handle;
  }

  const avatarUrl = bestThumbnail(header.accountPhoto?.thumbnails);

  return {
    name,
    email: email || undefined,
    handle: handle || undefined,
    avatarUrl,
  };
}

/**
 * Parses a single musicResponsiveListItemRenderer into an InnertubeSong.
 */
export function parseResponsiveListItem(renderer: any): InnertubeSong | null {
  if (!renderer) return null;

  const videoId =
    renderer.playlistItemData?.videoId ||
    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;

  if (!videoId) return null;

  const flexColumns = renderer.flexColumns || [];
  const title = runsText(flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
  if (!title) return null;

  const subtitleNode = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text;
  const subtitleRuns: any[] = subtitleNode?.runs || [];

  let artist = 'Unknown artist';
  let artistId: string | undefined;
  let albumName: string | undefined;
  let albumId: string | undefined;
  let durationText: string | undefined;

  for (const run of subtitleRuns) {
    const text = run?.text?.trim() || '';
    if (!text || text === '•') continue;

    const browse = run?.navigationEndpoint?.browseEndpoint;
    const pageType =
      browse?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType || '';

    if (pageType.includes('ARTIST') && !artistId) {
      artist = text;
      artistId = browse?.browseId;
    } else if (pageType.includes('ALBUM') && !albumId) {
      albumName = text;
      albumId = browse?.browseId;
    } else if (DURATION_REGEX.test(text)) {
      durationText = text;
    }
  }

  // Fallback if artist was not an interactive link
  if (artist === 'Unknown artist' && subtitleRuns.length > 0) {
    const parts = runsText(subtitleNode)
      .split('•')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const candidate = parts.find(
      (part) =>
        !DURATION_REGEX.test(part) &&
        !TYPE_WORDS.has(part.toLowerCase()) &&
        !TALLY_REGEX.test(part)
    );
    if (candidate) {
      artist = candidate;
    }
  }

  const thumbnails =
    renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;

  return {
    videoId,
    title,
    artist,
    artistId,
    albumId,
    albumName,
    durationText,
    thumbnailUrl: bestThumbnail(thumbnails),
    isExplicit: hasExplicitBadge(renderer.badges),
    isVideo: false,
  };
}

/**
 * Parses playlist tracks (e.g. Liked Songs, custom playlist).
 */
export function parsePlaylistSongs(root: any): InnertubeSong[] {
  if (!root) return [];
  const rows = collectRenderers(root, 'musicResponsiveListItemRenderer');
  const songs: InnertubeSong[] = [];
  const seenIds = new Set<string>();

  for (const row of rows) {
    const song = parseResponsiveListItem(row);
    if (song && !seenIds.has(song.videoId)) {
      seenIds.add(song.videoId);
      songs.push(song);
    }
  }

  return songs;
}

/**
 * Parses saved playlists from `FEmusic_liked_playlists` browse response.
 */
export function parseUserPlaylists(root: any): InnertubePlaylist[] {
  if (!root) return [];
  const playlists: InnertubePlaylist[] = [];
  const seenIds = new Set<string>();

  // Two-row item renderers (Grid view)
  const twoRowItems = collectRenderers(root, 'musicTwoRowItemRenderer');
  for (const item of twoRowItems) {
    const title = runsText(item.title);
    if (!title) continue;

    const browseId: string | undefined = item.navigationEndpoint?.browseEndpoint?.browseId;
    if (!browseId || !browseId.startsWith('VL')) continue;

    const rawId = browseId.replace(/^VL/, '');
    if (NOT_EDITABLE_PLAYLIST_PREFIXES.some((prefix) => rawId.startsWith(prefix))) {
      continue;
    }

    if (seenIds.has(rawId)) continue;
    seenIds.add(rawId);

    const subtitle = runsText(item.subtitle);
    const thumbnails =
      item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;

    playlists.push({
      playlistId: rawId,
      title,
      subtitle: subtitle || undefined,
      thumbnailUrl: bestThumbnail(thumbnails),
    });
  }

  return playlists;
}

/**
 * Extracts continuation token for paged responses.
 */
export function parseContinuationToken(root: any): string | null {
  if (!root) return null;
  const continuationItems = collectRenderers(root, 'continuationItemRenderer');
  for (const item of continuationItems) {
    const token =
      item.continuationEndpoint?.continuationCommand?.token ||
      item.continuationEndpoint?.browseContinuationEndpoint?.continuationCommand?.token;
    if (token) return token;
  }

  const nextContinuations = collectRenderers(root, 'nextContinuationData');
  for (const item of nextContinuations) {
    if (item?.continuation) return item.continuation;
  }

  return null;
}

/**
 * Converts formatted duration strings ('3:45' or '1:12:30') into milliseconds.
 */
export function parseDurationMs(durationText?: string): number {
  if (!durationText) return 180000;
  const parts = durationText.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
    return (parts[0]! * 60 + parts[1]!) * 1000;
  }
  if (parts.length === 3 && !isNaN(parts[0]!) && !isNaN(parts[1]!) && !isNaN(parts[2]!)) {
    return (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000;
  }
  return 180000;
}

export interface ParsedHomeSection {
  title: string;
  songs: InnertubeSong[];
  playlists: InnertubePlaylist[];
}

/**
 * Parses carousel shelves from YouTube Music's FEmusic_home browse response.
 */
export function parseHomeFeed(root: any): ParsedHomeSection[] {
  if (!root) return [];
  const carousels = collectRenderers(root, 'musicCarouselShelfRenderer');
  const sections: ParsedHomeSection[] = [];

  for (const carousel of carousels) {
    const title =
      runsText(carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title) ||
      runsText(carousel.header?.musicHeaderRenderer?.title);

    const songs: InnertubeSong[] = [];
    const playlists: InnertubePlaylist[] = [];

    const listItems = collectRenderers(carousel, 'musicResponsiveListItemRenderer');
    for (const item of listItems) {
      const song = parseResponsiveListItem(item);
      if (song) songs.push(song);
    }

    const twoRowItems = collectRenderers(carousel, 'musicTwoRowItemRenderer');
    for (const item of twoRowItems) {
      const plTitle = runsText(item.title);
      const browseId = item.navigationEndpoint?.browseEndpoint?.browseId;
      const rawId = browseId ? browseId.replace(/^VL/, '') : '';
      if (plTitle && rawId) {
        playlists.push({
          playlistId: rawId,
          title: plTitle,
          subtitle: runsText(item.subtitle) || undefined,
          thumbnailUrl: bestThumbnail(item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails),
        });
      }
    }

    if (songs.length > 0 || playlists.length > 0) {
      sections.push({
        title: title || 'Recommended',
        songs,
        playlists,
      });
    }
  }

  return sections;
}

/**
 * Tracks of a watch queue (`next` response) — the AutoPlay radio mix.
 * Clean-room adaptation of BitChord's InnertubeParser.parseWatchQueue.
 */
export function parseWatchQueue(root: any): InnertubeSong[] {
  if (!root) return [];
  const renderers = collectRenderers(root, 'playlistPanelVideoRenderer');
  const out = new Map<string, InnertubeSong>();

  for (const renderer of renderers) {
    const videoId = renderer.videoId;
    if (!videoId || typeof videoId !== 'string') continue;
    const title = runsText(renderer.title);
    if (!title.trim()) continue;

    const bylineRuns = Array.isArray(renderer.longBylineText?.runs)
      ? renderer.longBylineText.runs
      : [];
    const bylineTexts = bylineRuns.map((r: any) => r?.text || '');
    let artist = '';
    for (const piece of bylineTexts) {
      if (piece.includes('•')) break;
      artist += piece;
    }
    artist = artist.trim() || 'Unknown Artist';

    const durationText = runsText(renderer.lengthText) || undefined;
    const isExplicit = hasExplicitBadge(renderer);

    out.set(videoId, {
      videoId,
      title,
      artist,
      thumbnailUrl: bestThumbnail(renderer.thumbnail?.thumbnails),
      durationText,
      isExplicit,
    });
  }

  return Array.from(out.values());
}

