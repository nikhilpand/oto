/**
 * Home Feed Engine
 *
 * Implements BitChord parallel feed assembly, recents lead-shelf injection,
 * continuation deduplication, and video scrubbing.
 */

export interface RawItem {
  videoId?: string;
  browseId?: string;
  title: string;
  subtitle: string;
  thumbnailUrl?: string;
  isVideo?: boolean;
}

export interface RawShelf {
  title: string;
  subtitle?: string;
  items: RawItem[];
}

export interface HomeAssemblyParams {
  coreShelves: RawShelf[];
  historyItems?: RawItem[];
  supplementShelves?: RawShelf[];
  recentLimit?: number;
}

export interface AssembledFeed {
  shelves: RawShelf[];
}

const VIDEO_WORD_REGEX = /\b(video|videos)\b/i;

export class HomeFeedEngine {
  /**
   * Filters out video-only compilation shelves and widescreen video entries.
   */
  static filterVideoShelves(shelves: RawShelf[]): RawShelf[] {
    return shelves
      .filter((shelf) => !VIDEO_WORD_REGEX.test(shelf.title))
      .map((shelf) => ({
        ...shelf,
        items: shelf.items.filter((item) => !item.isVideo),
      }))
      .filter((shelf) => shelf.items.length > 0);
  }

  /**
   * Assembles the home feed by prepending deduplicated recents,
   * replacing stale 'Listen again' shelves, and combining supplements.
   */
  static assembleHomeFeed(params: HomeAssemblyParams): AssembledFeed {
    const recentLimit = params.recentLimit ?? 20;
    const cleanCore = this.filterVideoShelves(params.coreShelves);
    const cleanSupplements = this.filterVideoShelves(params.supplementShelves ?? []);

    let shelves = [...cleanCore, ...cleanSupplements];

    if (params.historyItems && params.historyItems.length > 0) {
      // Deduplicate history items by videoId
      const seen = new Set<string>();
      const dedupedHistory: RawItem[] = [];

      for (const item of params.historyItems) {
        if (item.videoId && !seen.has(item.videoId)) {
          seen.add(item.videoId);
          dedupedHistory.push(item);
          if (dedupedHistory.length >= recentLimit) break;
        }
      }

      if (dedupedHistory.length > 0) {
        const recentsShelf: RawShelf = {
          title: 'Recents',
          subtitle: 'Recently played',
          items: dedupedHistory,
        };

        // Remove stale 'Listen again' or existing 'Recents' shelves from core
        shelves = shelves.filter((s) => {
          const lower = s.title.toLowerCase();
          return lower !== 'listen again' && lower !== 'recents' && lower !== 'recently played';
        });

        // Prepend at Index 0
        shelves.unshift(recentsShelf);
      }
    }

    return { shelves };
  }

  /**
   * State tracker for infinite scroll continuations to prevent infinite spinner traps.
   */
  static ContinuationTracker = class {
    private seenTitles = new Set<string>();

    recordShelfTitles(titles: string[]): void {
      for (const title of titles) {
        this.seenTitles.add(title.toLowerCase().trim());
      }
    }

    shouldContinue(newTitles: string[], token: string | null | undefined): boolean {
      if (!token) return false;
      const hasNewTitle = newTitles.some(
        (title) => !this.seenTitles.has(title.toLowerCase().trim())
      );
      return hasNewTitle;
    }
  };
}
