---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(npm test:*), Bash(npm run *:*), Bash(npx vercel:*), Bash(node tests/*:*), Bash(ffmpeg:*), Bash(ffprobe:*), Bash(mkdir:*), Bash(ls:*), Read, Write, Edit, AskUserQuestion
description: Ship workflow — test → commit → push → deploy → record → iterate on tweet → post
argument-hint: [optional one-line context about what changed]
---

## Context

- Working tree: !`git -C /Users/richardzhang/personal/computer-viz status --short`
- Branch: !`git -C /Users/richardzhang/personal/computer-viz branch --show-current`
- Recent commits (style reference): !`git -C /Users/richardzhang/personal/computer-viz log --oneline -8`
- Diff stat vs HEAD: !`git -C /Users/richardzhang/personal/computer-viz diff --stat HEAD | tail -25`

Optional user-provided context for the commit + tweet: **$ARGUMENTS**

## What to do

Execute these steps in order. Don't skip. Report progress as you go (one sentence per step) so the user can follow along.

### 1. Test

Run from `animations/`:
```bash
cd /Users/richardzhang/personal/computer-viz/animations && npm test 2>&1 | tail -10
```
If anything fails, **STOP** and report the failure. Do not commit broken code.

### 2. Commit

Stage only source/config/test changes — never `test-results/`, never `node_modules/`, never `.vercel/`. Inspect the working tree from the Context block and use targeted `git add` (no `git add -A`).

Draft a commit message:
- One short title line (under 70 chars) describing what changed at the conceptual level (new layer, new test guard, bug fix, refactor).
- Bullet list (3–6 lines) of substantive changes.
- Final paragraph reporting test count (`N tests passing`).
- Trailer: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

Use a HEREDOC for the commit message (so multi-line formatting survives). Run `git -C /Users/richardzhang/personal/computer-viz commit -m "$(cat <<'EOF' ... EOF)"`.

### 3. Push

```bash
git -C /Users/richardzhang/personal/computer-viz push origin main
```

### 4. Deploy

```bash
cd /Users/richardzhang/personal/computer-viz/animations && npx vercel --prod --yes 2>&1 | grep -E "Production|Aliased|READY|ready" | head -5
```
Capture the production URL from the output (usually aliased to `https://computer-viz-animations.vercel.app`).

### 5. Record a showcase video

Pick the most visible new feature from the commit (usually the topmost new layer, e.g. `regfile`, `datapath`, `alu1`). If there's already a `tests/record-<name>.mjs` for that level, run it. Otherwise create a new recorder by copying `tests/record-regfile.mjs` and adapting:
- Change `PORT` to a unique value (4180 + N).
- Change the starting URL to the new layer's HTML page.
- Click 1–3 child slots (`#slot-*`) to drill in, `page.goBack()` between each.
- Save as `tests/record-<name>.mjs`.

Run the recorder, then convert webm→mp4:
```bash
cd /Users/richardzhang/personal/computer-viz/animations/test-results/recordings && ffmpeg -y -i <name>.webm -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 -movflags +faststart -an -r 30 -vf "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:black" <name>.mp4
```

Extract a preview frame to show the user (so they can sanity-check before posting):
```bash
ffmpeg -y -i <name>.mp4 -vf "select=eq(n\,15)" -frames:v 1 /tmp/ship-preview.png
```
Read the preview image with the Read tool — that includes it in the conversation for the user to see.

### 6. Iterate on tweet text

Draft 2–3 candidate tweets (~200 chars each):
- One option that includes a URL (`computer-viz-animations.vercel.app`) — note this costs ~$0.20 on the X dev pay-per-use tier.
- One without a URL — costs ~$0.015.
- Optionally a third with a different angle (concept-first vs feature-first).

Use **AskUserQuestion** with previews so the user can compare them side-by-side. Include the per-option cost ($0.015 vs $0.20) in the option description. Make "With URL" the recommended default *only if* the user provided `$ARGUMENTS` mentioning shipping/showcase — otherwise let them pick.

If the user picks "edit" or types a custom answer, iterate: redraft and ask again. Don't loop more than 3 times — if they're not happy after 3 iterations, ask if they want to write it themselves and you'll just post it.

### 7. Post

Write a one-off post script to `/tmp/x-post/post-<name>.mjs`:
- Read X credentials from `/Users/richardzhang/workspace/research/quake3-worldmodel/.env`.
- Use `twitter-api-v2` (install in `/tmp/x-post` if needed).
- `client.v1.uploadMedia(VIDEO, { mimeType: 'video/mp4', target: 'tweet' })` → `client.v2.tweet({ text, media: { media_ids: [mediaId] } })`.
- Print the resulting tweet ID.

Run it, report the tweet URL: `https://x.com/i/web/status/<id>`.

### Final report

End the workflow with a 2–3 line summary:
- Commit SHA + title
- Live URL
- Tweet URL

If any step fails, stop at that step, surface the error, and ask the user how to proceed. Never silently skip a step. Never post a tweet without explicit user approval of the text.
