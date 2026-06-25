# QA Report — Phase 2: Level Restructure, Bat, Skeleton, NPCs, Death Animation, Credits, Audio

**Date**: 2026-06-25
**Tester**: qa-tester (automated code review)
**Files Reviewed**: Bat.js, Skeleton.js, NPC.js, CreditsScene.js, Player.js, MapView.js, GameScene.js, BossScene.js, MenuScene.js, BootScene.js, Enemy.js, BossMafuyu.js, Bench.js, Collectible.js, AbilityGate.js, PauseMenu.js, HUD.js, SceneManager.js, index.html, game.js

---

## Per-Feature Verdict

| Feature | Verdict | Critical | Major | Minor |
|---------|---------|:--------:|:-----:|:-----:|
| Level Restructuring | **PASS** (with minor concerns) | 0 | 0 | 1 |
| Bat Enemy | **BUGS FOUND** | 0 | 1 | 1 |
| Skeleton Enemy | **BUGS FOUND** | 0 | 1 | 1 |
| NPC System | **PASS** | 0 | 0 | 0 |
| Death Animation | **BUGS FOUND** | 1 | 1 | 0 |
| Credits Scene | **BUGS FOUND** | 0 | 0 | 2 |
| Audio Integration | **BUGS FOUND** | 0 | 2 | 1 |

**Overall**: Phase 2 introduces substantial new content with generally solid implementation. However, several functional defects exist — most critically, **player death in GameScene is unrecoverable** (BUG-012), and the **Bat's vertical movement is non-functional** (BUG-013). Audio has one dead listener (BUG-017) and the boss phase transition has a physics/sprite desync (BUG-015).

---

## Bug Reports

---

### BUG-011: `player_att2` texture is loaded but never used (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **Files** | `src/scenes/BootScene.js:11`, `src/entities/Player.js:651-677` |
| **Feature** | Level Restructuring (incidental) |

**Description**: The `player_att2` texture is loaded in BootScene (line 11) from `assets/images/player_mfy/mfy_att2.png`, but `Player.js` never uses it. All six attack states in `_onStateEnter()` (`attack1_startup`, `attack1_recovery`, `attack1_active`, `attack2_startup`, `attack2_recovery`, `attack2_active`, `air_attack_*`) reference `player_att1` exclusively (lines 651, 655, 661, 665, 669, 677). This means Attack1 and Attack2 show visually identical frames.

**Reproduction**: This is a static code issue; no runtime action required.

**Expected**: `attack2_startup` and `attack2_active` should use `player_att2` to visually distinguish the two attack types.

**Actual**: Both attacks display the same `player_att1` texture.

**Suggested Fix**: In `_onStateEnter()`, change `attack2_startup`, `attack2_recovery`, and `attack2_active` cases to use `player_att2`:
```javascript
case 'attack2_startup':
    this._setTextureStable('player_att2');  // was 'player_att1'
    break;
case 'attack2_active':
    this._setTextureStable('player_att2');  // was 'player_att1'
    break;
```

---

### BUG-012: Player death in GameScene is unrecoverable (CRITICAL)

| Field | Value |
|-------|-------|
| **Severity** | S1 (Critical) |
| **Frequency** | Always (when HP reaches 0 in GameScene) |
| **Files** | `src/entities/Player.js:131-209`, `src/scenes/GameScene.js:68-79` |
| **Feature** | Death Animation |

**Description**: When the player dies in GameScene (HP ≤ 0 from enemy contact damage), `Player.die()` is called, which sets `this.dead = true` and runs the 6-step death animation. However, after the animation completes (1700ms), the player sprite is just set to `alpha=0, active=false` — no respawn, no scene restart, no return to MenuScene. The game continues running but the player cannot interact. All input is silently ignored because `Player.update()` returns early at line 216 (`if (this.dead) return;`).

Meanwhile, GameScene registers a `'player-died'` event listener at line 68 that fades out BGM — but **this event is never emitted anywhere in the codebase**. The listener is dead code.

