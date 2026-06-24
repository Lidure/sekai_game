# MFY Player Character — Art Transition Plan

> **Document Type:** Art Design Specification  
> **Scope:** Player character switch (25miku → mfy), animation mapping, enemy visual design, asset pipeline  
> **Target Engine:** Phaser 3 (pixelArt mode, 800×600)  
> **Date:** 2026-06-24  
> **Status:** **Approved** — ready for implementation  
> **Creative Director Decisions:**
> - Idle: `boss_mfy.png` (key `boss_idle`) — no change needed
> - Air attack: `mfy_att1.png` raw frame, no rotation
> - Run timing: 60ms/frame → 16.7 fps, 660ms cycle
> - Physics body: Single unified across all states
> - Enemies: P1 after player switch; Shadow + Fragment only (Graphics primitives)
> - Wanderer: Skipped

---

## 1. Frame Mapping Table

### 1.1 Player State → Sprite Mapping (Approved)

| Player State | Mfy Sprite | Texture Key | Canvas Size | Content Size | Notes |
|---|---|---|---|---|---|
| idle | `boss_mfy.png` | `boss_idle` | 720×720 | ~570×620 | Upright ready stance. Already loaded. |
| run | `mfy_run1~11.png` | `boss_run1`–`boss_run11` | 720×720 each | ~486×616 | 11-frame cycle. Already loaded as boss assets. |
| jump | `mfy_run_jump.png` | `player_jump` | 620×620 | ~520×500 | **Must copy** from `游戏素材/mfy/mfy_run_jump.png` → `assets/images/player_jump.png` |
| fall | `mfy_run_jump.png` | `player_jump` | 620×620 | ~520×500 | Same texture as jump. No flip needed. |
| attack1_startup | `mfy_att1.png` | `boss_melee1` | 599×599 | ~548×477 | Forward swing. |
| attack1_active | `mfy_att1.png` | `boss_melee1` | 599×599 | ~548×477 | Same frame, continues through active. |
| attack1_recovery | `mfy_att1.png` | `boss_melee1` | 599×599 | ~548×477 | Hold during recovery. |
| attack2_startup | `mfy_att2.png` | `boss_melee2` | 720×720 | ~550×520 | Overhead/reverse swing. |
| attack2_active | `mfy_att2.png` | `boss_melee2` | 720×720 | ~550×520 | Same frame through active. |
| attack2_recovery | `mfy_att2.png` | `boss_melee2` | 720×720 | ~550×520 | Hold during recovery. |
| air_attack_startup | `mfy_att1.png` | `boss_melee1` | 599×599 | ~548×477 | Raw frame — **no rotation** per CD decision. Forward swing reads as downward thrust. |
| air_attack_active | `mfy_att1.png` | `boss_melee1` | 599×599 | ~548×477 | Same frame, active hitbox. |
| air_attack_recovery | `mfy_att1.png` | `boss_melee1` | 599×599 | ~548×477 | Hold during recovery. |
| hurt | `boss_mfy_蜷缩.png` | `boss_cower` | 720×720 | ~400×400 | Cowering crouch. Already loaded. |
| dead | `boss_mfy_蜷缩.png` | `boss_cower` | 720×720 | ~400×400 | Cower frame + fade alpha to 0 over 1.5s. |

### 1.2 Existing Asset Verification

All `assets/images/boss_*.png` files already contain correct mfy sprites:

