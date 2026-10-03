import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import type { Track } from '@/domain/types';
import type { SearchArtist, SearchAlbum, SearchPlaylist } from '../types';

export function SearchSectionHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <View style={headerStyles.header}>
      <OTOText variant="track" weight="semibold">
        {title}
      </OTOText>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[2],
  },
});

export function SearchTrackRow({
  track,
  onPlay,
}: {
  track: Track;
  onPlay: (t: Track) => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
      onPress={() => onPlay(track)}
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title} by ${track.artist}`}
    >
      <OTOArtwork
        uri={track.artworkUrl}
        thumbhash={track.thumbhash}
        size={44}
        borderRadius={radius.xs}
        style={rowStyles.artwork}
      />
      <View style={rowStyles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>
          {track.title}
        </OTOText>
        <View style={rowStyles.subRow}>
          {track.isExplicit && (
            <View style={rowStyles.explicitBadge}>
              <OTOText variant="caption" weight="bold" style={rowStyles.explicitText}>
                E
              </OTOText>
            </View>
          )}
          <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>
            {track.artist}{track.album ? ` · ${track.album}` : ''}
          </OTOText>
        </View>
      </View>
    </Pressable>
  );
}

export function SearchArtistRow({
  artist,
  onPress,
}: {
  artist: SearchArtist;
  onPress: (a: SearchArtist) => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(artist);
      }}
      accessibilityRole="button"
      accessibilityLabel={`View artist ${artist.name}`}
    >
      <OTOArtwork
        uri={artist.artworkUrl}
        size={44}
        borderRadius={22}
        style={rowStyles.artwork}
      />
      <View style={rowStyles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>
          {artist.name}
        </OTOText>
        <OTOText variant="meta" customColor={color.text.secondary}>
          {artist.isVerified ? 'Verified · ' : ''}Artist
        </OTOText>
      </View>
    </Pressable>
  );
}

export function SearchAlbumRow({
  album,
  onPress,
}: {
  album: SearchAlbum;
  onPress: (al: SearchAlbum) => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(album);
      }}
      accessibilityRole="button"
      accessibilityLabel={`View album ${album.title} by ${album.artist}`}
    >
      <OTOArtwork
        uri={album.artworkUrl}
        size={44}
        borderRadius={radius.xs}
        style={rowStyles.artwork}
      />
      <View style={rowStyles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>
          {album.title}
        </OTOText>
        <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>
          Album · {album.artist}
        </OTOText>
      </View>
    </Pressable>
  );
}

export function SearchPlaylistRow({
  playlist,
  onPress,
}: {
  playlist: SearchPlaylist;
  onPress: (pl: SearchPlaylist) => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(playlist);
      }}
      accessibilityRole="button"
      accessibilityLabel={`View playlist ${playlist.title}`}
    >
      <OTOArtwork
        uri={playlist.artworkUrl}
        size={44}
        borderRadius={radius.xs}
        style={rowStyles.artwork}
      />
      <View style={rowStyles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>
          {playlist.title}
        </OTOText>
        <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>
          Playlist
        </OTOText>
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    minHeight: 56,
  },
  artwork: {
    marginRight: space[3],
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  explicitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitText: {
    fontSize: 9,
    color: color.text.primary,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.75,
  },
});
