/**
 * One-time migration script: generates .tmj (Tiled JSON) files from existing RoomDef.ROOMS data.
 * Run with: node scripts/generate-tilemaps.js
 *
 * Output: assets/maps/*.tmj (one per room)
 */

const fs = require('fs');
const path = require('path');

const MAPS_DIR = path.resolve(__dirname, '..', 'assets', 'maps');
const IMAGES_DIR = path.resolve(__dirname, '..', 'assets', 'images');
const TILE_SIZE = 16;
const ROOM_OFFSET_Y = -16; // match existing collision surface
const GROUND_OFFSET_Y = -8; // ground layer offset (half tile lower)

const GAME_WIDTH = 1280;
const BASE_WIDTH = 960;
const scaleX = GAME_WIDTH / BASE_WIDTH;
const TILES_PER_UNIT = Math.round(64 / TILE_SIZE); // floor tile fill density

// ── Room definitions (from RoomDef.ROOMS) ──
//
// PLATFORM DESIGN NOTES (HK-style):
//   Tile size: 16×16px. Ground surface: y=672 (row 43 top: 43*16-16=672).
//   Platform y = T*16+8 where T = desired tile row.
//   Platform top (collision surface) = T*16-16.
//   Vertical gap between consecutive platforms ≤ 32px (2 rows) or 48px (3 rows — harder).
//   Each platform 3-4 tiles wide (w=0.75→48px, w=1→64px).
//   Adjacent platforms overlap horizontally by ≥ 2 tiles (32px).
//   Jump: ~59px typical hold, ~76px max. Horiz distance: ~200px.
//   p.x = tile_col * 12 gives exact tile alignment.
//
const ROOMS = {
  // ── INTRO (no abilities) ──
  // Pure ground-level intro. Let player learn movement before any platforming.
  intro: {
    id: 'intro', name: 'INTRO', width: 960, height: 720,
    groundTexture: 'ground_intro',
    tint: { color: 0x0a0a1a, alpha: 0.25 },
    exits: [{ x: 954, y: 624, w: 10, h: 60, dir: 'right', targetRoom: 'ascent', targetX: 48, targetY: 660 }],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Tutorial platforms — teach jumping without requiring it for progression
      { x: 144, y: 664, w: 0.75 },  // T=41  surface 640  step up from ground
      { x: 252, y: 632, w: 0.50 },  // T=39  surface 608  health orb platform
      { x: 576, y: 664, w: 0.50 },  // T=41  surface 640  combat platform above bloated
    ],
    enemies: [{ id: 'intro_0', type: 'bloated', x: 480, y: 636 }],
    collectibles: [{ type: 'health', saveId: 'health_1', x: 600, y: 600, value: 30, persistent: false }],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 0, y: 1 },
  },

  // ── ASCENT (no abilities) ──
  // Staircase: 8 platforms, Δ2 rows (32px) per step, w=1 (4 tiles), left-to-right staircase.
  // T=41→T=27 (top 640→416, 224px climb). Each platform 24px right of previous.
  // Overlap: 2 tiles between adjacent platforms.
  // NPC at (120, 660) on ground; bench at x=720 on ground.
  ascent: {
    id: 'ascent', name: 'ASCENT', width: 960, height: 720,
    groundTexture: 'ground_ascent',
    tint: { color: 0x0e0a20, alpha: 0.25 },
    exits: [
      { x: 0, y: 624, w: 10, h: 60, dir: 'left', targetRoom: 'intro', targetX: 912, targetY: 660 },
      { x: 954, y: 624, w: 10, h: 60, dir: 'right', targetRoom: 'lower', targetX: 48, targetY: 660 },
      { x: 530, y: 300, w: 48, h: 80, dir: 'up', targetRoom: 'secret', targetX: 640, targetY: 660 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Main staircase: 5 steps + landing + 2 descent (≤5 consecutive ✓)
      { x: 96,  y: 664, w: 0.75 },  // T=41  surface 640  step 1
      { x: 144, y: 632, w: 0.75 },  // T=39  surface 608  step 2
      { x: 192, y: 600, w: 0.75 },  // T=37  surface 576  step 3
      { x: 240, y: 568, w: 0.75 },  // T=35  surface 544  step 4
      { x: 288, y: 536, w: 0.75 },  // T=33  surface 512  step 5

      // Wide landing (break after 5)
      { x: 396, y: 536, w: 1.00 },  // T=33  surface 512

      // Rightward descent back to ground
      { x: 504, y: 568, w: 0.75 },  // T=35  surface 544  step down
      { x: 600, y: 600, w: 0.75 },  // T=37  surface 576  step down

      // Upper secret path (64px above landing, requires max jump)
      { x: 420, y: 472, w: 0.50 },  // T=29  surface 448  64px up from landing
      { x: 528, y: 440, w: 0.50 },  // T=27  surface 416  health orb here
    ],
    enemies: [
      { id: 'sf_1', type: 'shadow', x: 300, y: 636 },
      { id: 'bat_0', type: 'bat', x: 600, y: 300, noGravity: true },
    ],
    collectibles: [
      { type: 'health', saveId: 'health_2', x: 480, y: 600, value: 30, persistent: false },
      { type: 'health', saveId: 'health_8', x: 360, y: 360, value: 30, persistent: false },
    ],
    benches: [],
    npcs: [{
      x: 120, y: 660, name: '???', hairColor: 0x4A4A6A,
      dialogues: [
        "The echoes in this place... they sound like her voice.",
        "She left something behind. I can feel it.",
        "You're looking for her too, aren't you?",
      ],
    }],
    abilityItems: [], abilityGates: [], oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 1, y: 1 },
  },

  // ── SECRET (optional, no abilities needed — but challenging) ──
  // Vertical climb: 11 platforms, Δ3 rows (48px) per step, w=0.75 (3 tiles).
  // Zigzag: platforms alternate between left (col 16) and right (col 22-32) clusters.
  // T=41→T=11 (top 640→160, 480px climb). Full-jump steps for precision challenge.
  // Collectibles at top: hp_up at (806,168), feelings_up at (600,204).
  secret: {
    id: 'secret', name: 'SECRET', width: 960, height: 720,
    groundTexture: 'ground_secret',
    tint: { color: 0x0a1018, alpha: 0.25 },
    exits: [
      { x: 474, y: 714, w: 30, h: 10, dir: 'down', targetRoom: 'ascent', targetX: 480, targetY: 360 },
      { x: 474, y: 60, w: 30, h: 80, dir: 'up', targetRoom: 'void', targetX: 480, targetY: 60 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Full-height zigzag climb (T=41→T=11, 48px steps)
      { x: 192, y: 664, w: 0.75 },  // T=41  surface 640  left
      { x: 264, y: 616, w: 0.75 },  // T=38  surface 592  right  ✓ 48px
      { x: 192, y: 568, w: 0.75 },  // T=35  surface 544  left   ✓ 48px
      { x: 288, y: 520, w: 0.75 },  // T=32  surface 496  right  ✓ 48px
      { x: 216, y: 472, w: 0.75 },  // T=29  surface 448  left   ✓ 48px
      { x: 336, y: 424, w: 0.75 },  // T=26  surface 400  right  ✓ 48px
      { x: 264, y: 376, w: 0.75 },  // T=23  surface 352  left   ✓ 48px
      { x: 360, y: 328, w: 0.75 },  // T=20  surface 304  right  ✓ 48px
      { x: 288, y: 280, w: 0.75 },  // T=17  surface 256  left   ✓ 48px
      { x: 384, y: 232, w: 0.75 },  // T=14  surface 208  right  ✓ 48px
      { x: 312, y: 184, w: 0.75 },  // T=11  surface 160  left   ✓ 48px
    ],
    enemies: [
      { id: 'fl_1', type: 'floating', x: 480, y: 156, noGravity: true },
      { id: 'fl_2', type: 'floating', x: 720, y: 240, noGravity: true },
      { id: 'cr_0', type: 'crystal', x: 192, y: 160, noGravity: true },
      { id: 'sf_secret_0', type: 'shadow', x: 400, y: 636 },
    ],
    collectibles: [
      { type: 'hp_up', saveId: 'hp_1', x: 806, y: 168, value: 10 },
      { type: 'feelings_up', saveId: 'feel_2', x: 600, y: 204, value: 50 },
    ],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 1, y: 0 },
  },

  // ── VOID (secret challenge room, reached from secret) ──
  // Vertical climb: 8 winding platforms from ground to upper area.
  // 48px steps, staggered left→right. Dead-end — drop back to bottom exit.
  // Crystal hovers near top, shadow patrols ground near exit.
  void: {
    id: 'void', name: 'THE VOID', width: 960, height: 720,
    groundTexture: 'ground_mid',
    tint: { color: 0x0a0010, alpha: 0.35 },
    exits: [
      { x: 474, y: 714, w: 30, h: 10, dir: 'down', targetRoom: 'secret', targetX: 480, targetY: 60 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Winding ascent from bottom to top (48px steps, staggered)
      { x: 144, y: 664, w: 0.75 },  // T=41  surface 640  step 1 (left)
      { x: 288, y: 616, w: 0.75 },  // T=38  surface 592  step 2 (right, +48px)
      { x: 168, y: 568, w: 0.75 },  // T=35  surface 544  step 3 (left, +48px)
      { x: 312, y: 520, w: 0.75 },  // T=32  surface 496  step 4 (right, +48px)
      { x: 216, y: 472, w: 0.75 },  // T=29  surface 448  step 5 (left, +48px) — health orb reachable
      { x: 360, y: 424, w: 0.75 },  // T=26  surface 400  step 6 (right, +48px)
      { x: 264, y: 376, w: 0.75 },  // T=23  surface 352  step 7 (left, +48px)
      { x: 408, y: 328, w: 0.75 },  // T=20  surface 304  step 8 (right, +48px) — crystal above
    ],
    enemies: [
      { id: 'cr_void_0', type: 'crystal', x: 432, y: 260, noGravity: true },
      { id: 'sf_void_0', type: 'shadow', x: 768, y: 616 },
    ],
    collectibles: [
      { type: 'health', saveId: 'health_void', x: 504, y: 440, value: 30, persistent: false },
    ],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 2, y: 0 },
  },

  // ── LOWER (no abilities yet) ──
  // Ground-level room, platform staircase from left to right.
  // 9 platforms: 5-step staircase → runway → destructible wall blocks passage
  // Wall at x=760 is the ONLY path to right exit (mid).
  // Health orb at (840, 480) — reachable after breaking wall.
  lower: {
    id: 'lower', name: 'LOWER PATH', width: 960, height: 720,
    groundTexture: 'ground_lower',
    tint: { color: 0x1a0a1a, alpha: 0.25 },
    exits: [
      { x: 0, y: 624, w: 10, h: 60, dir: 'left', targetRoom: 'ascent', targetX: 912, targetY: 660 },
      { x: 840, y: 460, w: 10, h: 40, dir: 'right', targetRoom: 'mid', targetX: 48, targetY: 660 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Main staircase: 5 steps (≤5 ✓), 32px each
      { x: 144, y: 664, w: 0.75 },  // T=41  surface 640  step 1
      { x: 192, y: 632, w: 0.75 },  // T=39  surface 608  step 2
      { x: 240, y: 600, w: 0.75 },  // T=37  surface 576  step 3
      { x: 288, y: 568, w: 0.75 },  // T=35  surface 544  step 4
      { x: 336, y: 536, w: 0.75 },  // T=33  surface 512  step 5

      // Runway at T=31 (surface 480), carries right to breakable wall
      { x: 432, y: 504, w: 0.75 },  // T=31  surface 480  runway start
      { x: 552, y: 504, w: 0.75 },  // T=31  surface 480  runway mid
      { x: 672, y: 504, w: 1.50 },  // T=31  surface 480  before wall (6 cols, flush with wall left)
      { x: 816, y: 504, w: 0.50 },  // T=31  surface 480  after wall (32px gap)

      // hp_up alcove — visible above runway, optional skill-check reward
      { x: 432, y: 472, w: 0.50 },  // T=29  surface 448  hp_up platform
    ],
    enemies: [
      { id: 'sf_2', type: 'shadow', x: 600, y: 636 },
      { id: 'sk_1', type: 'skeleton', x: 360, y: 636 },
      { id: 'bat_lower_0', type: 'bat', x: 500, y: 360, noGravity: true },
    ],
    collectibles: [
      { type: 'health', saveId: 'health_3', x: 840, y: 480, value: 30, persistent: false },
      { type: 'hp_up', saveId: 'hp_4', x: 456, y: 456, value: 10 },
    ],
    benches: [], npcs: [],
    abilityItems: [{ x: 700, y: 480, key: 'dash', name: 'DASH' }],
    abilityGates: [],
    oneWayDoors: [],
    destructibleWalls: [{ x: 768, y: 448, w: 48, h: 80, maxHp: 6 }],
    bossTrigger: false,
    decorations: {},
    mapGrid: { x: 2, y: 1 },
  },

  // ── MID CORRIDOR (first abilities: dash + sword) ──
  // Multi-tier platform network. Left staircase (ground→dash), cross path (right→sword),
  // center up-path (→shaft). 16 platforms, 32-48px steps.
  // Dash at (240,514) just below T=32 platform. Sword at (840,422) above T=27 platform.
    mid: {
    id: 'mid', name: 'MID CORRIDOR', width: 960, height: 720,
    groundTexture: 'ground_mid',
    tint: { color: 0x100a22, alpha: 0.25 },
    exits: [
      { x: 0, y: 624, w: 10, h: 60, dir: 'left', targetRoom: 'lower', targetX: 912, targetY: 660 },
      { x: 1261, y: 624, w: 10, h: 60, dir: 'right', targetRoom: 'preboss', targetX: 64, targetY: 660 },
      { x: 520, y: 156, w: 120, h: 72, dir: 'up', targetRoom: 'shaft', targetX: 300, targetY: 200 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Left staircase: ground→dash (48px steps, ≤4 consecutive ✓)
      { x: 168, y: 664, w: 0.75 },  // T=41  surface 640  step 1
      { x: 192, y: 616, w: 0.75 },  // T=38  surface 592  step 2
      { x: 216, y: 568, w: 0.75 },  // T=35  surface 544  step 3
      { x: 240, y: 520, w: 0.75 },  // T=32  surface 496  step 4  (dash at x=240, y=514)

      // Cross path: left→right (gradual descent)
      { x: 360, y: 488, w: 0.75 },  // T=30  surface 464  32px drop
      { x: 480, y: 456, w: 0.75 },  // T=28  surface 448  16px drop

      // Feelings alcove (64px above cross, optional)
      { x: 360, y: 408, w: 0.50 },  // T=25  surface 384  64px up

      // Right cluster (→ sword pickup)
      { x: 600, y: 424, w: 0.75 },  // T=26  surface 400
      { x: 720, y: 440, w: 0.75 },  // T=27  surface 416
      { x: 816, y: 440, w: 0.50 },  // T=27  surface 416  (sword at x=840, y=422)

      // Up path: center→shaft exit (32px steps, ≤5 ✓)
      { x: 432, y: 360, w: 0.75 },  // T=22  surface 336  step 1
      { x: 456, y: 328, w: 0.50 },  // T=20  surface 304  step 2
      { x: 480, y: 296, w: 0.75 },  // T=18  surface 272  step 3
      { x: 504, y: 264, w: 0.50 },  // T=16  surface 240  step 4
      { x: 528, y: 232, w: 0.75 },  // T=14  surface 208  step 5
    ],
    enemies: [
      { id: 'bl_1', type: 'bloated', x: 480, y: 636 },
      { id: 'sk_0', type: 'skeleton', x: 720, y: 636 },
      { id: 'fl_3', type: 'floating', x: 840, y: 300, noGravity: true },
    ],
    collectibles: [
      { type: 'feelings_up', saveId: 'feel_1', x: 480, y: 408, value: 50 },
      { type: 'health', saveId: 'health_4', x: 840, y: 600, value: 30, persistent: false },
    ],
    benches: [],
    npcs: [{
      x: 120, y: 660, name: 'K', hairColor: 0x2EC4B6,
      dialogues: [
        "I've been watching you. You carry her sword well.",
        'The door ahead requires resolve. Not just strength.',
        "When you face her... remember that she's also facing herself.",
      ],
    }],
    abilityItems: [
      { x: 240, y: 514, key: 'shadowCloak', name: 'SHADOW DASH' },
      { x: 840, y: 422, key: 'sword', name: 'SWORD OF TRUTH' },
    ],
    abilityGates: [{ x: 504, y: 176, w: 120, h: 72, key: 'dash' }],
    oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 3, y: 1 },
  },

  // ── VERTICAL SHAFT (player has dash) ──
  // 5 wide floor slabs + narrow edge staircases. No staircase steps as primary layout.
  // Room: 720×960 (45×60 tiles). Camera: shaft profile (zoom 1.6).
  shaft: {
    id: 'shaft', name: 'VERTICAL SHAFT', width: 720, height: 960,
    groundTexture: 'ground_mid',
    tint: { color: 0x100a22, alpha: 0.2 },
    exits: [
      { x: 336, y: 924, w: 96, h: 10, dir: 'down', targetRoom: 'mid', targetX: 660, targetY: 60 },
      { x: 708, y: 384, w: 10, h: 160, dir: 'right', targetRoom: 'preboss', targetX: 48, targetY: 384 },
      { x: 0, y: 624, w: 10, h: 60, dir: 'left', targetRoom: 'ascent', targetX: 900, targetY: 60 },
    ],
    ground: [
      { x: 0, w: 5 },     // left slab  cols 0-19 (320px)
      { x: 7, w: 4.25 },  // right slab cols 28-44 (272px) — center hole: cols 20-27 = 128px
    ],
    platforms: [
      // ── FLOOR 5: SUMMIT (surface 144, row 9) — 2 slabs, gap 240-336 ──
      { x: 0,   y: 168, w: 3.75 },  // left slab  0→240
      { x: 336, y: 168, w: 6.0  },  // right slab 336→720
      // Collectibles: hp_up(144,130), feelings_up(560,130) on F5

      // ── FLOOR 4 (surface 304, row 19) — 2 slabs, gap 240-336 ──
      { x: 0,   y: 328, w: 3.75 },  // left slab  0→240
      { x: 336, y: 328, w: 4.75 },  // right slab 336→640
      // Crystal hovers in gap at (288,290)

      // ── FLOOR 3: PREBOSS LAYER (surface 464, row 29) — 2 slabs, gap 240-336 ──
      { x: 0,   y: 488, w: 3.75 },  // left slab  0→240
      { x: 336, y: 488, w: 6.0  },  // right slab 336→720 → preboss exit at x=708
      // Bat at (480,450) patrols right slab

      // ── FLOOR 2: ASCENT LAYER (surface 592, row 37) — 2 slabs, gap 240-336 ──
      { x: 0,   y: 616, w: 3.75 },  // left slab  0→240
      { x: 336, y: 616, w: 4.75 },  // right slab 336→640
      // → ascent exit at x=0. Bat at (240,580) hovers in gap

      // ── FLOOR 1: ENTRY LAYER (surface 736, row 46) — 2 slabs, gap 240-336 ──
      { x: 0,   y: 760, w: 3.75 },  // left slab  0→240
      { x: 336, y: 760, w: 6.0  },  // right slab 336→720 → elevator at x=288 fills gap

      // ── RECOVERY STAIRCASE (ground→F1, staggered →gap 240) — 3 steps ──
      { x: 168, y: 888, w: 0.75 },  // surface 864, row 54
      { x: 216, y: 840, w: 0.75 },  // surface 816, row 51, +48px
      { x: 264, y: 792, w: 0.75 },  // surface 768, row 48, +48px → 32px to F1, near gap

      // ── LEFT STAIRCASE (F1→F2, staggered →gap 240) — 2 steps ──
      { x: 144, y: 712, w: 0.75 },  // surface 688, row 43
      { x: 192, y: 664, w: 0.75 },  // surface 640, row 40, +48px → 48px to F2, at gap edge
    ],
    movingPlatforms: [
      { x: 288, y: 600, width: 96, rangeY: 448, speed: 60 },
    ],
    enemies: [
      { id: 'bat_shaft_1', type: 'bat', x: 480, y: 450, noGravity: true },
      { id: 'bat_shaft_2', type: 'bat', x: 500, y: 290, noGravity: true },
      { id: 'cr_shaft_0', type: 'crystal', x: 288, y: 290, noGravity: true },
      { id: 'bl_shaft_0', type: 'bloated', x: 180, y: 900 },
      { id: 'sk_shaft_0', type: 'skeleton', x: 500, y: 450 },
    ],
    collectibles: [
      { type: 'hp_up', saveId: 'hp_3', x: 144, y: 130, value: 10 },
      { type: 'feelings_up', saveId: 'feel_3', x: 560, y: 130, value: 50 },
    ],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 3, y: 0 },
  },

  // ── PRE-BOSS (player has dash + sword) ──
  // 8 platforms, Δ3 rows (48px) steps. Entry at mid-left (from shaft), path to right+boss.
  // Collectibles: hp_up (816,360), health (240,600), health (840,432).
  // Bench at x=240. Ability gates: doubleJump (x=0), shadowCloak (x=840).
  preboss: {
    id: 'preboss', name: 'PRE-BOSS', width: 960, height: 720,
    groundTexture: 'ground_preboss',
    tint: { color: 0x1a0a0a, alpha: 0.25 },
    exits: [
      { x: 0, y: 384, w: 12, h: 160, dir: 'left', targetRoom: 'shaft', targetX: 658, targetY: 420 },
      { x: 946, y: 624, w: 12, h: 60, dir: 'right', targetRoom: 'boss', targetX: 67, targetY: 660 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // ── Entry from shaft (left side, y~400 landing) ──
      { x: 120, y: 424, w: 0.75 },  // T=26  surface 400  entry landing

      // ── Descending staircase (3 steps, 48px each, ≤5 ✓) ──
      { x: 240, y: 376, w: 0.75 },  // T=23  surface 352  descent 1
      { x: 360, y: 328, w: 0.75 },  // T=20  surface 304  descent 2
      { x: 480, y: 280, w: 0.75 },  // T=17  surface 256  descent 3 (bottom)

      // ── Ascending return (3 steps, 48px each, ≤5 ✓) ──
      { x: 600, y: 328, w: 0.75 },  // T=20  surface 304  ascent 1
      { x: 720, y: 376, w: 1.50 },  // T=23  surface 352  ascent 2 + hp_up merged

      // ── Boss approach (right side) ──
      { x: 816, y: 440, w: 0.50 },  // T=27  surface 416  health orb

      // ── Upper tier (48px steps, visible from descent, tactical reward) ──
      { x: 504, y: 232, w: 0.75 },  // T=13  surface 208  48px up from T=17
      { x: 432, y: 184, w: 0.75 },  // T=10  surface 160  48px up
      { x: 576, y: 136, w: 0.50 },  // T=7   surface 112  48px up — feelings_up at top
    ],
    enemies: [
      { id: 'bl_2', type: 'bloated', x: 600, y: 636 },
      { id: 'sk_2', type: 'skeleton', x: 360, y: 636 },
      { id: 'bat_2', type: 'bat', x: 600, y: 240, noGravity: true },
    ],
    collectibles: [
      { type: 'hp_up', saveId: 'hp_2', x: 756, y: 360, value: 10 },
      { type: 'health', saveId: 'health_5', x: 240, y: 600, value: 30, persistent: false },
      { type: 'health', saveId: 'health_6', x: 840, y: 432, value: 30, persistent: false },
      { type: 'feelings_up', saveId: 'feel_4', x: 600, y: 108, value: 50 },
    ],
    benches: [],
    npcs: [], abilityItems: [],
    abilityGates: [
      { x: 0, y: 650, w: 24, h: 36, key: 'doubleJump' },
      { x: 840, y: 650, w: 24, h: 36, key: 'shadowCloak' },
    ],
    oneWayDoors: [], destructibleWalls: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 4, y: 1 },
  },

  // ── BOSS ARENA ──
  // Simple arena. 2 low platforms (T=41, 32px above ground) for dodge tool.
  boss: {
    id: 'boss', name: 'BOSS AREA', width: 960, height: 720,
    groundTexture: 'ground_boss',
    tint: { color: 0x0a0018, alpha: 0.25 },
    exits: [
      { x: 0, y: 624, w: 12, h: 60, dir: 'left', targetRoom: 'preboss', targetX: 893, targetY: 660 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      { x: 96, y: 664, w: 0.75 },   // T=41  top=640   left side  32px from ground
      { x: 648, y: 664, w: 0.75 },  // T=41  top=640   right side 32px from ground
    ],
    enemies: [], collectibles: [],
    benches: [],
    npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], destructibleWalls: [],
    bossTrigger: true,
    decorations: {},
    mapGrid: { x: 5, y: 0 },
  },
};

