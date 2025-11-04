# Debug TTS Issue for "Berätta mer"

## Quick Checks

### 1. Is TTS Enabled?
Look for the **speaker icon** in the header of the Explore page. It should be:
- 🔊 (Sound ON) - TTS is enabled
- 🔇 (Sound OFF) - TTS is disabled

**Fix:** Click the speaker icon to enable TTS.

### 2. Check Browser Console
Open browser console (F12 or Cmd+Option+I) and click "Berätta mer". You should see:

**Expected logs:**
```
[LessonViewer] TTS enabled: true Response length: 245
[LessonViewer] Calling generateExpansionAudio...
[LessonViewer] Generating expansion audio for: Det djupaste stället i havet...
[LessonViewer] Expansion audio generated successfully
```

**If you see:**
```
[LessonViewer] Skipping audio generation - TTS disabled or no response
```
→ TTS is turned off. Enable it with the speaker icon.

**If you see an error:**
```
[LessonViewer] TTS API error: 429 ...
```
→ Rate limit or quota exceeded

```
[LessonViewer] TTS error: NetworkError
```
→ API connection issue

### 3. Browser Audio Permissions
Check if browser is blocking audio:
- Look for 🔇 icon in browser address bar
- Some browsers require user interaction before playing audio
- Try clicking somewhere on the page first, then "Berätta mer"

### 4. Volume Settings
- Check system volume is not muted
- Check browser tab is not muted
- TTS volume slider in Xplore (should show in header)

## Code Changes Made

The TTS audio code is still intact:
- ✅ `generateExpansionAudio()` function exists
- ✅ Audio playback with `playExpansionAudio()` 
- ✅ Called when `ttsEnabled && data.response` is true
- ✅ Uses `/api/tts` with ElevenLabs

## What Changed

The recent change only affected button targeting logic:
- Before: Always used first item in group (could be heading)
- After: Finds and uses text/fact content (correct target)

This shouldn't affect audio at all.

## Likely Causes

1. **TTS toggle is OFF** (most common)
2. **Browser blocked autoplay**
3. **API quota exceeded**
4. **ElevenLabs API key issue**

## Test Steps

1. Go to Explore mode
2. Open browser console (F12)
3. Ensure speaker icon shows 🔊
4. Click "Berätta mer"
5. Check console for logs above
6. Report what you see

## Quick Fix

If nothing works, try:
```javascript
// In browser console:
localStorage.setItem('globalAudioEnabled', 'true');
location.reload();
```

This forces TTS to be enabled.