| assets/images File | Source | Canvas | Already Loaded As | Used By |
|---|---|---|---|---|
| `boss_idle.png` | `boss_mfy.png` | 720×720 | `boss_idle` | Player idle + Boss idle |
| `boss_run1~11.png` | `mfy_run1~11.png` | 720×720 each | NOT loaded — **needs adding** | Player run animation |
| `boss_cower.png` | `boss_mfy_蜷缩.png` | 720×720 | `boss_cower` | Player hurt/dead + Boss recovery |
| `boss_melee1.png` | `mfy_att1.png` | 599×599 | NOT loaded — **needs adding** | Player attack1 + air_attack + Boss melee1 |
| `boss_melee2.png` | `mfy_att2.png` | 720×720 | NOT loaded — **needs adding** | Player attack2 + Boss melee2 |
| `boss_attack.png` | `boss_mfy_攻击.png` | 720×720 | `boss_attack` | Boss telegraph (unchanged) |
| `boss_dash.png` | `boss_mfy_飞行冲撞.png` | 720×720 | `boss_dash` | Boss dash (unchanged) |
| `boss_liberation.png` | `boss_mfy_解放攻击.png` | 720×720 | `boss_liberation` | Boss liberation (unchanged) |
| `boss_weapon.png` | `mfy_武器1.png` | 2048×2048 | NOT loaded | Boss weapon (unchanged) |

**File to copy:**
```
FROM: 游戏素材/mfy/mfy_run_jump.png (620×620)
  TO: assets/images/player_jump.png (620×620)
```

---

## 2. Animation Specifications

### 2.1 Run Cycle — 11 Frames

| Property | Value |
|---|---|
| **Frames** | 11 (keys: `boss_run1` through `boss_run11`) |
| **Frame rate** | ~16.7 fps (60ms per frame) |
| **Cycle duration** | 660ms |
| **Loop** | Yes, repeat -1 |
| **Flip** | `sprite.flipX = !facingRight` (via existing Player update logic) |
| **Squash/stretch** | Optional P2.5: subtle Y-bounce synced to cycle |

**Phaser Animation Config:**
```js
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

### 2.2 Idle — Static Frame + Y-Bob Tween

| Property | Value |
|---|---|
| **Texture** | `boss_idle` (single frame) |
| **Y-bob tween** | Sine wave, 4px amplitude, 1500ms period, yoyo infinite |
| **Spawn** | On `_onStateEnter('idle')` |
| **Kill** | On any non-idle state entry |
| **Priority** | P1.5 (after core switch) |

**Implementation:**
```js
// In Player constructor:
this.idleBob = null;