// ── Scale helper (mirrors RoomDef._scaleRoom) ──
function scaleVal(v) { return Math.round(v * scaleX); }
function scaleRoom(room) {
  const c = JSON.parse(JSON.stringify(room));
  c.width = Math.round((c.width || BASE_WIDTH) * scaleX);
  if (Array.isArray(c.ground)) {
    c.ground = c.ground.map(g => ({ x: scaleVal(g.x), w: Math.max(1, scaleVal(g.w)) }));
  }
  if (Array.isArray(c.platforms)) {
    c.platforms = c.platforms.map(p => ({ ...p, x: scaleVal(p.x) }));
  }
  if (Array.isArray(c.exits)) {
    c.exits = c.exits.map(e => ({ ...e, x: scaleVal(e.x), w: Math.max(1, scaleVal(e.w)), targetX: scaleVal(e.targetX) }));
  }
  if (Array.isArray(c.enemies)) {
    c.enemies = c.enemies.map(e => ({ ...e, x: scaleVal(e.x) }));
  }
  if (Array.isArray(c.collectibles)) {
    c.collectibles = c.collectibles.map(coll => ({ ...coll, x: scaleVal(coll.x) }));
  }
  if (Array.isArray(c.benches)) {
    c.benches = c.benches.map(b => ({ ...b, x: scaleVal(b.x) }));
  }
  if (Array.isArray(c.npcs)) {
    c.npcs = c.npcs.map(n => ({ ...n, x: scaleVal(n.x) }));
  }
  if (Array.isArray(c.abilityItems)) {
    c.abilityItems = c.abilityItems.map(a => ({ ...a, x: scaleVal(a.x) }));
  }
  if (Array.isArray(c.abilityGates)) {
    c.abilityGates = c.abilityGates.map(g => ({ ...g, x: scaleVal(g.x), w: Math.max(1, scaleVal(g.w)) }));
  }
  if (Array.isArray(c.oneWayDoors)) {
    c.oneWayDoors = c.oneWayDoors.map(d => ({ ...d, x: scaleVal(d.x), w: Math.max(1, scaleVal(d.w)) }));
  }
  if (Array.isArray(c.destructibleWalls)) {
    c.destructibleWalls = c.destructibleWalls.map(w => ({
      ...w, x: scaleVal(w.x), w: Math.max(1, scaleVal(w.w))
    }));
  }
  // Decorations
  const dec = c.decorations;
  if (dec) {
    if (Array.isArray(dec.stalactites)) dec.stalactites = dec.stalactites.map(s => ({ ...s, x: scaleVal(s.x) }));
    if (Array.isArray(dec.crystals)) dec.crystals = dec.crystals.map(cr => ({ ...cr, x: scaleVal(cr.x) }));
    if (Array.isArray(dec.torches)) dec.torches = dec.torches.map(t => ({ ...t, x: scaleVal(t.x) }));
    if (Array.isArray(dec.vines)) dec.vines = dec.vines.map(v => ({ ...v, x: scaleVal(v.x) }));
    if (Array.isArray(dec.ambientLights)) dec.ambientLights = dec.ambientLights.map(l => ({ ...l, x: scaleVal(l.x) }));
    if (dec.runeGlows && typeof dec.runeGlows === 'object' && !Array.isArray(dec.runeGlows)) {
      dec.runeGlows = { ...dec.runeGlows, startX: scaleVal(dec.runeGlows.startX || 0) };
    }
  }
  return c;
}

