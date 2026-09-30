# Lyrics Engine Evidence Log — BitChord Reverse-Engineering

This document records verified facts about provider cascading, syllable TTML parsing, Musixmatch HMAC signing, and synchronization clocks from `LyricsRepository.kt` and `LyricLine.kt`.

---

## Evidence 1: 16-Provider Concurrent Parallel Dispatch
- **Claim:** BitChord dispatches requests to up to 16 lyrics providers simultaneously using coroutine `async`, but consumes results strictly according to user priority order, ensuring fast response times without sacrificing provider precedence.
- **Evidence:**
  - `LyricsRepository.kt` lines 14–35 (KDoc):
    > "Every enabled source is asked *at the same time*, but their answers are taken in [order]: the loop awaits them one at a time in that sequence, so a lower-priority source finishing first never preempts one still pending ahead of it... Run together, a miss costs whatever the slowest one needed to still be waited on took."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/lyrics/LyricsRepository.kt`
- **Class:** `LyricsRepository`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, `Promise.allSettled()` or a prioritized `Promise` race should be used to fetch lyrics in parallel from multiple REST APIs.

---

## Evidence 2: Syllable TTML to Word Merging
- **Claim:** Apple Music TTML syllable spans (`<span begin="0.1s" end="0.3s">syll</span><span begin="0.3s" end="0.5s">able</span>`) are merged into unified whole words (`LyricWord`) so that real-time text bloom animations sweep smoothly across words without visual stuttering.
- **Evidence:**
  - `LyricLine.kt` lines 3–11 (KDoc):
    > "Apple's TTML splits long words into syllables; those are merged back into whole words on the way in, so [startMs] is the first syllable's start and [endMs] the last one's end. Whole words are what the sweep needs — a highlight that ran across 'e' and 'nough' separately reads as a stutter."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/lyrics/LyricLine.kt`
- **Class:** `LyricWord` & `LyricLine`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Parsers for TTML must aggregate consecutive syllable spans within a word boundary into a single `LyricWord` token.

---

## Evidence 3: Duet Call-and-Response Alignment & Background Vocals
- **Claim:** Duets are tagged via `LyricAlignment.Start` and `LyricAlignment.End` based on TTML agent markers (`ttm:agent`), and background vocals (`(ooh)`, echo phrases) are isolated into dedicated child `LyricLine` objects on separate clocks.
- **Evidence:**
  - `LyricLine.kt` lines 14–22 (duet alignment) and lines 35–44 (background vocal separation).
- **File:** `BitChord/app/src/main/java/com/music/bitchord/data/lyrics/LyricLine.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** In React Native, the lyrics list component can render left-aligned, right-aligned, and secondary background bubbles effortlessly using Flexbox.
