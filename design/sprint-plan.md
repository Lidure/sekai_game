# Sprint Plan — Next Development Phase

> **Status**: Approved
> **Author**: game-designer
> **Date**: 2026-06-24
> **Target**: Pixel-art Metroidvania (Phaser 3.87, Arcade Physics)
> **Theme**: 25-ji (Nightcord) — "Facing Yourself"

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Sprint Goals Overview](#2-sprint-goals-overview)
3. [Sprint 1: Player Mafuyu — Visual Switch + Run Animation (P0)](#3-sprint-1-player-mafuyu--visual-switch--run-animation-p0)
4. [Sprint 2: Player Mafuyu — Animation Polish + Boss Visuals (P1)](#4-sprint-2-player-mafuyu--animation-polish--boss-visuals-p1)
5. [Sprint 3: Feelings Special Attack + Death Sequence (P1)](#5-sprint-3-feelings-special-attack--death-sequence-p1)
6. [Sprint 4: Map Content — Collectibles + Game Loop (P2)](#6-sprint-4-map-content--collectibles--game-loop-p2)
7. [Sprint 5: Save/Load + Menu (P2)](#7-sprint-5-saveload--menu-p2)
8. [Balance Tuning](#8-balance-tuning)
9. [Implementation Dependencies](#9-implementation-dependencies)

---

## 1. Current State Assessment

### 1.1 What's Done (Verified in Code)

The codebase has already advanced significantly beyond the QA report snapshot. All critical bugs and most major bugs from `design/qa-report.md` have been fixed:

#### Bug Fixes Applied ✅

| Bug ID | Description | Status | Verified In |
|--------|-------------|--------|-------------|
| **C-01** | Player hitstun | ✅ Fixed | `Player.js` — `'hurt'` state, 0.3s duration, velocity decay, blocks inputs |
| **C-02** | HP reset overwrite | ✅ Fixed | `Player.js` — `reset(x, y, hp = this.maxHp)` parameter; `GameScene.js` passes 50 |
| **C-03** | Death race condition | ✅ Fixed | `Player.js` — `die()` no longer calls `scene.restart()`, just alpha fade |
| **C-04** | yBobTween during transition | ✅ Fixed | `BossMafuyu.js` — `yBobTween.stop()` at start of `_startPhaseTransition()` |
| **C-05** | Transition contact damage | ✅ Fixed | `BossScene.js` — `this.boss.transitioning` guard in `_onBossTouchPlayer()` |
| **M-01** | Double cooldown decrement | ✅ Fixed | `BossMafuyu.js` — aiTimer/cooldowns decremented once in `update()`, not in sub-methods |
| **M-02** | Phase 2 takeoff weak | ✅ Fixed | `BossMafuyu.js` — `-350` upward impulse, 400ms delayed velocity zero |
| **M-03** | Combo text tween collision | ✅ Fixed | `HUD.js` — stops existing tween before creating new one |
| **M-04** | Liberation dive skip | ✅ Fixed | `BossMafuyu.js` — `setAllowGravity(false)` in telegraph, lift boss if blocked.down |
| **M-05** | Boss leaves arena | ✅ Fixed | `BossMafuyu.js` — `setCollideWorldBounds(true)` in constructor |
| **M-06** | Stale inputs on resume | ✅ Fixed | `GameScene.js` — `this.input.keyboard.resetKeys()` in `_onBossResult()` |
| **M-07** | Boss body active during victory | ✅ Fixed | `BossMafuyu._die()` — `this.body.enable = false` |
| **M-09** | Missing state textures | ✅ Fixed | `Player._onStateEnter()` — all states covered (att1_active, att2_active, air_attack_*) |
| **m-01** | Feelings decay timer | ⚠️ Partial | `feelingsTimer=3001` in constructor (avoids initial decay), but only `onHitEnemy()` resets it, not `takeDamage()` |
| **m-02** | Desperate flag init | ✅ Fixed | `this.desperate = false` in BossMafuyu constructor |
| **m-04** | Air attack → idle flicker | ✅ Fixed | `_handleAirAttackState()` transitions to `'fall'` if not on ground |
| **m-06** | Mixed timer units | ⚠️ Still present | `comboTimer` in ms, `stateTimer` in seconds — works but maintenance hazard |

#### Combat Systems Implemented ✅

| System | Status | Details |
|--------|--------|---------|
| Player ground combo | ✅ Done | Attack1 (13 dmg, 7f/5f/10f) → combo window → Attack2 (22 dmg, 8f/6f/12f) |
| Player air attack | ✅ Done | Downward thrust (18 dmg, 7f/25f/8f), gravity boost +120/+200 |
| Player hurt state | ✅ Done | 0.3s hitstun, velocity decay, no inputs |
| Input buffering | ✅ Done | 5-frame buffer for attack |
| Feelings meter | ✅ Done | +8 on hit, +5 on damage taken, decay after 3s idle |
| Combo system | ✅ Done | RESONANCE ×N display, 2s timeout |
| Hit particles | ✅ Done | White circle burst on enemy contact |
| Enemy base class | ✅ Done | `Enemy.js` — takeDamage, invuln, hit flash, death particles, audio |
| Shadow Fragment | ✅ Done | Patrol + Chase AI, 3 HP, 5 contact dmg, +2 feelings on kill |
| Floating Shard | ✅ Done | Hover + Drift + Return AI, 4 HP, 8 contact dmg, +5 feelings, Y-bob visual |
| Boss Phase 1 | ✅ Done | Pattern A (melee), Pattern B (dash), 1.5s AI evaluation |
| Boss Phase 2 | ✅ Done | Pattern C (liberation dive), Pattern D (3-dash), flight AI |
| Boss Desperation | ✅ Done | 0.7x cooldowns, 1.0s telegraph, triggered at ≤50 HP |
| Phase transition | ✅ Done | 0.5s pause → float up → flash → dialogue (invuln during) |
| HUD — Heart pips | ✅ Done | 10 pips, half-pip rendering, animated colors |
| HUD — Boss bar | ✅ Done | Gradient fill, red flash at <25%, smooth lerp |
| HUD — Feelings bar | ✅ Done | Bottom-center bar |
| HUD — Combo counter | ✅ Done | "RESONANCE ×N" with fade-out |
| Boss death | ✅ Done | Fade + float up + "MEMORY FRAGMENT ACQUIRED" text |
| Overlay scene flow | ✅ Done | GameScene → BossScene (overlay) → result callback |
| GameScene world | ✅ Done | 4400×600, 6 sections with varied platforms |
| GameScene enemies | ✅ Done | 9 Shadow Fragments + 5 Floating Shards across all sections |
| GameScene boss trigger | ✅ Done | At x=4000, launches BossScene overlay |
| Menu scene | ✅ Done | Title, subtitle, fragment particles, NEW GAME/CONTINUE/CREDITS |
| Scene transitions | ✅ Done | SceneManager with fadeOut/fadeIn, overlay launch/finish |
| Audio integration | ✅ Done | 25+ SFX and 7 BGM tracks loaded, played on actions |
| Boss world bounds | ✅ Done | `setCollideWorldBounds(true)` |
| Boss liberation fix | ✅ Done | Gravity disabled during telegraph |
| Menu → Boot → Game flow | ✅ Done | Complete scene flow with animation |

#### Player Stats (Already Mafuyu) ✅

| Stat | Current Value | Design Spec |
|------|--------------|-------------|
| Speed | 180 px/s | 180 px/s ✅ |
| Jump Velocity | -400 px/s | -400 px/s ✅ |
| Acceleration | 600 px/s² | 600 px/s² ✅ |
| Drag | 700 px/s² | 700 px/s² ✅ |
| Slash 1 Damage | 13 | 13 ✅ |
| Slash 2 Damage | 22 | 22 ✅ |
| Air Damage | 18 | 18 ✅ |
| Slash 1 Startup | 7f / 117ms | 7f ✅ |
| Slash 1 Active | 5f / 83ms | 5f ✅ |
| Slash 1 Recovery | 10f / 167ms | 10f ✅ |
| Slash 2 Startup | 8f / 133ms | 8f ✅ |
| Slash 2 Active | 6f / 100ms | 6f ✅ |
| Slash 2 Recovery | 12f / 200ms | 12f ✅ |
| Air Startup | 7f / 117ms | 7f ✅ |
| Air Active (max) | 25f / 417ms | 25f ✅ |
| Air Recovery | 8f / 133ms | 8f ✅ |
| Hurt Duration | 0.3s | 0.3s ✅ |
| Slash 1 Hitbox | 20w × 18h | 20w × 18h ✅ |
| Slash 2 Hitbox | 28w × 22h | 28w × 22h ✅ |
| Air Hitbox | 16w × 24h | 16w × 24h ✅ |

### 1.2 What's Missing ❌

#### Critical Gaps

| Gap | Impact | Sprint |
|-----|--------|--------|
| **Player still uses 25miku sprites** (texture keys: `player_idle`, `player_att1`, `player_att2`) | Player displays as 25miku (teal hair) instead of Mafuyu (purple hair) | Sprint 1 |
| **Run animation not implemented** — `_onStateEnter('run')` sets `player_idle` static texture, `_updateRunBob()` is empty stub | Player slides without walking animation | Sprint 1 |
| **Player body sizing is for 25miku** — `setSize(200, 333)`, offset `(260, 260)` instead of mfy `(200, 400)`, offset `(260, 320)` | Hitbox misaligned with mfy sprite dimensions | Sprint 1 |
| **IdleBob tween not implemented** — `_startIdleBob()` and `_stopIdleBob()` methods don't exist | Mafuyu stands completely still when idle | Sprint 2 |

#### Moderate Gaps

| Gap | Impact | Sprint |
|-----|--------|--------|
| **Boss melee uses `boss_attack` (telegraph pose) for active frames** instead of `boss_melee1` (actual swing frame) | Boss swings sword but shows telegraph pose during active frames | Sprint 2 |
| **Feelings special attack not implemented** — 50 Feelings → wide slash (35 damage) | No resource dump for Feelings meter; reduces strategic depth | Sprint 3 |
| **Death animation is simple alpha fade** using `boss_cower` texture instead of defeat/vanish sprites | Less dramatic death sequence | Sprint 3 |

#### Polish/Feature Gaps

| Gap | Impact | Sprint |
|-----|--------|--------|
| **No collectibles** (HP shards, Feelings fragments) in overworld | Empty secret alcove; no exploration reward | Sprint 4 |
| **No save/load system** — CONTINUE disabled | Player must start from beginning each session | Sprint 5 |
| **No CREDITS scene** | CREDITS menu item disabled | Sprint 5 |
| **Jump squash/stretch tweens not implemented** | No landing impact feedback | Sprint 2 |

---

## 2. Sprint Goals Overview

| Sprint | Focus | Priority | Est. Effort | Dependencies |
|--------|-------|----------|-------------|--------------|
| **1** | Player Mafuyu — Visual Switch + Run Animation | **P0** | ~2 hours | None |
| **2** | Player Animation Polish + Boss Visuals | **P1** | ~2 hours | Sprint 1 |
| **3** | Feelings Special Attack + Death Sequence | **P1** | ~3 hours | Sprint 2 |
| **4** | Map Content — Collectibles + Game Loop | **P2** | ~3 hours | Sprint 1 |
| **5** | Save/Load + Menu + Polish | **P2** | ~3 hours | Sprint 4 |

**Total estimated effort**: ~13 hours of implementation + ~3 hours of testing

---

## 3. Sprint 1: Player Mafuyu — Visual Switch + Run Animation (P0)

**Goal**: Replace all 25miku sprite references with mfy sprites. Player should display as Mafuyu with correct idle pose and 11-frame run animation.

### 3.1 Task Breakdown

#### Task 1.1: Copy mfy_run_jump.png → assets/images/

| Property | Value |
|----------|-------|
| **File** | `游戏素材/mfy/mfy_run_jump.png` |
| **Destination** | `assets/images/player_jump.png` |
| **Command** | `Copy-Item "游戏素材/mfy/mfy_run_jump.png" "assets/images/player_jump.png"` |
| **Why** | The jump/fall state needs this frame. The file exists at source but not in assets. |
| **Effort** | 1 minute |

#### Task 1.2: Update BootScene.preload() — Load mfy Asset Keys

**File**: `src/scenes/BootScene.js`

**Changes to `preload()`**:
- Keep existing loads for `boss_idle`, `boss_dash`, `boss_attack`, `boss_liberation`, `boss_cower` (these are used by BossMafuyu)
- Keep audio loads (all existing)
- **Remove** old 25miku player loads (lines 8–10):
  ```javascript
  // REMOVE these three lines:
  this.load.image('player_idle', 'assets/images/player_idle.png');
  this.load.image('player_att1', 'assets/images/player_att1.png');
  this.load.image('player_att2', 'assets/images/player_att2.png');
  ```
- **Add** mfy texture loads (14 new load calls):

```javascript
// ── Player Mafuyu Sprites ──────────────────────────────────────
// Idle / standing frame (uses existing boss_idle which is mfy)
this.load.image('boss_melee1', 'assets/images/boss_melee1.png');  // Attack 1 + air attack
this.load.image('boss_melee2', 'assets/images/boss_melee2.png');  // Attack 2
this.load.image('player_jump', 'assets/images/player_jump.png');  // Jump/fall frame

// 11 run frames
this.load.image('boss_run1',  'assets/images/boss_run1.png');
this.load.image('boss_run2',  'assets/images/boss_run2.png');
this.load.image('boss_run3',  'assets/images/boss_run3.png');
this.load.image('boss_run4',  'assets/images/boss_run4.png');
this.load.image('boss_run5',  'assets/images/boss_run5.png');
this.load.image('boss_run6',  'assets/images/boss_run6.png');
this.load.image('boss_run7',  'assets/images/boss_run7.png');
this.load.image('boss_run8',  'assets/images/boss_run8.png');
this.load.image('boss_run9',  'assets/images/boss_run9.png');
this.load.image('boss_run10', 'assets/images/boss_run10.png');
this.load.image('boss_run11', 'assets/images/boss_run11.png');
```

> **Note**: `boss_run1-11.png` already exist in `assets/images/`. Only `boss_melee1`, `boss_melee2`, and `player_jump` need new load entries.
>
> **Optimization note**: These 14 individual load.image calls are fine for a small game. Future optimization: combine into spritesheets. Not a priority now.

**Effort**: 5 minutes

#### Task 1.3: Create player_run Animation in BootScene.create()

**File**: `src/scenes/BootScene.js`

**Add to `create()` before `this.scene.start('MenuScene')`**:

```javascript
// ── Player Run Animation (11-frame cycle) ──────────────────────
this.anims.create({
    key: 'player_run',
    frames: [
        { key: 'boss_run1' },  { key: 'boss_run2' },  { key: 'boss_run3' },
        { key: 'boss_run4' },  { key: 'boss_run5' },  { key: 'boss_run6' },
        { key: 'boss_run7' },  { key: 'boss_run8' },  { key: 'boss_run9' },
        { key: 'boss_run10' }, { key: 'boss_run11' },
    ],
    frameRate: 16.7,
    repeat: -1,
});
```

> **Design note**: 16.7 fps = 60ms per frame = 660ms cycle. The run animation should feel deliberate and weighty, matching Mafuyu's grounded movement.

**Effort**: 3 minutes

#### Task 1.4: Update Player._onStateEnter() — Mfy Texture Keys

**File**: `src/entities/Player.js`

**Changes**:
1. **Remove** `_stopRunBob()` calls — the old bob system is replaced by Phaser animation
2. **Update** all `setTexture()` calls to use mfy keys:

```javascript
_onStateEnter(state) {
    // Stop any playing animation
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
        this.sprite.anims.stop();
    }

    switch (state) {
        case 'idle':
            this.sprite.setTexture('boss_idle');
            this.sprite.setAngle(0);
            this._startIdleBob();   // NEW
            break;

        case 'run':
            this.sprite.play('player_run');
            this.sprite.setAngle(0);
            this._stopIdleBob();    // NEW
            break;

        case 'jump':
        case 'fall':
            this.sprite.setTexture('player_jump');
            this.sprite.setAngle(0);
            this._stopIdleBob();    // NEW
            break;

        case 'attack1_startup':
        case 'attack1_active':
        case 'attack1_recovery':
            this.sprite.setTexture('boss_melee1');
            this.sprite.setAngle(0);
            this._stopIdleBob();    // NEW
            break;

        case 'attack2_startup':
        case 'attack2_active':
        case 'attack2_recovery':
            this.sprite.setTexture('boss_melee2');
            this.sprite.setAngle(0);
            this._stopIdleBob();    // NEW
            break;

        case 'air_attack_startup':
        case 'air_attack_active':
        case 'air_attack_recovery':
            this.sprite.setTexture('boss_melee1');
            this.sprite.setAngle(0); // No rotation — forward swing reads as downward thrust
            this._stopIdleBob();    // NEW
            break;

        case 'hurt':
            this.sprite.setTexture('boss_idle');  // Could use boss_cower for a crouch
            this.sprite.setAngle(0);
            this.sprite.setTint(0xff6666);
            this._stopIdleBob();    // NEW
            this.scene.time.delayedCall(100, () => {
                if (!this.dead) this.sprite.clearTint();
            });
            break;

        case 'dead':
            this.sprite.setTexture('boss_cower');
            this.sprite.setAngle(0);
            this._stopIdleBob();    // NEW
            break;
    }
}
```

**Effort**: 15 minutes

#### Task 1.5: Update Player Body Sizing

**File**: `src/entities/Player.js`

**Current** (line 9–11):
```javascript
this.sprite.body.setSize(200, 333);
this.sprite.body.setOffset(260, 260);
```

**New** (mfy unified body, 24w × 48h world pixels at 0.12 scale):
```javascript
// Mafuyu body: 24w × 48h world pixels at 0.12 scale
// Source: 24/0.12 = 200, 48/0.12 = 400
this.sprite.body.setSize(200, 400);
// Offset: X = (720 - 200) / 2 = 260, Y = 720 - 400 = 320
this.sprite.body.setOffset(260, 320);
```

**Rationale**: Mafuyu's sprite (720×720 canvas, content ~570×620) is taller than 25miku's sprite. The body needs to extend closer to the bottom of the canvas to match Mafuyu's longer proportions. The `y` offset moves from 260 to 320 to position the bottom of the body at the sprite's foot position.

> **Visual verification**: After this change, playtest and check that the hitbox covers the visible character body. Adjust offset if body appears misaligned (±10px). Mafuyu's sprite dimensions differ slightly from 25miku's, so the exact offset may need tuning.

**Effort**: 2 minutes

#### Task 1.6: Add idleBob Tween Methods

**File**: `src/entities/Player.js`

**Add to constructor** (after `this.dead = false`):
```javascript
this.idleBob = null;
```

**Add new methods**:
```javascript
_startIdleBob() {
    if (this.idleBob) return;
    this.idleBob = this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y + 4,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
    });
}

_stopIdleBob() {
    if (this.idleBob) {
        this.idleBob.stop();
        this.idleBob = null;
    }
}
```

**Add to `reset()`** (at end):
```javascript
this._stopIdleBob();
```

**Effort**: 10 minutes

#### Task 1.7: Remove Stub Methods + Clean Up

**File**: `src/entities/Player.js`

**Replace empty stubs**:
```javascript
// REMOVE these empty methods entirely:
_updateRunBob(left, right) {}    // line 420–421
_stopRunBob() {}                 // line 423–424
```

**Remove** any remaining `_stopRunBob()` calls from `_onStateEnter('idle')` and `reset()` — replaced by `_stopIdleBob()`.

**Effort**: 2 minutes

#### Task 1.8: Update Player Constructor — Remove weapon_sword If Loaded

**File**: `src/entities/Player.js`

Check if `weapon_sword` image is used in the constructor. If there's a line loading or referencing it, remove or comment it out. The weapon is baked into the mfy att1/att2 sprites.

**Review** the `slashHitbox` zone creation — dimensions should remain as Mafuyu values (already updated to 20×18 / 28×22 per the code check). **No change needed**.

**Effort**: 1 minute (verification only)

#### Task 1.9: Playtest — Verify All States Display Correct Mfy Sprites

**Test Checklist**:
- [ ] Idle: shows `boss_idle` (mfy standing pose) with gentle y-bob
- [ ] Run: plays `player_run` animation (11 frames cycling)
- [ ] Jump: shows `player_jump` (jumping pose)
- [ ] Fall: shows `player_jump` (same frame)
- [ ] Attack 1 startup/active/recovery: shows `boss_melee1`
- [ ] Attack 2 startup/active/recovery: shows `boss_melee2`
- [ ] Air attack: shows `boss_melee1`
- [ ] Hurt: shows `boss_idle` with red tint (or `boss_cower` for crouch — designer choice)
- [ ] Dead: shows `boss_cower` with alpha fade
- [ ] Facing right/left: flipX works correctly
- [ ] Body hitbox aligns with visible sprite (no floating hits or phantom hits)

**Effort**: 15 minutes

### 3.2 Sprint 1 — Files Modified Summary

| File | Change | Type |
|------|--------|------|
| `assets/images/player_jump.png` | Copy from `游戏素材/mfy/mfy_run_jump.png` | File copy |
| `src/scenes/BootScene.js` | Add 14 load.image calls + 1 anim.create | Edit |
| `src/entities/Player.js` | Update `_onStateEnter` mfy keys, body sizing, add idleBob methods, remove stubs | Edit |

### 3.3 Sprint 1 — Acceptance Criteria

1. Player displays as Mafuyu (purple hair) in all states — no 25miku (teal hair) visible
2. Run animation cycles correctly when moving left/right
3. Idle bob is visible and pleasing (not distracting)
4. Body hitbox aligns with mfy sprite (no "ghost hits" from wrong offset)
5. Jump, attack, hurt, and death all show appropriate mfy sprites
6. No console errors for missing textures

---

## 4. Sprint 2: Player Animation Polish + Boss Visuals (P1)

**Goal**: Add animation polish (jump squash/stretch, landing impact) and update boss attack visuals to use correct melee frames.

### 4.1 Task Breakdown

#### Task 2.1: Jump Squash/Stretch

**File**: `src/entities/Player.js`

Add squash on jump departure and landing:

```javascript
// In _handleMoveState, when entering jump state:
if (jump && this.onGround) {
    this.body.setVelocityY(JUMP_VEL);
    // Squash before jump (compress then release)
    this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 0.85,
        scaleX: 1.15,
        duration: 50,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
            this.sprite.setScale(0.12); // restore normal scale
        },
    });
    this._enterState('jump');
    return;
}
```

**Landing squash** — detect transition from jump/fall to idle:

In `_handleMoveState` or create a `_onLand()` callback. The landing is detected when `this.onGround` transitions from false to true.

```javascript
// Detect landing (add at top of _handleMoveState or in update())
if (!this._wasOnGround && this.onGround && (this.state === 'jump' || this.state === 'fall')) {
    this._onLand();
}
this._wasOnGround = this.onGround; // add this._wasOnGround = true in constructor
```

```javascript
_onLand() {
    this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 0.8,
        scaleX: 1.2,
        duration: 60,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
            this.sprite.setScale(0.12);
        },
    });
}
```

**Add** `this._wasOnGround = true;` to constructor.

**Enhance air attack landing** — in `_handleAirAttackState`, add a similar landing squash when `this.onGround` transitions to true.

**Effort**: 20 minutes

#### Task 2.2: Boss Melee Active — Use boss_melee1 Texture

**File**: `src/entities/BossMafuyu.js`

**Current** (line 197–204):
```javascript
case 'melee_telegraph':
    this.sprite.setTexture('boss_attack');
    // ...
case 'melee_active':
    this.body.setVelocityX(0);
    this.stateTimer -= dt;
    this._updateMeleeHitbox();
    // Missing: different texture for the swing itself
```

**Change**: Add `this.sprite.setTexture('boss_melee1');` in `melee_active` case:
```javascript
case 'melee_active':
    this.sprite.setTexture('boss_melee1');  // ← SWING texture (was missing)
    this.body.setVelocityX(0);
    this.stateTimer -= dt;
    this._updateMeleeHitbox();
    if (this.stateTimer <= 0) {
        this._disableMeleeHitbox();
        this._enterBossState('melee_recovery');
    }
    break;
```

**Why**: The boss currently shows the telegraph pose (`boss_attack`) during the active swing frames. The actual sword swing should show `boss_melee1.png` (mfy_att1 pose) which has the sword in mid-swing.

> **Note**: `boss_melee1` and `boss_melee2` are loaded in Sprint 1 (Task 1.2). If Sprint 1 hasn't been done yet, add these two load calls to BootScene.

**Effort**: 2 minutes

#### Task 2.3: Boss Melee Recovery — Use boss_cower for Vulnerability

**File**: `src/entities/BossMafuyu.js`

Already uses `boss_idle` for recovery. Consider switching to `boss_cower` for a more readable "I'm vulnerable" state. This is a design touch that improves telegraph readability.

**Current** (line 206–211):
```javascript
case 'melee_recovery':
    this.body.setVelocityX(0);
    this.sprite.setTexture('boss_idle');
```

**Recommended**: Keep as `boss_idle` for now — the recovery is only 0.8s and the player already knows to attack during this window. Over-use of `boss_cower` would dilute its meaning. Defer to playtest feedback.

**Effort**: 0 (design decision, no code change)

#### Task 2.4: Verify Boss All States Texture Mapping

**File**: `src/entities/BossMafuyu.js`

**Complete texture audit**:

| State | Current Texture | Correct? | Notes |
|-------|----------------|----------|-------|
| idled (Phase 1) | `boss_idle` | ✅ | Correct |
| idle (Phase 2) | `boss_liberation` | ✅ | Matches liberated form |
| melee_telegraph | `boss_attack` | ✅ | Telegraph pose |
| melee_active | `boss_attack` | ❌ | Should be `boss_melee1` — see Task 2.2 |
| melee_recovery | `boss_idle` | ✅ | Returning to neutral |
| dash_telegraph | `boss_dash` | ✅ | Correct |
| dash_active | `boss_dash` | ✅ | Correct |
| dash_recovery | `boss_cower` | ✅ | Vulnerable after dash |
| liberation_telegraph | `boss_liberation` | ✅ | Correct |
| liberation_active | `boss_liberation` | ✅ | Correct |
| liberation_recovery | `boss_cower` | ✅ | Vulnerable after dive |
| phase_transition | `boss_liberation` | ✅ | Correct |
| dead | `boss_cower` | ✅ | Defeated pose |

**Effort**: 5 minutes

#### Task 2.5: Audio File Verification

**File**: `src/scenes/BootScene.js` (audio loads)

**Check** all 21 audio load paths against actual files on disk. The audio directory has partial files. Missing files will cause console warnings but won't crash the game.

**Known gaps** (from directory listing):
- `sfx_combo_feelings_02.mp3` exists but loaded as `sfx_combo_feelings` (should use `_01.mp3` or update path — current code loads `sfx_combo_feelings` which maps to `sfx/combo/sfx_combo_feelings_01.mp3`)
- All other files appear to exist

**Action**: No changes needed unless testing shows missing-audio warnings. Audio is non-blocking in Phaser — missing files just log warnings.

**Effort**: 5 minutes (verification only)

### 4.2 Sprint 2 — Files Modified Summary

| File | Change | Type |
|------|--------|------|
| `src/entities/Player.js` | Add jump squash/stretch, landing detection + `_onLand()`, `_wasOnGround` | Edit |
| `src/entities/BossMafuyu.js` | Add `boss_melee1` to `melee_active` state | Edit |

### 4.3 Sprint 2 — Acceptance Criteria

1. Player scale squashes/stretches on jump start and landing (visible 100ms effect)
2. Landing squash plays when transitioning from air to ground in ALL states (jump, fall, air attack)
3. Boss melee attack shows `boss_melee1` texture during active swing frames (not telegraph pose)
4. No visual regression: all other boss states look correct

---

## 5. Sprint 3: Feelings Special Attack + Death Sequence (P1)

**Goal**: Implement the Feelings special attack (consume 50 meter for wide slash) and enhance the player death sequence with the defeat/vanish sprite progression.

### 5.1 Task Breakdown

#### Task 3.1: Special Attack State Machine

**File**: `src/entities/Player.js`

**Design Spec** (from `design/combat-design.md` §1.8):
- Cost: 50 Feelings
- Damage: 35 base
- Hitbox: 64w × 48h (wider than normal attacks)
- Hitstop: 8f (133ms)
- Screen shake: 6px
- Visual: Sword glows white-blue when meter ≥ 50

**Implementation Plan**:

**Step 1 — Add state cases to `update()` switch**:
```javascript
case 'special_startup':
    this._handleSpecialStartup(dt);
    break;
case 'special_active':
    this._handleSpecialActive(dt);
    break;
case 'special_recovery':
    this._handleSpecialRecovery(dt);
    break;
```

**Step 2 — Add trigger in `_handleMoveState`**:
Special activates when J/Z is pressed AND feelings ≥ 50 AND on ground. Use a held-key detection or a double-press. Simplest approach: if feelings ≥ 50 and attack is pressed, check if a modifier key is held OR use a special key (e.g., `K` or `F`).

**Recommended**: Use the same J/Z key but check if feelings ≥ 50 AND comboCount ≥ 3 (to prevent accidental activation). Or use a dedicated `special` key (K).

```javascript
// Add to input setup in both GameScene and BossScene:
this.keys.special = this.input.keyboard.addKey('K');

// In Player._handleMoveState (or _handleAirState):
const special = this.scene.keys.special?.isDown;
if (special && this.feelings >= 50 && this.onGround) {
    this._enterState('special_startup');
    return;
}
```

**Step 3 — Special state durations**:
```javascript
case 'special_startup': return at60fps(15);  // 250ms windup
case 'special_active': return at60fps(10);   // 167ms active
case 'special_recovery': return at60fps(15); // 250ms recovery
```

**Step 4 — Special texture and behavior**:
```javascript
// In _onStateEnter:
case 'special_startup':
    this.sprite.setTexture('boss_melee2');  // Wide arc pose
    this.sprite.setTint(0xa8d8ff);  // White-blue glow
    this.feelings -= 50;
    this._stopIdleBob();
    break;
case 'special_active':
    this.sprite.setTexture('boss_melee2');
    this._updateSpecialHitbox();
    this._stopIdleBob();
    break;
case 'special_recovery':
    this.sprite.setTexture('boss_idle');
    this.sprite.clearTint();
    this._stopIdleBob();
    break;
```

**Step 5 — Special hitbox**:
```javascript
_updateSpecialHitbox() {
    const dir = this.facingRight ? 1 : -1;
    const w = 64, h = 48;
    this.slashHitbox.body.setSize(w, h);
    if (dir > 0) {
        this.slashHitbox.body.x = this.body.x + this.body.width + 2;
    } else {
        this.slashHitbox.body.x = this.body.x - 2 - w;
    }
    this.slashHitbox.body.y = this.body.y + 4;
}
```

**Step 6 — Damage values**:
Add `case 'special_active':` to damage lookup in both `BossScene._onPlayerHitBoss()` and `GameScene._onPlayerHitEnemy()`:
```javascript
case 'special_active':
    dmg = 35; kbx = 300; kby = -100; shake = 6; hitStop = 133;
    break;
```

**Step 7 — Special handler methods**:
```javascript
_handleSpecialStartup(dt) {
    this.body.setVelocityX(0);
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) this._enterState('special_active');
}

_handleSpecialActive(dt) {
    this.body.setVelocityX(0);
    this.stateTimer -= dt;
    this._updateSpecialHitbox();
    if (this.stateTimer <= 0) {
        this._disableHitbox();
        this.sprite.clearTint();
        this._enterState('special_recovery');
    }
}

_handleSpecialRecovery(dt) {
    this.body.setVelocityX(0);
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) this._enterState('idle');
}
```

**Step 8 — UI feedback**: When Feelings ≥ 50, the Feelings bar should visually indicate "special ready". The HUD already renders the bar. Add a glow effect:

```javascript
// In HUD.drawFeelings(), when value >= 50:
if (value >= 50) {
    // Pulsing glow overlay
    const pulse = 0.6 + 0.4 * Math.sin(this.scene.time.now / 200);
    this.feelFill.fillStyle(0xa8d8ff, pulse);
    this.feelFill.fillRoundedRect(bx - 1, by - 1, (barW + 2) * pct, barH + 2, 2);
}
```

**Effort**: 1.5 hours

#### Task 3.2: Player Death Animation — Defeat/Vanish Sequence

**File**: `src/entities/Player.js`

**Current**: Death just fades alpha on `boss_cower` frame.

**Proposed**: Use the defeat/vanish sprite textures for a more dramatic sequence.

**Approach**: Since the defeat/vanish sprites are still 25miku sprites and we're switching to mfy, we have two options:
- **Option A**: Use the existing PJSK mfy artist's sprites if available. **No dedicated mfy defeat frames exist** per the art plan.
- **Option B**: Use the simple alpha fade (current) but add particle effects (teal fragment burst) for more drama. This is the pragmatic choice.

**Recommended**: Option B with enhanced particles.

```javascript
die() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.sprite.setVelocity(0, 0);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setTexture('boss_cower');
    this._stopIdleBob();

    this.scene.sound.play('sfx_player_death', { volume: 0.8 });

    // Enhanced death particles — Mafuyu dissolves into teal fragments
    for (let i = 0; i < 12; i++) {
        const p = this.scene.add.circle(
            this.x + Phaser.Math.Between(-15, 15),
            this.y + Phaser.Math.Between(-20, 10),
            Phaser.Math.Between(2, 5),
            0xa8d8ff, 0.9
        ).setDepth(50);
        this.scene.tweens.add({
            targets: p,
            x: p.x + Phaser.Math.Between(-40, 40),
            y: p.y + Phaser.Math.Between(-60, 20),
            alpha: 0, scale: 0.1,
            duration: Phaser.Math.Between(600, 1200),
            ease: 'Power2',
            onComplete: () => p.destroy(),
        });
    }

    // Fade sprite
    this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
    });
}
```

**Effort**: 15 minutes

#### Task 3.3: Add Special Key to Both Scenes

**File**: `src/scenes/GameScene.js` and `src/scenes/BossScene.js`

Add the special key binding in both `_createInput()` methods:

```javascript
// In GameScene._createInput() and BossScene._createInput():
this.keys.special = this.input.keyboard.addKey('K');
// OR use a combo: Shift + J
// this.keys.specialMod = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
```

Also add keyboard listener:
```javascript
this.input.keyboard.on('keydown-K', () => {
    if (this.player && !this.player.dead) this.player.specialPressed();
});
```

And add the method to Player:
```javascript
specialPressed() {
    if (this.dead) return;
    // Signal is handled in update() via key state check
    // OR set a flag:
    this.specialRequested = true;
}
```

**Simpler approach**: Check key state directly in update:
```javascript
// In Player.update():
const special = this.scene.keys.special?.isDown;
```

No need for event listeners — just check the key state in the existing update flow.

**Effort**: 5 minutes

### 5.2 Sprint 3 — Files Modified Summary

| File | Change | Type |
|------|--------|------|
| `src/entities/Player.js` | Add special attack states + handlers, enhanced death particles | Edit |
| `src/scenes/BossScene.js` | Add special key binding, damage value for special_active | Edit |
| `src/scenes/GameScene.js` | Add special key binding, damage value for special_active | Edit |
| `src/HUD.js` | Add special-ready glow when feelings ≥ 50 | Edit |

### 5.3 Sprint 3 — Acceptance Criteria

1. Player can use special attack (K key) when feelings ≥ 50
2. Special attack consumes 50 feelings, deals 35 damage
3. Special attack has wider hitbox and longer hitstop
4. Player death produces 12 particle fragments (teal burst)
5. Boss and overworld hit detection both handle `special_active` case
6. Feelings bar glows when special is ready (≥50)
7. No regression: normal attacks still work

---

## 6. Sprint 4: Map Content — Collectibles + Game Loop (P2)

**Goal**: Fill the expanded 4400px world with collectibles (HP shards, Feelings fragments), populate the secret alcove, and add meaningful exploration rewards.

### 6.1 Task Breakdown

#### Task 4.1: Collectible Pickup System

**New file**: `src/collectibles/Collectible.js`

A base class for collectible items:

```javascript
class Collectible {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.collected = false;

        // Visual: glowing teal shard (rectangle or circle)
        this.sprite = scene.physics.add.staticSprite(x, y, config.textureKey || 'col_hp_shard');
        this.sprite.setDepth(8);
        this.sprite.setAlpha(0.9);

        // Light bob tween
        scene.tweens.add({
            targets: this.sprite,
            y: y - 4,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Collection overlap
        scene.physics.add.overlap(scene.player.sprite, this.sprite, () => {
            if (!this.collected) {
                this.collected = true;
                config.onCollect(scene.player);
                this._collectEffect();
            }
        });
    }

    _collectEffect() {
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0, scale: 2,
            duration: 200,
            ease: 'Power2',
            onComplete: () => this.sprite.destroy(),
        });
    }
}
```

#### Task 4.2: HP Shard Collectible

**Design**:
- Visual: Small teal heart/gem (programmatic: 8×8 rectangle with glow)
- Effect: Restore 10 HP
- Placement: 6–8 scattered across the world, 1 in secret alcove

**Texture generation** in `BootScene.create()`:
```javascript
// HP Shard texture (8x8)
const hs = this.make.graphics({ add: false });
hs.fillStyle(0x2EC4B6, 1);
hs.fillRect(1, 1, 6, 6);
hs.fillStyle(0x7FE0DE, 0.7);
hs.fillRect(2, 2, 4, 4);
hs.generateTexture('col_hp_shard', 8, 8);
hs.destroy();
```

**Placement** in `GameScene._createCollectibles()`:
```javascript
_createCollectibles() {
    this.collectibles = [];

    const hpShards = [
        // Section 1: Intro
        { x: 200, y: 530 },  // Before first enemies
        // Section 2: Ascent
        { x: 700, y: 350 },  // On platform
        // Section 3: Upper Branch — Secret Alcove
        { x: 1520, y: 140 }, // Reward for exploring upper path
        // Section 4
        { x: 2100, y: 340 }, // On mid platform
        { x: 2600, y: 310 }, // On high platform
        // Section 5: Pre-boss
        { x: 3300, y: 400 }, // Between enemies
        { x: 3800, y: 510 }, // Pre-boss rest area
    ];

    hpShards.forEach(pos => {
        const c = new Collectible(this, pos.x, pos.y, {
            textureKey: 'col_hp_shard',
            onCollect: (player) => {
                player.heal(10);
                this._spawnCollectParticles(pos.x, pos.y);
            },
        });
        this.collectibles.push(c);
    });
}
```

**Add** `_spawnCollectParticles()`:
```javascript
_spawnCollectParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        const p = this.add.circle(x, y, 3, 0x2EC4B6, 0.8).setDepth(50);
        this.tweens.add({
            targets: p,
            x: p.x + Phaser.Math.Between(-20, 20),
            y: p.y + Phaser.Math.Between(-20, 20),
            alpha: 0, scale: 0.2,
            duration: 300, ease: 'Power2',
            onComplete: () => p.destroy(),
        });
    }
}
```

#### Task 4.3: Feelings Fragment Collectible

**Design**:
- Visual: Larger purple crystal (12×12, triangular or diamond)
- Effect: +15 Feelings
- Placement: 4–5 across world

**Texture generation**:
```javascript
// Feelings Fragment texture (12x12)
const ff = this.make.graphics({ add: false });
ff.fillStyle(0x7B52C0, 1);
ff.fillTriangle(6, 0, 0, 12, 12, 12);
ff.fillStyle(0x9966ff, 0.6);
ff.fillTriangle(6, 2, 2, 10, 10, 10);
ff.generateTexture('col_feelings', 12, 12);
ff.destroy();
```

**Placement**:
```javascript
const feelShards = [
    { x: 500, y: 520 },
    { x: 1200, y: 450 },
    { x: 2300, y: 390 },
    { x: 3100, y: 350 },
];

feelShards.forEach(pos => {
    const c = new Collectible(this, pos.x, pos.y, {
        textureKey: 'col_feelings',
        onCollect: (player) => {
            player.feelings = Math.min(100, player.feelings + 15);
            this._spawnCollectParticles(pos.x, pos.y);
        },
    });
    this.collectibles.push(c);
});
```

#### Task 4.4: Secret Alcove Reward

**Location**: Section 3 Upper Branch — x=1472, y=159 is the alcove.

**Place** a special collectible: HP Shard + Feelings Fragment together. Or a unique "Memory Fragment" that acts as a progression key (for future gating).

**For now**: Place both an HP shard and a Feelings fragment at the alcove position so players who find the secret path get double reward.

#### Task 4.5: Add Collectible to index.html

```html
<script src="src/collectibles/Collectible.js"></script>
```

Add after the enemies' script tags.

### 6.2 Sprint 4 — Files Modified Summary

| File | Change | Type |
|------|--------|------|
| `src/scenes/BootScene.js` | Add collectible texture generation | Edit |
| `src/scenes/GameScene.js` | Add `_createCollectibles()`, collectible array, particle effects, call in `create()` | Edit |
| `src/collectibles/Collectible.js` | New file | New |
| `index.html` | Add `Collectible.js` script tag | Edit |

### 6.3 Sprint 4 — Acceptance Criteria

1. HP shards restore 10 HP when collected
2. Feelings fragments give +15 Feelings
3. Collection shows brief visual effect (particle burst + scale pop)
4. 7 HP shards + 4 Feelings fragments placed across the world
5. Secret alcove has reward items
6. Collectibles are not in enemy spawn positions
7. Collectibles respawn on game restart (but not mid-session)

---

## 7. Sprint 5: Save/Load + Menu (P2)

**Goal**: Implement basic save/load system using localStorage, enable CONTINUE menu item, add CREDITS scene.

### 7.1 Task Breakdown

#### Task 5.1: Save Data Manager

**New file**: `src/SaveManager.js`

```javascript
class SaveManager {
    static SAVE_KEY = 'sekai_game_save';

    static save(data) {
        const saveData = {
            hp: data.hp || 100,
            feelings: data.feelings || 0,
            position: data.position || { x: 120, y: 480 },
            bossDefeated: data.bossDefeated || false,
            collectiblesCollected: data.collectiblesCollected || [],
            timestamp: Date.now(),
            version: 1,
        };
        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.warn('Save failed:', e);
            return false;
        }
    }

    static load() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data.version !== 1) return null; // version mismatch
            return data;
        } catch (e) {
            console.warn('Load failed:', e);
            return null;
        }
    }

    static hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    static delete() {
        localStorage.removeItem(this.SAVE_KEY);
    }
}
```

#### Task 5.2: Save Points in GameScene

**Design**: Save points are triggered when:
1. Player collects a major collectible (boss arena key)
2. Player enters the boss room (auto-save before boss)
3. Player finds a save point in the world (glowing crystal)

**Simplified approach**: Auto-save at key moments:
```javascript
// In GameScene._onBossResult(result):
if (result.victory) {
    SaveManager.save({
        hp: this.player.hp,
        feelings: this.player.feelings,
        position: { x: 120, y: 480 },
        bossDefeated: true,
    });
}

// Player death in GameScene would load from save...
// But currently there's no death outside boss fight.
```

#### Task 5.3: Enable CONTINUE Menu Item

**File**: `src/scenes/MenuScene.js`

In `create()`, after checking for save data:
```javascript
_createMenuItems() {
    const hasSave = SaveManager.hasSave();

    this.menuItems = [
        {
            key: 'new_game',
            text: 'NEW GAME',
            y: 260,
            selectable: true,
            action: 'startGame',
        },
        {
            key: 'continue',
            text: 'CONTINUE',
            y: 310,
            selectable: hasSave,  // ← Dynamic based on save existence
            action: hasSave ? 'continueGame' : null,
            locked: !hasSave,
        },
        {
            key: 'credits',
            text: 'CREDITS',
            y: 360,
            selectable: true,     // ← Enable (will launch CreditsScene)
            action: 'showCredits',
            locked: false,
        },
    ];
}
```

**Update `_confirm()`** to handle `continueGame`:
```javascript
if (item.action === 'continueGame') {
    this._transitionToGame({ continueData: SaveManager.load() });
}
```

**Update `SceneManager.goTo()` call** in `_transitionToGame()` to pass optional save data to BootScene/GameScene.

#### Task 5.4: Player Reset on New Game

**File**: `src/scenes/GameScene.js`

When starting a new game (no save), ensure fresh state:
```javascript
create(data) {
    this.isContinue = data?.continueData ? true : false;
    if (this.isContinue) {
        // Restore from save
        this.player.hp = data.continueData.hp;
        this.player.feelings = data.continueData.feelings;
        this.player.sprite.setPosition(
            data.continueData.position.x,
            data.continueData.position.y
        );
        this.bossDefeated = data.continueData.bossDefeated;
        this.collectedFlags = data.continueData.collectiblesCollected || [];
    }
    // ...
}
```

#### Task 5.5: CREDITS Scene

**New file**: `src/scenes/CreditsScene.js`

Simple scroll text scene:
```javascript
class CreditsScene extends Phaser.Scene {
    constructor() {
        super('CreditsScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#0a0a1a');
        this.cameras.main.fadeIn(500);

        const lines = [
            'SEKAI GAME',
            '',
            'A 25-ji Metroidvania',
            '',
            '─── Team ───',
            'Game Design: lidure',
            'Programming: lidure',
            'Art: Project SEKAI (fan art)',
            'Sound: CC0 assets from OpenGameArt',
            '',
            '─── Special Thanks ───',
            'SEGA / Colorful Palette',
            'Project SEKAI community',
            'Phaser 3 team',
            'OpenGameArt contributors',
            '',
            '─── Built With ───',
            'Phaser 3.87',
            'Arcade Physics',
            'JavaScript (ES6)',
            'GitHub Pages',
            '',
            '',
            'Press J or ESC to return',
        ];

        this.text = this.add.text(400, 650, lines.join('\n'), {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
            align: 'center',
        }).setOrigin(0.5, 1).setDepth(10);

        // Auto-scroll
        this.scrollSpeed = 30; // px/s
        this.scrollY = 650;

        // Input to return
        this.input.keyboard.on('keydown-J', () => this._returnToMenu());
        this.input.keyboard.on('keydown-ESC', () => this._returnToMenu());
        this.input.keyboard.on('keydown-SPACE', () => this._returnToMenu());
    }

    update(time, delta) {
        this.scrollY -= this.scrollSpeed * (delta / 1000);
        this.text.y = this.scrollY;
    }

    _returnToMenu() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
            this.scene.start('MenuScene');
        });
    }
}
```

**Register in `game.js`**:
```javascript
scene: [BootScene, MenuScene, GameScene, BossScene, CreditsScene],
```

**Add to `index.html`**:
```html
<script src="src/scenes/CreditsScene.js"></script>
```

#### Task 5.6: Save Key on Boss Defeat + Rest Points

Add additional auto-save points:
- When entering the boss room (save HP/position)
- When collecting a major item

**Update `GameScene._startBossBattle()`**:
```javascript
_startBossBattle() {
    // Auto-save before boss
    SaveManager.save({
        hp: this.player.hp,
        feelings: this.player.feelings,
        position: { x: 120, y: 480 }, // respawn at start
        bossDefeated: false,
    });
    // ... existing launch overlay code
}
```

### 7.2 Sprint 5 — Files Modified Summary

| File | Change | Type |
|------|--------|------|
| `src/SaveManager.js` | New file | New |
| `src/scenes/CreditsScene.js` | New file | New |
| `src/scenes/MenuScene.js` | Enable CONTINUE if save exists, add CREDITS action | Edit |
| `src/scenes/GameScene.js` | Handle continue data, auto-save on boss entry | Edit |
| `game.js` | Add CreditsScene to scene list | Edit |
| `index.html` | Add SaveManager.js + CreditsScene.js script tags | Edit |

### 7.3 Sprint 5 — Acceptance Criteria

1. Save persists across browser refreshes (localStorage)
2. CONTINUE menu item is active when save exists, grayed out otherwise
3. CONTINUE restores player HP, feelings, and position
4. CREDITS scene scrolls text and returns to menu on J/ESC
5. Auto-save fires when entering boss room
6. Auto-save fires on boss victory

---

## 8. Balance Tuning

### 8.1 Current Values vs. Design Target

| Metric | Current Value | Target | Assessment |
|--------|--------------|--------|------------|
| Player Max HP | 100 | 100 | ✅ On target |
| Slash 1 Damage | 13 | 13 | ✅ On target |
| Slash 2 Damage | 22 | 22 | ✅ On target |
| Air Damage | 18 | 18 | ✅ On target |
| Combo (S1+S2) | 35 | 35 | ✅ On target |
| Boss HP | 300 | 300 | ✅ On target |
| Phase 1 HP | 300→151 | 300→151 | ✅ On target |
| Phase 2 HP | 150→0 | 150→0 | ✅ On target |
| Desperation HP | ≤50 | ≤50 | ✅ On target |
| Feelings on Hit | +8 | +8 | ✅ On target |
| Feelings on Kill (Shadow) | +2 | +2 | ✅ On target |
| Feelings on Kill (Shard) | +5 | +5 | ✅ On target |
| Feelings on Damage | +5 | +5 | ✅ On target |
| Contact Damage (Shadow) | 5 | 5 | ✅ On target |
| Contact Damage (Shard) | 8 | 8 | ✅ On target |
| Boss Pattern A Damage | 12 | 12 | ✅ On target |
| Boss Pattern B Damage | 15 | 15 | ✅ On target |
| Boss Pattern C Damage | 20 | 20 | ✅ On target |
| Boss Pattern D Per Dash | 10 | 10 | ✅ On target |

### 8.2 Hitbox Value Comparison

| Hitbox | Current | Design Spec | Match? |
|--------|---------|-------------|--------|
| Slash 1 Width | 20 | 20 | ✅ |
| Slash 1 Height | 18 | 18 | ✅ |
| Slash 1 Y Offset | 12 | 12 | ✅ |
| Slash 2 Width | 28 | 28 | ✅ |
| Slash 2 Height | 22 | 22 | ✅ |
| Slash 2 Y Offset | 10 | 10 | ✅ |
| Air Width | 16 | 16 | ✅ |
| Air Height | 24 | 24 | ✅ |
| Air Y Offset | body.h × 0.55 | body.h × 0.55 | ✅ |

### 8.3 Enemy TTK (Time to Kill) Analysis

| Enemy | HP | Slash 1 (13) | Slash 2 (22) | Air (18) | Combo (35) |
|-------|----|-------------|-------------|----------|------------|
| Shadow Fragment | 3 | 1 hit ✓ | 1 hit ✓ | 1 hit ✓ | — |
| Floating Shard | 4 | 1 hit ✓ | 1 hit ✓ | 1 hit ✓ | — |
| Boss Phase 1 (150 HP) | 150 | 12 hits | 7 hits | 9 hits | 5 combos |
| Boss Phase 2 (150 HP) | 150 | 12 hits | 7 hits | 9 hits | 5 combos |

**Assessment**: Enemy TTK is exactly where it should be. Common enemies die in 1 hit, creating a satisfying power fantasy. The boss requires sustained effort (~10 full combos = ~3 minutes of focused play).

### 8.4 Special Attack Balance

Once implemented (Sprint 3):

| Metric | Value | Rationale |
|--------|-------|-----------|
| Cost | 50 Feelings | Requires landing ~7 hits to charge |
| Damage | 35 | More than a full combo (35 = S1+S2) |
| DPE (Damage per Feelings) | 0.7 | Efficient use of meter |
| S1+S2 combo DPE | 0.35 (35 dmg / 16 feelings) | Normal combo is less meter-efficient |
| Hitstop | 133ms (8f) | Dramatic impact, rewards landing it |
| Screen shake | 6px | Matches "ultimate attack" feel |

**Tuning note**: If the special attack feels too powerful or too weak, adjust:
- **Too strong**: Reduce damage to 30 or increase cost to 60
- **Too weak**: Reduce cost to 40 or increase damage to 40
- Leave initial implementation at 50 cost / 35 damage and playtest

### 8.5 Boss Recommended Tuning After Sprint 2

After the melee texture fix and with all QA bugs resolved, the boss should be retested:

| Check | Expected | If Wrong |
|-------|----------|----------|
| Phase 1 clear time | ~60s (experienced) | Adjust AI cooldowns (±0.5s) |
| Phase 2 clear time | ~60s (experienced) | Adjust Pattern C cooldown (6s) |
| Player deaths per clear | 1–3 for first-time | Adjust contact damage threshold |
| Phase Transition reliability | Always plays, boss invuln | Verify C-04/C-05 fixes |
| Liberation dive lands | Always completes | Verify gravity fix (Task 2.4) |

---

## 9. Implementation Dependencies

### 9.1 Task Dependency Graph

```
Sprint 1: Player Mafuyu Visual Switch (P0)
  ├── Task 1.1: Copy mfy_run_jump.png
  ├── Task 1.2: BootScene preload — add mfy loads
  ├── Task 1.3: BootScene create — player_run animation
  ├── Task 1.4: Player._onStateEnter — mfy texture keys
  ├── Task 1.5: Player body sizing (200×400)
  ├── Task 1.6: idleBob methods
  ├── Task 1.7: Remove stub methods
  ├── Task 1.8: Verify constructor
  └── Task 1.9: Playtest
  │
  ├──▶ Sprint 2: Animation Polish + Boss (P1)
  │     ├── Task 2.1: Jump squash/stretch          ← needs Sprint 1 done
  │     ├── Task 2.2: Boss melee_active texture    ← needs Sprint 1 (boss_melee1 loaded)
  │     └── Task 2.5: Audio verification
  │     │
  │     └──▶ Sprint 3: Special Attack + Death (P1)
  │           ├── Task 3.1: Special state machine   ← needs Sprint 2 (polish done)
  │           ├── Task 3.2: Death particles
  │           └── Task 3.3: Special key binding
  │
  ├──▶ Sprint 4: Map Content + Collectibles (P2)
  │     ├── Task 4.1: Collectible base class
  │     ├── Task 4.2: HP shards
  │     ├── Task 4.3: Feelings fragments
  │     ├── Task 4.4: Secret alcove reward
  │     └── Task 4.5: index.html update
  │     │
  │     └──▶ Sprint 5: Save/Load + Menu (P2)
  │           ├── Task 5.1: SaveManager class
  │           ├── Task 5.2: Save points in GameScene
  │           ├── Task 5.3: Enable CONTINUE menu
  │           ├── Task 5.4: Player reset on new game
  │           ├── Task 5.5: CREDITS scene
  │           └── Task 5.6: Save on boss entry
  │
  └── (Sprint 1 is independent of all others — can start immediately)
```

### 9.2 Parallelization Opportunities

All sprints can be done sequentially, but these tasks can be parallelized:
- Sprint 1.1 (file copy) can be done at any time
- Sprint 2.5 (audio verification) can be done at any time
- Sprint 5.1 (SaveManager class) is independent of all other work

### 9.3 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| mfy sprite body offset wrong | Medium | Medium | Playtest after Sprint 1.2; adjust offset ±10px |
| mfy_run_jump.png is wrong frame for jump arc | Low | Low | Jump is fast (~0.5s); single frame is acceptable |
| Special attack too strong/weak | Medium | Low | Tuning knobs: damage ±5, cost ±10 |
| Save system has cross-browser issues | Low | Medium | Use try/catch on localStorage; fall back gracefully |
| Audio files missing from disk | Medium | Low | Phaser warns but doesn't crash; add placeholder if needed |
| Performance with 20+ game objects | Low | Medium | 9 shadows + 5 shards + collectibles + particles = ~40 objects min |

---

## Appendix: Key File Reference

| File | Responsibility | Sprint |
|------|---------------|--------|
| `src/scenes/BootScene.js` | Load all textures + generate textures + anims | 1, 4 |
| `src/entities/Player.js` | Player state machine, textures, body, special attack | 1, 2, 3 |
| `src/entities/BossMafuyu.js` | Boss AI, textures | 2 |
| `src/scenes/GameScene.js` | World layout, enemy spawn, collectibles, save triggers | 4, 5 |
| `src/scenes/BossScene.js` | Boss arena, damage values for special attack | 3 |
| `src/scenes/MenuScene.js` | CONTINUE enable, CREDITS navigation | 5 |
| `src/HUD.js` | Special-ready glow on feelings bar | 3 |
| `src/SaveManager.js` | NEW - localStorage save/load | 5 |
| `src/scenes/CreditsScene.js` | NEW - credits scroll text | 5 |
| `src/collectibles/Collectible.js` | NEW - collectible base class | 4 |
| `index.html` | Add new script tags | 3, 4, 5 |
| `game.js` | Add CreditsScene to scene list | 5 |

---

> **End of Sprint Plan.** All tasks reference existing design documents and code files. Estimated total: ~13 hours implementation + ~3 hours testing.
