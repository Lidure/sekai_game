# Art Asset Pipeline & Visual Design Plan

**Project:** Sekai Game — Pixel-art Metroidvania (Phaser 3.87, GitHub Pages)
**Universe:** PJSK / 25-ji (Nightcord)
**Art Director Document** — Source of truth for all sprite asset creation

---

## Table of Contents

1. [Spritesheet Specifications](#1-spritesheet-specifications)
2. [Pixel Art Standards](#2-pixel-art-standards)
3. [Animation Blueprint](#3-animation-blueprint)
4. [Visual Effects Notes](#4-visual-effects-notes)
5. [Implementation Priority](#5-implementation-priority)
6. [File Naming & Organization](#6-file-naming--organization)

---

## 1. Spritesheet Specifications

### 1.1 Source Material Summary

All source PNGs are 720×720 (32-bit ARGB) canvases with the actual character content occupying a smaller region within transparent padding. All specs below reference the **actual pixel content bounds** after cropping.

| Sprite | Raw Canvas | Content Bounds | Content Size |
|--------|-----------|----------------|--------------|
| 25miku idle | 720×720 | (212,178)→(518,541) | 307×364 |
| 25miku att1 | 720×720 | (0,136)→(518,626) | 519×491 |
| 25miku att2 | 720×720 | (0,179)→(518,573) | 519×395 |
| 25miku down | 720×720 | (144,171)→(596,557) | 453×387 |
| 25miku defeat1 | 720×720 | — | — |
| 25miku defeat2 | 720×720 | (145,186)→(569,549) | 425×364 |
| 25miku vanish1 | 720×720 | (69,115)→(689,627) | 621×513 |
| 25miku vanish2 | 720×720 | (11,30)→(710,711) | 700×682 |
| 25miku vanish3 | 720×720 | (56,141)→(661,584) | 606×444 |
| mfy_run1–11 | 720×720 | ~(116,42)→~(601,658) | ~486×616 each |
| mfy_run_jump | 620×620 | (47,79)→(492,546) | 446×468 |
| mfy_att1 | 599×599 | (49,71)→(596,547) | 548×477 |
| mfy_att2 | 720×720 | (116,49)→(617,668) | 502×620 |
| boss_mfy idle | 720×720 | (115,48)→(550,700) | 436×653 |
| boss_mfy dash | 720×720 | (6,70)→(626,623) | 621×554 |
| boss_mfy melee | 720×720 | (21,48)→(700,700) | 680×653 |
| boss_mfy liberate | 720×720 | (23,35)→(714,708) | 692×674 |
| boss_mfy cower | 720×720 | (14,75)→(706,674) | 693×600 |
| weapon_sword | 720×720 | (73,66)→(644,665) | 572×600 |
| mfy_weapon1 | 2048×2048 | (235,139)→(1562,1921) | 1328×1783 |

### 1.2 Spritesheet A — Player Movement `char_25miku_move.png`

**Contents:** idle (1 frame) + run (11 frames, palette-remapped from mfy)

#### Frame Processing

1. **Idle frame** (25miku.png): Crop to content bounds (212,178)→(518,541) = 307×364
2. **Run frames** (mfy_run1–11.png → palette remapped):
   - Crop each to its content bounds (~486×616, varying per frame)
   - Apply palette remap (mfy purple → 25miku teal/cyan)
   - Scale down to **68%** → ~330×419 (to match idle body proportions)

#### Sheet Layout

| Property | Value |
|----------|-------|
| **Frame size** | 340 × 430 px |
| **Frame count** | 12 (1 idle + 11 run) |
| **Grid layout** | 12 columns × 1 row (single row) |
| **Total sheet** | 4080 × 430 px |
| **Format** | PNG-32 (ARGB) |
| **Anchor point** | (170, 420) — center X, 10px from bottom (foot position) |

#### Frame Index & Alignment

| Index | Source | Animation | Content Size | Position in Frame (x, y) |
|-------|--------|-----------|-------------|------------------------|
| 0 | 25miku.png (cropped) | idle | 307×364 | (17, 66) |
| 1 | mfy_run1 → remap 68% | run_1 | ~330×419 | (5, 11) |
| 2 | mfy_run2 → remap 68% | run_2 | ~330×419 | (5, 11) |
| 3 | mfy_run3 → remap 68% | run_3 | ~330×419 | (5, 11) |
| 4 | mfy_run4 → remap 68% | run_4 | ~330×419 | (5, 11) |
| 5 | mfy_run5 → remap 68% | run_5 | ~330×419 | (5, 11) |
| 6 | mfy_run6 → remap 68% | run_6 | ~330×419 | (5, 11) |
| 7 | mfy_run7 → remap 68% | run_7 | ~330×419 | (5, 11) |
| 8 | mfy_run8 → remap 68% | run_8 | ~330×419 | (5, 11) |
| 9 | mfy_run9 → remap 68% | run_9 | ~330×419 | (5, 11) |
| 10 | mfy_run10 → remap 68% | run_10 | ~330×419 | (5, 11) |
| 11 | mfy_run11 → remap 68% | run_11 | ~330×419 | (5, 11) |

**Alignment rule:** All frames are bottom-aligned (feet at y=420) and center-aligned (character torso at x=170). This prevents the character from appearing to bounce vertically during animation transitions.

### 1.3 Spritesheet B — Player Attack `char_25miku_attack.png`

**Contents:** att1 (1 frame) + att2 (1 frame) + weapon reference pose

#### Sheet Layout

| Property | Value |
|----------|-------|
| **Frame size** | 560 × 520 px |
| **Frame count** | 3 (att1, att2, weapon-hold) |
| **Grid layout** | 3 columns × 1 row |
| **Total sheet** | 1680 × 520 px |
| **Format** | PNG-32 (ARGB) |
| **Anchor point** | (170, 510) — **same X-center as sheet A** for seamless transitions |

#### Frame Index & Alignment

| Index | Source | Animation | Content Size | Position in Frame (x, y) |
|-------|--------|-----------|-------------|------------------------|
| 0 | 25miku_att1.png (cropped) | attack_1 (sword swing) | 519×491 | (20, 29) |
| 1 | 25miku_att2.png (cropped) | attack_2 (sword follow-through) | 519×395 | (20, 125) |
| 2 | weapon_sword.png (cropped) | weapon_hold (idle carry pose) | 572×600 | — |

**Critical alignment note:** The attack frames extend to x=0 (left edge) because the sword swings left. The character's body (torso, head) stays at roughly x:250–518. The anchor point (170, 510) is set so the **character's body center aligns with the idle/run anchor**, meaning the visual body doesn't "jump" when transitioning from run to attack. The sword extension on the left is bonus visual space.

**Weapon child sprite positioning:**
The `weapons/weapon_sword.png` (cropped to 572×600) is used as a **separate Phaser sprite child** attached to the player during attack. It is NOT baked into the spritesheet frames (the sword is already drawn in att1/att2). The standalone weapon sprite is used for:
- Weapon pick-up / UI display
- Attack hitbox visualization (debug)
- Future weapon swapping

Position relative to player origin:
- **attack_1** (left swing): weapon at (x: -200, y: -50) — sword extends left of player
- **attack_2** (right swing): weapon at (x: +200, y: -50) — sword extends right (flipped)

### 1.4 Spritesheet C — Player Defeat `char_25miku_defeat.png`

**Contents:** down (躺平) + defeat1 + defeat2 + vanish1 + vanish2 + vanish3

#### Sheet Layout

| Property | Value |
|----------|-------|
| **Frame size** | 704 × 688 px (to fit vanish2, the largest frame) |
| **Frame count** | 6 |
| **Grid layout** | 3 columns × 2 rows |
| **Total sheet** | 2112 × 1376 px |
| **Format** | PNG-32 (ARGB) |
| **Anchor point** | (352, 678) — center X, near foot-bottom |

#### Frame Index

| Index | Row | Col | Source | Content Size |
|-------|-----|-----|--------|-------------|
| 0 | 0 | 0 | 25miku_躺平.png | 453×387 |
| 1 | 0 | 1 | 25miku_战败1.png | — |
| 2 | 0 | 2 | 25miku_战败2.png | 425×364 |
| 3 | 1 | 0 | 25miku_战败消散1.png | 621×513 |
| 4 | 1 | 1 | 25miku_战败消散2.png | 700×682 |
| 5 | 1 | 2 | 25miku_战败消散3.png | 606×444 |

### 1.5 Spritesheet D — Boss mfy `char_boss_mfy.png`

**Contents:** All boss mfy poses in a single spritesheet

#### Sheet Layout

| Property | Value |
|----------|-------|
| **Frame size** | 696 × 680 px (to fit liberate, the largest) |
| **Frame count** | 8 |
| **Grid layout** | 8 columns × 1 row (single row for simple indexing) |
| **Total sheet** | 5568 × 680 px |
| **Format** | PNG-32 (ARGB) |
| **Anchor point** | (348, 670) — center X, foot-bottom |

#### Frame Index & Animation Mapping

| Index | Source | Animation State | Phase | Content Size |
|-------|--------|----------------|-------|-------------|
| 0 | boss_mfy.png (cropped) | idle | Phase 1 & 2 | 436×653 |
| 1 | mfy_att1.png (cropped) | melee_attack_1 | Phase 1 | 548×477 |
| 2 | mfy_att2.png (cropped) | melee_attack_2 | Phase 1 | 502×620 |
| 3 | boss_mfy_飞行冲撞.png (cropped) | dash_charge | Phase 1 & 2 | 621×554 |
| 4 | boss_mfy_攻击.png (cropped) | ranged_attack | Phase 1 & 2 | 680×653 |
| 5 | boss_mfy_解放攻击.png (cropped) | liberation (ultimate) | Phase 2 only | 692×674 |
| 6 | boss_mfy_蜷缩.png (cropped) | cower (vulnerable) | Phase 1 & 2 | 693×600 |
| 7 | mfy.png or mfy1.png | defeated/stunned | Phase 2 | 720×720 |

---

## 2. Pixel Art Standards

### 2.1 Palette Notes — 25-ji (Nightcord) Visual Identity

The 25-ji aesthetic is defined by **night, isolation, and digital fragility**:
- **Dominant tones:** Dark blues, blacks, muted purples
- **Accent:** Teal-cyan (25miku's power), pale pink (25miku's ribbon)
- **Boss (mfy) base:** Deep purple, dark navy, warm pale skin
- **Boss Phase 2:** Base purple + **teal corruption cracks** (see §4.2)

#### 25miku Player Palette

```
Hair primary:    #2EC4B6  (teal-cyan)
Hair highlight:  #7FE0DE  (light cyan)
Skin base:       #E8F0F8  (cool pale)
Skin shadow:     #C8D8E8  (cool shadow)
Eyes:            #40D0C0  (cyan-teal)
Eye highlight:   #80F0E0  (bright teal)
Outfit primary:  #1A3A3A  (dark teal)
Outfit shadow:   #0E2424  (near-black teal)
Outfit accent:   #50D0D0  (bright cyan)
Ribbon:          #FF87A0  (signature pink)
Outline:         #0A1A1A  (very dark teal-black)
```

#### mfy Boss Palette

```
Hair primary:    #3B2E5A  (dark purple)
Hair highlight:  #5C4E7A  (medium purple)
Skin base:       #FFE4D6  (warm pale)
Skin shadow:     #E8C8B8  (warm shadow)
Eyes:            #6B3FA0  (purple-violet)
Outfit primary:  #2A1E42  (dark navy-purple)
Outfit shadow:   #1A1230  (near-black purple)
Outfit accent:   #7B52C0  (bright purple)
Outline:         #120C20  (very dark purple-black)

--- Phase 2 additions (applied on top of base) ---
Corruption:      #40D0C0 → #2EC4B6 (teal fissures, same as 25miku's power)
Eye glow:        #00FFE0  (intense cyan glow at ≤25% HP)
Crack glow:      #80FFE0  (bright teal along crack lines)
```

### 2.2 Scaling Factor

| Property | Specification |
|----------|--------------|
| **Source resolution** | Full content-crop resolution (varies per sprite, see §1) |
| **In-game display scale** | To be determined — recommended 3× or 4× pixel-perfect via Phaser `setScale()` |
| **Scaling filter** | `NEAREST` (pixel-art mode) — enforced by `pixelArt: true` in Phaser config |
| **Run frame downscale** | 68% of original mfy_run frame size to match 25miku idle proportions |
| **Downscale method** | Nearest-neighbor on pixel art (do NOT use bilinear/bicubic) |

### 2.3 Pixel Grid Alignment

- All character sprites must be aligned to a **whole-pixel grid** — no sub-pixel offsets
- Character foot position is the **canonical alignment point** (y-bottom)
- All frames in a spritesheet share the same **x-center alignment** so the character doesn't "wobble" horizontally during animation
- When placing frames in a spritesheet, use integer coordinates only

---

## 3. Animation Blueprint

### 3.1 Player (25miku) Animation States

#### idle
| Property | Value |
|----------|-------|
| **Sheet** | char_25miku_move.png |
| **Frames** | [0] |
| **Duration per frame** | 800 ms |
| **Loop** | Yes |
| **Flip rules** | Respect `setFlipX()`: flip entire sprite based on movement direction |
| **Transition out** | → run when velocity.x ≠ 0 |

#### run
| Property | Value |
|----------|-------|
| **Sheet** | char_25miku_move.png |
| **Frames** | [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] (11 frames, indexed 1–11) |
| **Duration per frame** | 60 ms (~16.7 fps) |
| **Loop** | Yes |
| **Flip rules** | Respect `setFlipX()` |
| **Speed-linked animation** | Increase frame rate as horizontal velocity increases: **60–100 ms** range |
| **Transition out** | → idle when velocity.x = 0 and touching ground; → jump when off ground |

#### jump (in-air)
| Property | Value |
|----------|-------|
| **Sheet** | char_25miku_move.png (reuse run frame or idle) |
| **Frames** | [0] (idle frame, or frame 6 as "mid-stride in air") |
| **Duration per frame** | N/A (single frame held) |
| **Loop** | No |
| **Flip rules** | Respect `setFlipX()` |
| **Note** | No dedicated jump frames yet — use idle with slight rotation or a held run frame. Future enhancement: create proper jump arc frames (2–4 frames: ascent, apex, descent). |

#### attack_1 (first swing)
| Property | Value |
|----------|-------|
| **Sheet** | char_25miku_attack.png |
| **Frames** | [0] |
| **Duration** | Hold 100 ms, active hitbox 80 ms, recovery 120 ms → total ~300 ms |
| **Loop** | No — fire-and-forget |
| **Flip rules** | Respect `setFlipX()` — this controls which side the sword swings toward |
| **Weapon child** | Attach weapon_sword child sprite at offset (-200, -50) from anchor |
| **Transition out** | → attack_2 if button held; → idle when done |

#### attack_2 (follow-through swing)
| Property | Value |
|----------|-------|
| **Sheet** | char_25miku_attack.png |
| **Frames** | [1] |
| **Duration** | Hitbox 100 ms, recovery 100 ms → total ~200 ms |
| **Loop** | No |
| **Flip rules** | Respect `setFlipX()` |
| **Weapon child** | Attach at offset (+200, -50) from anchor (opposite side) |
| **Transition out** | → idle when done |

#### defeat (death sequence)
| Property | Value |
|----------|-------|
| **Sheet** | char_25miku_defeat.png |
| **Frames** | [0, 1, 2, 3, 4, 5] |
| **Duration per frame** | 300 ms per frame total = 1800 ms |
| **Loop** | No — plays once, then game over or respawn |
| **Timing note** | Frame 0 (down) holds 500 ms; frames 1–2 (defeat) 300 ms each; frames 3–5 (vanish/dissolve) 400 ms each |
| **Flip rules** | No flip — death plays facing last direction |

### 3.2 Boss (mfy) Animation States

#### idle (Phase 1 & 2)
| Property | Value |
|----------|-------|
| **Sheet** | char_boss_mfy.png |
| **Frames** | [0] |
| **Duration per frame** | 1000 ms (slow, menacing hover) |
| **Loop** | Yes |
| **Visual** | Boss floats gently, slight y-bob via Phaser tween (sinusoidal ±8 px, period 2s) |

#### melee_attack (Phase 1 & 2)
| Property | Value |
|----------|-------|
| **Sheet** | char_boss_mfy.png |
| **Frames** | [1, 2] (two-hit combo) |
| **Duration per frame** | 200 ms each |
| **Loop** | No — fires once per attack |
| **Transition** | After last frame → return to idle or dash |

#### dash_charge (Phase 1 & 2)
| Property | Value |
|----------|-------|
| **Sheet** | char_boss_mfy.png |
| **Frames** | [3] (single frame held during entire dash) |
| **Duration** | Hold frame for dash duration (~600–1000 ms across screen) |
| **Loop** | No |
| **Visual** | Boss stretches horizontally during movement (scaleX tween 1.0→1.4→1.0) |
| **Screen shake** | On collision with walls or player: shake camera 150 ms, intensity 0.01 |

#### ranged_attack (Phase 1 & 2)
| Property | Value |
|----------|-------|
| **Sheet** | char_boss_mfy.png |
| **Frames** | [4] |
| **Duration** | Hold 500 ms (charge-up), then fire projectile |
| **Loop** | No |
| **Projectile** | Purple energy bolt — see §4.3 for VFX |

#### liberation_attack (Phase 2 only)
| Property | Value |
|----------|-------|
| **Sheet** | char_boss_mfy.png |
| **Frames** | [5] |
| **Duration** | Hold 1000 ms (slow charge-up), screen shake builds, then explosive release |
| **Loop** | No |
| **Visual** | Boss grows to scale 1.2 during charge, teal cracks glow bright, screen pulses |
| **Screen effects** | Full-screen purple tint ramp-up during charge, then white flash on release |
| **Cooldown** | Can only use once every 15 seconds in Phase 2 |

#### cower (vulnerable window)
| Property | Value |
|----------|-------|
| **Sheet** | char_boss_mfy.png |
| **Frames** | [6] |
| **Duration** | Hold 1500–2000 ms (player damage window) |
| **Loop** | No |
| **Visual** | Boss shrinks to scale 0.85, dark vignette effect |

To support 25miku's unique color palette, the **Palette Remap Pipeline** transforms each mfy_run frame to use 25miku's colors. This is done as a multi-step process:

1. **Crop** — Remove transparent padding around each run frame
2. **Color Replace** — Apply palette mapping table (see below)
3. **Scale** — Downscale by 68% using nearest-neighbor sampling
4. **Pad** — Place into 340×430 frame sheet with alignment

#### Palette Remap Table (mfy purple → 25miku teal/cyan)

Each pixel color is mapped by hue similarity. For pixels on the boundary between color regions (gradients), use a **fuzzy match** with threshold-based replacement:

```
mfy dark purple (#2A1E42)     → 25miku dark teal (#1A3A3A)
mfy medium purple (#3B2E5A)   → 25miku teal-cyan (#2EC4B6)
mfy light purple (#5C4E7A)    → 25miku light cyan (#7FE0DE)
mfy bright accent (#7B52C0)   → 25miku bright cyan (#50D0D0)
mfy warm skin (#FFE4D6)       → 25miku cool pale (#E8F0F8)
mfy warm skin shadow (#E8C8B8) → 25miku cool shadow (#C8D8E8)
mfy eye purple (#6B3FA0)      → 25miku eye cyan (#40D0C0)
mfy outline (#120C20)         → 25miku outline (#0A1A1A)
mfy white/highlight (#FFFFFF) → keep white (both share)
```

**Edge case:** Any pixel that doesn't match a mapped hue (e.g., 25miku's unique pink ribbon) must be **manually painted** onto the remapped run frames after the automated pass.

### 2.4 Palette Remap Pipeline (Detailed)

To support 25miku's unique color palette, the **Palette Remap Pipeline** transforms each mfy_run frame to use 25miku's colors.

**Step-by-step process:**
1. **Crop** each mfy_run#.png to its non-transparent content bounds
2. **Color Replace** — Apply the palette mapping table below using an image editor (Aseprite, Photoshop, or scripted with Python/PIL)
3. **Scale down** to 68% using nearest-neighbor sampling (NOT bilinear)
4. **Pad** to 340×430 frame, aligned bottom-center (feet at y=420, torso center at x=170)
5. **Manual fixes** — Paint any details that didn't map correctly (ribbon, accessories)

#### Palette Remap Table

| mfy Source Color | Hex | → | 25miku Target Color | Hex |
|:----------------:|:---:|:-:|:-------------------:|:---:|
| Dark purple (hair base) | `#2A1E42` | → | Dark teal (hair base) | `#1A3A3A` |
| Medium purple (hair) | `#3B2E5A` | → | Teal-cyan (hair primary) | `#2EC4B6` |
| Light purple (hair hl) | `#5C4E7A` | → | Light cyan (hair hl) | `#7FE0DE` |
| Bright purple (accent) | `#7B52C0` | → | Bright cyan (accent) | `#50D0D0` |
| Warm skin base | `#FFE4D6` | → | Cool pale skin | `#E8F0F8` |
| Warm skin shadow | `#E8C8B8` | → | Cool skin shadow | `#C8D8E8` |
| Purple eyes | `#6B3FA0` | → | Cyan-teal eyes | `#40D0C0` |
| Purple-black outline | `#120C20` | → | Teal-black outline | `#0A1A1A` |
| White / pure highlight | `#FFFFFF` | → | Keep white | `#FFFFFF` |

**Special handling:** 25miku's pink ribbon (`#FF87A0`) does not exist in mfy's palette. This must be **manually painted** onto the remapped run frames as a post-process step. Recommended position: same location as mfy's hair accessory, but in 25miku's signature pink.

### 2.5 Boss Phase 2 Visual Corruption

When mfy enters Phase 2 (≤50% HP), apply the following visual modifications:

1. **Palette overlay:** Add pulsing teal cracks on the boss sprite using a **Phaser pipeline/shader** or a **tinted duplicate sprite** overlay
   - Overlay sprite: Duplicate of boss, rendered with `setTint(0x40D0C0)`, blended with `ADD` mode, masked with a crack texture
   - Crack texture: A separate 696×680 PNG overlay showing teal fissure lines (created by artist)
   - Pulse animation: Tween overlay alpha 0.1 → 0.5 → 0.1 over 2 seconds

2. **Eye glow** (≤25% HP):
   - Add a `Blit` or particle emitter at eye position
   - Color: `#00FFE0` (intense cyan), render with ADD blend
   - Pulse to match boss attack timing

3. **Aura particles** (≤50% HP):
   - Small teal particles rising from boss
   - Count: 5–8, size: 4×4, speed: 30 px/s upward, fade out over 1.5s
   - Color: `#2EC4B6` → `#00FFE0` gradient

### 2.6 Rendering Notes for Technical Artist

- All spritesheets must be imported via `this.load.spritesheet('key', 'path', { frameWidth, frameHeight })` in Phaser 3
- Use `this.anims.create()` to define animation sequences from spritesheet frames
- Player movement animation switching should happen in `update()` by checking `body.velocity.x` and `body.touching.down`
- For pixel-perfect rendering:
  ```js
  // Already set in config, but ensure:
  this.player.setScale(3); // or appropriate integer scale
  this.player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  ```

---

## 3. Animation Blueprint

### 3.1 Player (25miku) Animation States

#### idle (no movement, grounded)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_25miku_move` |
| **Frame index** | [0] |
| **Repeat** | -1 (loop) |
| **Frame rate** | 1.25 fps (800 ms per frame) |
| **Flip X** | Controlled by `player.setFlipX(direction)` |
| **Phaser key** | `anim_player_idle` |

#### run (horizontal movement, grounded)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_25miku_move` |
| **Frame indices** | [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] |
| **Repeat** | -1 (loop) |
| **Base frame rate** | 16.67 fps (60 ms per frame) |
| **Speed-linked** | Scale frame rate: 60 ms at max speed → 100 ms at min speed |
| **Flip X** | Controlled by `player.setFlipX(direction)` |
| **Phaser key** | `anim_player_run` |

#### jump (in air, not grounded)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_25miku_move` |
| **Frame index** | [0] (reuse idle) or [6] (mid-stride) |
| **Repeat** | 0 (play once, hold) |
| **Frame rate** | N/A (single frame) |
| **Flip X** | Controlled by `player.setFlipX(direction)` |
| **Phaser key** | `anim_player_jump` |
| **Note** | Future: create dedicated jump frames (ascent, apex, descent) |

#### attack_1 (first sword swing)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_25miku_attack` |
| **Frame index** | [0] |
| **Repeat** | 0 (play once) |
| **Timing** | Windup (0 ms) + Active (80 ms) + Recovery (120 ms) = **300 ms total** |
| **Flip X** | Controlled by `player.setFlipX(direction)` |
| **Phaser key** | `anim_player_attack1` |
| **Weapon child** | Attach `weapon_sword` sprite at offset (-200, -50) from player anchor |

#### attack_2 (follow-through swing)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_25miku_attack` |
| **Frame index** | [1] |
| **Repeat** | 0 (play once) |
| **Timing** | Active (100 ms) + Recovery (100 ms) = **200 ms total** |
| **Flip X** | Controlled by `player.setFlipX(direction)` |
| **Phaser key** | `anim_player_attack2` |
| **Weapon child** | Attach `weapon_sword` sprite at offset (+200, -50) from player anchor |

#### defeat (death sequence)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_25miku_defeat` |
| **Frame indices** | [0, 1, 2, 3, 4, 5] |
| **Repeat** | 0 (play once, then game over callback) |
| **Per-frame timing** | Frame 0: 500 ms | Frames 1–2: 300 ms each | Frames 3–5: 400 ms each |
| **Total duration** | 2200 ms |
| **Flip X** | Lock to last facing direction (no flip during death) |
| **Phaser key** | `anim_player_defeat` |

### 3.2 Boss (mfy) Animation States

#### boss_idle (Phase 1 & 2)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame index** | [0] |
| **Repeat** | -1 (loop) |
| **Frame rate** | 1 fps (1000 ms per frame) |
| **Helper tween** | Y-bob: `this.tweens.add({ targets: boss, y: '+=8', duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })` |
| **Phaser key** | `anim_boss_idle` |

#### boss_melee (two-hit combo)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame indices** | [1, 2] |
| **Repeat** | 0 (play once) |
| **Per-frame timing** | 200 ms each |
| **Total duration** | 400 ms |
| **Phaser key** | `anim_boss_melee` |

#### boss_dash

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame index** | [3] |
| **Repeat** | 0 (hold single frame) |
| **Horizontal stretch** | Scale tweens: x 1.0→1.4→1.0 during dash movement |
| **Duration** | Matches dash movement (600–1000 ms) |
| **Phaser key** | `anim_boss_dash` |

#### boss_ranged

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame index** | [4] |
| **Repeat** | 0 (hold single frame) |
| **Charge duration** | 500 ms, then fire projectile |
| **Projectile color** | `#7B52C0` (purple energy bolt) |
| **Phaser key** | `anim_boss_ranged` |

#### boss_liberation (Phase 2 ultimate)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame index** | [5] |
| **Repeat** | 0 (play once) |
| **Charge duration** | 1000 ms charge-up, then explosive release |
| **Scale tween** | 1.0 → 1.2 during charge |
| **Screen effects** | Purple tint ramp, camera shake build-up, white flash on release |
| **Cooldown** | 15 seconds minimum between uses |
| **Phaser key** | `anim_boss_liberation` |

#### boss_cower (vulnerable window)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame index** | [6] |
| **Repeat** | 0 (hold single frame) |
| **Duration** | 1500–2000 ms (player damage window) |
| **Scale tween** | 1.0 → 0.85 |
| **Vignette** | Dark overlay fades in over boss area |
| **Phaser key** | `anim_boss_cower` |

#### boss_defeated (death)

| Property | Value |
|----------|-------|
| **Spritesheet** | `char_boss_mfy` |
| **Frame index** | [7] |
| **Repeat** | 0 (play once) |
| **Duration** | Held until death animation completes (could add dissolve VFX) |
| **Phaser key** | `anim_boss_defeated` |

---

## 4. Visual Effects Notes

### 4.1 Player Attack Effects

| Event | Visual | Phaser Implementation |
|-------|--------|----------------------|
| **Sword swing (att1)** | Quick white arc / slash trail | Particle emitter: 5 particles, white→transparent, lifespan 150 ms, follow weapon tip |
| **Sword swing (att2)** | Same, cyan-tinted arc | Same emitter with tint `#40D0C0` |
| **Hit confirmed** | Impact spark burst | 8 particles burst from hit point, colors: `#FFFFFF`, `#40D0C0`, `#FF87A0` |
| **Hit flash** | Enemy flashes white for 100 ms | `enemy.setTint(0xFFFFFF)` then `enemy.clearTint()` after 100 ms |

### 4.2 Boss Ability Effects

| Event | Visual | Phaser Implementation |
|-------|--------|----------------------|
| **Dash charge** | Motion blur / trailing ghost | Duplicate boss sprite alpha 0.3 at previous position each frame (trail render) |
| **Dash wall hit** | Screen shake, dust particles | `this.cameras.main.shake(150, 0.01)` + 10 gray dust particles at impact point |
| **Ranged attack fire** | Purple energy bolt | Projectile sprite with glow: `setTint(0x7B52C0)` + light sprite child |
| **Liberation charge** | Screen tint darkens, build-up rumble | Tween camera tint to dark purple over 800 ms + `shake()` intensity ramps 0→0.02 |
| **Liberation explosion** | White flash + expanding ring | Full-screen white overlay α=1→0 over 300 ms + ring sprite scaling from boss center |
| **Phase 2 corruption** | Teal cracks pulse on boss body | Overlay sprite (crack texture) with `setBlendMode(Phaser.BlendModes.ADD)` alpha 0.1→0.5 pulse |
| **Eye glow (≤25% HP)** | Cyan glow from boss eyes | Particle emitter at eye position, 2 particles, color `#00FFE0`, ADD blend |

### 4.3 Purple Energy Bolt Projectile

```
Sprite: simple_bolt.png (16×32 glow shape, gradient purple→transparent)
Launch: from boss hand/position at player direction
Speed: 350 px/s
Behavior: Destroy on world bounds or player collision
Hit effect: small purple burst (6 particles, 200 ms fade)
```

### 4.4 Screen Effects Summary

| Effect | Method | Duration | Intensity |
|--------|--------|----------|-----------|
| Dash impact shake | `cameras.main.shake()` | 150 ms | 0.01 |
| Liberation charge rumble | `cameras.main.shake()` (ramp) | 1000 ms | 0.00 → 0.02 |
| Liberation explosion flash | White overlay sprite fade | 300 ms | α 1.0 → 0.0 |
| Phase transition | Dark flash + tint transition | 500 ms | α 0.0 → 0.6 → 0.0 |
| Player hit | Red flash on player sprite | 150 ms | `setTint(0xFF0000)` |

---

## 5. Implementation Priority

Priority scale: **P0** = must-have for first vertical slice | **P1** = core gameplay | **P2** = polish | **P3** = stretch

| Priority | Task | Depends On | Est. Effort | Notes |
|:--------:|------|-----------|:-----------:|-------|
| **P0** | Crop all 720×720 sources to content bounds | — | 2 hours | Foundation for all sheets |
| **P0** | Create `char_25miku_move.png` (idle only) | P0 crop idle | 1 hour | Start with idle alone to unblock dev |
| **P0** | Create `char_boss_mfy.png` | P0 crop all boss | 2 hours | Boss fight needs all frames |
| **P1** | Palette-remap mfy_run1–11 → 25miku colors | P0 crop runs | 8 hours | Core player mechanic |
| **P1** | Scale remapped runs to 68%, pad to `char_25miku_move.png` | P1 palette remap | 1 hour | Complete move sheet |
| **P1** | Create `char_25miku_attack.png` | P0 crop att1/att2 | 1 hour | Combat mechanic |
| **P1** | Create `char_25miku_defeat.png` | P0 crop defeat/vanish | 1 hour | Death handling |
| **P1** | Define all Phaser `anims.create()` in code | All sheets done | 2 hours | See §3 for specs |
| **P2** | Screen shake implementation | — | 30 min | Camera shake for boss |
| **P2** | Attack slash trail particles | P1 attack sheet | 1 hour | Visual feedback |
| **P2** | Boss Phase 2 teal corruption overlay | P1 boss sheet | 2 hours | See §2.5 |
| **P2** | Purple energy bolt projectile | P1 boss ranged | 1 hour | Ranged attack VFX |
| **P2** | Hit flash (white tint on damage) | — | 30 min | Universal hit feedback |
| **P3** | Liberation attack full VFX sequence | P2 all effects | 3 hours | Screen flash, rumble, particles |
| **P3** | Player jump animation frames | — | — | Future commission |
| **P3** | Side character spritesheets (ena, knd, mzk) | — | — | Future milestone |

### 5.1 Phaser Code Implementation Notes

The spritesheets are loaded and used in Phaser as follows:

```js
// In scene preload():
this.load.spritesheet('player_move', 'assets/spritesheets/char_25miku_move.png', {
    frameWidth: 340,
    frameHeight: 430
});
this.load.spritesheet('player_attack', 'assets/spritesheets/char_25miku_attack.png', {
    frameWidth: 560,
    frameHeight: 520
});
this.load.spritesheet('player_defeat', 'assets/spritesheets/char_25miku_defeat.png', {
    frameWidth: 704,
    frameHeight: 688
});
this.load.spritesheet('boss_mfy', 'assets/spritesheets/char_boss_mfy.png', {
    frameWidth: 696,
    frameHeight: 680
});
this.load.image('weapon_sword', 'assets/images/weapons/weapon_sword.png');

// In scene create():
this.anims.create({
    key: 'player_run',
    frames: this.anims.generateFromNumbers('player_move', [1,2,3,4,5,6,7,8,9,10,11]),
    frameRate: 16,
    repeat: -1
});
// ... etc for all animation keys defined in §3
```

---

## 6. File Naming & Organization

### 6.1 Asset Paths

```
assets/
├── spritesheets/
│   ├── char_25miku_move.png         (idle + run)
│   ├── char_25miku_attack.png       (attack frames)
│   ├── char_25miku_defeat.png       (defeat + vanish)
│   ├── char_boss_mfy.png            (all boss poses)
│   └── char_ena_move.png            (future)
├── images/
│   ├── weapons/
│   │   └── weapon_sword.png         (standalone weapon)
│   └── particles/
│       ├── particle_slash.png       (sword trail particle)
│       ├── particle_spark.png       (impact spark)
│       ├── particle_bolt.png        (energy bolt projectile)
│       └── particle_glow.png        (boss glow particle)
├── audio/                           (future)
└── fonts/                           (future)
```

### 6.2 Naming Convention

All assets follow: `[category]_[name]_[variant]_[size].[ext]`

- Spritesheets: `char_[character]_[animtype].png`
- Weapons: `weapon_[name].png`
- Particles: `particle_[effect].png`

---

## Appendix: Visual Concept Summary

```
Color Language:
  Teal/Cyan (#2EC4B6 → #7FE0DE) = 25miku's digital power, hope
  Purple (#3B2E5A → #7B52C0)    = mfy's emotional weight, the "real" world
  Pink (#FF87A0)                 = 25miku's humanity, her ribbon
  Dark (#1A1A2E → #0A0A1A)      = the Sekai, the night, emptiness

Visual Contrast (Player vs Boss):
  25miku: Cool tones, smaller frame, quick movements, cyan effects
  mfy:    Warm-purple tones, larger presence, heavy attacks, purple effects
  Phase 2: Teal corruption on purple = mfy being "invaded" by 25miku's power
```
