# MFY Player Character — Art Transition Plan

> **Document Type:** Art Design Specification  
> **Scope:** Player character switch (25miku → mfy), animation mapping, enemy visual design, asset pipeline  
> **Target Engine:** Phaser 3 (pixelArt mode, 800×600)  
> **Date:** 2026-06-24  
> **Status:** Draft — awaiting creative director approval

---

## 1. Frame Mapping Table

### 1.1 Current → New Mapping

| Player State | Current (25miku) | Replace With | Source File | Canvas Size | Notes |
|---|---|---|---|---|---|
| idle | `player_idle.png` | `boss_idle.png` | `游戏素材\boss_mfy.png` | 720×720 | Best standing frame: **boss_mfy.png** — upright, ready stance, arms loose. Alternative: `mfy1.png` (more static pose). **Recommend boss_mfy.png** — more dynamic for idle. |
| run | single idle + code bounce | **mfy_run1~11.png** (11-frame cycle) | `游戏素材\mfy\mfy_run1~11.png` | 720×720 each | No more code bounce! Real run animation. |
| jump | single idle frame | `mfy_run_jump.png` | `游戏素材\mfy\mfy_run_jump.png` | 620×620 | Leaping pose, arms forward. |
| fall | single idle frame | `mfy_run_jump.png` (reuse, vertical flip isn't needed — same frame works for ascent & descent) | same as jump | 620×620 | The jump frame works for both directions; the difference is in vertical velocity, not visual. |
| attack1 | `player_att1.png` | `mfy_att1.png` | `游戏素材\mfy\mfy_att1.png` | 599×599 | Slash pose 1 (horizontal swing). |
| attack2 | `player_att2.png` | `mfy_att2.png` | `游戏素材\mfy\mfy_att2.png` | 720×720 | Slash pose 2 (overhead or reverse swing). |
| air_attack | `player_att2.png` | `mfy_att1.png` (downward slant, rotated -15° via Phaser `setAngle`) | `游戏素材\mfy\mfy_att1.png` | 599×599 | Air attack is a downward strike. `mfy_att1.png` has a forward swing pose that reads well when angled down. |
| hurt | `player_idle.png` | `boss_cower.png` | `游戏素材\boss_mfy_蜷缩.png` | 720×720 | Cowering/defensive crouch — perfect for hurt recoil. |
| dead | 6-frame defeat sequence | `boss_cower.png` + fade-out tween | `游戏素材\boss_mfy_蜷缩.png` | 720×720 | No dedicated death frames. Use cower frame → hold → fade alpha to 0 over 1.5s. |

### 1.2 Boss Asset Verification

The following `assets/images/boss_*.png` files are **already mfy sprites** (no changes needed for boss):

| Asset Key | Source File | Purpose |
|---|---|---|
| `boss_idle` | `游戏素材\boss_mfy.png` | Boss idle (floating) |
| `boss_attack` | `游戏素材\boss_mfy_攻击.png` | Boss melee telegraph |
| `boss_dash` | `游戏素材\boss_mfy_飞行冲撞.png` | Boss dash charge |
| `boss_liberation` | `游戏素材\boss_mfy_解放攻击.png` | Boss phase 2 / liberation |
| `boss_cower` | `游戏素材\boss_mfy_蜷缩.png` | Boss recovery / cower |
| `boss_melee1` | `游戏素材\mfy\mfy_att1.png` | Boss melee hit 1 |
| `boss_melee2` | `游戏素材\mfy\mfy_att2.png` | Boss melee hit 2 |
| `boss_weapon` | `游戏素材\mfy\mfy_武器1.png` | Boss weapon sprite |
| `boss_run1~11` | `游戏素材\mfy\mfy_run1~11.png` | Boss run animation (currently unused by boss AI) |

> **Note:** The `boss_run1~11.png` assets already exist in `assets/images/`. The player will reference these same texture keys.

---

## 2. New Animation Specifications

### 2.1 Animation: Run Cycle (P0)

- **Frames:** 11 (`boss_run1` through `boss_run11`)
- **Frame size:** 720×720 (canvas) — content is ~486×616 within canvas
- **Frame rate:** 11 frames ÷ 0.66s ≈ **16.7 fps** (60ms per frame)
- **Loop:** Yes, repeat
- **Play speed:** 60ms per frame → 660ms per full cycle
- **Flip rule:** FlipX based on `facingRight` (same as current)
- **Implementation approach:** Individual textures, cycled via timer in `_onStateEnter` / `update`

**Phaser Animation Config:**
```js
// In BootScene or Player constructor, create animation from individual textures
this.scene.anims.create({
    key: 'player_run',
    frames: [
        { key: 'boss_run1' },
        { key: 'boss_run2' },
        { key: 'boss_run3' },
        { key: 'boss_run4' },
        { key: 'boss_run5' },
        { key: 'boss_run6' },
        { key: 'boss_run7' },
        { key: 'boss_run8' },
        { key: 'boss_run9' },
        { key: 'boss_run10' },
        { key: 'boss_run11' },
    ],
    frameRate: 16.7,
    repeat: -1,
});
```

### 2.2 Animation: Idle (P1)

- **Frames:** 1 (static — `boss_idle`)
- **Frame size:** 720×720
- **Loop:** N/A (single frame)
- **Suggestion:** Add a subtle y-bob tween (like the boss) — sine wave, 4px amplitude, 1.5s period
- **Alternative:** Create 2-frame idle (breathe in/out) — currently no second frame exists

**Fallback:**
```js
// In _onStateEnter for 'idle':
this.sprite.setTexture('boss_idle');
// If sprite y-bob tween isn't running, start it:
if (!this.idleBob) {
    this.idleBob = this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y + 4,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
    });
}
```

### 2.3 Animation: Jump & Fall (P0)

- **Frames:** 1 (`boss_run_jump`) — note: load as key `player_jump`
- **Frame size:** 620×620
- **Loop:** No
- **Flip rule:** FlipX based on facing
- **Suggestion:** Add a squash/stretch tween:
  - On jump start: scaleY to 0.85, scaleX to 1.15 (stretch) over 100ms → return to normal
  - On landing: squash (scaleY 0.8, scaleX 1.2) over 80ms → bounce back

### 2.4 Animation: Attack 1 (P0)

- **Frames:** 1 (`boss_melee1` → maps to `mfy_att1.png`)
- **Frame size:** 599×599
- **Loop:** No
- **Combo cancel:** Frame-accurate window at 4–8 frames into recovery
- **Damage active window:** Frames 5–9 (startup 5f → active 4f)

### 2.5 Animation: Attack 2 (P0)

- **Frames:** 1 (`boss_melee2` → maps to `mfy_att2.png`)
- **Frame size:** 720×720
- **Loop:** No
- **Damage active window:** Frames 6–11 (startup 6f → active 5f)

### 2.6 Animation: Air Attack (P1)

- **Frames:** 1 (`boss_melee1` rotated -15°)
- **Frame size:** 599×599
- **Loop:** No
- **Rotation:** `this.sprite.setAngle(-15)` on startup, `this.sprite.setAngle(0)` on recovery

### 2.7 Animation: Hurt (P0)

- **Frames:** 1 (`boss_cower`)
- **Frame size:** 720×720
- **Duration:** 300ms (18 frames at 60fps)
- **Feedback:** Tint red (0xff6666) for 100ms, then clear

### 2.8 Animation: Death (P1)

- **Frames:** 1 (`boss_cower`) + fade tween
- **Total duration:** 1.5s fade to alpha 0
- **Ease:** Power2
- **Alternative:** Could use `boss_cower` for hold frame, then crossfade to a dedicated vanish frame if created later

### Summary Table

| Animation | Frames | Frame Size | Duration | Loop | Texture Key(s) |
|---|---|---|---|---|---|
| idle | 1 | 720×720 | static (+ tween bob) | — | `boss_idle` |
| run | 11 | 720×720 | 660ms | yes | `boss_run1`~`boss_run11` |
| jump | 1 | 620×620 | varies | no | `player_jump` (copy of `boss_run_jump`) |
| fall | 1 | 620×620 | varies | no | `player_jump` (same as jump) |
| attack1 | 1 | 599×599 | 17f (283ms) | no | `boss_melee1` |
| attack2 | 1 | 720×720 | 21f (350ms) | no | `boss_melee2` |
| air_attack | 1 | 599×599 | 37f (617ms) | no | `boss_melee1` (angled) |
| hurt | 1 | 720×720 | 18f (300ms) | no | `boss_cower` |
| dead | 1 | 720×720 | 1.5s fade | no | `boss_cower` + fade |

---

## 3. Enemy Visual Specifications

### 3.1 Enemy: "Shadow" (影)

**Concept:** A small, dark amorphous blob with glowing teal eyes. It patrols left-right on platforms and damages the player on touch.

| Property | Value |
|---|---|
| **Pixel size (source)** | 24×24 px |
| **In-game size (at 1.0)** | 24×24 px (at 0.12 player scale: ~3×3 px — very small) |
| **Scale to apply** | 1.0 (visible as a small dark spot) |
| **Body physics size** | 20×20 px |
| **Palette** | Body: `#0A0A1A` (near-black navy), Eyes: `#2EC4B6` (teal glow), Glow aura: `#2EC4B6` at alpha 0.3 |
| **Frames needed** | 2 (pulse: frame 1 = normal, frame 2 = slightly expanded + brighter eyes) |
| **Source method** | **Phaser Graphics primitives** — no external asset needed |

**Construction from Phaser Graphics:**
```js
// Generate 'shadow' texture — frame 1 (normal)
const g = this.make.graphics({ add: false });
g.fillStyle(0x0A0A1A, 1);
g.fillCircle(12, 12, 10);    // body blob
g.fillStyle(0x2EC4B6, 1);
g.fillCircle(8, 10, 2);      // left eye
g.fillCircle(16, 10, 2);     // right eye
g.fillStyle(0x2EC4B6, 0.3);
g.fillCircle(8, 10, 4);      // left glow
g.fillCircle(16, 10, 4);     // right glow
g.generateTexture('shadow1', 24, 24);
g.destroy();

// Frame 2 (pulse expanded)
const g2 = this.make.graphics({ add: false });
g2.fillStyle(0x0A0A1A, 1);
g2.fillCircle(12, 12, 12);   // slightly larger body
g2.fillStyle(0x2EC4B6, 1);
g2.fillCircle(8, 10, 3);     // larger eyes
g2.fillCircle(16, 10, 3);
g2.fillStyle(0x2EC4B6, 0.5);
g2.fillCircle(8, 10, 5);     // brighter glow
g2.fillCircle(16, 10, 5);
g2.generateTexture('shadow2', 24, 24);
g2.destroy();
```

**Animation:**
- 2-frame pulse, alternating every 500ms
- Tween scale from 1.0 → 1.15 → 1.0 on a sine loop (cleaner than swapping textures)

```js
this.scene.tweens.add({
    targets: this.sprite,
    scaleX: 1.15,
    scaleY: 1.15,
    duration: 500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

### 3.2 Enemy: "Fragment" (欠片)

**Concept:** Floating crystal shard, jagged diamond shape. Hovers in place, drifts toward player when close. Damages on touch.

| Property | Value |
|---|---|
| **Pixel size (source)** | 16×16 px |
| **In-game size** | 16×16 px |
| **Scale to apply** | 1.0 |
| **Body physics size** | 14×14 px |
| **Palette** | Body: `#3B2E5A` (dark purple), Core: `#7B52C0` (bright purple), Edge highlight: `#A479E8` (light purple) |
| **Frames needed** | 2 (rotation animation: diamond upright, diamond tilted 45°) |
| **Source method** | **Phaser Graphics primitives** — polygon drawing |

**Construction from Phaser Graphics:**
```js
// Generate 'fragment1' — diamond shape (upright)
const g = this.make.graphics({ add: false });
g.fillStyle(0x3B2E5A, 1);
g.fillPoints([
    new Phaser.Geom.Point(8, 0),    // top
    new Phaser.Geom.Point(16, 8),   // right
    new Phaser.Geom.Point(8, 16),   // bottom
    new Phaser.Geom.Point(0, 8),    // left
], true);
g.fillStyle(0x7B52C0, 1);
g.fillPoints([
    new Phaser.Geom.Point(8, 3),    // inner top
    new Phaser.Geom.Point(13, 8),   // inner right
    new Phaser.Geom.Point(8, 13),   // inner bottom
    new Phaser.Geom.Point(3, 8),    // inner left
], true);
g.lineStyle(1, 0xA479E8, 0.6);
g.strokePoints([
    new Phaser.Geom.Point(8, 0),
    new Phaser.Geom.Point(16, 8),
    new Phaser.Geom.Point(8, 16),
    new Phaser.Geom.Point(0, 8),
    new Phaser.Geom.Point(8, 0),
], true);
g.generateTexture('fragment1', 16, 16);
g.destroy();
```

**Alternative (easier):** Use a single diamond texture, tween rotation:
```js
// Continuous rotation tween
this.scene.tweens.add({
    targets: this.sprite,
    angle: 360,
    duration: 2000,
    repeat: -1,
    ease: 'Linear',
});
```

### 3.3 Enemy: "Wanderer" (彷徨う)

**Concept:** Slightly larger humanoid shadow with tattered cloak. Walks toward player, performs a slow melee swing. The most complex basic enemy.

| Property | Value |
|---|---|
| **Pixel size (source)** | 32×48 px |
| **In-game size** | 32×48 px |
| **Scale to apply** | 1.0 (or 0.8 to differentiate from player) |
| **Body physics size** | 24×44 px |
| **Palette** | Body: `#1A1A2E` (dark navy silhouette), Cloak edge: `#2D3561` (navy highlight), Eyes: `#C47BFF` (purple glow), Accent: `#7B52C0` |
| **Frames needed** | 4–6 (idle 2f, walk 2–4f) |
| **Source method** | **External pixel art** — this needs manual drawing or CC0 source modification |

**Sourcing Options (ranked by effort):**

1. **(Recommended) KENNEY "1-Bit Pack"** — Contains dark silhouette characters. Free CC0. Repurpose a walking sprite, palette-swap to `#1A1A2E`/`#2D3561`/`#7B52C0`.
   - URL: https://kenney.nl/assets/1-bit-pack
   - Sprites: "character_walk1-4.png" (16×16 — scale up to 32×48)

2. **CRAFTPIX Free Enemy Sprites** — Free pixel art enemies, CC0 license. Choose a cloaked figure, recolor to 25-ji palette.
   - URL: https://craftpix.net/freebies/

3. **Custom drawing** — If a pixel artist is available, commission 32×48 sprite with:
   - 2 idle frames (cloak sway)
   - 2 walk frames (leg stride + cloak drag)
   - 1 attack frame (arm extends, claw/swipe)

**Fallback (if no external asset available):**
Build procedurally from Phaser Graphics:
```js
// Simplified Wanderer — geometric humanoid silhouette
const g = this.make.graphics({ add: false });
// Torso
g.fillStyle(0x1A1A2E, 1);
g.fillRect(8, 14, 16, 20);        // body
g.fillRect(10, 34, 5, 14);        // left leg
g.fillRect(17, 34, 5, 14);        // right leg
g.fillRect(10, 8, 12, 10);        // head
// Cloak
g.fillStyle(0x2D3561, 0.6);
g.fillTriangle(6, 14, 26, 14, 4, 38);   // cloak left
g.fillTriangle(26, 14, 6, 14, 28, 38);  // cloak right
// Eyes
g.fillStyle(0xC47BFF, 1);
g.fillRect(12, 10, 3, 2);         // left eye
g.fillRect(17, 10, 3, 2);         // right eye
g.generateTexture('wanderer1', 32, 48);
g.destroy();
```

### Enemy Summary Table

| Enemy | Source Method | Difficulty | Frames | Priority | Visual Complexity |
|---|---|---|---|---|---|
| Shadow (影) | Phaser Graphics | Trivial (no asset needed) | 2 or tween | P1 | Low — 24×24 blob + 2 dots |
| Fragment (欠片) | Phaser Graphics | Trivial (no asset needed) | 1 + rotate tween | P1 | Low — 16×16 diamond |
| Wanderer (彷徨う) | External CC0 + palette swap | Medium | 2–4 | P2 | Medium — needs sprite work |

---

## 4. Asset Pipeline

### 4.1 File Copy & Rename Operations

No new PNG files need to be created in `assets/images/` — the `boss_*` files already exist and contain the correct mfy sprites. The player code will reference these existing keys.

**New load entries for BootScene (additions only):**

```js
// In BootScene.preload() — ADD these load calls:

// Run animation frames (11 individual textures)
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

// Jump frame
this.load.image('player_jump', '游戏素材/mfy/mfy_run_jump.png');
// OR if copied: this.load.image('player_jump', 'assets/images/boss_run_jump.png');
// Note: boss_run_jump.png does NOT exist yet — needs to be copied from mfy source

// If we want to keep player-specific files in assets/images/:
// Copy 游戏素材\mfy\mfy_run_jump.png → assets\images\player_jump.png
```

### 4.2 Phaser Animation Registration

Create all player animations in `BootScene.create()` or `Player` constructor:

```js
// Run cycle
this.anims.create({
    key: 'player_run',
    frames: [
        { key: 'boss_run1' }, { key: 'boss_run2' }, { key: 'boss_run3' },
        { key: 'boss_run4' }, { key: 'boss_run5' }, { key: 'boss_run6' },
        { key: 'boss_run7' }, { key: 'boss_run8' }, { key: 'boss_run9' },
        { key: 'boss_run10' }, { key: 'boss_run11' },
    ],
    frameRate: 16.7,
    repeat: -1,
});
```

### 4.3 Player Code Changes

The key change is in `Player._onStateEnter()`:

**Current (simplified):**
```js
_onStateEnter(state) {
    switch (state) {
        case 'run': this.sprite.setTexture('player_idle'); break;
        // all states use setTexture
    }
}
```

**New:**
```js
_onStateEnter(state) {
    // Stop any playing animation first
    this.sprite.anims?.stop();

    switch (state) {
        case 'idle':
            this.sprite.setTexture('boss_idle');
            this._startIdleBob();
            break;
        case 'run':
            this.sprite.play('player_run');
            this._stopIdleBob();
            break;
        case 'jump':
        case 'fall':
            this.sprite.setTexture('player_jump');
            this._stopIdleBob();
            break;
        case 'attack1_startup':
        case 'attack1_active':
        case 'attack1_recovery':
            this.sprite.setTexture('boss_melee1');
            break;
        case 'attack2_startup':
        case 'attack2_active':
        case 'attack2_recovery':
            this.sprite.setTexture('boss_melee2');
            break;
        case 'air_attack_startup':
        case 'air_attack_active':
        case 'air_attack_recovery':
            this.sprite.setTexture('boss_melee1');
            if (state !== 'air_attack_recovery') {
                this.sprite.setAngle(-15);  // downward slant
            } else {
                this.sprite.setAngle(0);
            }
            break;
        case 'hurt':
            this.sprite.setTexture('boss_cower');
            this.sprite.setTint(0xff6666);
            this.scene.time.delayedCall(100, () => {
                if (!this.dead) this.sprite.clearTint();
            });
            break;
    }
}
```

**Additional methods to add:**
```js
_startIdleBob() {
    if (!this.idleBobTween) {
        this.idleBobTween = this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y + 4,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}

_stopIdleBob() {
    if (this.idleBobTween) {
        this.idleBobTween.stop();
        this.idleBobTween = null;
    }
}
```

### 4.4 Player Body Sizing

**Critical: Recalculate physics body size for mfy sprites.**

Mfy's run frames are ~486×616 content on a 720×720 canvas. At scale 0.12:
- Scaled sprite: 720 × 0.12 = 86.4px
- We want a body approximately 24px wide × 48px tall (was 24×40 for 25miku)

New body calculation:
```js
// Target world-space body: 24w × 48h
// Source body = world ÷ scale = 24/0.12 = 200, 48/0.12 = 400
this.sprite.body.setSize(200, 400);
// Offset to center the body on the scaled sprite:
// (720 - 200) / 2 = 260 horizontally
// (720 - 400) / 2 = 160 vertically — but we want feet at bottom, so offset from top:
// 720 - 400 = 320, offset = 320
this.sprite.body.setOffset(260, 320);
```

**Recommended body dimensions per state:**

| State | Sprite size | Body W | Body H | Offset X | Offset Y |
|---|---|---|---|---|---|
| idle/run | 720×720 | 200 | 400 | 260 | 280 |
| jump | 620×620 | 180 | 300 | 220 | 280 |
| attack1 | 599×599 | 200 | 380 | 200 | 180 |
| attack2 | 720×720 | 200 | 400 | 260 | 280 |
| hurt | 720×720 | 200 | 350 | 260 | 330 |

> **Note:** The body `setSize` and `setOffset` should ideally stay consistent across states to avoid physics glitches. **Recommend using a single body config** (idle/run values) for all states. The body only needs to be accurate enough for collision feel — pixel-perfect body matching is not required and often causes edge-clipping issues.

### 4.5 To Copy: Jump Frame

The jump frame (`mfy_run_jump.png` at 620×620) does NOT exist as `boss_run_jump.png` in `assets/images/`. It needs to be copied from source:

```
Copy: 游戏素材\mfy\mfy_run_jump.png
  To: assets\images\player_jump.png
```

---

## 5. Implementation Priority

### P0 — Core Switch (Must Do First)

| # | Task | Files Affected | Effort |
|---|---|---|---|
| 1 | Copy `boss_idle.png` reference — already exists, just change texture key in code | `Player.js` | 5 min |
| 2 | Load run frames in BootScene (add 11 load.image calls) | `BootScene.js` | 10 min |
| 3 | Copy `mfy_run_jump.png` → `assets/images/player_jump.png`, add load call | File copy + `BootScene.js` | 5 min |
| 4 | Create `player_run` animation (11 frames) | `BootScene.create()` or `Player` constructor | 5 min |
| 5 | Rewrite `_onStateEnter` to use new textures and run animation | `Player.js` | 30 min |
| 6 | Adjust physics body size for mfy proportions | `Player.js` constructor | 10 min |
| 7 | Test: player idle, run, jump, fall, attack1, attack2, hurt all display correct sprites | Playtest | 15 min |

### P0.5 — Hurt & Death Polish

| # | Task | Details |
|---|---|---|
| 8 | Implement hurt visual: tint red, use `boss_cower` texture | Already in `_onStateEnter` spec |
| 9 | Death: hold `boss_cower` frame → fade alpha to 0 over 1.5s | Already partially done in `die()` method |

### P1 — Enemy Implementation

| # | Task | Files | Effort |
|---|---|---|---|
| 10 | Create `Shadow` enemy class with Graphics-generated texture | New file `src/enemies/Shadow.js` | 1–2 hr |
| 11 | Create `Fragment` enemy class with Graphics-generated texture | New file `src/enemies/Fragment.js` | 1 hr |
| 12 | Integrate enemies into `GameScene` (spawn points, patrol logic) | `GameScene.js` + new enemy files | 2 hr |
| 13 | Add physics collisions: player ↔ enemies, damage on touch | `GameScene.js` | 30 min |

### P1.5 — Idle Animation Polish

| # | Task | Details |
|---|---|---|
| 14 | Add idle y-bob tween for player (sine wave 4px, 1.5s) | `Player.js` — add `_startIdleBob()` / `_stopIdleBob()` |

### P2 — Air Attack & Wanderer

| # | Task | Details |
|---|---|---|
| 15 | Air attack rotation: set `sprite.angle = -15` during active | `Player.js` `_onStateEnter` |
| 16 | Source or create Wanderer sprite from CC0 assets | External |
| 17 | Implement Wanderer enemy class | New file |
| 18 | Add Wanderer to GameScene spawn list | `GameScene.js` |

### P2.5 — Run Animation Squash/Stretch

| # | Task | Details |
|---|---|---|
| 19 | Add subtle vertical bounce to run animation (sine on Y, sync with run cycle) | `Player.js` |

### P3 — Optimization (Optional, Future)

| # | Task | Details |
|---|---|---|
| 20 | Combine 11 run frames into single spritesheet `char_mfy_move.png` | Image processing tool |
| 21 | Combine attack frames into spritesheet `char_mfy_attack.png` | Image processing tool |
| 22 | Convert from individual loads to spritesheet loads | `BootScene.js` + animation config |

---

## 6. Edge Cases & Known Gaps

1. **No dedicated idle animation** — Mfy has no 2-frame breathe. Using `boss_idle.png` + y-bob tween is the stopgap. If a pixel artist creates idle frames later, slot them in as `player_idle1.png`, `player_idle2.png`.

2. **Jump frame looks identical for ascent and descent** — Acceptable for now. The jump arc is fast enough (~0.5–0.8s) that the single frame won't look wrong. Squash/stretch tweens on jump start and landing will add enough visual feedback.

3. **Air attack uses attack1 frame rotated** — `mfy_att1.png` is a horizontal swing; rotating it -15° gives a downward slant feel. Not ideal but functional. If a dedicated air attack frame is created later (mfy swinging downward), swap it in as `player_air_att.png`.

4. **Death animation is a fade on cower frame** — The original 25miku had 6 defeat frames. Mfy has none. The fade-out is acceptable for now but feels less dramatic. Future: commission 3–4 death frames (mfy dissolving into teal particles) or create particle effects.

5. **Run frame canvas is 720×720 (mostly empty)** — The content is ~486×616 centered on a 720×720 canvas. At scale 0.12, the sprite displays at 86.4×86.4 screen pixels but the actual character is ~58×74. The large empty canvas is inefficient but won't cause visual issues. Future spritesheet optimization should crop to content bounds.

6. **`boss_melee1` (mfy_att1.png) is 599×599, not 720×720** — This is fine; Phaser handles mixed texture sizes. No special treatment needed.

---

## 7. Phaser Load Block — Copy-Paste Ready

Add the following to `BootScene.preload()` after existing load calls:

```js
// === Player Animation Frames (Mafuyu) ===
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
this.load.image('player_jump', 'assets/images/player_jump.png');
```

Add the following to `BootScene.create()` before `this.scene.start('MenuScene')`:

```js
// === Player Run Animation ===
this.anims.create({
    key: 'player_run',
    frames: [
        { key: 'boss_run1' }, { key: 'boss_run2' }, { key: 'boss_run3' },
        { key: 'boss_run4' }, { key: 'boss_run5' }, { key: 'boss_run6' },
        { key: 'boss_run7' }, { key: 'boss_run8' }, { key: 'boss_run9' },
        { key: 'boss_run10' }, { key: 'boss_run11' },
    ],
    frameRate: 16.7,
    repeat: -1,
});
```

---

## 8. Quick-Reference: Complete State ↔ Texture Map

| Player State | Texture Key | Angle | Tint | Animation |
|---|---|---|---|---|
| idle | `boss_idle` | 0 | none | y-bob tween |
| run | (animation) | 0 | none | `player_run` (11 frames) |
| jump | `player_jump` | 0 | none | squash tween on start/land |
| fall | `player_jump` | 0 | none | — |
| attack1_startup | `boss_melee1` | 0 | none | — |
| attack1_active | `boss_melee1` | 0 | none | — |
| attack1_recovery | `boss_melee1` | 0 | none | — |
| attack2_startup | `boss_melee2` | 0 | none | — |
| attack2_active | `boss_melee2` | 0 | none | — |
| attack2_recovery | `boss_melee2` | 0 | none | — |
| air_attack_startup | `boss_melee1` | -15 | none | — |
| air_attack_active | `boss_melee1` | -15 | none | — |
| air_attack_recovery | `boss_melee1` | 0 | none | — |
| hurt | `boss_cower` | 0 | `0xff6666` (100ms) | — |
| dead | `boss_cower` | 0 | none | fade alpha → 0 (1.5s) |

---

*End of document. Submit for creative director approval before writing any files.*