**Reproduction**:
1. Start or load a game in GameScene
2. Allow a ShadowFragment, FloatingShard, Bat, or Skeleton to reduce HP to 0
3. Observe: death animation plays, then the player disappears
4. Attempt to press any key (J, A, D, ESC, M)
5. Observe: nothing happens. Game is permanently stuck.

**Expected**: Player death in GameScene should either:
- Reset the player to the last bench/save point, or
- Return to MenuScene with a game-over message, or
- At minimum reload the scene

**Actual**: Game becomes unresponsive. Player is invisible and untouchable. No way to continue.

**Related**: GameScene `'player-died'` listener at line 68 is dead code. No code path emits this event.

Note: In BossScene, death is properly handled (lines 258-281) with a fade-out and overlay return. GameScene has no equivalent.

**Suggested Fix**:
1. After the death animation completes in `Player.die()`, add a scene-level callback:
   ```javascript
   // At end of die(), after all delayedCalls:
   scene.time.delayedCall(1800, () => {
       this.scene.events.emit('player-died');
   });
   ```
2. In GameScene, handle the event with a proper death flow (respawn at bench or return to menu).
3. Or, for a simpler fix, add the `'player-died'` emit in `die()` and handle it in GameScene.

---

### BUG-013: Bat vertical bobbing is cancelled by physics engine (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/enemies/Bat.js:62, 75, 89` |
| **Feature** | Bat Enemy |

**Description**: The `_updateAI()` method directly sets `this.sprite.y` in each state to create a vertical bobbing effect (lines 62, 75, 89):

```javascript
// Line 62 (patrol):
this.sprite.y = this.originY + Math.sin(time * Math.PI * 2 / 1.5) * 8;
// Line 75 (chase):
this.sprite.y = this.originY + Math.sin(time * Math.PI * 2 / 1.2) * 8;
// Line 89 (retreat):
this.sprite.y = this.originY + Math.sin(time * Math.PI * 2 / 1.5) * 6;
```

In Phaser Arcade Physics, the physics step runs AFTER `scene.update()`. The body's position is integrated from velocity, and then the **sprite position is overwritten to match the body position** (`body.postUpdate()` sync). Since the bat has `noGravity: true` and no Y velocity is set, the body's Y never changes from its initial value. Therefore `this.sprite.y` is reset to `originY` every physics frame, completely negating the bobbing effect.

**Reproduction**: Static code analysis. The bat's sprite Y position is always reset to the body's Y position after physics step.

**Expected**: The bat should smoothly bob up and down vertically while patrolling, chasing, and retreating.

**Actual**: The bat stays at a fixed Y height with no visible bobbing.

**Suggested Fix**: Set the body's Y velocity instead of the sprite's Y directly. Add a vertical velocity component in the AI:

```javascript
// In patrol state:
const bobVelocity = Math.cos(time * Math.PI * 2 / 1.5) * (Math.PI * 2 / 1.5) * 8;
this.body.setVelocityY(bobVelocity);
```

Or, since the bat has no gravity, directly set `this.body.y` instead of `this.sprite.y`:
```javascript
this.body.y = this.originY + Math.sin(time * Math.PI * 2 / 1.5) * 8;
```

---

### BUG-014: Skeleton melee hitbox is omnidirectional (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/enemies/Skeleton.js:119-131` |
| **Feature** | Skeleton Enemy |

**Description**: The skeleton's melee attack uses a simple distance check that does not account for which direction the skeleton is facing:

```javascript
const hDist = Math.abs(this.x - playerX);
const vDist = Math.abs(this.y - playerY);
if (hDist < 30 && vDist < 10) {
```

`Math.abs(this.x - playerX)` is symmetric — it checks both sides equally. A skeleton facing right can hit the player standing behind it (to its left) and vice versa. The knockback direction (`this.sprite.flipX ? 1 : -1` at line 124) also becomes incorrect when the player is behind the skeleton: the knockback pushes the player in the wrong direction relative to the swing.

