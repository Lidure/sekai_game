class RoomDef {
    static ROOMS = {
        intro: {
            id: 'intro', name: 'INTRO',
            width: 960, height: 720,
            groundTexture: 'ground_intro',
            tint: { color: 0x0a0a1a, alpha: 0.25 },
            exits: [
                { x: 954, y: 600, w: 10, h: 60, dir: 'right', targetRoom: 'ascent', targetX: 48, targetY: 636 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [{ x: 384, y: 551, w: 3 }],
            enemies: [{ id: 'intro_0', type: 'shadow', x: 540, y: 636 }],
            collectibles: [{ type: 'health', saveId: 'health_1', x: 600, y: 600, value: 30, persistent: false }],
            benches: [], npcs: [], abilityItems: [], abilityGates: [],
            oneWayDoors: [], bossTrigger: false,
            decorations: { stalactites: [], crystals: [], torches: [], vines: [], runeGlows: [], ambientLights: [] },
            mapGrid: { x: 0, y: 1 },
        },
        ascent: {
            id: 'ascent', name: 'ASCENT',
            width: 960, height: 720,
            groundTexture: 'ground_ascent',
            tint: { color: 0x0e0a20, alpha: 0.25 },
            exits: [
                { x: 0, y: 600, w: 10, h: 60, dir: 'left', targetRoom: 'intro', targetX: 912, targetY: 636 },
                { x: 954, y: 600, w: 10, h: 60, dir: 'right', targetRoom: 'lower', targetX: 48, targetY: 636 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [
                { x: 134, y: 544, w: 2 },
                { x: 288, y: 467, w: 2 },
                { x: 461, y: 390, w: 2 },
                { x: 634, y: 313, w: 2 },
            ],
            enemies: [
                { id: 'sf_1', type: 'shadow', x: 240, y: 636 },
                { id: 'bat_0', type: 'bat', x: 720, y: 360, noGravity: true },
            ],
            collectibles: [{ type: 'health', saveId: 'health_2', x: 480, y: 600, value: 30, persistent: false }],
            benches: [{ x: 720 }],
            npcs: [{
                x: 120, y: 636, name: '???', hairColor: 0x4A4A6A,
                dialogues: [
                    "The echoes in this place... they sound like her voice.",
                    "She left something behind. I can feel it.",
                    "You're looking for her too, aren't you?",
                ],
            }],
            abilityItems: [], abilityGates: [], oneWayDoors: [], bossTrigger: false,
            decorations: {
                stalactites: [{ x: 120, h: 18 }, { x: 360, h: 24 }, { x: 600, h: 14 }],
                crystals: [], torches: [],
                vines: [{ x: 144 }, { x: 288 }, { x: 432 }],
                runeGlows: [], ambientLights: [],
            },
            mapGrid: { x: 1, y: 1 },
        },
        secret: {
            id: 'secret', name: 'SECRET',
            width: 960, height: 720,
            groundTexture: 'ground_secret',
            tint: { color: 0x0a1018, alpha: 0.25 },
            exits: [
                { x: 474, y: 714, w: 30, h: 10, dir: 'down', targetRoom: 'ascent', targetX: 480, targetY: 360 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [
                { x: 192, y: 364, w: 2 },
                { x: 365, y: 296, w: 2 },
                { x: 538, y: 229, w: 3 },
                { x: 749, y: 191, w: 2 },
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
            decorations: {
                stalactites: [{ x: 60, h: 20 }, { x: 300, h: 28 }, { x: 540, h: 16 }, { x: 780, h: 22 }],
                crystals: [
                    { x: 384, y: 168 }, { x: 504, y: 120 }, { x: 624, y: 96 },
                    { x: 720, y: 144 }, { x: 840, y: 108 }, { x: 900, y: 180 },
                ],
                torches: [],
                vines: [{ x: 480 }, { x: 720 }],
                runeGlows: [],
                ambientLights: [{ x: 540, y: 180, count: 3, color: 0x7FE0DE, alpha: 0.3 }],
            },
            mapGrid: { x: 1, y: 0 },
        },
        lower: {
            id: 'lower', name: 'LOWER PATH',
            width: 960, height: 720,
            groundTexture: 'ground_lower',
            tint: { color: 0x1a0a1a, alpha: 0.25 },
            exits: [
                { x: 0, y: 600, w: 10, h: 60, dir: 'left', targetRoom: 'ascent', targetX: 912, targetY: 636 },
                { x: 954, y: 600, w: 10, h: 60, dir: 'right', targetRoom: 'mid', targetX: 48, targetY: 636 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [
                { x: 192, y: 551, w: 2 },
                { x: 384, y: 493, w: 2 },
                { x: 595, y: 455, w: 2 },
                { x: 768, y: 416, w: 2 },
            ],
            enemies: [
                { id: 'sf_2', type: 'shadow', x: 600, y: 636 },
                { id: 'sf_3', type: 'shadow', x: 780, y: 636 },
            ],
            collectibles: [{ type: 'health', saveId: 'health_3', x: 840, y: 480, value: 30, persistent: false }],
            benches: [], npcs: [], abilityItems: [], abilityGates: [],
            oneWayDoors: [{ x: 720, h: 340, y: 468 }],
            bossTrigger: false,
            decorations: {
                stalactites: [{ x: 120, h: 18 }, { x: 420, h: 14 }, { x: 660, h: 20 }],
                crystals: [], torches: [],
                vines: [{ x: 240 }, { x: 600 }, { x: 840 }],
                runeGlows: [], ambientLights: [],
            },
            mapGrid: { x: 2, y: 1 },
        },
        mid: {
            id: 'mid', name: 'MID CORRIDOR',
            width: 960, height: 720,
            groundTexture: 'ground_mid',
            tint: { color: 0x100a22, alpha: 0.25 },
            exits: [
                { x: 0, y: 600, w: 12, h: 60, dir: 'left', targetRoom: 'lower', targetX: 893, targetY: 636 },
                { x: 946, y: 600, w: 12, h: 60, dir: 'right', targetRoom: 'preboss', targetX: 67, targetY: 636 },
                { x: 600, y: 0, w: 60, h: 10, dir: 'up', targetRoom: 'shaft', targetX: 480, targetY: 708 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [
                { x: 115, y: 551, w: 2 },
                { x: 307, y: 481, w: 2 },
                { x: 480, y: 419, w: 2 },
                { x: 672, y: 479, w: 2 },
            ],
            enemies: [
                { id: 'sf_4', type: 'shadow', x: 240, y: 636 },
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
            benches: [{ x: 0 }],
            npcs: [{
                x: 120, y: 636, name: 'K', hairColor: 0x2EC4B6,
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
            decorations: {
                stalactites: [], crystals: [], torches: [
                    { x: 180, y: 534 }, { x: 420, y: 402 },
                ],
                vines: [],
                runeGlows: [],
                ambientLights: [],
            },
            mapGrid: { x: 3, y: 1 },
        },
        shaft: {
            id: 'shaft', name: 'VERTICAL SHAFT',
            width: 720, height: 960,
            groundTexture: 'ground_mid',
            tint: { color: 0x100a22, alpha: 0.2 },
            exits: [
                { x: 300, y: 954, w: 100, h: 10, dir: 'down', targetRoom: 'mid', targetX: 660, targetY: 60 },
                { x: 708, y: 384, w: 10, h: 160, dir: 'right', targetRoom: 'preboss', targetX: 48, targetY: 384 },
            ],
            ground: [{ x: 0, w: 1 }],
            platforms: [
                { x: 144, y: 744, w: 2 },
                { x: 336, y: 648, w: 2 },
                { x: 163, y: 542, w: 2 },
                { x: 355, y: 446, w: 2 },
                { x: 182, y: 343, w: 2 },
                { x: 413, y: 343, w: 2 },
            ],
            enemies: [],
            collectibles: [{ type: 'hp_up', saveId: 'hp_3', x: 240, y: 264, value: 10 }],
            benches: [], npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [], bossTrigger: false,
            decorations: { stalactites: [{ x: 60, h: 26 }, { x: 420, h: 14 }], crystals: [], torches: [], vines: [], runeGlows: [], ambientLights: [] },
            mapGrid: { x: 3, y: 0 },
        },
        preboss: {
            id: 'preboss', name: 'PRE-BOSS',
            width: 960, height: 720,
            groundTexture: 'ground_preboss',
            tint: { color: 0x1a0a0a, alpha: 0.25 },
            exits: [
                { x: 0, y: 384, w: 12, h: 160, dir: 'left', targetRoom: 'shaft', targetX: 658, targetY: 420 },
                { x: 946, y: 600, w: 12, h: 60, dir: 'right', targetRoom: 'boss', targetX: 67, targetY: 636 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [
                { x: 86, y: 400, w: 2 },
                { x: 221, y: 515, w: 2 },
                { x: 374, y: 431, w: 3 },
                { x: 624, y: 491, w: 2 },
                { x: 758, y: 383, w: 2 },
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
            benches: [{ x: 240 }],
            npcs: [], abilityItems: [],
            abilityGates: [{ x: 0, y: 650, w: 24, h: 36, key: 'doubleJump' }, { x: 840, y: 650, w: 24, h: 36, key: 'shadowCloak' }],
            oneWayDoors: [], bossTrigger: false,
            decorations: { stalactites: [], crystals: [], torches: [{ x: 120, y: 498 }, { x: 360, y: 414 }, { x: 960, y: 366 }], vines: [], runeGlows: [], ambientLights: [] },
            mapGrid: { x: 4, y: 1 },
        },
        boss: {
            id: 'boss', name: 'BOSS AREA',
            width: 960, height: 720,
            groundTexture: 'ground_boss',
            tint: { color: 0x0a0018, alpha: 0.25 },
            exits: [
                { x: 0, y: 600, w: 12, h: 60, dir: 'left', targetRoom: 'preboss', targetX: 893, targetY: 636 },
            ],
            ground: [{ x: 0, w: 13 }],
            platforms: [{ x: 48, y: 515, w: 3 }],
            enemies: [],
            collectibles: [],
            benches: [{ x: 60 }],
            npcs: [], abilityItems: [], abilityGates: [], oneWayDoors: [],
            bossTrigger: true,
            decorations: { stalactites: [], crystals: [], torches: [], vines: [], runeGlows: [{ startX: 120, count: 6 }], ambientLights: [{ x: 120, y: 600, count: 4, color: 0xff4444, alpha: 0.15 }] },
            mapGrid: { x: 5, y: 0 },
        },
    };

    static ROOM_ORDER = ['intro', 'ascent', 'secret', 'lower', 'mid', 'shaft', 'preboss', 'boss'];

    static get(roomId) {
        return RoomDef.ROOMS[roomId];
    }

    static getRoomByGrid(gx, gy) {
        for (const r of RoomDef.ROOM_ORDER) {
            const def = RoomDef.ROOMS[r];
            if (def.mapGrid.x === gx && def.mapGrid.y === gy) return r;
        }
        return null;
    }
}
