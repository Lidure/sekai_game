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
const GROUND_SURFACE_Y = 672;
const GROUND_ROW = Math.round((GROUND_SURFACE_Y + Math.abs(ROOM_OFFSET_Y)) / TILE_SIZE);
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
    platforms: [],  // Flat ground, teach movement first
    enemies: [{ id: 'intro_0', type: 'shadow', x: 540, y: 636 }],
    collectibles: [{ type: 'health', saveId: 'health_1', x: 600, y: 600, value: 30, persistent: false }],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], bossTrigger: false,
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
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // TileRow  T= row  top    p.y = T*16+8  x=col*12  gap from prev
      { x: 96, y: 664, w: 1 },   // T=41  top=640  —  32px from ground
      { x: 120, y: 632, w: 1 },  // T=39  top=608  ✓ 32px step
      { x: 144, y: 600, w: 1 },  // T=37  top=576  ✓ 32px
      { x: 168, y: 568, w: 1 },  // T=35  top=544  ✓ 32px
      { x: 192, y: 536, w: 1 },  // T=33  top=512  ✓ 32px
      { x: 216, y: 504, w: 1 },  // T=31  top=480  ✓ 32px
      { x: 240, y: 472, w: 1 },  // T=29  top=448  ✓ 32px
      { x: 264, y: 440, w: 1 },  // T=27  top=416  ✓ 32px
    ],
    enemies: [
      { id: 'sf_1', type: 'shadow', x: 360, y: 636 },
      { id: 'bat_0', type: 'bat', x: 720, y: 360, noGravity: true },
    ],
    collectibles: [{ type: 'health', saveId: 'health_2', x: 480, y: 600, value: 30, persistent: false }],
    benches: [],
    npcs: [{
      x: 120, y: 660, name: '???', hairColor: 0x4A4A6A,
      dialogues: [
        "The echoes in this place... they sound like her voice.",
        "She left something behind. I can feel it.",
        "You're looking for her too, aren't you?",
      ],
    }],
    abilityItems: [], abilityGates: [], oneWayDoors: [], bossTrigger: false,
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
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // TileRow  T= row  top    p.y = T*16+8  x=col*12  gap
      { x: 192, y: 664, w: 0.75 },  // T=41  top=640   left    32px from ground
      { x: 264, y: 616, w: 0.75 },  // T=38  top=592   right   ✓ 48px
      { x: 192, y: 568, w: 0.75 },  // T=35  top=544   left    ✓ 48px (zigzag)
      { x: 288, y: 520, w: 0.75 },  // T=32  top=496   right   ✓ 48px
      { x: 216, y: 472, w: 0.75 },  // T=29  top=448   left    ✓ 48px
      { x: 336, y: 424, w: 0.75 },  // T=26  top=400   right   ✓ 48px
      { x: 264, y: 376, w: 0.75 },  // T=23  top=352   left    ✓ 48px
      { x: 360, y: 328, w: 0.75 },  // T=20  top=304   right   ✓ 48px
      { x: 288, y: 280, w: 0.75 },  // T=17  top=256   left    ✓ 48px
      { x: 384, y: 232, w: 0.75 },  // T=14  top=208   right   ✓ 48px
      { x: 312, y: 184, w: 0.75 },  // T=11  top=160   left    ✓ 48px
    ],
    enemies: [
      { id: 'fl_1', type: 'floating', x: 480, y: 156, noGravity: true },
      { id: 'fl_2', type: 'floating', x: 720, y: 120, noGravity: true },
    ],
    collectibles: [
      { type: 'hp_up', saveId: 'hp_1', x: 806, y: 168, value: 10 },
      { type: 'feelings_up', saveId: 'feel_2', x: 600, y: 204, value: 50 },
    ],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 1, y: 0 },
  },

  // ── LOWER (no abilities yet) ──
  // Ground-level room, platform staircase from left to right.
  // 10 platforms, Δ2 rows (32px) per step climbing, then runway at T=30 across room.
  // w=0.75 (3 tiles) for stairs, w=0.5 for final right platform.
  // OneWayDoor at x=720 traps player on right side after crossing.
  // Health collectible at (840, 480) — reachable from runway.
  lower: {
    id: 'lower', name: 'LOWER PATH', width: 960, height: 720,
    groundTexture: 'ground_lower',
    tint: { color: 0x1a0a1a, alpha: 0.25 },
    exits: [
      { x: 0, y: 624, w: 10, h: 60, dir: 'left', targetRoom: 'ascent', targetX: 912, targetY: 660 },
      { x: 954, y: 624, w: 10, h: 60, dir: 'right', targetRoom: 'mid', targetX: 48, targetY: 660 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // TileRow  top    p.y        x=col*12   w    gap from prev
      { x: 192, y: 664, w: 0.75 },  // T=41  top=640    col 16    32px from ground
      { x: 216, y: 632, w: 0.75 },  // T=39  top=608    col 18    ✓ 32px
      { x: 240, y: 600, w: 0.75 },  // T=37  top=576    col 20    ✓ 32px
      { x: 264, y: 568, w: 0.75 },  // T=35  top=544    col 22    ✓ 32px
      { x: 288, y: 536, w: 0.75 },  // T=33  top=512    col 24    ✓ 32px
      { x: 312, y: 504, w: 0.75 },  // T=31  top=480    col 26    ✓ 32px
      { x: 432, y: 488, w: 0.75 },  // T=30  top=464    col 36    runway right
      { x: 576, y: 488, w: 0.75 },  // T=30  top=464    col 48    runway right
      { x: 696, y: 488, w: 0.5 },   // T=30  top=464    col 58    runway bridge
      { x: 816, y: 488, w: 0.5 },   // T=30  top=464    col 68    final, under health orb
    ],
    enemies: [
      { id: 'sf_2', type: 'shadow', x: 600, y: 636 },
      { id: 'sf_3', type: 'shadow', x: 780, y: 636 },
    ],
    collectibles: [{ type: 'health', saveId: 'health_3', x: 840, y: 480, value: 30, persistent: false }],
    benches: [], npcs: [], abilityItems: [], abilityGates: [],
    oneWayDoors: [{ x: 720, h: 340, y: 468 }],
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
      { x: 0, y: 624, w: 12, h: 60, dir: 'left', targetRoom: 'lower', targetX: 893, targetY: 660 },
      { x: 946, y: 624, w: 12, h: 60, dir: 'right', targetRoom: 'preboss', targetX: 67, targetY: 660 },
      { x: 600, y: 0, w: 60, h: 10, dir: 'up', targetRoom: 'shaft', targetX: 480, targetY: 708 },
    ],
    ground: [{ x: 0, w: 15 }],
    platforms: [
      // Left staircase: ground→dash (48px steps)
      { x: 168, y: 664, w: 0.75 },  // T=41  top=640   col 14   32px from ground
      { x: 192, y: 616, w: 0.75 },  // T=38  top=592   col 16   ✓ 48px
      { x: 216, y: 568, w: 0.75 },  // T=35  top=544   col 18   ✓ 48px
      { x: 240, y: 520, w: 0.75 },  // T=32  top=496   col 20   ✓ 48px  (dash 18px above)

      // Cross path: left→right (gradual descent)
      { x: 360, y: 488, w: 0.75 },  // T=30  top=464   col 30   drop 32px from T=32
      { x: 480, y: 456, w: 0.75 },  // T=28  top=448   col 40   drop 16px

      // Collectible platforms (mid-right)
      { x: 336, y: 408, w: 0.5 },   // T=25  top=384   col 28   under health (360,396)
      { x: 456, y: 424, w: 0.5 },   // T=26  top=400   col 38   under feelings_up (480,408)

      // Right cluster (sword access)
      { x: 600, y: 424, w: 0.75 },  // T=26  top=400   col 50
      { x: 720, y: 440, w: 0.75 },  // T=27  top=416   col 60
      { x: 816, y: 440, w: 0.5 },   // T=27  top=416   col 68   under sword (840,422)

      // Up path: center→shaft exit (32px steps)
      { x: 432, y: 360, w: 0.75 },  // T=22  top=336   col 36
      { x: 456, y: 328, w: 0.5 },   // T=20  top=304   col 38   ✓ 32px
      { x: 480, y: 296, w: 0.75 },  // T=18  top=272   col 40   ✓ 32px
      { x: 504, y: 264, w: 0.5 },   // T=16  top=240   col 42   ✓ 32px
      { x: 528, y: 232, w: 0.75 },  // T=14  top=208   col 44   ✓ 32px
    ],
    enemies: [
      { id: 'sf_4', type: 'shadow', x: 360, y: 636 },
      { id: 'sf_5', type: 'shadow', x: 720, y: 636 },
      { id: 'sk_0', type: 'skeleton', x: 480, y: 636 },
      { id: 'bat_1', type: 'bat', x: 360, y: 300, noGravity: true },
      { id: 'fl_3', type: 'floating', x: 840, y: 300, noGravity: true },
    ],
    collectibles: [
      { type: 'feelings_up', saveId: 'feel_1', x: 480, y: 408, value: 50 },
      { type: 'health', saveId: 'health_4', x: 840, y: 600, value: 30, persistent: false },
      { type: 'health', saveId: 'health_7', x: 360, y: 396, value: 30, persistent: false },
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
    abilityGates: [{ x: 0, y: 650, w: 24, h: 36, key: 'dash' }],
    oneWayDoors: [], bossTrigger: false,
    decorations: {},
    mapGrid: { x: 3, y: 1 },
  },

  // ── VERTICAL SHAFT (player has dash) ──
  // 13 platforms, Δ3 rows (48px) per step. Zigzag left→right then cross to right wall.
  // T=41→T=11 (top 640→160). Final platforms near right wall for preboss exit.
  // Room: 720×960 (60×61 tiles). Camera: shaft profile (zoom 1.6).
  shaft: {
    id: 'shaft', name: 'VERTICAL SHAFT', width: 720, height: 960,
    groundTexture: 'ground_mid',
    tint: { color: 0x100a22, alpha: 0.2 },
    exits: [
      { x: 300, y: 954, w: 100, h: 10, dir: 'down', targetRoom: 'mid', targetX: 660, targetY: 60 },
      { x: 708, y: 384, w: 10, h: 160, dir: 'right', targetRoom: 'preboss', targetX: 48, targetY: 384 },
    ],
    ground: [{ x: 0, w: 1 }],
    platforms: [
      // Zigzag climb (left side, 48px steps)
      { x: 60, y: 664, w: 0.75 },   // T=41  top=640   col 5    32px from ground
      { x: 120, y: 616, w: 0.75 },  // T=38  top=592   col 10   ✓ 48px
      { x: 72, y: 568, w: 0.75 },   // T=35  top=544   col 6    ✓ 48px zigzag left
      { x: 168, y: 520, w: 0.75 },  // T=32  top=496   col 14   ✓ 48px
      { x: 96, y: 472, w: 0.75 },   // T=29  top=448   col 8    ✓ 48px zigzag left
      { x: 240, y: 424, w: 0.75 },  // T=26  top=400   col 20   ✓ 48px
      { x: 144, y: 376, w: 0.75 },  // T=23  top=352   col 12   ✓ 48px zigzag left
      { x: 288, y: 328, w: 0.75 },  // T=20  top=304   col 24   ✓ 48px
      { x: 204, y: 280, w: 0.75 },  // T=17  top=256   col 17   ✓ 48px zigzag left
      // Cross to right wall (same row, horizontal dash)
      { x: 336, y: 280, w: 0.75 },  // T=17  top=256   col 28   132px jump right ✓
      { x: 480, y: 280, w: 0.75 },  // T=17  top=256   col 40   ✓ 144px
      // Climb right wall (toward exit zone at y=384-544)
      { x: 600, y: 232, w: 0.75 },  // T=14  top=208   col 50   ✓ 48px up + 128px right
      { x: 696, y: 184, w: 0.75 },  // T=11  top=160   col 58   ✓ 48px up — exit reachable
    ],
    enemies: [],
    collectibles: [{ type: 'hp_up', saveId: 'hp_3', x: 240, y: 264, value: 10 }],
    benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], bossTrigger: false,
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
      // Entry from shaft at ~y=384-544, land on descending path rightward
      { x: 120, y: 424, w: 0.75 },  // T=26  top=400   col 10   near shaft entry
      { x: 240, y: 376, w: 0.75 },  // T=23  top=352   col 20   ✓ 48px down (bench below)
      { x: 360, y: 328, w: 0.75 },  // T=20  top=304   col 30   ✓ 48px down
      { x: 480, y: 280, w: 0.75 },  // T=17  top=256   col 40   ✓ 48px down
      // Back up for variety
      { x: 600, y: 328, w: 0.75 },  // T=20  top=304   col 50   ✓ 48px up
      { x: 720, y: 376, w: 0.75 },  // T=23  top=352   col 60   ✓ 48px up
      // Collectible platforms (right side)
      { x: 792, y: 376, w: 0.5 },   // T=23  top=352   col 66   near hp_up (816,360)
      { x: 816, y: 440, w: 0.5 },   // T=27  top=416   col 68   near health (840,432)
    ],
    enemies: [
      { id: 'sf_6', type: 'shadow', x: 600, y: 636 },
      { id: 'sf_7', type: 'shadow', x: 840, y: 636 },
      { id: 'sk_1', type: 'skeleton', x: 360, y: 636 },
      { id: 'fl_4', type: 'floating', x: 720, y: 312, noGravity: true },
      { id: 'bat_2', type: 'bat', x: 600, y: 240, noGravity: true },
    ],
    collectibles: [
      { type: 'hp_up', saveId: 'hp_2', x: 816, y: 360, value: 10 },
      { type: 'health', saveId: 'health_5', x: 240, y: 600, value: 30, persistent: false },
      { type: 'health', saveId: 'health_6', x: 840, y: 432, value: 30, persistent: false },
    ],
    benches: [],
    npcs: [], abilityItems: [],
    abilityGates: [
      { x: 0, y: 650, w: 24, h: 36, key: 'doubleJump' },
      { x: 840, y: 650, w: 24, h: 36, key: 'shadowCloak' },
    ],
    oneWayDoors: [], bossTrigger: false,
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
    npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [],
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

  // ── Ground tiles ──
  for (const g of scaled.ground) {
    const startCol = Math.round(g.x * 64 / TILE_SIZE);
    const tileCount = g.w * TILES_PER_UNIT;
    const row = GROUND_ROW;
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

const ROOM_ORDER = ['intro', 'ascent', 'secret', 'lower', 'mid', 'shaft', 'preboss', 'boss'];

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
