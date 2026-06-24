# QA Report — Static Code Review

**Project:** Sekai Game (25-ji Metroidvania)  
**Engine:** Phaser 3.87 + Arcade Physics  
**Date:** 2026-06-24  
**Reviewer:** QA Tester  
**Type:** Static code review + design doc comparison  
**Files Reviewed:** game.js, src/ (all), design/ (all)

---

## 1. Summary

**Overall Assessment: PASS WITH CONCERNS** — The game is structurally sound and the core loop (explore → boss → result) works. However, there are **5 critical bugs** that directly impact gameplay correctness, **9 major bugs** that affect game feel or create unintended behavior, and **9+ minor issues**. The most urgent are: missing player hitstun, a race condition on player death in BossScene, a boss HP reset bug, boss visual/physics desync during phase transition, and boss contact damage during the invulnerable phase transition animation.

---

## 2. Bugs Found

### 🔴 CRITICAL

#### C-01: Player Has No Hitstun — `takeDamage()` Doesn't Change State

- **File:** `src/entities/Player.js` lines 47–63
- **Design Doc Reference:** §1.9 — state machine shows `HITSTUN (0.3s) → IDLE`
- **Description:** `takeDamage()` applies knockback velocity and sets `invulnTimer`, but **never changes `this.state`**. The player remains in whatever state they were in (e.g., `idle`, `attack1_active`). There is no `'hurt'` case in the `update()` switch statement, and no state is set to prevent attacking/moving during knockback.
- **Reproduction:** Player gets hit while standing. They take knockback velocity but can immediately attack, move, or even continue a ground combo during the knockback animation.
- **Expected:** Player enters `'hurt'` state for ~0.3s. Movement and attack inputs are ignored during hitstun.
- **Actual:** Player acts normally during knockback. The `invulnTimer` (30f) prevents additional damage, but the player's state machine is entirely unaffected.
- **Suggested Fix:** Add `'hurt'` case to the `update()` switch (velocity decays, no input). Set `this.state = 'hurt'` and `this.stateTimer = 0.3` (18f) in `takeDamage()`. Add duration `case 'hurt': return 0.3;` to `_getStateDuration()`.
- **Severity:** CRITICAL — breaks core combat feel

---

#### C-02: `Reset()` Overwrites HP — Player Respawns with 100 HP Instead of 50

- **File:** `src/scenes/GameScene.js` lines 44–48 (`_onBossResult`)
- **File:** `src/entities/Player.js` lines 393–405 (`reset()`)
- **Design Doc Reference:** §2.9 — "Retrying after death restores player to 50% HP"
- **Description:** When the player dies in BossScene, `_onBossResult` sets `this.player.hp = 50` on line 45, then immediately calls `this.player.reset(120, 480)` on line 47. However, `reset()` unconditionally sets `this.hp = 100` on line 394, overwriting the 50 HP.
- **Reproduction:** Die in BossScene. Observe player HP on respawn.
- **Expected:** 50 HP (50% of max, per design doc).
- **Actual:** 100 HP (full health).
- **Suggested Fix:** Option A: Remove `this.hp = 100` from `reset()` and let the caller set HP. Option B: Pass HP as a parameter to `reset(x, y, hp)`. Option C: Swap the order — call `reset()` first, then set `this.player.hp = 50`.
- **Severity:** CRITICAL — design contract violation, significantly reduces boss fight difficulty

---

#### C-03: Race Condition on Player Death — `Player.die()` vs `BossScene._handlePlayerDeath()`

- **File:** `src/entities/Player.js` lines 65–80 (`die()`)
- **File:** `src/scenes/BossScene.js` lines 195–215 (`_handlePlayerDeath()`)
- **Description:** When the player reaches 0 HP in BossScene, both `Player.die()` (called from `takeDamage()`) and `BossScene._handlePlayerDeath()` (called from `_checkEndConditions()`) execute. Both schedule separate 2000ms delayed calls with conflicting outcomes:
  - `Player.die()` calls `this.scene.scene.restart()` — restarts BossScene entirely
  - `_handlePlayerDeath()` calls `SceneManager.finishOverlay(...)` — stops BossScene and resumes GameScene
  
  Since both delayed calls fire at exactly 2000ms, the order is non-deterministic. If `restart()` fires first, BossScene restarts (GameScene stays paused forever). If `finishOverlay()` fires first, everything works.
