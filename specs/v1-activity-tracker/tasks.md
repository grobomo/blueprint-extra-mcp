# 010 — V1 Activity Tracker

Expand clickRecorder.js into a full user activity tracker for V1 console pages.
Captures clicks, hovers, scroll depth, page dwell time, navigation paths.

## Phase 1: Expand the Recorder Script

**Checkpoint**: `bash scripts/test/test-activity-tracker.sh` exits 0

- [ ] T001 Add hover tracking to RECORDER_SCRIPT — track mouseover events with element info, hover duration (start/end timestamps), filter noise (>500ms threshold)
- [ ] T002 Add scroll depth tracking — record max scroll percentage per page, scroll events with timestamps
- [ ] T003 Add page dwell time — track page enter/leave via visibilitychange + hashchange + beforeunload, emit dwell events with page URL and duration
- [ ] T004 Add navigation path tracking — record page transitions (from → to) with timestamps, sidebar menu clicks as named waypoints

## Phase 2: Activity Report Generation

**Checkpoint**: `bash scripts/test/test-activity-report.sh` exits 0

- [ ] T005 Create ActivityReporter class in server/src/activityReporter.js — aggregates raw events into summary: top clicked elements, page dwell rankings, hover heatmap data, navigation flow graph
- [ ] T006 Add MCP tool `browser_activity_report` — returns JSON summary of recorded activity session, callable via Blueprint tools
- [ ] T007 Add HTML report output — generate a standalone HTML file with activity dashboard (dwell time bars, click counts, nav flow)

## Phase 3: V1-Specific Enrichment

**Checkpoint**: `bash scripts/test/test-v1-enrichment.sh` exits 0

- [ ] T008 V1 page name resolver — map V1 hash routes (#/app/sensor-policy, #/app/xdr, etc.) to human-readable page names for reports
- [ ] T009 V1 iframe context enrichment — tag events with which V1 module they belong to based on iframe name (__VES_CONTAINER = Endpoint Security, __ADS_CONTAINER = Data Security, etc.)