// New methods:
_startIdleBob() {
    if (this.idleBob) return; // already running
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

### 2.3 Jump & Fall — Single Frame

| Property | Value |
|---|---|
| **Texture** | `player_jump` (load from `assets/images/player_jump.png`) |
| **Jump duration** | ~0.5–0.8s (depends on velocity: JUMP_VEL = -420, gravity = 500) |
| **Squash/stretch (P1.5)** | Jump start: scaleY→0.85, scaleX→1.15 over 100ms, return to 1.0<br>Landing: scaleY→0.8, scaleX→1.2 over 80ms, bounce to 1.0 |

### 2.4 Attack 1 — Single Frame, 3 Sub-states

| Property | Startup | Active | Recovery |
|---|---|---|---|
| **Texture** | `boss_melee1` | `boss_melee1` | `boss_melee1` |
| **Duration (60fps)** | 5f (83ms) | 4f (67ms) | 8f (133ms) |
| **Total** | 17 frames = 283ms | | |
| **Hitbox active** | — | Yes | No |
| **Combo window** | — | — | Frames 4–8 of recovery (at `stateTimer` 0.069–0.138s) can chain to attack2 |

### 2.5 Attack 2 — Single Frame, 3 Sub-states

| Property | Startup | Active | Recovery |
|---|---|---|---|
| **Texture** | `boss_melee2` | `boss_melee2` | `boss_melee2` |
| **Duration (60fps)** | 6f (100ms) | 5f (83ms) | 10f (167ms) |
| **Total** | 21 frames = 350ms | | |
| **Hitbox active** | — | Yes | No |

### 2.6 Air Attack — Single Frame, No Rotation

| Property | Startup | Active | Recovery |
|---|---|---|---|
| **Texture** | `boss_melee1` | `boss_melee1` | `boss_melee1` |
| **Angle** | 0 (raw frame) | 0 (raw frame) | 0 (raw frame) |
| **Duration (60fps)** | 6f (100ms) | 25f (417ms) | 6f (100ms) |
| **Total** | 37 frames = 617ms | | |
| **Hitbox active** | — | Yes | No |
| **Gravity during** | +120 * dt per frame | +200 * dt per frame | Normal |

**Per CD decision:** No rotation applied. The forward swing pose of `mfy_att1.png` reads naturally as a downward thrust when the player is above the target.

### 2.7 Hurt — Single Frame + Tint

| Property | Value |
|---|---|
| **Texture** | `boss_cower` |
| **Duration** | 0.3s (18 frames) |
| **Tint** | `0xff6666` for first 100ms, then clear |
| **Knockback** | Inherits knockback velocity from `takeDamage()` |

### 2.8 Death — Single Frame + Fade

| Property | Value |
|---|---|
| **Texture** | `boss_cower` |
| **Fade duration** | 1.5s |
| **Ease** | `Power2` |
| **Alpha curve** | 1.0 → 0.0 |
| **Gravity** | Disabled during death |

---

## 3. Enemy Visual Specifications

### 3.1 Enemy: "Shadow" (影)

**Design:** Small dark amorphous blob with glowing teal eyes. Patrols platforms, damages on touch.

#### Visual Specs

| Property | Value |
|---|---|
| **Pixel size (source)** | 24×24 px |
| **In-game scale** | 1.0 (no scale applied) |
| **In-game size** | 24×24 screen px |
| **Physics body** | 20×20 px |
| **Body offset** | (2, 2) relative to sprite |
| **Palette** | Body: `#0A0A1A`, Eyes: `#2EC4B6` (glow), Eye glow aura: `#2EC4B6` at α=0.3 |
| **Frames** | 2 (pulse: normal + expanded) |

#### Generation Code (BootScene.create)

```js
// Shadow — Frame 1 (normal, 24x24)
const g1 = this.make.graphics({ add: false });
g1.fillStyle(0x0A0A1A, 1);
g1.fillCircle(12, 12, 10);
g1.fillStyle(0x2EC4B6, 1);
g1.fillCircle(9, 10, 2);
g1.fillCircle(15, 10, 2);
g1.fillStyle(0x2EC4B6, 0.3);
g1.fillCircle(9, 10, 4);
g1.fillCircle(15, 10, 4);
g1.generateTexture('shadow1', 24, 24);
g1.destroy();

// Shadow — Frame 2 (expanded, 28x28 → centered on 28x28 canvas)
const g2 = this.make.graphics({ add: false });
g2.fillStyle(0x0A0A1A, 1);
g2.fillCircle(14, 14, 12);
g2.fillStyle(0x2EC4B6, 1);
g2.fillCircle(11, 12, 2.5);
g2.fillCircle(17, 12, 2.5);
g2.fillStyle(0x2EC4B6, 0.5);
g2.fillCircle(11, 12, 5);
g2.fillCircle(17, 12, 5);
g2.generateTexture('shadow2', 28, 28);
g2.destroy();
```

#### Animation Config

```js
this.anims.create({
    key: 'shadow_pulse',
    frames: [
        { key: 'shadow1' },
        { key: 'shadow2' },
    ],
    frameRate: 2,   // 2 frames over 1 second
    repeat: -1,
});
```

#### Behavior Skeleton

```js
// Shadow enemy — basic patrol
class Shadow extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'shadow1');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setAllowGravity(false);
        this.patrolDir = 1;
        this.patrolSpeed = 40;
        this.patrolRange = 80;  // patrols 80px left-right from spawn
        this.originX = x;
    }

    update() {
        // Patrol: reverse direction at range limits
        if (Math.abs(this.x - this.originX) > this.patrolRange) {
            this.patrolDir *= -1;
        }
        this.body.setVelocityX(this.patrolDir * this.patrolSpeed);

        // Play animation
        if (!this.anims.isPlaying) {
            this.play('shadow_pulse');
        }
    }
}
```

### 3.2 Enemy: "Fragment" (欠片)

**Design:** Floating jagged crystal shard. Hovers in place, drifts toward player when close. Damages on touch.

#### Visual Specs

| Property | Value |
|---|---|
| **Pixel size (source)** | 16×16 px |
| **In-game scale** | 1.0 |
| **In-game size** | 16×16 screen px |
| **Physics body** | 14×14 px |
| **Body offset** | (1, 1) relative to sprite |
| **Palette** | Body: `#3B2E5A` (dark purple), Core: `#7B52C0` (bright purple), Edge highlight: `#A479E8` |
| **Frames** | 1 (single diamond) + rotation tween |
| **Movement** | Hovers at float point, slowly drifts toward player when distance < 120px |

#### Generation Code (BootScene.create)

```js
// Fragment — single diamond shape (16x16)
const g = this.make.graphics({ add: false });
// Outer diamond
g.fillStyle(0x3B2E5A, 1);
g.beginPath();
g.moveTo(8, 0);     // top
g.lineTo(16, 8);    // right
g.lineTo(8, 16);    // bottom
g.lineTo(0, 8);     // left
g.closePath();
g.fillPath();
// Inner core
g.fillStyle(0x7B52C0, 1);
g.beginPath();
g.moveTo(8, 3);
g.lineTo(13, 8);
g.lineTo(8, 13);
g.lineTo(3, 8);
g.closePath();
g.fillPath();
// Edge glow
g.lineStyle(1, 0xA479E8, 0.7);
g.beginPath();
g.moveTo(8, 0);
g.lineTo(16, 8);
g.lineTo(8, 16);
g.lineTo(0, 8);
g.closePath();
g.strokePath();
g.generateTexture('fragment', 16, 16);
g.destroy();
```

#### Animation Config

```js
// Continuous rotation via tween (no animation frames needed)
// Applied in entity constructor:
this.scene.tweens.add({
    targets: this,
    angle: 360,
    duration: 3000,
    repeat: -1,
    ease: 'Linear',
});

// Optional: floating bob
this.scene.tweens.add({
    targets: this,
    y: this.y - 8,
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

#### Behavior Skeleton

```js
class Fragment extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fragment');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setAllowGravity(false);
        this.originX = x;
        this.originY = y;
        this.detectionRange = 120;
        this.floatSpeed = 20;

        // Floating bob
        scene.tweens.add({
            targets: this,
            y: y - 8,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Rotation
        scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear',
        });
    }

    update(player) {
        if (!player || player.dead) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (dist < this.detectionRange) {
            // Drift toward player slowly
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            this.body.setVelocity(
                Math.cos(angle) * this.floatSpeed,
                Math.sin(angle) * this.floatSpeed
            );
        } else {
            // Return to origin
            const distToOrigin = Phaser.Math.Distance.Between(this.x, this.y, this.originX, this.originY);
            if (distToOrigin > 5) {
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.originX, this.originY);
                this.body.setVelocity(
                    Math.cos(angle) * this.floatSpeed,
                    Math.sin(angle) * this.floatSpeed
                );
            } else {
                this.body.setVelocity(0, 0);
            }
        }
    }
}
```

### Enemy Summary

| Enemy | Source | Size | Palette | Behavior | Priority |
|---|---|---|---|---|---|
| Shadow (影) | Phaser Graphics (2 frames) | 24×24 | `#0A0A1A` / `#2EC4B6` | Patrol L-R, touch damage | P1 |
| Fragment (欠片) | Phaser Graphics (1 frame + tween) | 16×16 | `#3B2E5A` / `#7B52C0` / `#A479E8` | Float, drift-to-player | P1 |
| Wanderer (彷徨う) | **Skipped** — no external assets needed | — | — | — | — |

