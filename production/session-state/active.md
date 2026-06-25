# Active Session State

**Current Task**: NPC Interaction System — Design + Implementation
**Date**: 2026-06-25

## Files Created
- `src/systems/NPC.js` (NEW — 358 lines)

## Files Modified
- `src/scenes/GameScene.js` — Added NPC spawning, proximity detection, dialogue handling
- `index.html` — Added `<script src="src/systems/NPC.js">`

## NPC System Summary

### Visual
- Graphics-drawn character (head circle + body rect + hair rect), ~24×32 world pixels
- 25-ji colour palette: dark teal body (#1A3A3A), pale skin head (#E8F0F8), teal eyes (#2EC4B6)
- Configurable hair colour per NPC (Wanderer: dark purple-gray #4A4A6A, K: teal #2EC4B6)
- Depth: 5 (same as enemies)

### Prompt
- Shows "NAME  ◆ TALK (J)" at bottom-center of screen when player is within 60px
- Pulsing alpha tween (1 ↔ 0.5, 800ms sine) matching Bench prompt pattern
- Hidden when player walks away

### Dialogue UI
- Dark semi-transparent box (#0A0A1A at 85% alpha) at bottom of screen, 500×100
- Border in teal (#2EC4B6) at 50% alpha
- Name in cyan (#7FE0DE) at top of box
- Dialogue text in white (#c8d8ff) below, word-wrapped at 470px
- ▼ indicator at bottom-right, changes to ◆ CLOSE (J) on last line
- Typewriter effect: one character every 30ms
- J during typing → completes line immediately

### Dialogue State
- `isTalking` / `isTyping` flags managed per NPC
- `advanceDialogue()` returns `true` when dialogue reaches end
- `reset()` resets index to 0 when player walks away (only if not mid-conversation)

### GameScene Integration
- `_createNPCs()` spawns two NPCs:
  - Wanderer (???): x=800, y=530 — 3 melancholic lines about "her"
  - K: x=2500, y=530 — 3 poetic lines foreshadowing boss fight
- `_getNearbyNPC()` — circular proximity check, returns first matching NPC or null
- Dialogue freezes gameplay (early return in update) — player, enemies, items paused
- `_attackHandlerJ` / `_attackHandlerZ` both check `isTalking` and `_getNearbyNPC()` to prevent attacking while near NPCs
- NPC prompt takes priority over bench prompt (bench hidden when NPC nearby)
- NPC cleanup in shutdown handler

### Design Patterns Followed
- Proximity + prompt pulsing: Same as `Bench.js`
- Input suppression: Same `isTalking` flag pattern as `isResting`
- Dialogue advancement via `JustDown(this.keys.attack)` in update loop
- All UI uses `setScrollFactor(0)` and depth 200+ for overlay appearance

## Next Steps (Future Polish)
- Add sound effects for NPC interaction (talk open, advance, close)
- Add floating dialogue indicator above NPC head
- Add NPC sprite animation (idle bob)
- Add branching dialogue support (conditional responses based on player state)
- Integrate with save system (NPCs already available to talk, no save needed)

## Dependencies
- Upstream: `Bench.js` pattern (proximity + prompt), `Player.js` state management
- Downstream: None (self-contained system)
