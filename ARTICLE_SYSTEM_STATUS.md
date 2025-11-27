# Relocation Article System - Status & Restart Plan
**Date:** November 27, 2025

## Current State: WORKING (with caveats)

### What's Live
- **URL:** https://relocation.quest/cyprus-digital-nomad-visa-2025
- **Status:** Article renders with 4-act animated GIFs, hero video, all components

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   content-worker    │────▶│   Neon (PostgreSQL)   │◀────│   relocation    │
│   (generates)       │     │   (stores)       │     │   (displays)    │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
        │                           │                        │
        ▼                           ▼                        ▼
  ArticleCreation           articles table             [slug].astro
  Workflow                  (app='relocation')         template
```

---

## What's Working

### 1. Video Generation (Seedance 4-Act)
- 12-second videos, 4 acts × 3 seconds
- Uploaded to Mux, playback_id stored in Neon
- Act timestamps stored in `video_narrative.acts`

### 2. Article Generation (4-Act Content)
- `four_act_content[]` with title, factoid, video_title per section
- FAQ, callouts, comparison tables, timelines, stat highlights
- HTML content with H2 sections

### 3. Frontend Display (relocation)
- Hero video via `<mux-player>`
- **Section GIFs:** Mux animated.gif with start/end params (THE FIX)
- Ticker tape chapter navigation
- All structured components render from payload

### 4. Mux Integration
- Thumbnails: `image.mux.com/{id}/thumbnail.jpg?time=X&width=800`
- **Animated GIFs:** `image.mux.com/{id}/animated.gif?start=0&end=3&width=640&fps=15`
- Stream: `stream.mux.com/{id}.m3u8`
- **Critical:** GIF max width is 640px (larger fails)

---

## What Needs Work

### 1. Article Type Selection
**Problem:** Sonnet doesn't explicitly choose template (transformation/country_guide/comparison/listicle)
**Location:** `content-worker/src/activities/generation/article_generation.py`
**Fix:** Pass template name to generation, store in payload for frontend to adapt layout

### 2. Dynamic Timestamps from DB
**Problem:** relocation hardcodes act timestamps [0,3,6,9,12] instead of reading from `video_narrative.acts`
**Location:** `relocation/src/pages/[slug].astro` lines 92-97
**Status:** Partially fixed - reads from DB with fallback to defaults
**Verify:** Ensure new articles populate `video_narrative.acts` correctly

### 3. WeatherAPI Integration
**Problem:** Changed from Open-Meteo to WeatherAPI.com but may need API key rotation
**API Key:** `6efaa5ad34174ecda1c11201252711`
**Location:** `relocation/src/pages/[slug].astro` line ~1023

### 4. Component Library Not Passed to Sonnet
**Problem:** `app_config.py` defines ComponentLibrary but article generation doesn't use it
**Impact:** Sonnet doesn't know which components are enabled per app
**Fix:** Include ComponentLibrary config in generation prompt

---

## Neon Database Schema Requirements

For articles to render, these fields MUST be populated:

```sql
-- Required fields
video_playback_id     VARCHAR   -- Mux playback ID
video_narrative       JSONB     -- {"playback_id": "...", "acts": {...}}
payload               JSONB     -- four_act_content, faq, callouts, etc.
content               TEXT      -- HTML article body
meta_description      TEXT      -- SEO excerpt
app                   VARCHAR   -- 'relocation'
slug                  VARCHAR   -- URL slug

-- Optional but recommended
article_angle         VARCHAR   -- "Visa Guide", "Country Guide", etc.
word_count            INTEGER
```

### Payload Structure
```json
{
  "four_act_content": [
    {
      "title": "Section Title",
      "factoid": "Key stat or hook",
      "video_title": "Short label for GIF overlay",
      "four_act_visual_hint": "Video prompt for this act"
    }
    // ... 4 sections
  ],
  "faq": [{"q": "Question?", "a": "Answer"}],
  "callouts": [{"type": "pro_tip", "title": "...", "content": "...", "placement": "after_section_2"}],
  "comparison": {"title": "...", "items": [{"name": "Cyprus", "cost": "€800/mo"}]},
  "timeline": [{"date": "2022", "title": "...", "description": "..."}],
  "stat_highlight": {"headline": "...", "stats": [{"value": "3,400", "label": "Hours sunshine"}]},
  "sources": [{"name": "...", "url": "...", "description": "..."}]
}
```

---

## To-Do List for Scaling

### Phase 1: Stabilization (Immediate)
- [ ] Verify Cyprus article GIFs load on production (width=640 fix)
- [ ] Test generating a NEW article end-to-end
- [ ] Confirm `video_narrative.acts` populates correctly from workflow

### Phase 2: Article Type System
- [ ] Add `article_type` field to payload (transformation/country_guide/comparison/listicle)
- [ ] Update `generate_four_act_article` to accept and use template name
- [ ] Update relocation template to adapt layout based on article_type

### Phase 3: Component Library Integration
- [ ] Pass ComponentLibrary config to Sonnet in article generation prompt
- [ ] Let Sonnet decide which optional components to include
- [ ] Store enabled components in payload for frontend

### Phase 4: Multi-App Scaling
- [ ] Test placement app with same 4-act framework
- [ ] Test pe_news app (note: section_video_headers=False for news)
- [ ] Create shared component library across apps

### Phase 5: Automation
- [ ] Set up scheduled article generation via Temporal
- [ ] Topic discovery from news feeds
- [ ] Quality scoring and auto-publish threshold

---

## Key Files Reference

### Content Worker (article generation)
```
quest/content-worker/
├── src/config/app_config.py          # Article types, templates, components
├── src/activities/generation/
│   ├── article_generation.py         # generate_four_act_article
│   └── media_prompts.py              # generate_four_act_video_prompt
├── src/workflows/article_creation.py # Main workflow
└── worker.py                         # Registered activities
```

### Relocation (frontend display)
```
relocation/
├── src/pages/[slug].astro            # Article template (main file)
├── src/lib/db.ts                     # Neon connection
└── ARTICLE_SYSTEM_STATUS.md          # This file
```

---

## Commands for Testing

```bash
# Run content worker
cd ~/quest/content-worker
python3 worker.py

# Test article generation (if test file exists)
python3 test_full_article_workflow.py

# Run relocation dev server
cd ~/relocation
npm run dev
# Visit: http://localhost:4321/cyprus-digital-nomad-visa-2025

# Check Mux GIF works
curl -I "https://image.mux.com/PLAYBACK_ID/animated.gif?start=0&end=3&width=640&fps=15"
```

---

## Lessons Learned

1. **Mux animated GIFs are the answer** - Don't fight HLS bounded playback, use native GIF endpoint
2. **Max GIF width is 640px** - Larger sizes return 400 error
3. **Astro script handling is tricky** - `define:vars` and `set:html` don't work reliably for dynamic scripts
4. **Document in code** - Added headers to both app_config.py and [slug].astro for future reference
5. **Test locally first** - Many issues only showed up on deployed site

---

## Quick Restart Checklist

When resuming work on this system:

1. Read this file first
2. Check `app_config.py` docstring for article types and Neon requirements
3. Check `[slug].astro` header comment for template expectations
4. Verify Mux playback ID exists before testing frontend
5. Use GIF endpoint for bounded loops, not HLS+JavaScript