---

## 4. Asset Pipeline & File Changes

### 4.1 File to Copy

```
FROM: 游戏素材/mfy/mfy_run_jump.png (620×620)
  TO: assets/images/player_jump.png  (620×620)
```

### 4.2 BootScene.preload() — Additions

Add these load calls after the existing ones:

```js
// === Player Run Frames (11-frame cycle) ===
this.load.image('boss_run1', 'assets/images/boss_run1.png');
this.load.image('boss_run2', 'assets/images/boss_run2.png');
this.load.image('boss_run3', 'assets/images/boss_run3.png');
this.load.image('boss_run4', 'assets/images/boss_run4.png');
this.load.image('boss_run5', 'assets/images/boss_run5.png');
this.load.image('boss_run6', 'assets/images/boss_run6.png');
this.load.image('boss_run7', 'assets/images/boss_run7.png');
this.load.image('boss_run8', 'assets/images/boss_run8.png');
this.load.image('boss_run9', 'assets/images/boss_run9.png');
this.load.image('boss_run10', 'assets/images/boss_run10.png');
this.load.image('boss_run11', 'assets/images/boss_run11.png');

// === Player Jump Frame ===
this.load.image('player_jump', 'assets/images/player_jump.png');

// === Player Attack Frames ===
this.load.image('boss_melee1', 'assets/images/boss_melee1.png');
this.load.image('boss_melee2', 'assets/images/boss_melee2.png');
```