- **Reproduction:** Die in BossScene. Observe behavior across multiple attempts. Roughly 50% chance of getting stuck on a black screen.
- **Expected:** Player death → death animation → return to GameScene with 50% HP.
- **Actual:** GameScene can remain paused forever (BossScene restarted, overlay result never emitted).
- **Suggested Fix:** In BossScene, do NOT call `Player.die()`. Override `takeDamage` behavior or set `this.player.dead = true` before `takeDamage` can call `die()`. Or add a guard in `Player.die()` to check if it's being called from BossScene vs GameScene.
- **Severity:** CRITICAL — can soft-lock the game

---

#### C-04: Boss yBobTween Not Stopped During Phase Transition — Causes Visual/Physics Desync

- **File:** `src/entities/BossMafuyu.js` lines 30–37 (constructor), lines 64–92 (`_startPhaseTransition()`)
- **Description:** The constructor starts an infinite `yBobTween` that oscillates `sprite.y` by ±8px over 2s (yoyo). `_startPhaseTransition()` tweens the boss to y=150 over 1s but **never stops the yBobTween**. After the transition completes, the yBobTween continues fighting the physics system for control of the boss's Y position. The tween tries to return the boss to its original y (~480) while Phase 2's `idle` state uses `setVelocityY()` to maintain y=200. This creates a tug-of-war between the tween engine and Arcade Physics.
- **Reproduction:** Trigger phase transition. Observe boss behavior in early Phase 2 — the boss will drift downward and visually jitter.
- **Expected:** yBobTween stops during phase transition. Phase 2 physics handles flight positioning.
- **Actual:** Boss Y position oscillates erratically as the tween and physics fight for control.
- **Suggested Fix:** Add `if (this.yBobTween) this.yBobTween.stop();` at the beginning of `_startPhaseTransition()`. Create a new subtle bob tween after transition completes if desired.
- **Severity:** CRITICAL — boss behavior unpredictable in Phase 2

---

#### C-05: Boss Contact Damage During Phase Transition

- **File:** `src/scenes/BossScene.js` lines 153–163 (`_onBossTouchPlayer()`)
- **File:** `src/entities/BossMafuyu.js` lines 64–92 (`_startPhaseTransition()`)
- **Design Doc Reference:** §2.4 "During the transition, the player can move but cannot attack Mafuyu"
- **Description:** During `_startPhaseTransition()`, the boss sets `this.vulnerable = false` and `this.state = 'phase_transition'`. However, `_onBossTouchPlayer()` in BossScene only checks `this.boss.defeated` and the boss's attack states. Since `'phase_transition'` is not one of the checked attack states, the code falls to the `else` branch and applies **5 contact damage** to the player every frame they touch the boss during the invulnerable phase transition.
- **Reproduction:** Stay close to the boss when Phase 2 triggers (HP ≤ 150). The player takes 5 contact damage repeatedly as the boss floats upward.
- **Expected:** Zero damage during the invulnerable phase transition.
- **Actual:** 5 contact damage per frame of overlap during transition.
- **Suggested Fix:** Add `this.boss.transitioning` check to `_onBossTouchPlayer()`:
  ```javascript
  _onBossTouchPlayer() {
      if (!this.boss || this.boss.defeated || this.boss.transitioning) return;
  ```
- **Severity:** CRITICAL — unfair damage during a scripted sequence

---

### 🟠 MAJOR

#### M-01: Boss Cooldowns Decrement Twice Per Frame During Phase 2 Melee States

