# QA Report — Phase 1: Dash, Double Jump, Bench/Save, Map

**Date**: 2026-06-25
**Tester**: qa-tester (automated code review)
**Files Reviewed**: Player.js, GameScene.js, BossScene.js, MenuScene.js, Bench.js (new), MapView.js (new), BootScene.js, SceneManager.js, index.html

---

## Per-Feature Verdict

| Feature | Verdict | Critical Bugs | Major Bugs | Minor Bugs |
|---------|---------|:---:|:---:|:---:|
| Dash Ability | **BUGS FOUND** | 1 | 3 | 2 |
| Double Jump | **BUGS FOUND** | 0 | 1 | 0 |
| Bench/Save System | **BUGS FOUND** | 0 | 2 | 1 |
| Map System | **BUGS FOUND** | 0 | 0 | 1 |

**Overall**: Feature implementations are structurally sound but contain several functional defects that prevent correct behaviour in normal gameplay. **Not release-ready.**

---

## Bug Reports

---

### BUG-001: Dash ability is never obtainable (CRITICAL)

| Field | Value |
|-------|-------|
| **Severity** | S1 (Critical) |
| **Frequency** | Always |
| **File** | `src/entities/Player.js:37` |
| **Feature** | Dash |

**Description**: `Player.abilities.dash` defaults to `false` at construction, and there is no code anywhere in the codebase that sets it to `true`. The dash keybind checks `this.canDash` which requires `this.abilities.dash` to be truthy. Result: the entire dash feature—which represents a major implementation effort—is completely non-functional in normal gameplay.

**Reproduction**:
1. Start new game or continue from save
2. Press K or Shift (dash keys)
3. Observe: nothing happens

**Expected**: Player dashes horizontally.

**Actual**: Dash never activates because `abilities.dash` is `false`.

**Suggested Fix**: Either:
- Set `abilities.dash` to `true` by default in the constructor (line 37) if dash is meant to be available from the start
- OR implement the pickup/ability-grant system (TODO at GameScene.js:121) and ensure `abilities.dash` is set to `true` when collected

**Related**: BUG-005 (abilities lost on boss death), BUG-006 (abilities not transferred to BossScene)

---

### BUG-002: Ground dash cooldown is bypassed every frame (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/entities/Player.js:171-174` |
| **Feature** | Dash |

**Description**: The `_endDash()` method (line 479) sets `dashCooldownTimer = 0.3` to enforce a 0.3s cooldown. However, the grounded check in `update()` (lines 171–174) unconditionally resets `dashCooldownTimer` to 0 on every frame the player is in contact with the ground. This means the cooldown is immediately nullified after any ground dash, allowing the player to dash repeatedly with no delay.

**Reproduction**:
1. Ensure `abilities.dash` is `true` (e.g. after applying BUG-001 fix)
2. Stand on ground and dash
3. As soon as dash ends, press dash again
4. Observe: dash activates immediately despite the 0.3s cooldown

**Root Cause**: Lines 171–174 reset `dashCooldownTimer = 0` every frame while grounded:
```javascript
if (contact.rawGrounded) {
    this.dashUsedThisJump = false;
    this.dashCooldownTimer = 0;  // ← BUG: clears cooldown every frame
}
```

**Expected**: Dash should respect the 0.3s cooldown even when standing on the ground.

**Suggested Fix**: Only reset the cooldown if the player was NOT already grounded. Add a "previouslyGrounded" tracking variable, or separate the landing logic:

```javascript
if (contact.rawGrounded) {
    this.dashUsedThisJump = false;
    // Only reset cooldown on actual landing, not every grounded frame
}
```

---

### BUG-003: Dash sound key `sfx_player_dash` not loaded in BootScene (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always (when dash is used) |
| **File** | `src/scenes/BootScene.js:37-61`, `src/entities/Player.js:599` |
| **Feature** | Dash |

**Description**: The sound `sfx_player_dash` is played when entering the dash state (Player.js:599), but the audio key is never loaded in BootScene's `preload()`. No audio asset is defined for this key.

**Reproduction**:
1. Apply BUG-001 fix to enable dash
2. Press K or Shift to dash
3. Observe console: `"Audio key not found: sfx_player_dash"` (warning)

**Expected**: Dash sound plays on activation (or graceful no-op if sound is missing).

**Actual**: Phaser emits a console warning and no sound plays.

**Suggested Fix**: Add the missing audio load to BootScene, or if no dash sound asset exists yet, guard the play call:
```javascript
// Option A: Add audio asset
this.load.audio('sfx_player_dash', 'assets/audio/sfx/player/sfx_player_dash.wav');

// Option B: Guard the play call (if asset doesn't exist yet)
if (this.scene.cache.audio.exists('sfx_player_dash')) {
    this.scene.sound.play('sfx_player_dash', { volume: 0.5 });
}
```