**Reproduction**:
1. Stand behind a skeleton that is in `approach` state
2. If within 30px horizontally and 10px vertically, the skeleton's attack hits you
3. Knockback direction is based on sprite.flipX, not the actual direction to the player

**Expected**: The skeleton's melee hitbox should only detect the player in front of it (in the direction the skeleton faces).

**Actual**: The hitbox is a 30px radius circle centered on the skeleton, hitting in all directions equally.

**Suggested Fix**: Add a direction check to the hitbox detection:

```javascript
const dirToPlayer = playerX - this.x;
// Only hit if player is in front of the skeleton
const facingRight = !this.sprite.flipX;  // flipX=false = facing right
const isInFront = facingRight ? (dirToPlayer > 0) : (dirToPlayer < 0);

if (isInFront && hDist < 30 && vDist < 10) {
    const knockDir = facingRight ? 1 : -1;
    ...
}
```

---

### BUG-015: Boss phase transition sprite tween desyncs with paused physics (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/entities/BossMafuyu.js:79-129` |
| **Feature** | Death Animation / Audio Integration |

**Description**: During the boss phase transition, `this.scene.physics.pause()` is called (line 80), then a camera flash runs. After 500ms, `physics.resume()` is called (line 82-83). At the SAME 500ms mark, a tween starts that moves `this.sprite.y` from its current position to 150 over 1000ms (lines 110-128).

However, the boss's physics BODY does not move during pause (velocity is frozen), and when physics resumes, the body's Y position still reflects the pre-pause position. The tween moves the SPRITE directly, but on the next physics step, the sprite position is overwritten to match the body position (standard Phaser arcade physics sync: `body.postUpdate` → `sprite.setPosition(body.x, body.y)` or similar).

Result: The upward levitation tween is wiped out the instant physics resumes. The boss snaps back to its original Y position instead of floating upward.

**Reproduction**: Static code analysis of the timing sequence:
1. t=0ms: `physics.pause()` freezes body positions
2. t=500ms: `physics.resume()` — body Y unchanged
3. t=500ms: Tween starts moving sprite.y → 150 over 1000ms
4. t=500ms+1 frame: Physics step overwrites sprite.y with body.y
5. Boss appears at original Y, not at the tweened position

**Expected**: The boss should smoothly float upward to y=150 during the phase transition.

**Actual**: The tween has no visual effect because physics overrides the sprite position.

**Suggested Fix**: Manually update the body position to match the tween. Add an `onUpdate` callback to the tween:

```javascript
this.scene.tweens.add({
    targets: this.sprite,
    y: 150,
    duration: 1000,
    ease: 'Sine.easeOut',
    onUpdate: (tween) => {
        // Sync body position with sprite
        this.body.y = this.sprite.y;
    },
    onComplete: () => { ... },
});
```

---

### BUG-016: MenuScene CREDITS plays confirm sound twice (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **File** | `src/scenes/MenuScene.js:334, 344` |
| **Feature** | Credits Scene |

**Description**: The `_confirmItem()` method plays `sfx_ui_confirm` at line 334 BEFORE the switch statement, and then plays it AGAIN inside the `case 'credits'` branch at line 344. All other branches (`newGame`, `continue`) do NOT have a duplicate play. Only CREDITS plays the sound twice.

**Reproduction**:
1. On the main menu, select CREDITS and press J/Space
2. Observe: two confirm sounds play overlapping

**Expected**: The confirm sound should play exactly once, consistent with NEW GAME and CONTINUE.

**Actual**: Two overlapping confirm sounds play when selecting CREDITS.

**Suggested Fix**: Remove the duplicate sound at line 344:
```javascript
case 'credits':
    // this.sound.play('sfx_ui_confirm', { volume: 0.5 }); ← DELETE
    SceneManager.goTo(this, 'CreditsScene');
    break;
```