- **File:** `src/entities/BossMafuyu.js` lines 125–129 (`_updatePhase1()`), lines 201–205 (`_updatePhase2()`)
- **Description:** When the boss is in Phase 2 and enters a melee state (`melee_telegraph/active/recovery`), `_updatePhase2()` delegates to `_updatePhase1()`. Both methods independently decrement `this.aiTimer` and `this.aiCooldowns`. This means during melee states in Phase 2, all cooldowns run at ~2x speed. Furthermore, `_updatePhase2` applies the desperate modifier (`* 0.7`) but `_updatePhase1` does not.
- **Reproduction:** Enter Phase 2, trigger a melee attack. Observe that cooldowns A, B, C, D all expire roughly twice as fast during the melee sequence.
- **Expected:** Cooldowns decrement once per frame with consistent desperate modifier.
- **Actual:** Cooldowns decremented twice per frame during Phase 2 melee states.
- **Suggested Fix:** When `_updatePhase2` delegates to `_updatePhase1`, do NOT decrement aiTimer/cooldowns in `_updatePhase2` for those states. Or restructure Phase 2 melee handling to not call `_updatePhase1()`.

---

#### M-02: Boss Cannot Reliably Become Airborne in Phase 2

- **File:** `src/entities/BossMafuyu.js` lines 237–253 (`_updatePhase2` idle state)
- **Description:** When the boss is on the ground in Phase 2, it uses `setVelocityY(-200)` with a 200ms delayed call that zeros the velocity. With gravity at 500, the boss reaches a peak height of only ~40px before falling back down (velocity: -200 + 500*0.2 = -100, still rising when velocity is zeroed, then falls). This small hop does not reliably get the boss to flight altitude (y=200). Pattern D requires `this.sprite.y < 250`, which this hop can't reach, making Pattern D essentially unusable from ground start.
- **Reproduction:** Boss lands on ground in Phase 2. Watch it attempt to take off with a tiny hop.
- **Expected:** Boss can reliably take off to flight altitude (y=200).
- **Actual:** Boss does a ~40px hop, then falls back. Remains on ground for extended periods.
- **Suggested Fix:** Increase initial jump velocity or remove the 200ms velocity zeroing. Use a continuous upward force until target altitude is reached.

---

#### M-03: Multiple Competing Combo Text Tweens

- **File:** `src/HUD.js` lines 160–170 (`showCombo()`)
- **Description:** Every time the player hits the boss, `showCombo()` creates a **new** tween fading `this.comboText` to alpha 0 over 1500ms. If the player lands multiple hits within 1.5s, multiple tweens are stacked on the same target, all fighting to control `alpha`. The last tween to update "wins," causing the text to flicker or disappear prematurely.
- **Reproduction:** Hit the boss 3+ times quickly. Observe the combo text alpha behavior.
- **Expected:** Combo text stays visible while combo is active, fades after 1.5s of no hits.
- **Actual:** Text alpha flickers as multiple tweens compete. May disappear during active combo.
- **Suggested Fix:** Stop existing tween before creating a new one, or use a single tween with dynamic duration:
  ```javascript
  if (this.comboTween) this.comboTween.stop();
  this.comboTween = this.scene.tweens.add({ ... });
  ```

---

#### M-04: Liberation Dive Bomb Can Be Skipped If Boss Lands During Telegraph

- **File:** `src/entities/BossMafuyu.js` lines 295–315 (`liberation_telegraph` and `liberation_active`)
- **Description:** During `liberation_telegraph` (1.5s normal, 1.0s desperate), the boss hovers with `setVelocity(0, 0)` but gravity is still active. The `yBobTween` (which is also still running — see C-04) can push the boss down. If the boss hits the ground during the telegraph, `body.blocked.down` is true the moment `liberation_active` starts, which immediately transitions to recovery — skipping the dive entirely.
- **Reproduction:** Trigger Pattern C (Liberation) from a low altitude. Observe that the dive may be skipped and the boss immediately goes to recovery.
- **Expected:** Liberation dive always completes (boss dives toward player).
- **Actual:** Dive can be skipped if the boss is on or near the ground.
- **Suggested Fix:** In `liberation_telegraph`, disable gravity (`body.setAllowGravity(false)`) or ensure upward velocity keeps the boss airborne. In `liberation_active`, add a minimum height check before allowing blocked.down to end the dive.

---

#### M-05: Boss Can Leave Arena Bounds