---

### BUG-004: Dash ability state not transferred from GameScene to BossScene (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/scenes/GameScene.js:333-338` |
| **Feature** | Dash |

**Description**: When entering the boss fight, GameScene passes `playerData` to BossScene containing only `hp` and `feelings`. The `abilities` object (including `dash`, `doubleJump`, `shadowCloak`) is not transferred. BossScene creates a fresh Player instance with default abilities (`dash: false`).

**Reproduction**:
1. Apply BUG-001 fix to enable dash
2. Save game (bench)
3. Enter boss trigger area
4. Observe: dash does not work in BossScene

**Expected**: The player's ability state is preserved across scene transitions.

**Suggested Fix**: Include `abilities` in the `playerData` passed to BossScene:
```javascript
SceneManager.launchOverlay(this, 'BossScene', {
    playerData: {
        hp: this.player.hp,
        feelings: this.player.feelings,
        abilities: { ...this.player.abilities },  // ← ADD
    },
});
```
And in BossScene's `_createPlayer()`, apply them:
```javascript
_createPlayer() {
    this.player = new Player(this, 200, 530.8);
    this.player.hp = this.playerData.hp || 100;
    this.player.feelings = this.playerData.feelings || 0;
    if (this.playerData.abilities) {
        this.player.abilities.dash = !!this.playerData.abilities.dash;
        this.player.abilities.doubleJump = !!this.playerData.abilities.doubleJump;
        this.player.abilities.shadowCloak = !!this.playerData.abilities.shadowCloak;
    }
}
```

---

### BUG-005: `player.reset()` destroys ability state on boss death (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/entities/Player.js:706-714`, `src/scenes/GameScene.js:87-90` |
| **Feature** | Dash / Double Jump |

**Description**: When the player dies in the BossScene and returns to GameScene, `player.reset()` is called (GameScene.js:89). The `reset()` method (Player.js:706) overwrites the entire `abilities` object with hardcoded defaults:
```javascript
this.abilities = { dash: false, doubleJump: true, shadowCloak: false };
```
This means any ability progression the player had is permanently lost upon death in the boss room. Currently this is moot because `dash` is never set to `true` (BUG-001), but it becomes critical as soon as ability progression is implemented.

**Reproduction**:
1. (Requires ability-grant system or manual edit to set `abilities.dash = true`)
2. Enter boss fight
3. Die in boss fight
4. Return to GameScene
5. Check `player.abilities.dash` → `false`

**Expected**: Player abilities should persist through death (or at least be restorable from save data).

**Suggested Fix**: Either:
- Remove the `abilities` reset from `reset()` and preserve existing ability state, or
- Restore abilities from save data after `reset()`, or
- Save ability state before boss battle and restore it on death

---

### BUG-006: Double jump sound plays twice (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **File** | `src/entities/Player.js:327` and `src/entities/Player.js:549` |
| **Feature** | Double Jump |

**Description**: When performing a double jump in the air, `sfx_player_jump` plays twice: once explicitly at line 327 in `_handleAirState()`, and once via `_onStateEnter('jump')` at line 549.

**Reproduction**:
1. Jump from ground (one play — correct)
2. Press jump again in the air (double jump)
3. Observe: jump sound plays twice overlapping

**Root Cause**: Line 327 has an explicit `sound.play()` call, but the subsequent `this._enterState('jump')` at line 326 triggers `_onStateEnter` which ALSO plays the same sound at line 549.

**Expected**: Jump sound should play exactly once per jump action.

**Suggested Fix**: Remove the explicit sound play at line 327. The `_onStateEnter('jump')` handler at line 549 already plays it:
```javascript
// In _handleAirState (line 326-330):
this._enterState('jump');
this.scene.sound.play('sfx_player_jump', { volume: 0.5 }); // ← DELETE
if (this.jumpCount === 2) {
    this._spawnDoubleJumpVFX();
}
```

---

### BUG-007: Bench `usedCount` never initialized or incremented (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/systems/Bench.js:21-31`, `src/scenes/GameScene.js:546` |
| **Feature** | Bench/Save |

**Description**: The `Bench` class never defines a `usedCount` property. The `_saveGame()` method uses `b.usedCount > 0` as a filter predicate, which always evaluates to `false` (`undefined > 0` is `false`). Consequently, `benchesUsed` in save data is always an empty array. Upon load, `_applySaveData` tests bench x-coordinates against this empty array, so bench usage history is never restored.

Additionally, there is no code that increments `usedCount` when the player rests at a bench.

**Reproduction**:
1. Rest at bench at x=600
2. Save game (part of rest)
3. Inspect `localStorage.getItem('sekai_save')` → `benchesUsed: []`
4. Load from save → bench at x=600 appears unused

**Expected**: `benchesUsed` should contain the coordinates of benches where the player has rested.