---

### BUG-017: MenuScene CREDITS transition does not fade BGM out (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **File** | `src/scenes/MenuScene.js:336-346` |
| **Feature** | Credits Scene / Audio Integration |

**Description**: When selecting NEW GAME or CONTINUE from the menu, the BGM is smoothly faded out over 500ms before the scene transition (lines 386-392 and 366-372). However, the CREDITS action (lines 343-346) immediately calls `SceneManager.goTo(this, 'CreditsScene')` without any BGM fade. This causes an abrupt audio cut when transitioning to the CreditsScene.

**Reproduction**:
1. From the main menu, press J on CREDITS
2. Observe: menu BGM (menu_title.mp3) cuts off abruptly

**Expected**: The BGM should fade out smoothly (matching the NEW GAME / CONTINUE pattern).

**Actual**: Audio cuts off abruptly on transition.

**Suggested Fix**: Add BGM fade-out before the CreditsScene transition:

```javascript
case 'credits':
    this.sound.play('sfx_ui_confirm', { volume: 0.5 });
    if (this.bgm) {
        this.tweens.add({
            targets: this.bgm,
            volume: 0,
            duration: 500,
            onComplete: () => { this.bgm.stop(); this.bgm.destroy(); this.bgm = null; },
        });
    }
    this.time.delayedCall(300, () => {
        SceneManager.goTo(this, 'CreditsScene');
    });
    break;
```

---

### BUG-018: GameScene 'player-died' event listener is dead code (MAJOR)

| Field | Value |
|-------|-------|
| **Severity** | S2 (Major) |
| **Frequency** | Always |
| **File** | `src/scenes/GameScene.js:68-79`, `src/entities/Player.js:131-209` |
| **Feature** | Audio Integration |

**Description**: GameScene registers an event listener `this.events.on('player-died', ...)` at line 68 during `create()` that is meant to fade out the exploration BGM when the player dies. However, **no code path ever emits this event**. `Player.die()` (line 131) does not emit any events. `GameScene._onEnemyTouchPlayer` (line 391) calls `player.takeDamage()` which calls `player.die()`, but neither emit `'player-died'`.

Combined with BUG-012 (player death is unrecoverable in GameScene), this dead listener means that not only is the game stuck on death, but the BGM also never fades.

**Reproduction**:
1. Search entire codebase for `emit.*player-died` or `emit.*died`
2. No results found. Event is registered but never triggered.

**Expected**: The event should be emitted when `Player.die()` is called, or death handling should be restructured.

**Actual**: The event listener at GameScene.js:68 is unreachable.

**Suggested Fix**: Add an emit in `Player.die()` after setting the dead state:
```javascript
die() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    // ... existing code ...
    this.scene.events.emit('player-died');  // ADD
}
```

---

### BUG-019: Skeleton never switches spritesheet frames (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **File** | `src/enemies/Skeleton.js:35-36`, `src/scenes/BootScene.js:33` |
| **Feature** | Skeleton Enemy |

**Description**: The skeleton is loaded as a spritesheet (`skeleton-Sheet.png` with 48×56 frames) but the code never calls `this.sprite.setFrame()` or `this.sprite.play()` to switch between frames. The sprite is created with `scene.physics.add.sprite(x, y, config.textureKey)` which uses frame 0 by default. The skeleton therefore always displays the first frame (presumably the idle pose), even during the attack telegraph, active hitbox, and recovery phases.

**Reproduction**: Static code analysis. No `setFrame()` or `play()` calls exist in Skeleton.js. The only sprite modification calls are `setFlipX()`, `setScale()`, `setTint()`, `setOrigin()`, and `clearTint()`.

**Expected**: The skeleton should display different frames for idle/attack telegraph/attack active/recovery phases.

**Actual**: Always shows frame 0 regardless of AI state.

