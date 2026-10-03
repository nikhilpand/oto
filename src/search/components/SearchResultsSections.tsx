import React from 'react';
import { View } from 'react-native';
import { TopResultCard } from './TopResultCard';
import {
  SearchSectionHeader,
  SearchTrackRow,
  SearchArtistRow,
  SearchAlbumRow,
  SearchPlaylistRow,
} from './SearchItemRows';
import type { SearchResults, TopResult, SearchArtist, SearchAlbum, SearchPlaylist } from '../types';
import type { Track } from '@/domain/types';
import type { SearchFilter } from './SearchCategoryPills';

export interface SearchResultsSectionsProps {
  results: SearchResults;
  activeFilter: SearchFilter;
  onTopResultPress: (result: TopResult) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  onArtistPress: (artist: SearchArtist) => void;
  onAlbumPress: (album: SearchAlbum) => void;
  onPlaylistPress: (playlist: SearchPlaylist) => void;
}

export function SearchResultsSections({
  results,
  activeFilter,
  onTopResultPress,
  onPlayTrack,
  onArtistPress,
  onAlbumPress,
  onPlaylistPress,
}: SearchResultsSectionsProps): React.JSX.Element {
  const showSongs =
    (activeFilter === 'All' || activeFilter === 'Songs' || activeFilter === 'Videos') &&
    results.tracks.length > 0;
  const showArtists = (activeFilter === 'All' || activeFilter === 'Artists') && results.artists.length > 0;
  const showAlbums = (activeFilter === 'All' || activeFilter === 'Albums') && results.albums.length > 0;
  const showPlaylists =
    (activeFilter === 'All' || activeFilter === 'Playlists') && (results.playlists?.length ?? 0) > 0;

  return (
    <View>
      {/* Top result card (only for All filter) */}
      {activeFilter === 'All' && results.topResult && (
        <TopResultCard
          result={results.topResult}
          onPress={onTopResultPress}
          onPlayPress={(res) => {
            if (res.kind === 'track' && res.track) {
              onPlayTrack(res.track, results.tracks);
            }
          }}
        />
      )}

      {/* Songs */}
      {showSongs && (
        <>
          <SearchSectionHeader title="Songs" />
          {(activeFilter === 'All' ? results.tracks.slice(0, 5) : results.tracks).map((track) => (
            <SearchTrackRow
              key={track.id}
              track={track}
              onPlay={(t) => onPlayTrack(t, results.tracks)}
            />
          ))}
        </>
      )}

      {/* Artists */}
      {showArtists && (
        <>
          <SearchSectionHeader title="Artists" />
          {(activeFilter === 'All' ? results.artists.slice(0, 3) : results.artists).map((artist) => (
            <SearchArtistRow key={artist.id} artist={artist} onPress={onArtistPress} />
          ))}
        </>
      )}

      {/* Albums */}
      {showAlbums && (
        <>
          <SearchSectionHeader title="Albums" />
          {(activeFilter === 'All' ? results.albums.slice(0, 3) : results.albums).map((album) => (
            <SearchAlbumRow key={album.id} album={album} onPress={onAlbumPress} />
          ))}
        </>
      )}

      {/* Playlists */}
      {showPlaylists && (
        <>
          <SearchSectionHeader title="Playlists" />
          {(activeFilter === 'All' ? results.playlists!.slice(0, 3) : results.playlists!).map(
            (playlist) => (
              <SearchPlaylistRow
                key={playlist.id}
                playlist={playlist}
                onPress={onPlaylistPress}
              />
            )
          )}
        </>
      )}
    </View>
  );
}
