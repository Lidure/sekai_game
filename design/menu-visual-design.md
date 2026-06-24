# Menu Visual Design — Main Menu Screen

**Status:** Design Spec — Ready for Implementation
**Engine:** Phaser 3.87 (Arcade Physics, pixelArt: true)
**Canvas:** 800 × 600 px
**Theme:** 25-ji (Nightcord) — melancholic, digital-fragile, night

---

## Table of Contents

1. [Scene Architecture](#1-scene-architecture)
2. [Full Color Palette](#2-full-color-palette)
3. [Background Spec](#3-background-spec)
4. [Text Styling Spec](#4-text-styling-spec)
5. [Menu Item Layout & Interaction](#5-menu-item-layout--interaction)
6. [Animation Spec](#6-animation-spec)
7. [Sound Direction](#7-sound-direction)
8. [Pixel Dimensions Reference](#8-pixel-dimensions-reference)
9. [Scene Lifecycle](#9-scene-lifecycle)
10. [Future Enhancement Slots](#10-future-enhancement-slots)

---

## 1. Scene Architecture

### Scene Registration Order

Add `MenuScene` as the **first scene** in the Phaser config (and first in the script load order):

```javascript
// game.js
scene: [MenuScene, BootScene, GameScene, BossScene],
```

```html
<!-- index.html — add BEFORE BootScene -->
<script src="src/scenes/MenuScene.js"></script>
```

### Scene Flow

```
[MENU SCENE] ──"NEW GAME"──▶ [BootScene] ──▶ [GameScene] ──▶ [BossScene]
                                  ▲                                │
                                  └──────── "return" ──────────────┘
```

- MenuScene is the **entry point** — player sees it first
- "NEW GAME" fades to BootScene (which already generates textures, then auto-transitions to GameScene)
- After boss win/death, control returns to GameScene, not MenuScene

### BootScene Modification

BootScene currently does `this.scene.start('GameScene')`. No change needed — it already acts as the loading bridge.

---

## 2. Full Color Palette

All values reference the existing 25-ji palette from `art-asset-plan.md`. New menu-specific colors are marked **(menu)**.

### Core Palette

| Role | Hex | CSS | Phaser Integer | Usage |
|------|-----|-----|----------------|-------|
| Background base | `#0A0A1A` | `'#0a0a1a'` | `0x0A0A1A` | Canvas fill, same as game |
| Background deep edge | `#050510` | `'#050510'` | `0x050510` | Vignette / edge darkening |
| Title "SEKAI" | `#2EC4B6` | `'#2ec4b6'` | `0x2EC4B6` | Main title fill |
| Title glow | `#7FE0DE` | `'#7fe0de'` | `0x7FE0DE` | Title drop shadow / glow |
| Subtitle | `#a8d8ff` | `'#a8d8ff'` | `0xA8D8FF` | Subtitle text |
| Menu active | `#7FE0DE` | `'#7fe0de'` | `0x7FE0DE` | Selected/unlocked menu item |
| Menu inactive | `#3B2E5A` | `'#3b2e5a'` | `0x3B2E5A` | Grayed-out menu item |
| Menu highlight **(menu)** | `#2EC4B6` | `'#2ec4b6'` | `0x2EC4B6` | Hovered item color (brighter than active) |
| Selection caret | `#FF87A0` | `'#ff87a0'` | `0xFF87A0` | Pink `>` `<` indicators |
| Hint text | `#5C4E7A` | `'#5c4e7a'` | `0x5C4E7A` | Muted purple for hint |
| Separator line | `#2EC4B6` | `'#2ec4b6'` | `0x2EC4B6` | Divider, drawn at low alpha (0.25) |
| Fragment color A | `#2EC4B6` | `'#2ec4b6'` | `0x2EC4B6` | Teal fragment (40% of pool) |
| Fragment color B | `#3B2E5A` | `'#3b2e5a'` | `0x3B2E5A` | Purple fragment (30% of pool) |
| Fragment color C | `#7FE0DE` | `'#7fe0de'` | `0x7FE0DE` | Light cyan fragment (20% of pool) |
| Fragment color D | `#FF87A0` | `'#ff87a0'` | `0xFF87A0` | Pink fragment accent (10% of pool) |
| Overlay flash | `#FFFFFF` | `'#ffffff'` | `0xFFFFFF` | Scene transition flash |

### Color Application Rules

- **No warm colors** except the single pink accent (#FF87A0) — same rule as in-game combat
- Text never uses pure white — always tinted (cyan, light blue, or purple)
- Fragment alpha range: 0.08–0.45 (very subtle, never distracting)
- Transition flash uses white-to-black (white flash, then fade to black)

---

## 3. Background Spec

### 3.1 Layer Stack (bottom to top)

```
Depth -20: Base solid fill (#0A0A1A)
Depth -19: Vignette overlay (radial gradient edge darkening)
Depth -18: Fragment particles (20 objects, floating upward)
Depth  -5: Separator line (between title and menu)
Depth   0: Title text + subtitle
Depth   1: Menu items + selection carets
Depth   2: Hint text
```

### 3.2 Base Fill

```javascript
// Method 1 — simplest (scene background color)
this.cameras.main.setBackgroundColor('#0a0a1a');

// Method 2 — explicit Graphics rect (if background needs to differ from camera color)
const bg = this.add.graphics().setDepth(-20);
bg.fillStyle(0x0A0A1A, 1);
bg.fillRect(0, 0, 800, 600);
```

**Recommendation:** Use Method 1 (`cameras.main.setBackgroundColor`) — matches existing scene pattern.

### 3.3 Vignette Overlay

A subtle radial darkening at the edges of the screen. Creates depth without drawing attention.

```javascript
function createVignette(scene) {
    const g = scene.add.graphics().setDepth(-19);
    // Draw 4 gradient rectangles from each edge toward center
    // Using layered rects with decreasing alpha approximates a radial gradient

    const layers = 8;
    for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const alpha = 0.12 * (1 - t * t);  // fades quadratically
        const inset = 300 * t;  // expands inward

        g.fillStyle(0x050510, alpha);
        g.fillRect(0, 0, 800, inset);                         // top
        g.fillRect(0, 600 - inset, 800, inset);               // bottom
        g.fillRect(0, 0, inset, 600);                         // left
        g.fillRect(800 - inset, 0, inset, 600);               // right
    }
}

// Alternative — simpler single-pass border:
function createVignetteSimple(scene) {
    const g = scene.add.graphics().setDepth(-19);
    g.fillStyle(0x050510, 1);
    // Top band
    g.fillRect(0, 0, 800, 60);
    g.fillStyle(0x050510, 0.6);
    g.fillRect(0, 60, 800, 40);
    // Bottom band
    g.fillStyle(0x050510, 1);
    g.fillRect(0, 540, 800, 60);
    g.fillStyle(0x050510, 0.6);
    g.fillRect(0, 500, 800, 40);
    // Left band
    g.fillStyle(0x050510, 0.4);
    g.fillRect(0, 0, 40, 600);
    // Right band
    g.fillRect(760, 0, 40, 600);
}
```

**Recommendation:** Use the simple single-pass approach. The goal is subtle edge shadow, not a pronounced vignette. Visual result: edges are ~15% darker than center.

### 3.4 Fragment Particles

#### Concept

20 floating fragment shapes drifting slowly upward from below the screen, evoking the broken cube fragments of the 25-ji Empty SEKAI. They are **not interactive** — purely atmospheric.

#### Fragment Data Model

Each fragment is a `Phaser.GameObjects.Rectangle` with the following properties:

| Property | Range | Notes |
|----------|-------|-------|
| Width | 2–8 px (integer) | Pixel grid aligned |
| Height | 2–8 px (integer) | Can differ from width for rectangular shards |
| Fill color | See §2 palette | Teal, Purple, Light Cyan, Pink |
| Alpha | 0.08–0.45 | Random per fragment, fixed for its lifetime |
| Speed Y | 6–18 px/s | Upward drift speed (negative Y in Phaser) |
| Speed X | -4 to +4 px/s | Gentle horizontal drift (±) |
| Drift amplitude | 20–60 px | How far it sways horizontally over its lifetime |
| Drift period | 6–15 s | Sine wave period for horizontal sway |

#### Fragment Shape Distribution

| Shape | Width × Height | Proportion | Notes |
|-------|---------------|-----------|-------|
| Thin shard | 2 × 6 or 3 × 8 | 30% | Tall slivers, like broken glass |
| Small chip | 3 × 3 or 4 × 4 | 25% | Tiny square fragments |
| Flat shard | 6 × 2 or 8 × 3 | 25% | Wide slivers |
| Large chunk | 6 × 6 or 8 × 8 | 20% | Larger fragments, less common |

#### Spawn System

**Initial spawn** (in `create()`):
- 20 fragments generated at random Y positions distributed across the full screen height
- This ensures the screen is populated immediately, not empty at start

**Continuous respawn** (in `update()`):
- When a fragment drifts above y < -30, reset it:
  - Y: 630 (just below visible area)
  - X: Random(0, 800)
  - New random size, color, speed
  - Alpha resets to its random value

#### Fragment Lifetime Behavior (update loop)

```javascript
// Pseudocode for fragment update (called every frame in scene.update())
fragments.forEach(f => {
    // Vertical drift (upward)
    f.y += f.speedY * (delta / 1000);

    // Horizontal sway (sine wave)
    f.elapsed += delta;
    const swayOffset = Math.sin(f.elapsed * (2 * Math.PI) / f.driftPeriod) * f.driftAmplitude;
    f.x = f.baseX + swayOffset;

    // Respawn when off-screen top
    if (f.y < -30) {
        respawnFragment(f);
    }
});
```

#### Performance Notes

- 20 rectangles is trivially cheap for Phaser
- Do NOT use tweens for fragment movement — update loop is more efficient for continuous animation
- Fragments should have no stroke/border — just fill
- `setOrigin(0.5)` on each fragment so position is center-based

---

## 4. Text Styling Spec

### 4.1 Font Stack

```javascript
fontFamily: '"Courier New", Courier, monospace'
```

- **Why:** Courier New is available on all platforms and has a consistent monospace pixel-grid feel. The existing code uses `monospace` which maps to different fonts per OS — Courier New ensures cross-platform consistency.
- **Future:** When a pixel font (e.g., "m3x6", "Press Start 2P", "PixelOperator") is added to `assets/fonts/`, replace the fontFamily.
- **Loading a pixel font:** Use `this.load.bitmapFont()` or load a web font via CSS `@font-face`. The design below assumes monospace for now.

### 4.2 Text Elements — Sizing & Positioning

#### Title: "SEKAI"

| Property | Value |
|----------|-------|
| Text | `'SEKAI'` |
| X | 400 (center of 800 canvas) |
| Y | 90 (float center; animates between 86–94) |
| Origin | `(0.5, 0.5)` |
| Font size | `'52px'` |
| Font family | `'"Courier New", Courier, monospace'` |
| Color | `'#2ec4b6'` |
| Letter spacing | N/A (monospace is fixed) |
| Font style | `'bold'` |

**Glow implementation** — Two-layer approach:

```javascript
// Layer 1: Glow (behind, blurred, larger, lower alpha)
this.titleGlow = this.add.text(400, 90, 'SEKAI', {
    fontSize: '52px',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#2ec4b6',  // same color
    fontStyle: 'bold',
}).setOrigin(0.5).setAlpha(0.3)
    .setShadow(0, 0, '#7fe0de', 12, true, true);  // blur glow in teal
    // Note: setShadow blur uses canvas 2D shadow, unaffected by pixelArt mode

// Layer 2: Main text (sharp, on top)
this.titleText = this.add.text(400, 90, 'SEKAI', {
    fontSize: '52px',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#2ec4b6',
    fontStyle: 'bold',
}).setOrigin(0.5);
```

#### Subtitle: "A 25-ji Metroidvania"

| Property | Value |
|----------|-------|
| Text | `'A 25-ji Metroidvania'` |
| X | 400 |
| Y | 140 |
| Origin | `(0.5, 0.5)` |
| Font size | `'16px'` |
| Font family | `'"Courier New", Courier, monospace'` |
| Color | `'#a8d8ff'` |
| Font style | `'normal'` |

**Subtitle glow (optional polish):**
```javascript
// Optional: subtle glow on subtitle (much softer than title)
this.subtitle.setShadow(0, 0, '#a8d8ff', 4, false, true);
```

#### Menu Items

| Property | Value |
|----------|-------|
| Font size | `'20px'` |
| Font family | `'"Courier New", Courier, monospace'` |
| Font style | `'normal'` |
| Origin | `(0.5, 0.5)` |
| X | 400 (all centered) |

#### Hint Text

| Property | Value |
|----------|-------|
| Font size | `'13px'` |
| Font family | `'"Courier New", Courier, monospace'` |
| Color | `'#5c4e7a'` |
| Font style | `'normal'` |
| Origin | `(0.5, 0.5)` |
| X | 400 |
| Y | 560 |

---

## 5. Menu Item Layout & Interaction

### 5.1 Layout Positions (Y coordinates)

All items are center-aligned at X = 400.

```
Y    Element
─    ──────────────────────────────────────
 0   [top edge of canvas]

 90  "SEKAI" title (floats: 86–94)
140  "A 25-ji Metroidvania" subtitle

190  Separator line (centered, 160px wide, 2px tall)

260  >  NEW GAME  <   [ACTIVE — selected]
310     CONTINUE       [INACTIVE — grayed-out, visible]
360     CREDITS        [INACTIVE — grayed-out, future slot]

     [gap — empty space for atmosphere]

555  "Use ↑↓ to select · J to confirm"  [hint text]

600  [bottom edge of canvas]
```

### 5.2 Separator Line

```javascript
const sep = this.add.graphics().setDepth(-5);
sep.lineStyle(1, 0x2EC4B6, 0.25);
// Horizontal line
sep.lineBetween(320, 190, 480, 190);

// Small diamond accent at center
sep.fillStyle(0x2EC4B6, 0.4);
sep.fillRect(398, 188, 4, 4);  // 4×4 pixel diamond approximation
```

### 5.3 Menu Items Data Model

```javascript
this.menuItems = [
    {
        key: 'new_game',
        text: 'NEW GAME',
        y: 260,
        active: true,
        selectable: true,
        action: 'startGame',
    },
    {
        key: 'continue',
        text: 'CONTINUE',
        y: 310,
        active: false,
        selectable: false,     // not functional yet — grayed out
        action: null,
        locked: true,
    },
    {
        key: 'credits',
        text: 'CREDITS',
        y: 360,
        active: false,
        selectable: false,     // not functional yet — grayed out
        action: null,
        locked: true,
    },
];

this.selectedIndex = 0;  // starts on NEW GAME
```

### 5.4 Visual States Per Item

#### Active / Selected (current selection, e.g., NEW GAME)

| Element | State |
|---------|-------|
| Text color | `'#7fe0de'` (light cyan) |
| Left caret | `'>'` in `'#ff87a0'` (pink) at x=340, y=item.y |
| Right caret | `'<'` in `'#ff87a0'` (pink) at x=460, y=item.y |
| Text glow | Subtle setShadow with 4px blur in `'#2ec4b6'` |

#### Inactive / Grayed-Out (CONTINUE, CREDITS)

| Element | State |
|---------|-------|
| Text color | `'#3b2e5a'` (muted purple) |
| No carets | Selection indicators hidden |
| No glow | No shadow effect |
| Alpha | 1.0 (fully opaque, just dark color) |

### 5.5 Selection Carets

The carets are **Phaser text objects** (`fontSize: '20px'`, same as menu items):

```javascript
// Left caret
this.caretLeft = this.add.text(340, 260, '>', {
    fontSize: '20px',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#ff87a0',
}).setOrigin(0.5);

// Right caret
this.caretRight = this.add.text(460, 260, '<', {
    fontSize: '20px',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#ff87a0',
}).setOrigin(0.5);
```

Caret positions are tied to `selectedIndex`:
- NEW GAME (index 0): carets at x=340, x=460
- CONTINUE (index 1): carets at x=340, x=460  (if made selectable later)
- CREDITS (index 2): carets at x=340, x=460  (if made selectable later)

When selection changes, carets tween to the new Y position (see §6 Animation).

### 5.6 Input Handling

```javascript
// In create():

this.input.keyboard.on('keydown-UP', () => this._navigate(-1));
this.input.keyboard.on('keydown-DOWN', () => this._navigate(1));
this.input.keyboard.on('keydown-J', () => this._confirm());
this.input.keyboard.on('keydown-SPACE', () => this._confirm());

_navigate(dir) {
    const newIndex = this.selectedIndex + dir;
    // Clamp to valid selectable range
    if (newIndex < 0 || newIndex >= this.menuItems.length) {
        // Optional: play a "bump" sound effect at boundary
        return;
    }
    if (!this.menuItems[newIndex].selectable) {
        // Skip locked items
        // Optional: play a muted "locked" sound
        return;
    }

    this.selectedIndex = newIndex;
    this._updateCaretPositions();
    this._updateItemStyling();
    // Play menu_navigate SFX here (future)
}

_confirm() {
    const item = this.menuItems[this.selectedIndex];
    if (!item.active) return;

    // Play menu_confirm SFX here (future)

    if (item.action === 'startGame') {
        this._transitionToGame();
    }
}
```

### 5.7 Scene Transition ("NEW GAME")

```javascript
_transitionToGame() {
    // Prevent multiple triggers
    if (this._transitioning) return;
    this._transitioning = true;

    // 1. Flash white
    this.cameras.main.flash(200, 255, 255, 255);

    // 2. After flash settles, fade to black
    this.time.delayedCall(300, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.time.delayedCall(600, () => {
            this.scene.start('BootScene');
        });
    });
}
```

Alternatively, a simpler approach matching existing patterns:

```javascript
_transitionToGame() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
        this.scene.start('BootScene');
    });
}
```

**Recommendation:** Use the fade-to-black approach (not white flash) — it's more melancholic and matches the 25-ji tone.

---

## 6. Animation Spec

### 6.1 Staggered Entry Timeline

When MenuScene `create()` fires, elements appear in this order:

```
Time    Event
────    ─────────────────────────────────────────────
  0ms   Background + fragments appear (instant)
300ms   Vignette fades in (alpha 0→1, 400ms)
500ms   Title "SEKAI" fades in + slides up
        tween: alpha 0→1, y: 110→90, duration 800ms, ease 'Power2'
900ms   Subtitle fades in
        tween: alpha 0→1, duration 500ms, ease 'Power2'
1200ms  Separator draws in (width expands from center)
        Graphics: animate lineEnd from center(400,190) outward
        duration 400ms, ease 'Power2'
1500ms  NEW GAME fades in + slides up
        tween: alpha 0→1, y: 280→260, duration 500ms, ease 'Back.easeOut'
1700ms  CONTINUE fades in + slides up
        tween: alpha 0→1, y: 330→310, duration 500ms, ease 'Back.easeOut'
1900ms  CREDITS fades in + slides up
        tween: alpha 0→1, y: 380→360, duration 500ms, ease 'Back.easeOut'
2200ms  Hint text fades in
        tween: alpha 0→1, duration 400ms, ease 'Power2'
2500ms  Selection carets appear + begin pulsing
        tween: alpha 0→1 over 300ms, then pulse loop starts
```

### 6.2 Ongoing Loop Animations

#### Title Float

```javascript
this.tweens.add({
    targets: this.titleText,     // main text
    y: 86,                       // 4px above center
    duration: 3000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});

// Same tween for glow, synced
this.tweens.add({
    targets: this.titleGlow,     // glow behind text
    y: 86,
    duration: 3000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

**Float amplitude:** ±4px (86–94), period 3 seconds. Very gentle — barely perceptible.

#### Title Glow Pulse (second loop, slower)

```javascript
// Subtle glow intensity oscillation
this.tweens.add({
    targets: this.titleGlow,
    alpha: { from: 0.25, to: 0.40 },
    duration: 4000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

#### Selection Caret Pulse

```javascript
this.tweens.add({
    targets: [this.caretLeft, this.caretRight],
    alpha: { from: 0.5, to: 1.0 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

#### Hint Text Blink

```javascript
this.tweens.add({
    targets: this.hintText,
    alpha: { from: 0.2, to: 0.6 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

### 6.3 Selection Change Animation

When the player presses Up/Down:

```javascript
// 1. Carets tween to new Y position (200ms)
this.tweens.add({
    targets: this.caretLeft,
    y: newItemY,
    duration: 200,
    ease: 'Power2',
});
this.tweens.add({
    targets: this.caretRight,
    y: newItemY,
    duration: 200,
    ease: 'Power2',
});

// 2. Previous item fades to inactive color (200ms)
//    Handled in _updateItemStyling() with a color change tween:
this.tweens.add({
    targets: previousText,
    style: { color: '#3b2e5a' },  // Note: Phaser text color change needs setColor()
    duration: 150,
});

// 3. New item fades to active color (200ms)
this.tweens.add({
    targets: newText,
    duration: 150,
    onStart: () => newText.setColor('#7fe0de'),
});
```

**Important:** Phaser Text color changes must use `text.setColor('#hex')` directly — tweening the `style` property doesn't work. Use `onStart`/`onUpdate` callbacks instead:

```javascript
// Correct approach — tween a helper value, apply color in onUpdate
this.tweens.addCounter({
    from: 0, to: 1,
    duration: 200,
    ease: 'Power2',
    onUpdate: (tween) => {
        // Interpolate between muted purple and light cyan
        const t = tween.getValue();
        // Not needed for simple swap — just swap at start
    },
    onStart: () => {
        prevText.setColor('#3b2e5a');
        newText.setColor('#7fe0de');
    },
});
```

Or more simply:

```javascript
_selectItem(index) {
    // Reset all items to inactive
    this.menuItemTexts.forEach(t => t.setColor('#3b2e5a'));

    // Highlight selected
    this.menuItemTexts[index].setColor('#7fe0de');

    // Move carets
    this.tweens.add({
        targets: [this.caretLeft, this.caretRight],
        y: this.menuItems[index].y,
        duration: 200,
        ease: 'Power2',
    });
}
```

### 6.4 Separator Draw Animation

The separator line appears by growing from the center outward:

```javascript
// Store the target width segments
this.separatorTarget = { progress: 0 };

this.tweens.add({
    targets: this.separatorTarget,
    progress: 1,
    duration: 400,
    ease: 'Power2',
    delay: 1200,
    onUpdate: () => {
        this.separatorGraphics.clear();
        this.separatorGraphics.lineStyle(1, 0x2EC4B6, 0.25);
        const halfLen = 80 * this.separatorTarget.progress;  // 80px = half of 160
        this.separatorGraphics.lineBetween(400 - halfLen, 190, 400 + halfLen, 190);
        // Diamond at center
        if (this.separatorTarget.progress > 0.5) {
            this.separatorGraphics.fillStyle(0x2EC4B6, 0.4);
            this.separatorGraphics.fillRect(398, 188, 4, 4);
        }
    },
});
```

Or simpler — just fade the line in:

```javascript
this.separatorGraphics.setAlpha(0);
this.tweens.add({
    targets: this.separatorGraphics,
    alpha: 1,
    duration: 400,
    delay: 1200,
    ease: 'Power2',
});
```

**Recommendation:** Use the simpler alpha-fade approach for reliability.

---

## 7. Sound Direction

### 7.1 Menu BGM

| Property | Specification |
|----------|---------------|
| Style | Ambient piano + digital pads |
| Tempo | 72 BPM (slow, contemplative) |
| Key | B minor (melancholic, matches 25-ji) |
| Mood | Lonely, hopeful, empty |
| References | "Nomad" by 25-ji, "Soshite Kimi wa Tsuki ni Natta", "Bake no Hana" |
| Instrumentation | Sparse piano arpeggios, sustained synth pads, subtle digital artifacts |
| Texture | Bitcrushed reverb tails, occasional vinyl crackle or digital glitch |

**How it loops:**
- 8-bar phrase (4 chords, each held 2 bars at 72 BPM ≈ 6.67 seconds each, ~27 seconds total)
- Loop crossfade: fade out last bar, fade in first bar over 2 seconds
- Or seamless loop if using generative/ambient material

### 7.2 Menu SFX

| Event | Sound | Character |
|-------|-------|-----------|
| Navigate Up/Down | Soft digital blip | Short sine wave tone, `#2EC4B6`-colored — pitch: C5 (523 Hz), 80ms duration |
| Bump at boundary | Muted thud | Same but lower pitch (E3, 165 Hz), 60ms, with slight noise |
| Confirm selection | Resonance chime | Two-tone ascending: C5 → E5, 200ms, with light reverb tail |
| Locked item | Soft click | Single noise burst, 30ms, very quiet |
| Transition out | Reverse cymbal swell or low-pass filter sweep | 500ms, rising tension then cut |

### 7.3 Implementation Notes

- All SFX should be generated or sourced as **mono 16-bit WAV** at 44100 Hz
- Use `this.sound.play('menu_navigate')` — register audio keys in preload
- Volume levels: BGM at -12 dB, SFX at -6 dB (relative)
- Consider using Phaser's `this.sound.add()` with `{ volume: 0.5 }` for fine control

---

## 8. Pixel Dimensions Reference

### 8.1 Complete Position Map

All positions in pixels on the 800×600 canvas. X=400 is horizontal center.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          ┌──────────────────┐                               │
│                          │    S E K A I      │  ← X:400, Y:90 (52px font)   │
│                          └──────────────────┘                               │
│                     A 25-ji Metroidvania  ← X:400, Y:140 (16px font)        │
│                                                                              │
│                     ────── ◆ ──────  ← 160px wide, center at Y:190          │
│                                                                              │
│                                                                              │
│         >    NEW GAME    <     ← X:400, Y:260, carets at X:340 / X:460      │
│                                                                              │
│              CONTINUE            ← X:400, Y:310 (grayed out)                │
│                                                                              │
│              CREDITS             ← X:400, Y:360 (grayed out)                │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│          Use ↑↓ to select · J to confirm    ← X:400, Y:555 (13px font)     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Element Size Table

| Element | Width (px) | Height (px) | Notes |
|---------|-----------|-------------|-------|
| "SEKAI" text block | ~200 | ~52 | Measured in 52px monospace, 5 chars |
| "SEKAI" glow zone | ~224 | ~76 | Text + 12px shadow blur radius |
| Subtitle text block | ~224 | ~16 | "A 25-ji Metroidvania" in 16px |
| Separator line | 160 | 2 | Horizontal line only |
| Separator diamond | 4 | 4 | Center accent |
| Menu item text | ~160 | ~20 | "NEW GAME" in 20px monospace (~9 chars) |
| Caret `>` or `<` | ~12 | ~20 | Single character at 20px |
| Hint text block | ~300 | ~13 | Full hint sentence |
| Fragment min | 2 | 2 | Smallest particle |
| Fragment max | 8 | 8 | Largest particle |

### 8.3 Navigation Cell Boundaries

Each menu item has an implicit "hit area" for selection (even though selection is keyboard-based):

| Item | Top Y | Bottom Y | Center Y |
|------|-------|----------|----------|
| NEW GAME | 245 | 275 | 260 |
| CONTINUE | 295 | 325 | 310 |
| CREDITS | 345 | 375 | 360 |

Gap between items: 20px (from 275 to 295, and 325 to 345).

---

## 9. Scene Lifecycle

### 9.1 MenuScene create() — Execution Order

```javascript
create() {
    // 1. Camera setup
    this.cameras.main.setBackgroundColor('#0a0a1a');
    this.cameras.main.fadeIn(500, 0, 0, 0);  // fade in from black

    // 2. Background layers
    this._createVignette();
    this._createFragments();

    // 3. Separator
    this._createSeparator();

    // 4. Title
    this._createTitle();
    this._createSubtitle();

    // 5. Menu items
    this._createMenuItems();
    this._createCarets();

    // 6. Hint
    this._createHint();

    // 7. Input
    this._createInput();

    // 8. Start entry animations
    this._playEntryAnimations();

    // 9. Start loop animations
    this._playLoopAnimations();
}
```

### 9.2 update() Logic

```javascript
update(time, delta) {
    // Only fragment drift — everything else is tween-driven
    this._updateFragments(delta);
}
```

### 9.3 Scene Transition Out

On "NEW GAME" confirm:
```javascript
this.cameras.main.fadeOut(500, 0, 0, 0);
this.time.delayedCall(500, () => {
    this.scene.start('BootScene');
});
```

---

## 10. Future Enhancement Slots

These are identified but **not implemented yet** — design hooks for later.

### 10.1 CONTINUE Functionality

When save data exists:
- CONTINUE text color changes from `#3B2E5A` (inactive) to `#7FE0DE` (active)
- `selectable: true`
- On confirm: `this.scene.start('GameScene', { continueData: saveData })`

### 10.2 Pixel Font Replacement

When a pixel font is loaded:
1. Update `fontFamily` across all text objects
2. Test sizing — pixel fonts often render differently than Courier
3. Adjust Y positions if font metrics differ
4. Recommended font: "Press Start 2P" (free, Google Fonts) or "m3x6" (smaller)

### 10.3 Bitmap Font Title

For the "SEKAI" title, a bitmap font would allow per-character coloring or animation effects:
- Each letter could fade in individually
- Could add glitch distortion per-character

### 10.4 Credits Screen

When CREDITS is implemented:
- Scene: `CreditsScene.js` (extends Phaser.Scene)
- Slow-scrolling text (auto-scroll at 20 px/s from bottom)
- Text: "A SEKAIGAME Production", team names, "Built with Phaser 3.87", "Project Sekai (c) SEGA / Colorful Palette"
- Press Esc or J to return to menu

### 10.5 Save Data Visual Cue

For CONTINUE, show a small preview:
- Smallest thumbnail of last area visited (16×16, pixel art)
- Or a text line below: "Area: Empty SEKAI · 3 Fragments found"
- Or just a percentage: "33% complete"

### 10.6 Version Number

Optional small version text at bottom-right corner (X: 780, Y: 585, fontSize: '10px', color: '#1A2A3A' — barely visible):
```
v0.1.0
```

---

## Appendix A: Phaser Code Patterns Reference

### A.1 Fragment Manager (recommended implementation structure)

```javascript
_createFragments() {
    this.fragments = [];
    this.fragmentColors = [0x2EC4B6, 0x3B2E5A, 0x7FE0DE, 0xFF87A0];
    this.fragmentWeights = [0.40, 0.30, 0.20, 0.10];  // color distribution

    for (let i = 0; i < 20; i++) {
        this._spawnFragment(true);  // initial batch, random Y
    }
}

_spawnFragment(initial) {
    const color = this._weightedRandomColor();
    const w = Phaser.Math.Between(2, 8);
    const h = Phaser.Math.Between(2, 8);
    const alpha = Phaser.Math.FloatBetween(0.08, 0.45);

    const rect = this.add.rectangle(
        Phaser.Math.Between(0, 800),
        initial ? Phaser.Math.Between(-20, 620) : Phaser.Math.Between(620, 650),
        w, h,
        color, alpha
    ).setDepth(-18);

    rect.fragmentData = {
        speedY: Phaser.Math.FloatBetween(-18, -6),  // negative = upward
        speedX: Phaser.Math.FloatBetween(-4, 4),
        baseX: rect.x,
        elapsed: Phaser.Math.FloatBetween(0, 15000),
        driftAmplitude: Phaser.Math.FloatBetween(20, 60),
        driftPeriod: Phaser.Math.FloatBetween(6000, 15000),
    };

    this.fragments.push(rect);
}

_updateFragments(delta) {
    this.fragments.forEach(rect => {
        const d = rect.fragmentData;
        d.elapsed += delta;
        rect.y += d.speedY * (delta / 1000);
        const sway = Math.sin(d.elapsed * (2 * Math.PI) / d.driftPeriod) * d.driftAmplitude;
        rect.x = d.baseX + sway;

        if (rect.y < -30 || rect.y > 650) {
            this._respawnFragment(rect);
        }
    });
}

_respawnFragment(rect) {
    rect.x = Phaser.Math.Between(0, 800);
    rect.y = Phaser.Math.Between(620, 650);
    rect.width = Phaser.Math.Between(2, 8);
    rect.height = Phaser.Math.Between(2, 8);
    rect.fillColor = this._weightedRandomColor();
    rect.fillAlpha = Phaser.Math.FloatBetween(0.08, 0.45);
    rect.setFillStyle(rect.fillColor, rect.fillAlpha);
    rect.fragmentData.baseX = rect.x;
    rect.fragmentData.elapsed = 0;
    rect.fragmentData.speedY = Phaser.Math.FloatBetween(-18, -6);
}
```

### A.2 Weighted Color Selection

```javascript
_weightedRandomColor() {
    const r = Math.random();
    if (r < 0.40) return 0x2EC4B6;  // teal — 40%
    if (r < 0.70) return 0x3B2E5A;  // purple — 30%
    if (r < 0.90) return 0x7FE0DE;  // light cyan — 20%
    return 0xFF87A0;                  // pink — 10%
}
```

### A.3 Text Color Transition Helper

For smooth color transitions on menu item selection:

```javascript
_setItemActive(textObject, active) {
    if (active) {
        textObject.setColor('#7fe0de');
        textObject.setShadow(0, 0, '#2ec4b6', 4, false, true);
    } else {
        textObject.setColor('#3b2e5a');
        textObject.setShadow(0, 0, '#000000', 0, false, true);  // remove shadow
    }
}
```

---

## Appendix B: Asset Requirements for Programmer

### B.1 No new image assets needed

This entire menu can be built with:
- **Phaser Graphics** (shapes, lines, gradients)
- **Phaser Text** (monospace font, no bitmap font required)
- **Phaser.GameObjects.Rectangle** (fragment particles)

Zero new PNGs required.

### B.2 Asset Pipeline for Future

When adding pixel fonts or decorations:

| Asset | Path | Format | Status |
|-------|------|--------|--------|
| Pixel font | `assets/fonts/pixel.fnt` + `.png` | Bitmap font | Future |
| Menu bg decoration | `assets/images/ui/menu_deco.png` | 64×64 tileable | Future |
| Title logo sprite | `assets/images/ui/title_sekai.png` | Full raster title | Future |

---

## Appendix C: Quality Checklist

Before considering the menu "done":

- [ ] Title "SEKAI" has visible glow (not flat text)
- [ ] Fragment particles drift upward smoothly (no jerking)
- [ ] Menu items stagger in on first load with correct timing
- [ ] Carets pulse at readable rate (not too fast, not too slow)
- [ ] Up/Down navigation wraps correctly (stops at boundaries)
- [ ] "NEW GAME" transitions to BootScene with fade
- [ ] Inactive items (CONTINUE, CREDITS) are clearly grayed out
- [ ] Hint text blinks at readable rate
- [ ] All colors match the 25-ji palette (no orphan colors)
- [ ] Fragment pool maintains exactly 20 objects (no memory leak)
- [ ] Scene can be restarted without errors (test: exit and re-enter)
- [ ] Screen reader / accessibility: text is actual Text objects (not baked into sprites)