**Suggested Fix**: Either:
- Add individual image loads for idle/attack frames instead of a spritesheet, or
- Add `this.sprite.setFrame()` calls in the state machine for each phase:
  ```javascript
  // In _onStateEnter or state transitions:
  case 'attack_telegraph': this.sprite.setFrame(1); break;  // wind-up frame
  case 'attack_active':    this.sprite.setFrame(2); break;  // swing frame
  case 'attack_recovery':  this.sprite.setFrame(3); break;  // recovery frame
  ```

---

### BUG-020: Bat `_updateAI` ignores `dt` parameter for state timer (MINOR)

| Field | Value |
|-------|-------|
| **Severity** | S3 (Minor) |
| **Frequency** | Always |
| **File** | `src/enemies/Bat.js:44, 91` |
| **Feature** | Bat Enemy |

**Description**: The Bat's `_updateAI` receives `delta` (ms) as the first parameter but uses `this.scene.time.now / 1000` for sine-wave time (line 47) rather than accumulating time from `dt`. While this works correctly for oscillation (since `time.now` is monotonic), the `stateTimer` at line 91 (`this.stateTimer -= dt`) uses `dt` which is in milliseconds. The initial value `this.stateTimer = 1000` (set at line 79) was intended as 1 second. Since `dt` from Phaser's `update(time, delta)` is in milliseconds, `this.stateTimer` decrements by ~16.67 per frame, giving roughly 60 frames * 16.67 = 1000ms = 1 second of retreat. This is functionally correct but inconsistent: `stateTimer` stores milliseconds but is checked against `<= 0` (not `<= 0` with ms logic — as long as it starts positive and decrements by dt in ms, it reaches 0 after ~1000ms/16.67ms ≈ 60 frames ≈ 1 second).

**Reproduction**: Static code analysis — no runtime effect. The retreat timer works correctly by coincidence.

**Expected**: Consistent time units (either all seconds or all ms). The existing pattern in Skeleton.js uses seconds.

**Suggested Fix**: Change to use seconds consistently (matching Skeleton pattern):
```javascript
this.stateTimer = 1.0;  // 1 second retreat
// ...
this.stateTimer -= dt / 1000;
```

---

## Asset Path Verification

### Enemy Textures
| Key | Path | Status |
|-----|------|--------|
| `enemy_bat` | `assets/images/enemies/floating/bat/Bat_Full.png` | ✅ Found (320×320 source) |
| `enemy_skeleton` | `assets/images/enemies/shadow/skeleton/skeleton-Sheet.png` | ✅ Found (spritesheet, 48×56 frames) |
| `enemy_shadow` | `assets/images/enemies/common/dark_forest_slime/Enemy_Forest_Idle_01.png` | ✅ Found |
| `enemy_shard` | `assets/images/enemies/floating/ghost_gothicvania/Ghost1.png` | ✅ Found |

### Boss Textures
| Key | Path | Status |
|-----|------|--------|
| `boss_idle` | `assets/images/boss2_mfy/boss_idle.png` | ✅ Found |
| `boss_attack` | `assets/images/boss2_mfy/boss_attack.png` | ✅ Found |
| `boss_dash` | `assets/images/boss2_mfy/boss_dash.png` | ✅ Found |
| `boss_liberation` | `assets/images/boss2_mfy/boss_liberate.png` | ✅ Found |
| `boss_cower` | `assets/images/boss2_mfy/boss_cower.png` | ✅ Found |

### Player Textures
| Key | Path | Status |
|-----|------|--------|
| `player_idle` | `assets/images/player_mfy/mfy1.png` | ✅ Found |
| `player_att1` | `assets/images/player_mfy/mfy_att1.png` | ✅ Found |
| `player_att2` | `assets/images/player_mfy/mfy_att2.png` | ✅ Found (but unused — BUG-011) |
| `player_down` | `assets/images/player_mfy/mfy_down.png` | ✅ Found |
| `player_jump` | `assets/images/player_mfy/mfy_jump.png` | ✅ Found |
| `player_run1-11` | `assets/images/player_mfy/mfy_run{1-11}.png` | ✅ All 11 found |