**Suggested Fix**:
1. Add `this.usedCount = 0;` in the `Bench` constructor
2. Add `bench.usedCount++;` in `GameScene._restAtBench()`

---

### BUG-008: Bench prompts stack when moving between benches (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Sometimes |
| **File** | `src/scenes/GameScene.js:398-410` |
| **Feature** | Bench/Save |

**Description**: When the player moves from one bench's proximity zone directly into another's, the first bench's prompt is never hidden. The code only hides all prompts when `_getNearbyBench()` returns null (the `else` branch). It never hides the previous prompt when a different bench becomes the "nearby" one.

**Reproduction**:
1. Stand near bench at x=600 → prompt "◆ REST (J)" appears (correct)
2. Move directly toward bench at x=1800 without passing through a gap with no benches
3. Observe: prompt for bench at x=600 remains visible while prompt for x=1800 also appears
4. Two "◆ REST (J)" prompts overlap on screen

**Expected**: Only the nearest bench's prompt should be visible.

**Suggested Fix**: Before showing the new prompt, hide ALL bench prompts, then show only the nearby one:

```javascript
const nearbyBench = this._getNearbyBench();
this.benches.forEach(b => b.showPrompt(b === nearbyBench));
if (nearbyBench && Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
    this._restAtBench(nearbyBench);
}
```

---

### BUG-009: Map explored tracking only updates when map is open (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **File** | `src/ui/MapView.js:229` |
| **Feature** | Map |

**Description**: `MapView.update()` returns early at line 229 if `this.isOpen` is `false`:
```javascript
update(playerX, playerY) {
    if (!this.isOpen || this.destroyed) return;
    this._markExplored(playerX);
    ...
}
```
Since `_markExplored()` is only called when the map is open, sections are never marked as explored during normal gameplay. Players who never open the map will see every section as unexplored, and even players who open the map will only have the section they are currently standing in marked as explored — not sections they've already passed through.

**Reproduction**:
1. Start game, run from x=0 to x=2500 (passing through INTRO, ASCENT, LOWER PATH, MID CORRIDOR sections)
2. Press M to open map
3. Observe: only the current section (MID CORRIDOR) is marked explored. All previous sections show as unexplored.

**Expected**: All sections the player has visited should be marked as explored.

**Suggested Fix**: Move the `_markExplored()` call outside the `if (!this.isOpen)` guard so it runs every frame, even when the map is closed:

```javascript
update(playerX, playerY) {
    if (this.destroyed) return;
    
    // Always track exploration
    this._markExplored(playerX);
    
    // Only draw when open
    if (!this.isOpen) return;
    this._drawPlayer(playerX, playerY);
}
```

> **Note**: This may have a trivial performance cost (one loop over 7 sections per frame), but it is negligible.

---

### BUG-010: Dash wall collision bypasses platform side collisions (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Sometimes |
| **File** | `src/scenes/GameScene.js:177-181`, `src/entities/Player.js:458` |
| **Feature** | Dash |

**Description**: The `_shouldPlayerCollideWithPlatform` callback (GameScene.js:177) only allows collisions when the player is falling onto a platform from above:
```javascript
return body.velocity.y >= 0 && previousBottom <= platformBody.top + 8;
```
This means horizontal collisions with platform sides are completely ignored. If the player dashes into a raised platform (e.g., the staircase at x=576–832), the `body.blocked.left/right` check in `_handleDashState` (line 458) will NOT trigger, and the dash will not end early. The player will phase through the side of the platform.

**Reproduction**:
1. Apply BUG-001 fix to enable dash
2. Stand on ground near the staircase platforms (x=500–600)
3. Dash horizontally toward the platform side at x=576
4. Observe: player phases through the platform side, dash does not end

**Expected**: Dashing into a solid platform wall should end the dash (similar to hitting world bounds).

**Suggested Fix**: This is a design trade-off. Options:
- Modify `_shouldPlayerCollideWithPlatform` to also allow side collisions (but this affects normal gameplay movement)
- Add a separate wall-check in `_handleDashState` using overlap queries with the platform group
- Accept as intended (dash can phase through platform edges but not world bounds)

---

## Regression Checklist Items

### Dash
- [ ] Dash activates on K and Shift (both keys)
- [ ] Dash is blocked during attack states
- [ ] Dash is blocked during hurt state
- [ ] Dash is blocked during death
- [ ] Air dash: dash only usable once per jump (resets on landing)
- [ ] Air dash: jumping resets dash usage (jump used, dash available)
- [ ] Dash cooldown: 0.3s enforced on ground (currently BROKEN - BUG-002)
- [ ] Dash invulnerability: player takes no damage during dash
- [ ] Dash wall collision: stops dash early on world bounds
- [ ] Dash trail: cyan particles appear and are cleaned up after 250ms
- [ ] Dash tint: player sprite gets cyan tint during dash, cleared on end
- [ ] Dash sound plays (currently BROKEN - BUG-003)
- [ ] Dash works in BossScene (currently BROKEN - BUG-004)
- [ ] Dash persists through death (currently BROKEN - BUG-005)

