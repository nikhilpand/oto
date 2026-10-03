import { PlaylistEngine } from '../playlistEngine';

describe('PlaylistEngine', () => {
  it('detects truncated catalogue album and resolves backing playlist ID', () => {
    const albumBrowseId = 'MPREb_98765';
    const albumResponse = {
      header: {
        title: 'Random Access Memories',
        playButtonPlaylistId: 'OLAK5uy_k123456789',
      },
      previewTracksCount: 3,
    };

    const resolution = PlaylistEngine.resolveAlbumBackingPlaylist(albumBrowseId, albumResponse);
    expect(resolution.isAlbum).toBe(true);
    expect(resolution.backingPlaylistBrowseId).toBe('VLOLAK5uy_k123456789');
  });

  it('determines playlist ownership using BitChord 3-stage heuristic', () => {
    // Stage 1: Explicit editable header renderer
    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: true,
        menuIcons: [],
        hasSaveToggle: true,
      })
    ).toBe(true);

    // Stage 2: Menu contains DELETE or EDIT
    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: false,
        menuIcons: ['DELETE', 'SHARE'],
        hasSaveToggle: true,
      })
    ).toBe(true);

    // Stage 3: No save toggle in header buttons
    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: false,
        menuIcons: ['SHARE'],
        hasSaveToggle: false,
      })
    ).toBe(true);

    // Not owned: saved playlist with bookmark button and no delete icon
    expect(
      PlaylistEngine.determineOwnership({
        hasEditableHeader: false,
        menuIcons: ['SHARE'],
        hasSaveToggle: true,
      })
    ).toBe(false);
  });

  it('isolates Suggested tracks shelf from user playlist tracks', () => {
    const rawItems = [
      { videoId: 't1', title: 'User Song 1', isSuggested: false },
      { videoId: 't2', title: 'User Song 2', isSuggested: false },
      { videoId: 's1', title: 'Suggested Song 1', isSuggested: true },
    ];

    const partitioned = PlaylistEngine.partitionTracks(rawItems);
    expect(partitioned.playlistTracks).toHaveLength(2);
    expect(partitioned.playlistTracks.map((t) => t.videoId)).toEqual(['t1', 't2']);
    expect(partitioned.suggestedTracks).toHaveLength(1);
    expect(partitioned.suggestedTracks[0]?.videoId).toBe('s1');
  });

  it('generates remove mutation requiring setVideoId for duplicate-safe deletion', () => {
    const payload = PlaylistEngine.buildRemovePayload('VLPL12345', [
      { videoId: 'v1', setVideoId: 'set_abc_1' },
      { videoId: 'v1', setVideoId: 'set_abc_2' },
    ]);

    expect(payload.playlistId).toBe('PL12345');
    expect(payload.actions).toHaveLength(2);
    expect(payload.actions[0]).toEqual({
      action: 'ACTION_REMOVE_VIDEO',
      removedVideoId: 'v1',
      setVideoId: 'set_abc_1',
    });
    expect(payload.actions[1]).toEqual({
      action: 'ACTION_REMOVE_VIDEO',
      removedVideoId: 'v1',
      setVideoId: 'set_abc_2',
    });
  });
});