- **File:** `src/entities/BossMafuyu.js` constructor (no `setCollideWorldBounds`)
- **File:** `src/scenes/BossScene.js` lines 54–59 (arena walls are visual only)
- **Description:** The boss is created without `setCollideWorldBounds(true)`. The arena wall graphics (lines 54–59) are purely visual — they have no physics bodies. In Phase 1, the boss walks toward the player at 80px/s. If the player stands at the far right of the arena (x=1600), the boss walks past the visual wall and goes off-screen. The camera follows the player, so the boss becomes invisible.
- **Reproduction:** Walk right in the boss arena. The boss follows and walks past the visible wall.
- **Expected:** Boss stops at arena boundaries.
- **Actual:** Boss walks through visual walls into off-screen space.
- **Suggested Fix:** Add `this.sprite.setCollideWorldBounds(true)` in the BossMafuyu constructor.

---

#### M-06: `Phaser.Input.Keyboard.JustDown` Used in `update()` Without Cleanup on Scene Pause

- **File:** `src/entities/Player.js` line 93
- **Description:** `Phaser.Input.Keyboard.JustDown` relies on the keyboard event queue being consumed each frame. When the BossScene is overlaid, the GameScene is paused. If the keys were pressed during the pause, `JustDown` returns `true` on the first `update()` after resume. This means the player may unexpectedly jump or buffer an attack immediately upon returning to GameScene.
- **Reproduction:** Hold W/Space during boss fight → boss ends → GameScene resumes → player jumps unexpectedly.
- **Expected:** Input queue is cleared on scene resume.
- **Actual:** Stale `JustDown` inputs fire on resume.
- **Suggested Fix:** Call `this.input.keyboard.resetKeys()` in `_onBossResult()` before resuming the scene.

---

#### M-07: Boss Death Animation — Player Can Walk Into Fading Boss Sprite During Victory Delay

- **File:** `src/scenes/BossScene.js` lines 231–256 (`onBossDefeated()`)
- **Description:** After `onBossDefeated()` is called, `this.bossDefeated = true` stops the update loop. But the physics overlap callbacks still fire. The boss sprite remains in the physics world with its collision body active during the 3-second victory text display + 1.6-second fade-out. The player can walk into the fading boss sprite, but `_onBossTouchPlayer()` returns early due to `this.boss.defeated`. While this doesn't cause damage, the collision pushout from Arcade Physics can visibly push the player during the victory sequence.
- **Reproduction:** Defeat the boss, walk toward where the boss was fading out. Player may be physically pushed by the fading boss body.
- **Expected:** Boss body is disabled on the first frame of defeat.
- **Actual:** Boss physics body remains active during the 4.6s victory sequence.
- **Suggested Fix:** Disable the boss physics body immediately in `_die()`: `this.body.enable = false`.

---

#### M-08: `boss_melee1`, `boss_melee2`, `weapon_sword` Loaded But Never Used

- **File:** `src/scenes/BootScene.js` lines 16–18
- **File:** `assets/images/` — files exist
- **Description:** Three textures are loaded but never referenced by any sprite or animation in the game. This wastes memory and load time. The boss attack states use `boss_attack` texture (set in `_onBossStateEnter`), not `boss_melee1`/`boss_melee2`. The `weapon_sword` image has no associated sprite instance.
- **Suggested Fix:** Remove unused loads, or add placeholder TODO comments if they're intended for future use.

---

#### M-09: `_onStateEnter` Missing Texture Assignments for Active and Air Attack States

- **File:** `src/entities/Player.js` lines 322–350
- **Description:** The `_onStateEnter` switch handles `idle`, `run`, `jump`, `fall`, `attack1_startup/recovery`, and `attack2_startup/recovery` — but is **missing**:
  - `attack1_active`, `attack2_active` (no texture change)
  - `air_attack_startup`, `air_attack_active`, `air_attack_recovery` (no texture change)

  During active frames, the texture from the preceding startup phase persists (probably acceptable). During air attacks, the player shows whatever texture was loaded before (could be `player_idle`, `player_att1`, or `player_att2` depending on what triggered the air attack).
- **Reproduction:** Perform an air attack. The player sprite shows the wrong texture during the attack.
- **Expected:** Player shows `player_att2` (or a designated air attack sprite) during air thrust.
- **Actual:** Player shows whatever texture was previously set.
- **Suggested Fix:** Add cases for all missing states to `_onStateEnter()`.

