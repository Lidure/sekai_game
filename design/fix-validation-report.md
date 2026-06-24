# Fix Validation Report — Combat System Bug Fixes

**Author:** Game Designer  
**Date:** 2026-06-24  
**Review Type:** Design intent validation of proposed gameplay programmer fixes  
**Files Reviewed:** `src/entities/Player.js`, `src/entities/BossMafuyu.js`, `src/scenes/BossScene.js`, `src/scenes/GameScene.js`  
**Status of Fixes:** No code changes committed yet — report validates the proposed approach for each critical bug from `design/qa-report.md`

---

## Per-Fix Validation

---

### C-01: Player Has No Hitstun — `takeDamage()` Doesn't Change State

**Status:** 🔴 NOT YET APPLIED  
**Verdict:** ✅ **APPROVED** (with implementation guidance)

#### Current Code Issue
`Player.takeDamage()` (lines 47–63) applies knockback velocity and sets `invulnTimer`, but never changes `this.state`. There is no `'hurt'` case in the `update()` switch. The player can attack, move, and use the combo system while being knocked back.

#### Proposed Fix (from QA Report)
| Change | Location |
|--------|----------|
| Add `case 'hurt':` to `update()` switch — apply velocity decay, block all inputs | `Player.js` update() |
| Set `this.state = 'hurt'` and `this.stateTimer = 0.3` in `takeDamage()` | `Player.js` takeDamage() |
| Add `case 'hurt': return 0.3;` to `_getStateDuration()` | `Player.js` _getStateDuration() |
| Add `case 'hurt': this.sprite.setTexture('player_idle');` to `_onStateEnter()` | `Player.js` _onStateEnter() |

#### Design Intent Alignment

| Source | Requirement | Match? |
|--------|-------------|--------|
| §1.9 State Machine | `taking damage → HITSTUN (0.3s) → IDLE` | ✅ Matches 0.3s |
| §2.7 Contact Damage | "Hitstun: 0.25s" on 5-damage contact | ⚠️ Minor discrepancy (0.3s vs 0.25s) |
| §1.6 Damage Table | Player attacks inflict 0.3s–0.5s hitstun on boss | N/A — this is about player hitstun, not boss |
| §3.1 Player Stats | Invulnerability after hit: 0.5s (30f) | ✅ Independent from hitstun (invuln = 30f, hitstun = 18f) |

The 0.3s value is **correct** — it matches the state machine diagram (§1.9). The 0.25s in §2.7 refers specifically to contact damage knockback, but the state machine consistently uses 0.3s. **Recommend using 0.3s (18f at 60fps) for all damage types** for consistent player experience.

#### Implementation Guidance

The `'hurt'` state in `update()` should:
```javascript
case 'hurt':
    this.stateTimer -= dt;
    // Decay knockback velocity (not instant stop)
    this.body.velocity.x *= 0.85;
    // Do NOT process attack, jump, or movement inputs
    if (this.stateTimer <= 0) {
        this._enterState('idle');
    }
    break;
```

Key points:
- **Do NOT** zero velocity instantly — let knockback decay naturally over the 0.3s. This feels more physically satisfying.
- **Do NOT** process `attack` buffer, `jump` input, or left/right acceleration during hurt.
- **DO** continue the `invulnTimer` countdown (already handled outside the switch).
- **DO** continue feelings decay (already handled outside the switch).
- The `_enterState('idle')` transition on timer expiry will properly restore control.

#### Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Hit during attack startup** | Player transitions to `'hurt'`, canceling the attack. Consistent with §1.10 "Player knocked out of Slash 2 recovery." |
| **Hit during jump** | Player transitions to `'hurt'`. Knockback velocity stacks on existing velocity. The player falls faster after hitstun ends. Intentional — being hit in air is dangerous. |
| **Chain of rapid hits** | `invulnTimer` (30f) prevents re-entry to `takeDamage()`. The 0.3s hitstun is shorter than 0.5s invuln, so player won't be re-stunned before invuln expires. The `this.dead` guard also prevents `die()` from being called twice. |
| **Hitstun + feelings decay overlap** | Feelings decay runs regardless of state — correct per design (time-based, not state-based). |
| **Player at world edge during hitstun knockback** | `setCollideWorldBounds(true)` on player prevents leaving the arena. Knockback velocity is absorbed by the wall. Normal. |

