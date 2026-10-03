/**
 * Explore Screen Models and Types.
 */

export interface ExploreCardItem {
  readonly id: string;
  readonly title: string;
  readonly gradientColors: [string, string];
  readonly artworkUrl?: string;
  readonly query: string;
  readonly browseId?: string;
  readonly params?: string;
}
