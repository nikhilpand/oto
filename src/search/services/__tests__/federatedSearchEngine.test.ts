import {
  FederatedSearchEngine,
  SearchFilterType,
  SEARCH_PROTOBUF_PARAMS,
  RawSearchHit,
} from '../federatedSearchEngine';

describe('FederatedSearchEngine', () => {
  it('maps all SearchFilter types to exact BitChord protobuf base64 strings', () => {
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.ALL]).toBeNull();
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.SONGS]).toBe('EgWKAQIIAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.VIDEOS]).toBe('EgWKAQIQAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.ALBUMS]).toBe('EgWKAQIYAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.ARTISTS]).toBe('EgWKAQIgAWoKEAkQChAFEAMQBA==');
    expect(SEARCH_PROTOBUF_PARAMS[SearchFilterType.PLAYLISTS]).toBe('EgWKAQIoAWoKEAkQChAFEAMQBA==');
  });

  it('prepares typeahead request with cookies explicitly stripped for privacy', () => {
    const userCookie = 'SAPISID=abcd1234; HSID=xyz9876';
    const req = FederatedSearchEngine.prepareTypeaheadRequest({
      query: 'coldplay',
      userCookie,
    });

    expect(req.headers['Cookie']).toBeUndefined();
    expect(req.isAnonymous).toBe(true);
    expect(req.body.query).toBe('coldplay');
  });

  it('prepares confirmed search request with user auth headers intact', () => {
    const userCookie = 'SAPISID=abcd1234; HSID=xyz9876';
    const req = FederatedSearchEngine.prepareConfirmedSearchRequest({
      query: 'coldplay',
      filter: SearchFilterType.SONGS,
      userCookie,
    });

    expect(req.headers['Cookie']).toBe(userCookie);
    expect(req.isAnonymous).toBe(false);
    expect(req.body.params).toBe('EgWKAQIIAWoKEAkQChAFEAMQBA==');
  });

  it('promotes musicCardShelfRenderer to TopTrack and deduplicates rows', () => {
    const topCard: RawSearchHit = {
      kind: 'card_shelf',
      videoId: 'top_1',
      title: 'Yellow',
      artist: 'Coldplay',
      isVideo: false,
    };

    const regularRows: RawSearchHit[] = [
      { kind: 'row', videoId: 'top_1', title: 'Yellow', artist: 'Coldplay' },
      { kind: 'row', videoId: 'song_2', title: 'Fix You', artist: 'Coldplay' },
      { kind: 'browse', browseId: 'b_coldplay', title: 'Coldplay', subtitle: 'Artist' },
      { kind: 'browse', browseId: 'b_coldplay', title: 'Coldplay Dup', subtitle: 'Artist' },
    ];

    const results = FederatedSearchEngine.assembleSearchResults({
      topCard,
      rows: regularRows,
      filter: SearchFilterType.ALL,
    });

    expect(results.topResult?.videoId).toBe('top_1');
    expect(results.tracks.filter((t) => t.videoId === 'top_1')).toHaveLength(0);
    expect(results.tracks).toHaveLength(1);
    expect(results.tracks[0]?.videoId).toBe('song_2');
    expect(results.browseItems).toHaveLength(1);
    expect(results.browseItems[0]?.browseId).toBe('b_coldplay');
  });
});