#### Balance Impact
| Factor | Before Fix | After Fix | Delta |
|--------|-----------|-----------|-------|
| Max DPS while trading hits | Full DPS (no penalty) | Zero DPS during 0.3s | -0.3s of damage per hit taken |
| Tactical retreat viability | Low (no consequence to being hit) | High (hitstun punishes recklessness) | Mechanically significant |
| "Tank & spank" degenerate strategy | Viable (hit boss through damage) | Non-viable (can't attack during hitstun) | ✅ Design intent restored |

**Net balance**: Slightly harder for aggressive play. Correct — the design doc intends careful, rhythmic combat (§1.1: "not a frantic button mash").

---

### C-02: `Reset()` Overwrites HP — Player Respawns with 100 HP Instead of 50

**Status:** 🔴 NOT YET APPLIED  
**Verdict:** ✅ **APPROVED** (recommend Option B)

#### Current Code Issue
`GameScene._onBossResult()` (line 45) sets `this.player.hp = 50`, then calls `this.player.reset(120, 480)` (line 47). `Player.reset()` unconditionally sets `this.hp = 100` (line 394), overwriting the 50 HP.

#### Proposed Fix Options (from QA Report)
| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | Remove `this.hp = 100` from `reset()`, let caller set HP | Simple | All existing callers must be updated; fragile if new callers forget |
| **B** | Pass HP as parameter: `reset(x, y, hp)` with default `hp = 100` | Explicit API; self-documenting; safe default | Slightly more code |
| **C** | Swap order: call `reset()` first, then set `this.player.hp = 50` | Minimal code change | Fragile — future maintainer might re-order lines; violates principle of least surprise |

**🎯 RECOMMENDATION: Option B** — `reset(x, y, hp = 100)`

This is the cleanest design. The `reset()` method is a public API that should be explicit about what it resets. A caller who wants non-default HP should pass it explicitly.

#### Design Intent Alignment

| Source | Requirement | Match? |
|--------|-------------|--------|
| §2.9 Lose Condition | "Retrying after death restores player to 50% HP (not full)" | ✅ |
| §2.9 Retry Checkpoint | "Player restarts from the current phase — not from full HP boss" | ✅ |

#### Implementation

```javascript
// Player.js - reset() signature change
reset(x, y, hp = 100) {
    this.hp = hp;          // was: this.hp = 100
    this.feelings = 0;
    this.dead = false;
    // ... rest unchanged
}

// GameScene.js - _onBossResult caller change
if (result.playerDied) {
    this.player.feelings = 0;
    this.player.reset(120, 480, 50);  // pass 50 HP explicitly
}
```

#### Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **HP > maxHp passed to reset** | Guard: `this.hp = Math.min(hp, this.maxHp)` — cap at max. |
| **HP <= 0 passed to reset** | Guard: `this.hp = Math.max(hp, 1)` — minimum 1 HP on reset. |
| **Future feature: upgrade system changes maxHp** | `reset(hp = this.maxHp)` default handles this dynamically. |
| **Non-boss death (future feature)** | Default argument `hp = 100` preserves existing behavior for non-boss scenes. |

#### Balance Impact

| Factor | Before Fix | After Fix | Delta |
|--------|-----------|-----------|-------|
| HP on boss retry | 100 (full) | 50 (half) | -50 HP per retry |
| Boss TTK for retrying player | Same as first attempt | Must play more carefully | ✅ Design intent restored |
| Attempts needed to learn patterns | Fewer (generous HP) | More (consequence for dying) | ✅ Intentional — see §4.2 "3–5 attempts" |

**Net balance:** Boss retry is significantly harder. This is **intentional** — the design doc explicitly states 50% HP on retry (§2.9). The bug was making the boss easier than designed.

**Cascading impact:** Combined with C-01 (hitstun), the player now both takes damage more meaningfully AND has reduced HP on retry. This creates proper stakes for boss attempts.

---

### C-03: Race Condition on Player Death — `Player.die()` vs `BossScene._handlePlayerDeath()`

**Status:** ⚠️ PARTIALLY APPLIED — `_handlePlayerDeath()` no longer calls `player.die()`, but `takeDamage()` still calls `die()` before `_handlePlayerDeath()` runs  
**Verdict:** ⚠️ **NEEDS ADJUSTMENT** — current partial fix does NOT eliminate the race condition

#### Current Code Issue

The code has been partially fixed:
- `BossScene._handlePlayerDeath()` (line 195–215) now sets `player.dead = true` directly and uses `SceneManager.finishOverlay()` — it does NOT call `player.die()`.
- ✅ Comment on line 196: `"Mark player dead without calling player.die() (which would restart the scene)."`

However, the root cause remains:
- `Player.takeDamage()` (line 59–62) still calls `this.die()` when HP ≤ 0.
- `Player.die()` (line 65–80) still calls `this.scene.scene.restart()` at 2000ms.
- Both the `restart()` delayedCall (from `die()`) and the `finishOverlay()` delayedCall (from `_handlePlayerDeath()`) are scheduled at 2000ms — the race persists.

The execution order when the player dies:
```
Frame N (physics step):
  1. Overlap callback → _onBossTouchPlayer() → player.takeDamage()
  2. HP reaches 0 → player.die() called immediately
  3. player.die() schedules scene.restart() at +2000ms  ← RACE STILL EXISTS

Frame N (update):
  4. _checkEndConditions() sees hp ≤ 0
  5. _handlePlayerDeath() schedules SceneManager.finishOverlay() at +2000ms  ← CONFLICTING SCHEDULE
```

#### Design Intent Alignment

| Source | Requirement | Match? |
|--------|-------------|--------|
| §2.9 Lose Condition | "Player stumbles, collapses. Screen fades to dark over 2s." | ✅ Visual sequence correct |
| §2.9 Lose Condition | Options: "Try Again" or "Return" | 🔴 Race condition prevents this from working reliably |
| §1.9 State Machine | HP = 0 → DEFEAT (death animation) | ✅ Visuals are correct in isolation |

#### Recommended Fix

**Root cause:** `takeDamage()` has no context awareness — it calls `die()` in any scene, but during a boss fight, death should be handled by `BossScene._handlePlayerDeath()` alone.

**Best approach:** Prevent `Player.die()` from being called during boss fight. Two viable options:

**Option 1 (Clean): Set `player.dead` before takeDamage fires**  
In `BossScene._onBossTouchPlayer()`, check if the incoming damage would kill the player:
```javascript
_onBossTouchPlayer() {
    if (!this.boss || this.boss.defeated) return;
    // Guard: if this hit would kill the player, mark dead NOW
    // so takeDamage()'s guard (this.dead) prevents die() from being called
    if (this.player.hp <= 5 && this.player.invulnTimer <= 0) {
        this.player.dead = true;  // Prevent die() in takeDamage()
        this.playerDied = true;
        this._handlePlayerDeath();
        return;  // Don't apply damage — death state is already set
    }
    // ... rest of damage logic
}
```
**Problem:** This checks for contact damage (5) specifically but doesn't handle boss attack damage (12/15/20). A more robust approach is needed.

**Option 2 (Robust): Add a `bossFight` flag to Player**  
```javascript
// Player.js constructor
this.bossFight = false;

// Player.js takeDamage() - guard the die() call
if (this.hp <= 0) {
    this.hp = 0;
    if (!this.bossFight) {
        this.die();
    }
    // If bossFight, BossScene._handlePlayerDeath() takes over
}

// BossScene._createPlayer() - set the flag
_createPlayer() {
    this.player = new Player(this, 200, 480);
    this.player.bossFight = true;  // <-- prevents die() from restarting scene
    // ...
}
```

**Option 3 (Best): Remove `scene.restart()` from `Player.die()` entirely**  
`Player.die()` should handle player-level state (animation, gravity off, alpha fade). Scene transitions are the scene's responsibility:
```javascript
die() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.sprite.setVelocity(0, 0);
    this.sprite.body.setAllowGravity(false);
    this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
    });
    // REMOVED: this.scene.time.delayedCall(2000, () => { this.scene.scene.restart(); });
}
```
Then `BossScene._handlePlayerDeath()` handles the overlay result, and for future boss-free death, GameScene would implement its own death handler.

**🎯 RECOMMENDATION: Option 3** — This is architecturally cleanest. `die()` should be a pure player-state method. Scene transitions belong to scene code.

#### Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Player HP exactly 0 from two sources in one frame** | Both paths would set `dead = true`. The guard `if (this.dead) return;` in `takeDamage()` and `die()` prevents double-processing. |
| **Player dies while mid-attack** | `_handlePlayerDeath()` sets `state = 'dead'`, stopping attack state machine. Normal. |
| **Player dies during phase transition** | Player takes damage during transition (C-05 bug). After both fixes, transitioning boss is invulnerable + no contact damage → player shouldn't die during transition. If they somehow do, the death handler works correctly. |
| **Player dies at exactly the same time as boss** | See E-01 in QA report. Boss death should take priority. Add check in `_checkEndConditions()`. |

#### Balance Impact

**Zero balance impact** — this is a bug fix that makes the game functional. A game that soft-locks 50% of the time is unplayable regardless of balance.

---

### C-04: Boss yBobTween Not Stopped During Phase Transition

**Status:** 🔴 NOT YET APPLIED  
**Verdict:** ✅ **APPROVED** (with expanded fix scope)

#### Current Code Issue
`BossMafuyu` constructor (line 30–37) starts an infinite `yBobTween` oscillating `sprite.y` by ±8px. `_startPhaseTransition()` (line 64–92) tweens the boss to y=150 but never stops the yBobTween. The two tweens fight for control of `sprite.y` throughout the transition and into early Phase 2.

#### Proposed Fix (from QA Report)
Add `if (this.yBobTween) this.yBobTween.stop();` at the beginning of `_startPhaseTransition()`.

#### Design Intent Alignment

| Source | Requirement | Match? |
|--------|-------------|--------|
| §2.5 Phase Transition | "Mafuyu stops all action... rises into the air (floating upward over 1s to y=150)" | ✅ Tween must not fight the transition |
| §2.5 Phase 2 | "Mafuyu now flies. Arena lighting shifts." | ✅ Phase 2 uses physics-based flight, not tweens |
| §2.5 Phase Transition (2) | 0.5s pause before the float-up | ✅ Bob should stop during the pause too |

#### Implementation

```javascript
_startPhaseTransition() {
    if (this.transitioning) return;
    
    // Stop decorative bob BEFORE any transition animation
    if (this.yBobTween) {
        this.yBobTween.stop();
        this.yBobTween = null;
    }
    
    this.transitioning = true;
    this.vulnerable = false;
    this.state = 'phase_transition';
    this.body.setVelocity(0, 0);
    this.sprite.setTexture('boss_liberation');
    // ... rest unchanged
}
```

**Critical detail:** Stop the tween **before** the 0.5s delayed call (line 72). The bob should not run during the initial 0.5s pause either — the boss should be still during the dramatic pause.

#### Expanded Fix Scope

The `_die()` method already stops the yBobTween correctly (line 101: `if (this.yBobTween) this.yBobTween.stop();`). ✅

However, there are **additional states where the bob tween is problematic**:

| State | Issue | Fix Needed |
|-------|-------|-----------|
| `liberation_telegraph` | yBobTween pushes boss down during 1.5s telegraph, can cause premature ground contact (M-04) | Stop tween on entering `liberation_telegraph` or ensure gravity disabled |
| `liberation_active` | Boss dive is physics-driven; tween fighting Y velocity | Already stopped if stopped on telegraph entry |
| Phase 2 `idle` (airborne) | yBobTween fights `setVelocityY()` for altitude control | Stop tween; Phase 2 flight should be purely physics-based |

**🎯 RECOMMENDATION:** Stop the yBobTween once at phase transition start and do NOT restart it. Phase 2's visual bob (if desired) should be implemented as a subtle physics-based vertical oscillation (e.g., sinusoidal `setVelocityY` modulation) rather than a sprite-position tween, to avoid fighting the physics engine.

#### Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Boss reset (retry)** | `reset()` already stops and recreates the yBobTween (lines 420–428). ✅ Correct. |
| **Boss already near y=150 when transition starts** | The transition tween has minimal/no movement. With bob stopped, the boss stays still during the pause. This is fine — see QA E-03. |
| **Boss killed during phase transition** | `_die()` has its own `yBobTween.stop()`. Since we already stopped it in `_startPhaseTransition()`, this is a no-op. Safe. |

#### Balance Impact

| Factor | Before Fix | After Fix | Delta |
|--------|-----------|-----------|-------|
| Phase 2 boss Y predictability | Erratic (tween vs physics) | Stable (pure physics) | ✅ Major improvement |
| Pattern D usability | Reduced (boss at wrong altitude) | As designed (boss maintains y≈200) | ✅ Indirect improvement |
| Liberation dive bomb reliability | Reduced (bob tween pushes boss down) | Reliable (no tween interference) | ✅ Indirect improvement |

**Net balance:** Moderate improvement to boss reliability and fairness. The fight now plays as designed rather than having unpredictable boss positioning.

---

### C-05: Boss Contact Damage During Phase Transition

**Status:** 🔴 NOT YET APPLIED  
**Verdict:** ✅ **APPROVED**

#### Current Code Issue
`BossScene._onBossTouchPlayer()` (line 153–163) only checks `this.boss.defeated` at the top. During phase transition, `this.boss.state === 'phase_transition'`, which does not match any of the checked attack states (`melee_active`, `dash_active`, `liberation_active`). The code falls to the `else` branch (line 162) and applies 5 contact damage.

#### Proposed Fix (from QA Report)
Add `this.boss.transitioning` guard:
```javascript
_onBossTouchPlayer() {
    if (!this.boss || this.boss.defeated || this.boss.transitioning) return;
    // ...
}
```

#### Design Intent Alignment

| Source | Requirement | Match? |
|--------|-------------|--------|
| §2.5 Phase Transition | "During the transition, the player can move but cannot attack Mafuyu" | ✅ Invulnerability is explicit |
| §2.5 Phase Transition (6) | Bullet 6: "she is invulnerable" | ✅ |
| §2.10 Edge Cases | "Hitbox active but boss is invulnerable (phase transition): No hit registers" | ✅ Explicitly documented |

#### Implementation

```javascript
_onBossTouchPlayer() {
    if (!this.boss || this.boss.defeated || this.boss.transitioning) return;
    // ... rest unchanged
}
```

**Why `this.boss.transitioning` instead of checking `this.boss.state === 'phase_transition'`:**
- The `transitioning` flag is set at the very start of `_startPhaseTransition()` (line 66) and cleared after phase 2 begins (line 83).
- Using the flag covers the ENTIRE transition sequence, including the 500ms initial pause, the 1000ms float-up, and the 1000ms post-flash delay.
- The state is only `'phase_transition'` during the pause + float-up — checking state alone would miss the post-flash period.

#### Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Player touching boss at exact moment transition starts** | If the overlap callback fires before `transitioning` is set (rare, same frame), the player might take one tick of contact damage. Acceptable — this is a <1-frame window. |
| **Player spamming attack during transition** | Already handled by §2.10 edge case: "Hitbox active but boss is invulnerable: No hit registers." `boss.vulnerable` is false during transition. |
| **Transition starts while contact damage overlap is actively processing** | Phaser processes overlaps once per physics step. The `transitioning` flag is set in scene code, not in the physics callback, so the next overlap check will see it. Safe. |
| **Player already in contact with boss when Desperation (HP ≤ 50) triggers** | Desperation is not a transition — the boss continues fighting. Contact damage remains active. This is correct — Desperation is higher pressure, not a rest period. |

#### Balance Impact

| Factor | Before Fix | After Fix | Delta |
|--------|-----------|-----------|-------|
| Damage taken during transition | 5/tick (potentially 20–40+ total) | 0 | ✅ Large fairness improvement |
| Ability to position near boss during transition | Punished (damage) | Free (safe positioning) | ✅ Design intent restored |

**Net balance:** The transition period becomes a safe positioning window as designed (§2.5: "Player should use this time to position on a platform"). The bug was making the player afraid to approach during a scripted sequence, which directly contradicts the design intent.

**Fairness:** This is not a difficulty reduction — it's a bug fix. The damage was unintentional.

---

## Overall Balance Impact Summary

### Before Fixes (Current State)

| Factor | Value | Compared to Design |
|--------|-------|-------------------|
| Player hitstun | None | 🚩 Game is easier than designed — no penalty for being hit |
| Respawn HP | 100 (full) | 🚩 Game is easier than designed — no attrition mechanic |
| Death reliability | ~50% softlock | 🚩 Game can be unplayable |
| Phase 2 boss behavior | Unpredictable Y position | 🚩 Boss AI does not function as designed |
| Phase transition damage | Unintentional 5/tick | 🚩 Unfair damage during scripted sequence |

### After Fixes (Projected)

| Factor | Value | Compared to Design |
|--------|-------|-------------------|
| Player hitstun | 0.3s | ✅ As designed — hitstun penalizes reckless play |
| Respawn HP | 50 (half) | ✅ As designed — boss retry has consequence |
| Death reliability | 100% reliable | ✅ Game is functional |
| Phase 2 boss behavior | Stable Y position | ✅ Boss AI works as designed |
| Phase transition damage | 0 | ✅ As designed — safe positioning window |

### Net Difficulty Delta

| Aspect | Delta | Reasoning |
|--------|-------|-----------|
| **First attempt difficulty** | ↔️ Unchanged | Player starts with 100 HP, no hitstun yet learned |
| **Retry difficulty** | 🟠 Harder | 50 HP + hitstun makes retries significantly harder |
| **Phase 2 difficulty** | 🟡 Slightly harder | Reliable boss AI means more consistent pattern execution |
| **Fairness** | ✅ Improved | No transition damage, predictable boss behavior |
| **Skill ceiling** | ✅ Raised | Hitstun rewards hit-avoidance skill; retry HP models attrition |

The net balance impact brings the fight **closer to the design intent** (§4.1–4.2). The "3–5 attempts for first clear" benchmark from §4.2 becomes achievable rather than the current situation where: (a) retry gives full HP with no hitstun → too easy, or (b) the game softlocks → impossible.

---

## Cascading Interactions Between Fixes

The five critical bugs are **not independent** — they interact in important ways:

### Interaction Map

```
C-03 (Death Race) ──blocks──→ C-02 (HP Reset)  
    │                              Without C-03, the game softlocks before C-02 even matters
    │
    ├──affects──→ C-05 (Transition Damage)
    │              Death during transition (if C-05 unfixed) would interact with C-03
    │
C-04 (yBobTween) ──enables──→ M-04 (Liberation Skip)
    │                          C-04 fix also partially fixes M-04
    │
C-01 (Hitstun) ──multiplies──→ C-02 (HP Reset)
                                Lower HP + hitstun = much higher penalty for mistakes
```

### Critical Interaction: C-03 + C-02

If C-03 is fixed but C-02 is not: The game works, but the player always respawns at 100 HP instead of 50. The boss is much easier than designed.

If C-02 is fixed but C-03 is not: 50% of the time the player gets 50 HP, the other 50% the game softlocks. Worse than before.

**Order of fixes matters:** C-03 (game must work) → C-02 (correct HP) → C-05 (fair damage) → C-04 (correct Phase 2) → C-01 (correct feel).

### Critical Interaction: C-04 + M-04 (Liberation Skip)

The yBobTween pushing the boss downward during `liberation_telegraph` is a primary cause of the Liberation dive skipping (M-04). Fixing C-04 (stopping the yBobTween) will **substantially reduce** but **not eliminate** M-04. The remaining cause: `liberation_telegraph` sets `body.setVelocity(0, 0)` but does not disable gravity. With gravity at 500, the boss falls ~0.2px per frame during the telegraph. Over 1.5s (90f), that's ~18px — enough to contact the ground from a slightly low float height.

**Recommendation:** Also set `this.body.setAllowGravity(false)` during `liberation_telegraph` to fully fix M-04.

### Critical Interaction: C-01 + Existing Boss Balance

With hitstun added, the player loses 0.3s of active combat per hit taken. Pattern C (Liberation) deals 20 damage. With 100 HP and the current damage output:
- Pattern C hit = 20% of HP + 0.3s lost
- 5 contact damage hits = 25% of HP + 1.5s cumulative lost
- Full Pattern D combo (3 dashes) = 30% of HP + 0.9s cumulative lost

The hitstun penalty **compounds with damage** — a high-damage hit not only depletes HP but also denies the player the punish window that normally follows. The player must now decide: "Is the punish worth the risk of taking damage and losing 0.3s?"

**The balance feels correct for the intended experience (§1.1: "Patience → Observation → Punishment rhythm").**

---

## Additional Design Concerns Discovered

During validation, the following issues were noted that are **not part of the 5 critical fixes** but should be addressed:

### 🔴 Should Be Fixed Alongside C-04

**AC-01: Gravity Active During `liberation_telegraph` (M-04 Root Cause)**
```javascript
// BossMafuyu.js - liberation_telegraph
case 'liberation_telegraph':
    this.sprite.setTexture('boss_liberation');
    this.body.setVelocity(0, 0);
    // MISSING: this.body.setAllowGravity(false);
```
Without disabling gravity, the boss slowly descends during the 1.5s telegraph. If already near the ground, it lands before the dive starts. Fix: disable gravity during telegraph, re-enable on dive start.

**AC-02: Boss Phase 2 Takeoff Too Weak (M-02)**
In Phase 2 `idle` (grounded), the boss uses `setVelocityY(-200)` with a 200ms zeroing delayed call. At gravity 500:
- After 200ms: velocity = -200 + 500 × 0.2 = -100 (still rising)
- Velocity zeroed → boss coasts upward at -100 until gravity overcomes it
- Peak height ≈ v²/(2g) = 100²/(2×500) = 10px

This gives a **10px hop**, insufficient to reach flight altitude (y=200). The boss remains grounded, unable to use Pattern C (requires flight) or Pattern D (requires y < 250).

**Fix:** Replace the delayed-call approach with continuous upward force until target altitude:
```javascript
if (!this.onGround) {
    // Maintain flight altitude
    const targetY = 200;
    if (Math.abs(this.sprite.y - targetY) > 10) {
        this.body.setVelocityY(Math.sign(targetY - this.sprite.y) * 200);
    }
} else if (this.aiTimer <= 0) {
    // Takeoff: strong initial burst, then transition to flight
    this.body.setVelocityY(-350);  // Stronger initial jump
    this.scene.time.delayedCall(300, () => {
        if (!this.onGround) {
            this.body.setVelocityY(-100);  // Transition to hover
        }
    });
    this.aiTimer = 2;
}
```

### 🟠 Recommended Follow-up Fixes

**AC-03: Double Cooldown Decrement in Phase 2 Melee (M-01)**
When `_updatePhase2()` delegates melee states to `_updatePhase1()`, both methods decrement `this.aiTimer` and `this.aiCooldowns`. This means cooldowns run at ~2x during Phase 2 melee sequences. Fix: skip cooldown decrement in `_updatePhase2()` for melee states.

**AC-04: Boss `setCollideWorldBounds` Missing (M-05)**
The boss can walk off-screen in Phase 1. Add `this.sprite.setCollideWorldBounds(true)` in constructor.

**AC-05: `lastHitTime` Initialized to 0 (m-01)**
Feelings decay starts 3s after scene creation instead of 3s after last hit. Initialize to `this.scene.time.now`. Also update in `takeDamage()`.

**AC-06: `desperate` Flag Not Initialized in Constructor (m-02)**
`this.desperate` is first set in `takeDamage()`. Add `this.desperate = false;` in constructor for safety.

### 🟡 Polish Improvements

**AC-07: M-03 (Combo Text Tween Collision)** — Stop existing combo tween before creating new one in `HUD.showCombo()`.

**AC-08: M-06 (Stale JustDown Inputs on Scene Resume)** — Call `this.input.keyboard.resetKeys()` in `_onBossResult()`.

**AC-09: M-07 (Boss Physics Body Active During Victory)** — Disable boss physics body in `_die()`: `this.body.enable = false`.

**AC-10: M-09 (Missing Active State Textures)** — Add texture assignments for `attack1_active`, `attack2_active`, `air_attack_*` states.

---

## Priority Recommendation for Remaining Work

| Priority | Fix | Why |
|----------|-----|-----|
| **P0** | C-03 (Death race) | Game can softlock |
| **P0** | C-02 (HP reset) | Design contract violation |
| **P0** | C-04 + AC-01 (yBobTween + liberation gravity) | Boss doesn't work in Phase 2 |
| **P1** | C-01 (Hitstun) | Combat feel broken |
| **P1** | C-05 (Transition damage) | Unfair damage |
| **P1** | AC-02 (Phase 2 takeoff) | Boss can't use aerial patterns |
| **P1** | AC-03 (Double cooldown) | Boss patterns fire at 2x speed |
| **P2** | AC-04 (Boss world bounds) | Boss walks off-screen |
| **P2** | AC-05–AC-10 (Minor polish) | Various quality issues |

---

## Final Verdict by Bug

| Bug ID | Description | Verdict | Notes |
|--------|-------------|---------|-------|
| **C-01** | Player hitstun | ✅ **APPROVED** | Use 0.3s across all damage types. See implementation guidance above. |
| **C-02** | HP reset overwrite | ✅ **APPROVED** | Use Option B (parameterized reset). Use `Math.min(maxHp, Math.max(1, hp))` guards. |
| **C-03** | Death race condition | ⚠️ **NEEDS ADJUSTMENT** | Current partial fix (non-calling die() from _handlePlayerDeath) is NOT sufficient. `takeDamage()` still calls `die()`. Must remove `scene.restart()` from `Player.die()` or prevent `die()` call during boss fights. **Recommend Option 3: Remove `scene.restart()` from `die()` entirely.** |
| **C-04** | yBobTween during transition | ✅ **APPROVED** | Stop tween at start of `_startPhaseTransition()`. Do NOT restart in Phase 2. Also fix gravity in `liberation_telegraph` (AC-01). |
| **C-05** | Transition contact damage | ✅ **APPROVED** | Add `this.boss.transitioning` guard to `_onBossTouchPlayer()`. |

**Overall Assessment: 4 of 5 fixes APPROVED, 1 fix NEEDS ADJUSTMENT (C-03).**

The C-03 partial fix is a trap — it looks correct but doesn't eliminate the race condition because `takeDamage()` calls `die()` during the physics step, before `_checkEndConditions()` runs in `update()`. Both delayed calls (restart + finishOverlay) are still scheduled. The programmer must also prevent `die()` from being called, or remove `scene.restart()` from `die()` entirely.

---

*End of Fix Validation Report. Generated by Game Designer.*