### Vanish Textures (programmatic — generated in BootScene)
| Key | Generated in | Status |
|-----|-------------|--------|
| `player_vanish1` | BootScene.js:184 | ✅ Programmatic (720×720 ghost silhouette) |
| `player_vanish2` | BootScene.js:195 | ✅ Programmatic (720×720 partial dissolve) |
| `player_vanish3` | BootScene.js:206 | ✅ Programmatic (720×720 faint fragments) |

### Audio Assets (all 22 loaded keys)
All audio keys in BootScene.js (lines 37-68) resolve to existing files. Verified by glob.

| Key | Path | Status |
|-----|------|--------|
| `bgm_menu` | `assets/audio/bgm/menu_title.mp3` | ✅ |
| `bgm_explore` | `assets/audio/bgm/chiptune_exploration.mp3` | ✅ |
| `bgm_boss_p1` | `assets/audio/bgm/8bit_action_boss_battle_bpm145.mp3` | ✅ |
| `bgm_boss_p2` | `assets/audio/bgm/8bit_action_boss_battle_climax_bpm185.mp3` | ✅ |
| `sfx_player_jump` | `assets/audio/sfx/player/sfx_player_jump_01.wav` | ✅ |
| `sfx_player_hurt` | `assets/audio/sfx/player/sfx_player_hurt_01.wav` | ✅ |
| `sfx_player_death` | `assets/audio/sfx/player/player_death.mp3` | ✅ |
| `sfx_player_dash` | `assets/audio/sfx/magic/magic_spell_fast.mp3` | ✅ (fixed from Phase 1 BUG-003) |
| `sfx_sword_att1` | `assets/audio/sfx/sword/sword_synth_shing.mp3` | ✅ |
| `sfx_sword_att2` | `assets/audio/sfx/sword/sword_attack.mp3` | ✅ |
| `sfx_sword_air` | `assets/audio/sfx/sword/slash_rpg.mp3` | ✅ |
| `sfx_enemy_hurt` | `assets/audio/sfx/enemy/sfx_enemy_hurt_01.wav` | ✅ |
| `sfx_enemy_death` | `assets/audio/sfx/enemy/sfx_enemy_death_01.wav` | ✅ |
| `sfx_boss_hit` | `assets/audio/sfx/enemy/sfx_enemy_metal_hit_01.mp3` | ✅ |
| `sfx_boss_roar` | `assets/audio/sfx/enemy/sfx_enemy_roar_01.mp3` | ✅ |
| `sfx_boss_death` | `assets/audio/sfx/enemy/sfx_enemy_death_02.mp3` | ✅ |
| `sfx_ui_navigate` | `assets/audio/sfx/ui/sfx_ui_navigate_01.wav` | ✅ |
| `sfx_ui_confirm` | `assets/audio/sfx/ui/sfx_ui_confirm_01.wav` | ✅ |
| `sfx_ui_start` | `assets/audio/sfx/ui/menu_select.mp3` | ✅ |
| `sfx_combo_hit` | `assets/audio/sfx/combo/sfx_combo_resonance_01.wav` | ✅ |
| `sfx_combo_feelings` | `assets/audio/sfx/combo/sfx_combo_feelings_01.mp3` | ✅ |
| `sfx_combo_victory` | `assets/audio/sfx/combo/sfx_combo_powerup_01.mp3` | ✅ |

### Index.html Script Loading
All 20 scripts load in correct dependency order (SceneManager → HUD → entities → enemies → systems → scenes → game.js). Bat.js (line 40) and Skeleton.js (line 39) load after Enemy base class (line 36). NPC.js (line 45) loads correctly. CreditsScene.js (line 50) included. ✅

---

## MapView vs GameScene Platform Sync