// ── TMJ generation ──
function generateTMJ(room) {
  const scaled = scaleRoom(room);
  const mapW = scaled.width;
  const mapH = scaled.height;
  const tileCols = Math.ceil(mapW / TILE_SIZE);
  const tileRows = mapH % TILE_SIZE === 0
    ? Math.ceil(mapH / TILE_SIZE) + 1
    : Math.ceil(mapH / TILE_SIZE);

  // Tile data arrays
  const groundData = new Array(tileCols * tileRows).fill(0);
  const platformData = new Array(tileCols * tileRows).fill(0);

  // ── Ground tiles (dynamically placed ~48px from room bottom) ──
  const groundRow = Math.round((mapH - 48) / TILE_SIZE);
  for (const g of scaled.ground) {
    const startCol = Math.round(g.x * 64 / TILE_SIZE);
    const tileCount = g.w * TILES_PER_UNIT;
    const row = groundRow;
    for (let i = 0; i < tileCount; i++) {
      const col = startCol + i;
      if (col >= 0 && col < tileCols && row >= 0 && row < tileRows) {
        groundData[row * tileCols + col] = 1;
      }
    }
  }

  // ── Platform tiles ──
  for (const p of scaled.platforms) {
    const count = p.w * TILES_PER_UNIT;
    for (let i = 0; i < count; i++) {
      const centerX = p.x + i * TILE_SIZE + TILE_SIZE / 2;
      const centerY = p.y - TILE_SIZE / 2;
      const tileRow = Math.round(centerY / TILE_SIZE) - 1;
      const tileCol = Math.round((centerX - TILE_SIZE / 2) / TILE_SIZE);
      if (tileCol >= 0 && tileCol < tileCols && tileRow >= 0 && tileRow < tileRows) {
        platformData[tileRow * tileCols + tileCol] = 1;
      }
    }
  }

  // ── Build layers ──
  const layers = [];
  let nextObjId = 1;

  // Tile: Ground
  layers.push({
    data: groundData,
    height: tileRows,
    id: 1,
    name: 'Ground',
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: tileCols,
    x: 0,
    y: GROUND_OFFSET_Y,
  });

  // Tile: Platforms
  layers.push({
    data: platformData,
    height: tileRows,
    id: 2,
    name: 'Platforms',
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: tileCols,
    x: 0,
    y: 0,
  });

  // ── Object layers ──
  // Exits
  if (scaled.exits && scaled.exits.length) {
    const objs = scaled.exits.map((e, i) => ({
      id: nextObjId++,
      name: e.dir,
      type: 'exit',
      x: e.x, y: e.y,
      width: e.w, height: e.h,
      properties: [
        { name: 'targetRoom', type: 'string', value: e.targetRoom },
        { name: 'targetX', type: 'int', value: e.targetX },
        { name: 'targetY', type: 'int', value: e.targetY },
        { name: 'dir', type: 'string', value: e.dir },
      ],
    }));
    layers.push({
      id: 3, name: 'Exits', type: 'objectgroup', visible: true,
      objects: objs, opacity: 1, x: 0, y: 0,
    });
  }

  // SpawnPoints: enemies, collectibles, benches, npcs, ability items
  const spawnObjs = [];
  for (const e of (scaled.enemies || [])) {
    const props = [
      { name: 'spawnType', type: 'string', value: 'enemy' },
      { name: 'enemyType', type: 'string', value: e.type },
      { name: 'spawnId', type: 'string', value: e.id },
    ];
    if (e.noGravity) props.push({ name: 'noGravity', type: 'bool', value: true });
    spawnObjs.push({
      id: nextObjId++, name: `enemy_${e.id}`, type: 'enemy',
      x: e.x, y: e.y, width: 0, height: 0,
      properties: props,
    });
  }
  for (const c of (scaled.collectibles || [])) {
    const props = [
      { name: 'spawnType', type: 'string', value: 'collectible' },
      { name: 'collectType', type: 'string', value: c.type },
      { name: 'saveId', type: 'string', value: c.saveId },
      { name: 'value', type: 'int', value: c.value },
    ];
    if (c.persistent !== undefined) {
      props.push({ name: 'persistent', type: 'bool', value: c.persistent });
    }
    spawnObjs.push({
      id: nextObjId++, name: `collect_${c.saveId}`, type: 'collectible',
      x: c.x, y: c.y, width: 0, height: 0,
      properties: props,
    });
  }
  for (const b of (scaled.benches || [])) {
    spawnObjs.push({
      id: nextObjId++, name: 'bench', type: 'bench',
      x: b.x, y: 642, width: 0, height: 0,
      properties: [{ name: 'spawnType', type: 'string', value: 'bench' }],
    });
  }
  for (const n of (scaled.npcs || [])) {
    spawnObjs.push({
      id: nextObjId++, name: `npc_${n.name}`, type: 'npc',
      x: n.x, y: n.y, width: 0, height: 0,
      properties: [
        { name: 'spawnType', type: 'string', value: 'npc' },
        { name: 'npcName', type: 'string', value: n.name },
        { name: 'hairColor', type: 'int', value: n.hairColor },
        { name: 'dialogues', type: 'string', value: JSON.stringify(n.dialogues) },
      ],
    });
  }
  for (const a of (scaled.abilityItems || [])) {
    spawnObjs.push({
      id: nextObjId++, name: `ability_${a.key}`, type: 'abilityItem',
      x: a.x, y: a.y, width: 0, height: 0,
      properties: [
        { name: 'spawnType', type: 'string', value: 'abilityItem' },
        { name: 'abilityKey', type: 'string', value: a.key },
        { name: 'abilityName', type: 'string', value: a.name },
      ],
    });
  }
  if (spawnObjs.length) {
    layers.push({
      id: 4, name: 'SpawnPoints', type: 'objectgroup', visible: true,
      objects: spawnObjs, opacity: 1, x: 0, y: 0,
    });
  }

  // Gates (ability gates)
  if (scaled.abilityGates && scaled.abilityGates.length) {
    const gates = scaled.abilityGates.map((g, i) => ({
      id: nextObjId++, name: `gate_${g.key}`, type: 'gate',
      x: g.x, y: g.y, width: g.w, height: g.h,
      properties: [
        { name: 'spawnType', type: 'string', value: 'gate' },
        { name: 'abilityKey', type: 'string', value: g.key },
      ],
    }));
    layers.push({
      id: 5, name: 'Gates', type: 'objectgroup', visible: true,
      objects: gates, opacity: 1, x: 0, y: 0,
    });
  }

  // OneWayDoors
  if (scaled.oneWayDoors && scaled.oneWayDoors.length) {
    const doors = scaled.oneWayDoors.map((d, i) => ({
      id: nextObjId++, name: `door_${i}`, type: 'oneWayDoor',
      x: d.x, y: d.y || 390, width: d.w || 16, height: d.h || 340,
      properties: [{ name: 'spawnType', type: 'string', value: 'oneWayDoor' }],
    }));
    layers.push({
      id: 6, name: 'Doors', type: 'objectgroup', visible: true,
      objects: doors, opacity: 1, x: 0, y: 0,
    });
  }

  // DestructibleWalls
  if (scaled.destructibleWalls && scaled.destructibleWalls.length) {
    const walls = scaled.destructibleWalls.map((w, i) => ({
      id: nextObjId++, name: `destructibleWall_${i}`, type: 'destructibleWall',
      x: w.x, y: w.y, width: w.w, height: w.h,
      properties: [
        { name: 'spawnType', type: 'string', value: 'destructibleWall' },
        { name: 'wallId', type: 'string', value: `wall_${room.id}_${i}` },
        { name: 'maxHp', type: 'int', value: w.maxHp || 6 },
      ],
    }));
    layers.push({
      id: 7, name: 'DestructibleWalls', type: 'objectgroup', visible: true,
      objects: walls, opacity: 1, x: 0, y: 0,
    });
  }

  // MovingPlatforms
  if (scaled.movingPlatforms && scaled.movingPlatforms.length) {
    const mpObjs = scaled.movingPlatforms.map((mp, i) => ({
      id: nextObjId++, name: `movingPlatform_${i}`, type: 'movingPlatform',
      x: mp.x, y: mp.y, width: mp.width, height: 16,
      properties: [
        { name: 'spawnType', type: 'string', value: 'movingPlatform' },
        { name: 'rangeY', type: 'int', value: mp.rangeY },
        { name: 'speed', type: 'int', value: mp.speed },
      ],
    }));
    layers.push({
      id: 8, name: 'MovingPlatforms', type: 'objectgroup', visible: true,
      objects: mpObjs, opacity: 1, x: 0, y: 0,
    });
  }

  // Decorations
  const decoObjs = [];
  for (const s of (scaled.decorations?.stalactites || [])) {
    decoObjs.push({
      id: nextObjId++, name: 'stalactite', type: 'decoration',
      x: s.x, y: 0, width: 0, height: 0,
      properties: [
        { name: 'decoType', type: 'string', value: 'stalactite' },
        { name: 'h', type: 'int', value: s.h },
      ],
    });
  }
  for (const cr of (scaled.decorations?.crystals || [])) {
    decoObjs.push({
      id: nextObjId++, name: 'crystal', type: 'decoration',
      x: cr.x, y: cr.y, width: 0, height: 0,
      properties: [{ name: 'decoType', type: 'string', value: 'crystal' }],
    });
  }
  for (const t of (scaled.decorations?.torches || [])) {
    decoObjs.push({
      id: nextObjId++, name: 'torch', type: 'decoration',
      x: t.x, y: t.y, width: 0, height: 0,
      properties: [{ name: 'decoType', type: 'string', value: 'torch' }],
    });
  }
  for (const v of (scaled.decorations?.vines || [])) {
    decoObjs.push({
      id: nextObjId++, name: 'vine', type: 'decoration',
      x: v.x, y: 0, width: 0, height: 0,
      properties: [{ name: 'decoType', type: 'string', value: 'vine' }],
    });
  }
  // BossTrigger
  if (scaled.bossTrigger) {
    decoObjs.push({
      id: nextObjId++, name: 'bossTrigger', type: 'bossTrigger',
      x: 0, y: 0, width: mapW, height: mapH,
      properties: [{ name: 'spawnType', type: 'string', value: 'bossTrigger' }],
    });
  }
  if (decoObjs.length) {
    layers.push({
      id: 7, name: 'Decorations', type: 'objectgroup', visible: true,
      objects: decoObjs, opacity: 1, x: 0, y: 0,
    });
  }

  // ── Tileset ──
  const relImagePath = path.relative(MAPS_DIR, path.join(IMAGES_DIR, 'tiles', `${room.groundTexture}.png`)).replace(/\\/g, '/');
  const tilesets = [{
    firstgid: 1,
    name: room.groundTexture,
    image: relImagePath,
    imagewidth: TILE_SIZE,
    imageheight: TILE_SIZE,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    tiles: [{
      id: 0,
      properties: [{ name: 'collides', type: 'bool', value: true }],
    }],
  }];

  return {
    compressionlevel: -1,
    height: tileRows,
    infinite: false,
    layers,
    nextlayerid: 8,
    nextobjectid: nextObjId,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TILE_SIZE,
    tilesets,
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width: tileCols,
  };
}

// ── Main ──
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });

const ROOM_ORDER = ['intro', 'ascent', 'secret', 'void', 'lower', 'mid', 'shaft', 'preboss', 'boss'];

for (const id of ROOM_ORDER) {
  const room = ROOMS[id];
  const tmj = generateTMJ(room);
  // Verify ground/platform collision surface matches
  const filePath = path.join(MAPS_DIR, `${id}.tmj`);
  fs.writeFileSync(filePath, JSON.stringify(tmj, null, 2));
  console.log(`✓ Generated ${id}.tmj (${tmj.width}×${tmj.height} tiles, ${room.groundTexture})`);
}

// Summary
console.log('\n── Summary ──');
for (const id of ROOM_ORDER) {
  const room = ROOMS[id];
  const scaled = scaleRoom(room);
  console.log(`${id}: ${scaled.width}×${scaled.height} → ${Math.ceil(scaled.width/TILE_SIZE)}×${Math.ceil(scaled.height/TILE_SIZE)} tiles`);
}