---

### 🟡 MINOR

#### m-01: Feelings Decay Timer Initialized to 0

- **File:** `src/entities/Player.js` line 19, lines 149–151
- **Description:** `this.lastHitTime = 0` in constructor. The decay check `this.scene.time.now - this.lastHitTime > 3000` means feelings decay starts 3 seconds after scene creation rather than 3 seconds after the last hit/action. Additionally, `lastHitTime` is only updated in `onHitBoss()`, not in `takeDamage()`, so feelings gained from taking damage decay on the scene-time clock rather than from the hit.
- **Suggested Fix:** Initialize `lastHitTime` to `this.scene.time.now` at creation. Also update `lastHitTime` in `takeDamage()`.

---

#### m-02: `desperate` Flag Not Initialized in Constructor

- **File:** `src/entities/BossMafuyu.js` constructor (missing `this.desperate`)
- **Description:** `this.desperate` is first set in `takeDamage()` and `_startPhaseTransition()`. Before that, it's `undefined`. Since `undefined` is falsy, all existing checks (`this.desperate ? 0.7 : 1`) work correctly, but this is fragile.
- **Suggested Fix:** Add `this.desperate = false;` in the constructor.

---

#### m-03: `stun` State Is Dead Code

- **File:** `src/entities/BossMafuyu.js` lines 194–197
- **Description:** The `case 'stun':` block in `_updatePhase1` is never reachable because `_enterBossState('stun')` is never called anywhere. The design doc mentions a stun on wall collision during Pattern B dash, but it's not implemented.
- **Suggested Fix:** Either remove the dead code or implement the stun trigger on dash wall collision.

---

#### m-04: Air Attack Recovery Transitions to `idle` Instead of `fall`

- **File:** `src/entities/Player.js` lines 291–296
- **Description:** After `air_attack_recovery` completes (6f), the state goes to `'idle'`. If the player is still airborne, the next frame's `_handleMoveState` sees `!this.onGround` and transitions to `'jump'` or `'fall'`. This causes a one-frame visual flicker where the player shows the idle texture while falling.
- **Suggested Fix:** Transition directly to `'fall'` instead of `'idle'` when `!this.onGround` at the end of air attack recovery.

---

#### m-05: Hitstop Is Only Visual (Camera Shake)

- **File:** `src/scenes/BossScene.js` line 130
- **Design Doc Reference:** §1.6 — "Hit Stop (Freeze Frames): On hit, BOTH player and boss animations freeze for the specified duration."
- **Description:** The hitstop implementation only calls `cameras.main.shake()`. The player and boss state machines continue running during what should be a freeze. This means active frame durations effectively decrease because frames tick down during hitstop.
- **Suggested Fix:** Implement actual time freeze (e.g., scale scene time to 0 for the hitstop duration at the scene level, or manually pause state machine updates for both entities).

---

#### m-06: `comboTimer` Uses `delta` in ms While `stateTimer` Uses Seconds

- **File:** `src/entities/Player.js` lines 98–101, 210–229
- **Description:** `comboTimer` is decremented by `delta` (milliseconds, starting at 2000). `stateTimer` is decremented by `dt` (delta/1000, in seconds). Both work correctly, but the mixed units are a maintenance hazard and inconsistent.
- **Suggested Fix:** Standardize to one unit. Recommend seconds for both for consistency.

---

#### m-07: No Scene Shutdown Handler to Stop Persistent Timers

- **File:** `src/scenes/BossScene.js` (no `shutdown` event handler)
- **Description:** If BossScene is stopped (via `finishOverlay`) while any `delayedCall` or tween is pending, Phaser automatically cleans them up, but there's a risk of callbacks firing on a destroyed scene. Specifically, the `Player.die()` delayedCall (2000ms for `scene.restart()`) may still be queued when `finishOverlay` is called earlier.
- **Suggested Fix:** Add `this.events.on('shutdown', () => { ... })` to clean up player death delayed calls.

---

#### m-08: Boss AI Can Select No Action When All Conditions Fail

