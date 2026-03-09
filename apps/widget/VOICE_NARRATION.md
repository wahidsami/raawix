# Voice Narration Engine Documentation

## Overview

The Raawi X widget includes an enhanced Voice Narration Engine that provides intelligent, human-like reading of web pages. The engine creates a reading plan from DOM landmarks, headings, and structured API guidance, then reads content in natural chunks with smooth transitions.

## Features

### Narration Modes

1. **Full Page Reading** (`read page`)
   - Reads complete page content including:
     - Page title
     - Main summary (1-2 sentences)
     - All H2/H3 sections with first 1-2 sentences
     - Top 5 cards (title + one sentence + CTA)
     - Forms (purpose + field labels + required status)
     - Top 5 key actions

2. **Summary Mode** (`summary`)
   - Quick overview:
     - Page title
     - Main summary only

3. **Detailed Summary** (`detailed summary`)
   - Extended summary:
     - Page title
     - Main summary
     - Section headings with brief content

### TTS Chunking

- Segments split into 150-220 character chunks at sentence boundaries
- Natural transitions between sections: "Next section:", "Moving on:", "Now:"
- SSML-like pauses after punctuation (periods, exclamation, question marks)
- Sequential chunk playback with 200ms pauses between chunks

### State Management

The narration engine maintains:
- **Queue**: Current reading queue with segments
- **Index**: Current position in queue
- **State**: `speaking`, `paused`, `stopped`
- **Settings**: `rate` (0.5-2.0), `pitch` (0-2.0), `volume` (0-1.0)

## Voice Commands

### Reading Commands
- `"read page"` / `"read this page"` / `"read full page"` → Start full page narration
- `"summary"` → Read summary only
- `"detailed summary"` / `"read detailed"` → Read detailed summary

### Navigation Commands
- `"read landmarks"` / `"list landmarks"` → List page landmarks
- `"read actions"` / `"list actions"` → List key actions
- `"read issues"` / `"list issues"` → Read accessibility issues

### Control Commands
- `"pause"` → Pause current narration
- `"resume"` / `"continue"` / `"unpause"` → Resume paused narration
- `"stop"` → Stop narration completely
- `"next"` / `"next section"` → Skip to next segment
- `"repeat"` / `"say again"` → Repeat current segment
- `"faster"` / `"speed up"` → Increase reading speed
- `"slower"` / `"slow down"` → Decrease reading speed
- `"go to section {heading text}"` → Jump to specific section (fuzzy match)

### Legacy Commands (Still Supported)
- Text controls: `"increase text"`, `"decrease text"`
- Spacing controls: `"increase spacing"`, `"decrease spacing"`
- Toggle controls: `"contrast on/off"`, `"focus highlight on/off"`, `"reading mode on/off"`
- Action navigation: `"next action"`, `"previous action"`, `"activate action"`
- Help: `"list commands"` / `"help"`

## UI Controls

The widget provides button controls for users who cannot or prefer not to use voice:

- **Read Page** - Start full page narration
- **Summary** - Read summary only
- **Pause** - Pause narration
- **Resume** - Resume paused narration
- **Stop** - Stop narration
- **Next** - Skip to next segment
- **Repeat** - Repeat current segment

Status display shows: `Reading: {section} (X of Y)` or `Paused: {section} (X of Y)`

## API Integration

### Preferred: Structured Guidance

When `RAWI_API_URL` and `RAWI_SCAN_ID` are configured, the widget:
1. Fetches `/api/widget/guidance` on page load (non-blocking)
2. Uses API data for:
   - Page summary
   - Landmarks
   - Form steps with field details
   - Key actions with descriptions
3. Falls back to DOM extraction if API unavailable

### Issues API

- Fetches `/api/widget/issues` only when user requests "read issues"
- Caches results for subsequent requests
- Falls back to DOM-based issue detection if API unavailable

## Reading Queue Structure

Each segment in the queue contains:
- `id`: Unique identifier
- `type`: `title` | `summary` | `section` | `card` | `form` | `action` | `landmark`
- `text`: Text to be spoken
- `heading`: Optional heading text
- `element`: Optional DOM element (for scrolling)
- `priority`: Order in queue (lower = higher priority)

## Defaults

- **Reading Rate**: 1.0 (normal speed)
- **Pitch**: 1.0 (normal pitch)
- **Volume**: 1.0 (full volume)
- **Chunk Size**: 150-220 characters
- **Chunk Pause**: 200ms between chunks
- **Transition Variety**: Rotates between "Next section:", "Moving on:", "Now:"

## Accessibility

- **No Focus Hijacking**: Widget never moves focus automatically
- **Screen Reader Compatible**: Does not interfere with screen readers
- **Keyboard Accessible**: All UI controls keyboard accessible
- **ARIA Live Regions**: Status updates announced to assistive tech
- **Respects aria-hidden**: Skips elements marked `aria-hidden="true"`

## Browser Support

- **Speech Recognition**: Chrome, Edge, Safari (webkit prefix)
- **Speech Synthesis**: All modern browsers
- **Graceful Degradation**: Falls back to DOM-only extraction if API unavailable

## Configuration

Set these global variables before widget script loads:

```javascript
window.VOICE_ENABLED = true;           // Enable voice features
window.RAWI_API_URL = 'http://localhost:3001';  // Scanner API URL
window.RAWI_SCAN_ID = 'latest';        // Scan ID or 'latest'
```

## Example Usage

```javascript
// Enable voice mode
window.VOICE_ENABLED = true;
window.RAWI_API_URL = 'https://api.example.com';
window.RAWI_SCAN_ID = 'scan_1234567890_abc123';

// Load widget
const script = document.createElement('script');
script.src = '/widget.iife.js';
document.body.appendChild(script);

// After load, user can:
// - Say "read page" to start full narration
// - Click "Read Page" button
// - Use voice commands to control playback
```

## Implementation Notes

- Narration state persists across voice commands
- Queue is rebuilt on each "read page" request
- API guidance is cached for performance
- DOM extraction is fallback only (when API unavailable)
- Chunking ensures natural speech flow
- Transitions make navigation feel human