### 4.3 BootScene.create() — Additions

Add animation creation before `this.scene.start('MenuScene')`:

```js
// === Player Run Animation ===
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

// === Shadow Enemy Animation ===
this.anims.create({
    key: 'shadow_pulse',
    frames: [
        { key: 'shadow1' },
        { key: 'shadow2' },
    ],
    frameRate: 2,
    repeat: -1,
});
```

### 4.4 Player.js — Changes

#### 4.4.1 Constructor — Body Sizing

**Current (25miku):**
```js
this.sprite.body.setSize(200, 333);
this.sprite.body.setOffset(260, 260);
```

**New (mfy, single unified body):**
```js
// Single body for all states: 24w × 48h world pixels at 0.12 scale
// Source: 24/0.12 = 200, 48/0.12 = 400
this.sprite.body.setSize(200, 400);
// Offset to center on 720×720 canvas, feet at bottom:
// X: (720 - 200) / 2 = 260
// Y: 720 - 400 = 320 (bottom of body aligns with sprite bottom)
this.sprite.body.setOffset(260, 320);
```

#### 4.4.2 _onStateEnter — Complete Rewrite

```js
_onStateEnter(state) {
    // Stop any playing animation
    this.sprite.anims?.stop();

    switch (state) {
        case 'idle':
            this.sprite.setTexture('boss_idle');
            this.sprite.setAngle(0);
            this._startIdleBob();
            break;

        case 'run':
            this.sprite.play('player_run');
            this.sprite.setAngle(0);
            this._stopIdleBob();
            break;

        case 'jump':
        case 'fall':
            this.sprite.setTexture('player_jump');
            this.sprite.setAngle(0);
            this._stopIdleBob();
            break;

        case 'attack1_startup':
        case 'attack1_active':
        case 'attack1_recovery':
            this.sprite.setTexture('boss_melee1');
            this.sprite.setAngle(0);
            this._stopIdleBob();
            break;

        case 'attack2_startup':
        case 'attack2_active':
        case 'attack2_recovery':
            this.sprite.setTexture('boss_melee2');
            this.sprite.setAngle(0);
            this._stopIdleBob();
            break;

        case 'air_attack_startup':
        case 'air_attack_active':
        case 'air_attack_recovery':
            this.sprite.setTexture('boss_melee1');
            this.sprite.setAngle(0); // No rotation per CD decision
            this._stopIdleBob();
            break;

        case 'hurt':
            this.sprite.setTexture('boss_cower');
            this.sprite.setAngle(0);
            this.sprite.setTint(0xff6666);
            this._stopIdleBob();
            // Clear tint after 100ms
            this.scene.time.delayedCall(100, () => {
                if (!this.dead) this.sprite.clearTint();
            });
            break;

        case 'dead':
            this.sprite.setTexture('boss_cower');
            this.sprite.setAngle(0);
            this._stopIdleBob();
            break;
    }
}
```

#### 4.4.3 New Methods to Add