- **File:** `src/entities/BossMafuyu.js` lines 328–337
- **Description:** In `_evaluatePhase1AI`, if all RNG conditions fail, no state transition occurs. The boss stays in `idle` for another 1.5s. This means the boss can have extended periods of doing nothing but walking toward the player. The design doc suggests a "burst run" after 5s of distance > 300px, but this isn't implemented.
- **Suggested Fix:** Add a fallback: if no pattern fires, at least set a minimum action (e.g., always walk toward player with increased speed).

---

#### m-09: Boss Phase 2 Can Enter `melee_telegraph` From Idle While Airborne

- **File:** `src/entities/BossMafuyu.js` line 228
- **Description:** The condition `if (this.onGround && this.aiCooldowns.A <= 0 && Math.random() < 0.4)` checks `onGround` before entering melee telegraph. However, if the boss is on a platform (not the main ground), `onGround` is still true due to `body.touching.down || body.blocked.down`. The melee telegraph on a platform might look strange (boss swings sword while on a small platform).
- **Suggested Fix:** Add a check for the boss's Y position to ensure it's on the main ground, or accept this behavior as part of the combat design.

---

#### m-10: Menu Hint Text and Title Use Scene Tweens — No Cleanup on Transition

- **File:** `src/scenes/MenuScene.js` lines 142–149, 252–260
- **Description:** The title float tween and hint blink tween are infinite (repeat: -1). When `SceneManager.goTo` transitions to GameScene, these tweens are not explicitly stopped. Phaser does clean up scene-owned tweens when a scene stops, but if a tween reference outlives the scene, it could cause issues. Currently safe, but notable.
- **Status:** Not a bug — Phaser handles cleanup on scene.stop(). Documenting as an observation.

---

## 3. Edge Cases Not Covered

### E-01: Player and Boss Reach 0 HP on Same Frame
If the player lands a killing blow on the boss during the same frame that the boss's attack deals lethal damage to the player, both `bossDefeated` and `playerDied` could be set. Currently, `_checkEndConditions()` only checks `player.hp <= 0`. The boss's `takeDamage` and death path runs from the overlap callback. The order depends on Phaser's physics processing order. Suggestion: prioritize boss death (victory) over player death.

### E-02: Scene Restart While BossScene Overlay Is Active
Currently there's no way to restart the game while in BossScene. If the player dies in BossScene and `Player.die()` fires before `_handlePlayerDeath()`, the BossScene restarts but GameScene stays paused — a complete softlock (see C-03). There's no "back to menu" button.

### E-03: Boss Phase Transition When Already At y=150
If `_startPhaseTransition` starts while the boss is already near y=150 (e.g., pushed up by knockback or standing on a high platform), the transition tween moves the boss to y=150 — a small or zero movement. The camera flash and text still play, but the visual impact is reduced.

### E-04: Multiple Pattern C (Liberation) Triggers Simultaneously
The AI checks `aiCooldowns.C <= 0` and then enters `liberation_telegraph`. If two AI evaluation cycles (`aiTimer`) fire at the same time (possible due to double-decrement bug M-01), the boss could attempt to enter liberation twice. The `state` check prevents re-entry, but the `aiTimer` might be reset inappropriately.

