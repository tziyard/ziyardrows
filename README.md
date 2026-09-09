# Zone 2 Trainer — v2

What's new in this pass:

- **Profile / login** — local to this device (no server yet — see "About accounts" below)
- **One-time Zone 2 setup**, editable any time from the avatar → Settings
- **Audio + vibration cues** — one buzz and a spoken line ("Below zone 2, speed up" /
  "Above zone 2, slow down") when you drift out, with a cooldown so it doesn't nag
- **Dashboard** — streak (current + best), this week's minutes/zone%/workout count,
  a 7-workout bar chart, and history
- **Installable app (PWA)** — add it to your home screen and it opens full-screen,
  works offline for the shell, and stops resetting when you switch apps

## Deploy it (replace what's on GitHub Pages)

1. In your `ziyardrows` repo, delete the old files and copy in everything from this
   folder: `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, `icons/`.
2. Commit and push to the branch GitHub Pages serves (usually `main`, `/root` or `/docs`).
3. Open `https://tziyard.github.io/ziyardrows/` — give it a minute for GitHub Pages to rebuild.
4. On your phone: open it in **Chrome/Edge (Android)** or **Safari (iOS)**, then
   "Add to Home Screen." That's the fix for the browser-refresh problem — a home-screen
   PWA runs standalone instead of as a tab your OS can kill.

## About accounts (read this before you invite friends)

There's no backend yet, so "login" is really a **local profile**: username + passcode
are stored only in that browser's storage. It will not sync across your phone and laptop,
and the passcode hashing is not real security — don't reuse a password you care about.
This is fine for you testing solo. If you want real cross-device accounts (needed for
the community feature — likes, comments, follows, public profiles), that requires an
actual backend (e.g. Supabase or Firebase) with real auth, a database, and image storage
for profile pictures/run photos. Happy to scope and build that as the next phase.

## Notes on the alerts

- Alerts trigger after **4 seconds** sustained outside the zone, and won't repeat for
  **25 seconds** — tunable in `app.js` (`ALERT_SUSTAIN`, `ALERT_COOLDOWN`).
- Voice uses the browser's built-in text-to-speech (no audio files needed). Vibration
  only works on Android Chrome/Edge — iOS Safari doesn't expose vibration to web pages,
  so on iPhone you'll get the voice cue only.
- Both can be toggled off in Settings, or muted for just the current workout with the
  speaker icon on the workout screen.

## What's still on the roadmap

Weekly/monthly shareable reports, the community feed (posts, likes, comments, follows,
public/private accounts, profile pictures), and route mapping — all flagged in our
last conversation as needing real backend + storage infrastructure.