All 25 `PLATFORM_DATA` entries in `src/ui/MapView.js:52-88` were cross-referenced against `GameScene._createPlatforms()` platPositions (lines 136-191). **All entries match exactly:**

| MapView Line | GameScene Line | Position | Match |
|:---:|:---:|---|---|
| 54 | 139 | (320, 459, w:3) | ✅ |
| 56-58 | 143-145 | Ascent staircase (576, 704, 832) | ✅ |
| 60-62 | 149-151 | Secret alcove (1024, 1216, 1472) | ✅ |
| 64-66 | 156-158 | Lower path (1152, 1408, 1664) | ✅ |
| 68-71 | 162-165 | Mid corridor (1920, 2112, 2368, 2624) | ✅ |
| 73 | 168 | Drop-down landing (2368, 510, w:3) | ✅ |
| 75-78 | 173-176 | Vertical shaft (2688, 2816 × 2 each) | ✅ |
| 80 | 190 | Boss high route (3776, 300, w:4) | ✅ |
| 82-85 | 180-183 | Pre-boss gauntlet (2880, 3072, 3328, 3584) | ✅ |
| 87 | 186 | Boss rest (3840, 429, w:3) | ✅ |

**No sync issues found.** ✅

---

## Integration Cross-Check

### NPC + Bench proximity conflict
- Both systems use `this.keys.attack` (J) for interaction.
- GameScene.update processes benches first (line 576-587), then NPCs (line 589-610).
- If player is near both, NPC check hides bench prompt (line 594-595).
- If J is pressed and both are nearby, `_restAtBench` sets `this.isResting = true` synchronously (line 714), so the NPC block at line 590 (`if (!this.isResting && !this.player.dead)`) skips. ✅
- **Verdict**: NPC takes priority over bench, no double-activation. ✅

### Boss phase transition hit-stop physics resume
- `physics.pause()` at BossMafuyu.js:80
- `physics.resume()` at BossMafuyu.js:82-83 (500ms delayedCall)
- The resume callback is created with `this.scene.time.delayedCall(500, ...)` which is a Phaser timer event.
- The timer is NOT paused by `physics.pause()` (physics and scene timers are separate in Phaser).
- **Verdict**: `physics.resume()` WILL execute after 500ms. ✅

### CreditsScene return to MenuScene
- `SceneManager.goTo(this, 'MenuScene')` at CreditsScene.js:288.
- `goTo` does `cameras.main.fadeOut(...)` → on complete: `scene.scene.start('MenuScene')`.
- MenuScene.create() starts fresh BGM.
- No duplicate BGM issue. ✅

### Death animation vanish textures
- Keys `player_vanish1`, `player_vanish2`, `player_vanish3` generated in BootScene._generateVanishTextures() lines 168-207.
- Player.die() checks `scene.textures.exists('player_vanish1')` before use (lines 177, 186, 195). ✅

### Skeleton spritesheet frame dimensions
- BootScene.js:33: `{ frameWidth: 48, frameHeight: 56 }`
- Skeleton.js:32: `bodyWidth: 28, bodyHeight: 44`
- Scale: 0.85 from 48×56 source → 41×48 display pixels. Body (28×44) fits within display. ✅

### Bat scale and body
- BootScene.js:32: image load (320×320 source)
- Bat.js:30: `setScale(0.075)` → 24×24 display pixels
- Bat.js:24: `bodyWidth: 24, bodyHeight: 24`
- Body exactly matches display size. ✅

---

## Phase 1 Bug Regression Check

