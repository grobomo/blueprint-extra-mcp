# Spec 014: Code Quality Pass 3

## Goal
Fix bugs and inconsistencies found during post-merge code review.

## Issues Found
1. **Bug**: `activityReporter.test.js` uses `pct` field for scroll_depth events, but the tracker emits `scrollPct`. The reporter reads `s.scrollPct`, so scroll data silently reads as 0 in tests — masking potential bugs.
2. **DRY**: `ActivityTracker._summarize/_topPages/_topClicked/_topHovered` duplicates `ActivityReporter`. Acceptable since tracker returns quick inline summaries (no enrichment), but worth documenting.