### Double Jump
- [ ] Double jump activates with a single press in air
- [ ] Double jump velocity is -350 (weaker than ground jump -400)
- [ ] Double jump VFX (white circles) spawn and clean up
- [ ] Jump sound plays once per jump (currently BROKEN - BUG-006)
- [ ] Jump count (jumpCount) resets on landing
- [ ] Jump count does NOT reset when walking off a ledge
- [ ] Air attack takes priority over double jump when both pressed simultaneously
- [ ] Double jump works after air dash
- [ ] Double jump works in BossScene

### Bench/Save
- [ ] Rest prompt appears when player is within 80px of bench
- [ ] Rest prompt hides when player moves away
- [ ] Only one bench prompt visible at a time (currently BROKEN - BUG-008)
- [ ] J key rests at bench instead of attacking when near bench
- [ ] Rest fully restores HP and Feelings
- [ ] Rest resets all enemies
- [ ] Rest saves to localStorage
- [ ] Save data includes: hp, maxHp, feelings, position, abilities, enemiesKilled
- [ ] "◆ RESTORED ◆" text appears after rest
- [ ] Bench usedCount tracked (currently BROKEN - BUG-007)
- [ ] CONTINUE loads save: correct position, HP, abilities, enemies
- [ ] CONTINUE loads save: bench used state restored
- [ ] Multiple rests at same bench work correctly

### Map
- [ ] M key toggles map open/close
- [ ] Map pauses physics while open
- [ ] Map cannot open while pause menu is active
- [ ] Map cannot open during boss fight (BossScene has no MapView)
- [ ] Player marker updates in real time
- [ ] Player marker is clamped to map bounds
- [ ] POIs (benches, boss, secret) displayed correctly
- [ ] Section names displayed above sections
- [ ] Section exploration updates as player moves (currently BROKEN - BUG-009)
- [ ] Map cleanup: keyboard listener removed on scene shutdown

### General
- [ ] All new keys (K, Shift) don't conflict with existing keys
- [ ] CONTINUE menu item enables/disables based on save existence
- [ ] NEW GAME starts fresh (no save data)
- [ ] Menu → Game → Boss → Game transitions work end-to-end
- [ ] Pause menu works alongside map (map closes, pause opens)
- [ ] No double-fires or stuck states on scene transitions

---

## Overall Assessment

The four features are structurally well-integrated into the existing codebase and follow the established patterns (ES6 classes, Phaser 3 APIs, proper depth management, tween-based cleanup). However, **four critical defects prevent the Dash from being functional at all in normal gameplay**, and several major defects compromise the Bench/Save system.

### Top 3 Risks (Priority Order)

1. **BUG-001** (CRITICAL): Dash is dead code. The entire implementation effort is wasted unless `abilities.dash` is wired to a trigger or set to `true` by default. **Highest priority.**

2. **BUG-002** (MAJOR): Cooldown bypass ruins dash balance if/when BUG-001 is fixed. The 0.3s cooldown is completely ineffective on ground.

3. **BUG-007** (MAJOR) + **BUG-008** (MINOR): The Bench system's save/load cycle is partially broken (benchesUsed never saves), and prompt UX is glitchy when moving between benches.

### Recommendations

| Order | Action | Effort | Impact |
|-------|--------|--------|--------|
| 1 | Fix BUG-001: default `abilities.dash` to `true` or wire unlock | 1 line | Restores entire dash feature |
| 2 | Fix BUG-002: separate landing logic from frame-by-frame cooldown reset | 5 lines | Fixes dash balance |
| 3 | Fix BUG-007: add `usedCount` to Bench, increment on rest | 2 lines | Fixes bench save/load |
| 4 | Fix BUG-006: remove duplicate sound call | 1 line | Fixes double jump audio |
| 5 | Fix BUG-009: move exploration tracking outside `isOpen` guard | 2 lines | Fixes map functionality |
| 6 | Fix BUG-003: add or guard dash sound | 1 line | Fixes dash audio |
| 7 | Fix BUG-004: pass abilities to BossScene | 8 lines | Fixes dash in boss |
| 8 | Fix BUG-005: preserve abilities on player reset | 2 lines | Prevents future progression loss |
| 9 | Fix BUG-008: hide all prompts before showing nearby | 1 line | Fixes bench UX |

**Estimated total fix effort**: ~25 lines of code across 4 files.

**Recommendation**: Fix BUG-001 through BUG-003 and BUG-007 before next build. The remaining bugs can be fixed in a follow-up pass.