| BUG-ID | Description | Status |
|--------|-------------|--------|
| BUG-001 | Dash never obtainable (abilities.dash defaults false) | ⚠️ Still present (Player.js:37) |
| BUG-002 | Ground dash cooldown bypassed every frame | ⚠️ Still present (Player.js:237-238) |
| BUG-003 | `sfx_player_dash` not loaded in BootScene | ✅ **FIXED** (BootScene.js:46 now loads it) |
| BUG-004 | Dash ability not transferred to BossScene | ⚠️ Still present (GameScene.js:427-435 omit abilities) — **PARTIALLY MITIGATED** by ability-gate system |
| BUG-005 | `player.reset()` destroys ability state | ⚠️ Still present (Player.js:798-809) — **NEW**: Player.js now preserves abilities in `reset()` at line 800 (`savedAbilities`) |
| BUG-006 | Double jump sound plays twice | ✅ **FIXED** (single sound in `_onStateEnter('jump')`) |
| BUG-007 | Bench `usedCount` never initialized/incremented | ⚠️ Still present (Bench.js:31 has `usedCount = 0` now, but never incremented) |
| BUG-008 | Bench prompts stack between benches | ⚠️ Still partially present (only hides on null at GameScene.js:583-586) |
| BUG-009 | Map explored tracking only updates when map open | ⚠️ **NOT FIXED** — MapView.js update still guards `_markExplored` behind `isOpen` check |
| BUG-010 | Dash wall collision bypass | ⚠️ Still present (platform collision filter is one-way) |

**Notable fix**: BUG-005 (abilities lost on boss death) was partially addressed: Player.js `reset()` now preserves abilities via `savedAbilities` at line 800. ✅ **This is a fix from Phase 1!**

---

## Overall Assessment

Phase 2 adds meaningful content: two new enemy types (Bat, Skeleton), a working NPC system with typewriter dialogue, a polished Credits scene, player death animation, and audio integration. The level restructuring adds multiple new traversal paths and the MapView data is perfectly synced.

### Critical Issues

**BUG-012 (S1)**: Player death in GameScene is unrecoverable. The game becomes completely stuck with no way to continue. **Must fix before release.**

### Major Issues

1. **BUG-013 (S2)**: Bat vertical bobbing is non-functional. The enemy appears static.
2. **BUG-014 (S2)**: Skeleton melee hitbox works in all directions. Should be directional.
3. **BUG-015 (S2)**: Boss phase transition tween is invisible due to physics desync.
4. **BUG-018 (S2)**: GameScene `'player-died'` event listener is dead code. BGM never fades on death.

### Minor Issues

1. **BUG-011 (S3)**: `player_att2` loaded but unused.
2. **BUG-016 (S3)**: CREDITS confirm sound plays twice.
3. **BUG-017 (S3)**: CREDITS transition doesn't fade BGM.
4. **BUG-019 (S3)**: Skeleton always shows frame 0.
5. **BUG-020 (S3)**: Bat timer uses inconsistent time units.

### Recommendations by Priority

| Order | Action | Effort | Impact |
|-------|--------|--------|--------|
| 1 | **BUG-012**: Add death recovery in GameScene | ~10 lines | Prevents softlock |
| 2 | **BUG-013**: Fix Bat vertical bobbing via body velocity | 3 lines | Restores enemy visual |
| 3 | **BUG-015**: Sync body position in boss transition tween | 3 lines | Fixes phase transition visual |
| 4 | **BUG-014**: Make skeleton hitbox directional | 4 lines | Fixes combat fairness |
| 5 | **BUG-018**: Emit 'player-died' event from Player.die() | 1 line | Enables BGM fade on death |
| 6 | **BUG-017**: Add BGM fade to CREDITS transition | 8 lines | Smooths audio transition |
| 7 | **BUG-016**: Remove duplicate confirm sound | 1 line | Fixes audio glitch |
| 8 | **BUG-011**: Use `player_att2` for Attack2 states | 3 lines | Visual distinction |
| 9 | **BUG-019**: Add skeleton frame switching | 5 lines | Visual polish |

**Estimated total fix effort**: ~40 lines across 7 files.

**Recommendation**: Fix BUG-012 (CRITICAL) and BUG-013, BUG-014, BUG-015 (MAJOR) before the next build. The remaining bugs can be scheduled for a follow-up polish pass.