```js
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

#### 4.4.4 Constructor — Initialize idleBob

Add to constructor after `this.dead = false;`:
```js
this.idleBob = null;
```

#### 4.4.5 reset() — Clean up idleBob

Add at the end of `reset()`:
```js
this._stopIdleBob();
```

### 4.5 Player.js — _updateRunBob (Cleanup)

The existing `_updateRunBob` and `_stopRunBob` methods are now empty stubs. Since the run animation is handled by Phaser's animation system, these can be removed or left as no-ops. Recommend removing their calls from `_onStateEnter` and `update` for cleanliness.

---

## 5. Implementation Priority

### P0 — Core Player Switch (Must Do Now)

| # | Task | File(s) | Est. Time |
|---|---|---|---|
| 0.1 | Copy `mfy_run_jump.png` → `assets/images/player_jump.png` | CLI copy | 1 min |
| 0.2 | Add 14 load.image calls to `BootScene.preload()` (11 run + 1 jump + 2 attack) | `BootScene.js` | 5 min |
| 0.3 | Create `player_run` animation in `BootScene.create()` | `BootScene.js` | 3 min |
| 0.4 | Update Player constructor body size (200×400, offset 260,320) | `Player.js` | 2 min |
| 0.5 | Rewrite `_onStateEnter` with mfy texture keys | `Player.js` | 15 min |
| 0.6 | Add `this.idleBob = null` to constructor | `Player.js` | 1 min |
| 0.7 | **Test:** All states display correct mfy sprites | Playtest | 15 min |
| | **Total P0** | | ~42 min |

### P0.5 — Hurt & Death Polish

| # | Task | Details | Est. Time |
|---|---|---|---|
| 0.8 | Hurt tint: `boss_cower` + red tint 100ms | Already in `_onStateEnter` spec | — |
| 0.9 | Death: cower frame + fade alpha to 0 | Already in `die()` method (tweens alpha) | — |

### P1 — Enemies (After Player Switch Verified)

| # | Task | File(s) | Est. Time |
|---|---|---|---|
| 1.1 | Create shadow1/shadow2 textures in `BootScene.create()` | `BootScene.js` | 5 min |
| 1.2 | Create `shadow_pulse` animation | `BootScene.js` | 2 min |
| 1.3 | Create `fragment` texture in `BootScene.create()` | `BootScene.js` | 5 min |
| 1.4 | Write Shadow class | `src/enemies/Shadow.js` | 30 min |
| 1.5 | Write Fragment class | `src/enemies/Fragment.js` | 30 min |
| 1.6 | Integrate enemies into GameScene (spawn points, collisions) | `GameScene.js` | 30 min |
| 1.7 | Test: Enemy spawning, patrol, player damage | Playtest | 15 min |
| | **Total P1** | | ~1.9 hr |

### P1.5 — Player Animation Polish

| # | Task | Details | Est. Time |
|---|---|---|---|
| 1.5.1 | Add `_startIdleBob()` / `_stopIdleBob()` | `Player.js` | 10 min |
| 1.5.2 | Jump squash/stretch tweens | `Player.js` `_enterState('jump')` | 15 min |
| 1.5.3 | Landing squash tween | Detect land transition (jump/fall → idle) | 15 min |

### P2 — Optional Enhancements

| # | Task | Details |
|---|---|---|
| 2.1 | Run animation Y-bounce | Sync sine tween to run cycle for vertical impact feel |
| 2.2 | Spritesheet optimization | Combine 11 run frames into single `char_mfy_move.png` — reduces load calls from 14 to 3 |
| 2.3 | Death particles | Mfy dissolves into teal particles instead of simple fade |

---

## 6. Complete State/Texture Reference

| State | Texture Key | Angle | Tint | Anim/FX |
|---|---|---|---|---|
| idle | `boss_idle` | 0 | — | y-bob tween |
| run | `player_run` (anim) | 0 | — | 11-frame cycle |
| jump | `player_jump` | 0 | — | squash on start |
| fall | `player_jump` | 0 | — | — |
| attack1_startup | `boss_melee1` | 0 | — | — |
| attack1_active | `boss_melee1` | 0 | — | hitbox enabled |
| attack1_recovery | `boss_melee1` | 0 | — | combo window |
| attack2_startup | `boss_melee2` | 0 | — | — |
| attack2_active | `boss_melee2` | 0 | — | hitbox enabled |
| attack2_recovery | `boss_melee2` | 0 | — | — |
| air_attack_startup | `boss_melee1` | 0 | — | — |
| air_attack_active | `boss_melee1` | 0 | — | downward hitbox |
| air_attack_recovery | `boss_melee1` | 0 | — | — |
| hurt | `boss_cower` | 0 | `0xff6666` 100ms | knockback |
| dead | `boss_cower` | 0 | — | fade alpha 1→0, 1.5s |

---

## 7. Edge Cases & Known Gaps

1. **No dedicated idle animation** — Single frame + y-bob tween is the stopgap. Future: 2-frame idle (breathe in/out) if a pixel artist creates it.

2. **Jump = single frame** — The jump arc is fast (~0.5–0.8s) so the single frame won't look wrong. Squash/stretch tweens on start/land add enough feedback.

3. **Air attack = `boss_melee1` raw** — Per CD decision, no rotation. Reads as a forward thrust while falling. If a dedicated air-attack frame is created later, swap it in.

4. **Death = simple fade** — Original 25miku had 6 defeat frames. Mfy has none. Fade on cower frame is acceptable but less dramatic. Future: dissolve-into-teal-particles effect.

5. **Run frame canvases are 720×720 (mostly empty)** — Content is ~486×616 centered. At scale 0.12, the sprite renders at 86.4×86.4 but actual character is ~58×74 screen px. Inefficient but functional. Future: spritesheet with cropped frames.

6. **Mixed canvas sizes** — `boss_melee1` is 599×599, all others are 720×720. Phaser handles this fine — no special treatment needed.

7. **`boss_run1~11` textures already exist in assets** — No copy needed. Only `player_jump` needs a one-time file copy from source.

---

## 8. Exact File Change Checklist

### 8.1 BootScene.js

**In `preload()`, add after existing loads:**
```
14 load.image calls:
  boss_run1  through boss_run11
  player_jump
  boss_melee1
  boss_melee2