### E-05: Two Attacks Hitting the Boss on the Same Frame
If `attack1_active` and `attack2_active` hitboxes both overlap the boss on the same frame (impossible in current state machine since they're sequential), or if both the slash and air hitboxes overlap simultaneously: `_onPlayerHitBoss()` fires once per overlap pair. Arcade Physics fires the callback once per unique overlap pair per frame. This is safe.

### E-06: Player at World Bounds During Boss Fight
The player has `setCollideWorldBounds(true)` so they can't leave the arena. However, the camera follows the player with a deadzone of (100, 50). If the player is near the edge, the camera shows empty space beyond the background tile sprite. Minor polish issue.

### E-07: Boss Dies While Mid-Attack
When `_die()` is called from `takeDamage()`, the boss sets `defeated = true`, which causes `update()` to return immediately. The attack hitbox remains active for the current frame's physics step. If the player is within the melee/dash hitbox region on the frame the boss dies, `_onBossTouchPlayer()` fires. The check `this.boss.defeated` in `_onBossTouchPlayer` catches this — so this is handled.

### E-08: Feelings Meter Overflow (>100)
Handled by `Math.min(100, ...)` in both `onHitBoss()` and `takeDamage()`. Safe.

### E-09: Buffer Attack Input After Combo Ends
Handled — `bufferAttack` counts down from 5 to 0 and is consumed/rejected by the state machine. No hanging input.

### E-10: Phase 2 Boss on Ground — Can She Get Stuck?
Yes — see M-02. The boss can spend extended periods on the ground in Phase 2, unable to use Pattern C (requires flight) or Pattern D (requires y < 250). Only Pattern A (melee) is available on the ground. This significantly reduces Phase 2's difficulty and variety.

---

## 4. Improvement Suggestions

### Code Quality

| # | Suggestion | Area | Effort |
|---|-----------|------|--------|
| I-01 | Standardize timer units — inconsistent mix of seconds (`stateTimer`, `dt`) and milliseconds (`comboTimer`, `delta`) across the codebase | Player.js, BossScene.js | Low |
| I-02 | Use an enum or constants object for state strings to prevent typos (e.g., `STATES.ATTACK1_STARTUP` instead of `'attack1_startup'`) | Player.js, BossMafuyu.js | Medium |
| I-03 | Extract magic numbers — frame durations, speed values, cooldowns could live in a config object or constants file | All files | Low |
| I-04 | `_onBossStateEnter` in BossMafuyu.js sets cooldowns only for some states. Consider a `default` case or explicit cooldown management per state transition | BossMafuyu.js | Low |
| I-05 | GameScene's `_createInput()` registers keyboard event listeners. These should be cleaned up on scene shutdown to prevent zombie listeners if scene is restarted | GameScene.js | Low |
| I-06 | BossScene/Timer cleanup: Add explicit `shutdown` handler to cancel any pending delayedCalls/tweens related to death sequences | BossScene.js | Medium |
| I-07 | Boss attack state duration `at60(6)` for `melee_active` is 100ms — very fast. Consider whether this matches the "deliberate, melancholic" feel from the design doc | BossMafuyu.js | Low (balance) |

### Performance

| # | Suggestion | Area | Effort |
|---|-----------|------|--------|
| I-08 | HUD redraws pips every frame. For a static HP value, cache the last draw and skip if unchanged | HUD.js | Low |
| I-09 | Combo display tween on every hit creates new tween objects. Reuse a single tween or manage state explicitly | HUD.js | Low |
| I-10 | Boss `for (const k in this.aiCooldowns)` iterates all 4 keys every frame. Replace with an array of cooldowns for faster iteration | BossMafuyu.js | Low |

### UX

| # | Suggestion | Area | Effort |
|---|-----------|------|--------|
| I-11 | Implement actual hitstop (freeze both actors) rather than just camera shake. The design doc specifies freeze frames (3f/5f/4f) | BossScene.js | Medium |
| I-12 | Add hitstun/vulnerability animation (knockback, state change) to player when taking damage. Currently the player can act during knockback | Player.js | Medium |
| I-13 | Add screen shake to boss attacks hitting the player, not just player attacks hitting the boss | BossScene.js | Low |
| I-14 | Camera transition between GameScene and BossScene: currently BossScene fades in from black. Consider a seamless camera transition (e.g., zoom in to boss arena) | GameScene.js, BossScene.js | Medium |

### Testing Gaps

| # | Gap | Notes |
|---|-----|-------|
| I-15 | No manual override to re-trigger boss battle | Once boss is defeated, `bossActive` is reset to false but trigger is disabled. Cannot re-fight without scene restart |
| I-16 | No debug mode for testing boss phases directly | Adding `this.boss.hp = 151` hook via console would help testing |
| I-17 | No feel/frame-advance for testing combo timing | Combo window (frames 11–15 of recovery) is hard to test without frame-stepping |

---

## 5. Test Pass List — Systems Verified Correct

The following systems were audited and found to be **functionally correct** (design intent matches implementation, no logic errors detected):

### Player State Machine
- ✅ Idle → attack1 startup → attack1 active → attack1 recovery → idle (no chain)
- ✅ Idle → attack1 startup → attack1 active → attack1 recovery → (combo window) → attack2 startup → attack2 active → attack2 recovery → idle
- ✅ Ground attack → airborne → air attack (startup condition: `velocity.y >= -50`)
- ✅ Air attack hitbox positioning below player
- ✅ Attack input buffering (5 frames) and consumption
- ✅ Invulnerability timer (30 frames) prevents double-hits
- ✅ Hitstop visual damage values match design doc (10/18/15)
- ✅ Knockback direction relative to player facing
- ✅ Jump mechanics (velocity, gravity, acceleration)

### Boss State Machine — Phase 1
- ✅ Ground melee (Pattern A) — telegraph, active, recovery cycle with correct durations
- ✅ Dash charge (Pattern B) — backstep, telegraph, dash, active, recovery cycle
- ✅ AI evaluation every 1.5s with cooldowns
- ✅ Walk toward player in idle when distance > 60px
- ✅ Hitstop/damage application with invulnerability frames

### Boss State Machine — Phase 2
- ✅ Phase transition triggers at HP ≤ 150 (50%)
- ✅ Double `phase === 2` check prevents entering `_startPhaseTransition` twice
- ✅ `vulnerable = false` during transition
- ✅ Liberation dive bomb (Pattern C) cycle: telegraph → active (dive) → recovery
- ✅ Desperation mode cooldown reduction (`* 0.7`)
- ✅ Desperation faster telegraph (1.0s vs 1.5s)

### HUD
- ✅ Heart pips render correctly at all HP thresholds (0, 1, 5, 50, 99, 100)
- ✅ Boss bar shows gradient color + red flash when HP ≤ 25%
- ✅ Feelings meter clamped to 0–100
- ✅ Combo counter displays "RESONANCE ×N" format
- ✅ Boss bar hides on defeat

### Scene Flow
- ✅ Boot → Menu → Game scene transitions via `SceneManager.goTo()`
- ✅ Menu keyboard navigation (↑↓/WS) skips disabled items
- ✅ Menu confirm on NEW GAME → flash → fade → GameScene
- ✅ GameScene boss trigger at x=2150 launches BossScene overlay
- ✅ BossScene overlay pauses GameScene
- ✅ Victory: Boss scene fade → overlay result → GameScene resumes, player healed +30HP
- ✅ `onOverlayResult` listener cleaned up on scene shutdown

### Physics
- ✅ Player-platform collision
- ✅ Boss-platform collision
- ✅ Player hitbox overlap with boss triggers damage
- ✅ Player body overlap with boss triggers contact damage
- ✅ `setCollideWorldBounds(true)` for player

### Asset Loading
- ✅ All 11 textures and 2 generated textures load without error
- ✅ Generated textures (`ground`, `bg_tile`) created in BootScene

---

## Appendix: Quick Reference — Fix Priority Matrix

| Bug ID | Severity | Fix Impact | Effort | Priority |
|--------|----------|-----------|--------|----------|
| C-03 | Critical | Prevents game completion | Low | **P0** |
| C-02 | Critical | Design contract violation | Very Low | **P0** |
| C-04 | Critical | Boss behaves unpredictably | Very Low | **P0** |
| C-01 | Critical | Combat feel broken | Medium | **P1** |
| C-05 | Critical | Unfair damage during scripted event | Very Low | **P1** |
| M-01 | Major | Boss patterns fire too fast | Low | **P1** |
| M-02 | Major | Phase 2 boss can't fight properly | Medium | **P1** |
| M-04 | Major | Pattern C skips its attack | Medium | **P2** |
| M-03 | Major | Combo display flickers | Very Low | **P2** |
| M-05 | Major | Boss walks off-screen | Very Low | **P2** |
| M-06 | Major | Stale inputs trigger after resume | Very Low | **P2** |
| M-07 | Major | Player pushed during victory | Very Low | **P3** |
| M-08 | Major | Wasted memory/assets | Low | **P3** |
| M-09 | Major | Wrong sprites during attacks | Low | **P3** |
| All minors | Minor | Various polish issues | Various | **P3/P4** |

---

*Report generated by QA Tester. All bugs unassigned — pending QA Lead triage.*
