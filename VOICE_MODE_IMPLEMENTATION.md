# Voice Mode Implementation

## Overview

Voice Mode adds hands-free control to the Raawi X accessibility widget using the Web Speech API (Speech Recognition and Speech Synthesis).

## Features

### ✅ Voice Commands Supported

**Text Controls:**
- "increase text" / "text bigger" / "larger text"
- "decrease text" / "text smaller" / "smaller text"

**Spacing Controls:**
- "increase spacing" / "more spacing"
- "decrease spacing" / "less spacing"

**Toggle Controls:**
- "contrast on" / "enable contrast" / "turn on contrast"
- "contrast off" / "disable contrast" / "turn off contrast"
- "focus highlight on" / "enable focus" / "turn on focus"
- "focus highlight off" / "disable focus" / "turn off focus"
- "reading mode on" / "enable reading" / "turn on reading"
- "reading mode off" / "disable reading" / "turn off reading"

**Navigation Commands:**
- "read summary" / "page summary"
- "read landmarks" / "list landmarks"
- "read actions" / "list actions"
- "read issues" / "list issues"

**Action Navigation:**
- "next action" / "next"
- "previous action" / "previous" / "back"
- "activate action" / "click action" / "select action"

**Help:**
- "list commands" / "help" / "what can i say"

### ✅ UI Components

1. **Voice Mode Toggle** - Enable/disable voice mode
2. **Push-to-Talk Toggle** - Switch between continuous listening and push-to-talk
3. **Microphone Button** - Visual indicator and control
   - Continuous mode: Click to start/stop
   - Push-to-talk: Hold to speak
4. **Transcript Display** - Shows recognized speech in real-time
5. **List Commands Button** - Speaks available commands

### ✅ Speech Synthesis

- Speaks page summaries
- Speaks action labels and descriptions
- Speaks issue descriptions
- Speaks command confirmations
- Speaks help text

## Implementation Details

### Feature Flag

Voice mode is disabled by default. Enable via:

```javascript
window.VOICE_ENABLED = true;
```

Set before widget script loads, or widget will check on initialization.

### Browser Support

- **Speech Recognition:** Chrome, Edge (Chromium), Safari (partial)
- **Speech Synthesis:** All modern browsers

If not supported, voice controls are automatically hidden.

### Constraints Respected

✅ **Never hijacks focus** - Uses programmatic clicks, visual highlights only
✅ **Respects screen readers** - Doesn't auto-speak unless user triggers
✅ **Browser-only** - Uses Web Speech API, no cloud calls
✅ **User-controlled** - Only activates when user enables voice mode

### API Integration

Voice mode can fetch data from scanner API:
- Page summaries from `/api/widget/guidance`
- Issues from `/api/widget/issues`

Configure via:
```javascript
window.RAWI_API_URL = 'http://localhost:3001';
window.RAWI_SCAN_ID = 'latest';
```

## Usage

1. **Enable Voice Mode:**
   - Toggle "Voice Mode" switch in widget panel
   - Microphone button appears

2. **Choose Mode:**
   - **Continuous:** Automatically listens (after enabling)
   - **Push-to-Talk:** Hold microphone button to speak

3. **Give Commands:**
   - Speak naturally: "increase text", "contrast on", etc.
   - Transcript shows recognized speech
   - Widget responds with speech confirmation

4. **Navigate Actions:**
   - Say "read actions" to list available actions
   - Say "next action" to navigate
   - Say "activate action" to click highlighted action

## Technical Notes

- Speech recognition uses continuous mode with interim results
- Auto-restarts in continuous mode (unless push-to-talk)
- Respects microphone permissions
- Handles errors gracefully
- Action highlighting uses visual outline (doesn't change focus)
- Action activation uses programmatic click (browser handles focus naturally)

## Testing

Test on `http://localhost:4173/good` or `/messy`:
1. Enable voice mode toggle
2. Try commands: "increase text", "contrast on", "read summary"
3. Test push-to-talk: Hold mic button, speak, release
4. Test action navigation: "read actions", "next action", "activate action"