```

**In `create()`, add before `this.scene.start('MenuScene')`:**
```
2 animation creates:
  player_run (11 frames, 16.7 fps, repeat -1)
  shadow_pulse (2 frames, 2 fps, repeat -1) — optional, can add with P1
```

**In `create()`, add before `this.scene.start('MenuScene')`:**
```
3 generateTexture calls:
  shadow1 (24×24)
  shadow2 (28×28)
  fragment (16×16)
```

### 8.2 Player.js

**Constructor changes:**
- `this.sprite.body.setSize(200, 333)` → `(200, 400)`
- `this.sprite.body.setOffset(260, 260)` → `(260, 320)`
- Add `this.idleBob = null;`

**`_onStateEnter` changes:**
- Replace all `setTexture` calls with mfy keys as specified in §4.4.2
- Add `sprite.anims?.stop()` at top
- Add `sprite.setAngle(0)` in all cases
- Add `_startIdleBob()` / `_stopIdleBob()` calls for idle/run transitions

**New methods:**
- `_startIdleBob()`
- `_stopIdleBob()`

**`reset()` changes:**
- Add `this._stopIdleBob()` at end

### 8.3 New Files

```
assets/images/player_jump.png  (copy from 游戏素材/mfy/mfy_run_jump.png)
src/enemies/Shadow.js           (new class, P1)
src/enemies/Fragment.js         (new class, P1)
```

### 8.4 No Changes Needed

- `BossScene.js` — references `boss_*` keys that remain unchanged
- `BossMafuyu.js` — references `boss_*` keys that remain unchanged
- `HUD.js` — no visual changes
- `GameScene.js` — player creation unchanged (uses `Player` class, no texture reference)

---

> **End of document.** All creative director decisions applied. Ready for P0 implementation.
