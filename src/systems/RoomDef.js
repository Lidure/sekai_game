/**
 * Room metadata definitions — minimal, no coordinate data.
 * All room geometry, spawn points, and object positions are now
 * stored in Tiled .tmj files (loaded as tilemaps in BootScene).
 */
class RoomDef {
    static ROOMS = {
        intro: {
            id: 'intro', name: 'INTRO',
            tilemapKey: 'room_intro',
            groundTexture: 'ground_intro',
            tint: { color: 0x0a0a1a, alpha: 0.25 },
            bossTrigger: false,
            mapPOIs: [],
            mapGrid: { x: 0, y: 1 },
        },
        ascent: {
            id: 'ascent', name: 'ASCENT',
            tilemapKey: 'room_ascent',
            groundTexture: 'ground_ascent',
            tint: { color: 0x0e0a20, alpha: 0.25 },
            bossTrigger: false,
            mapPOIs: ['npc'],
            mapGrid: { x: 1, y: 1 },
        },
        secret: {
            id: 'secret', name: 'SECRET',
            tilemapKey: 'room_secret',
            groundTexture: 'ground_secret',
            tint: { color: 0x0a1018, alpha: 0.25 },
            bossTrigger: false,
            mapPOIs: ['hp_up', 'feelings_up'],
            mapGrid: { x: 1, y: 0 },
        },
        void: {
            id: 'void', name: 'THE VOID',
            tilemapKey: 'room_void',
            groundTexture: 'ground_mid',
            tint: { color: 0x0a0010, alpha: 0.35 },
            bossTrigger: false,
            mapGrid: { x: 2, y: 0 },
        },
        lower: {
            id: 'lower', name: 'LOWER PATH',
            tilemapKey: 'room_lower',
            groundTexture: 'ground_lower',
            tint: { color: 0x1a0a1a, alpha: 0.25 },
            bossTrigger: false,
            mapPOIs: ['hp_up', 'ability'],
            mapGrid: { x: 2, y: 1 },
        },
        mid: {
            id: 'mid', name: 'MID CORRIDOR',
            tilemapKey: 'room_mid',
            groundTexture: 'ground_mid',
            tint: { color: 0x100a22, alpha: 0.25 },
            bossTrigger: false,
            mapPOIs: ['npc', 'feelings_up', 'ability', 'gate'],
            mapGrid: { x: 3, y: 1 },
        },
        shaft: {
            id: 'shaft', name: 'VERTICAL SHAFT',
            tilemapKey: 'room_shaft',
            groundTexture: 'ground_mid',
            tint: { color: 0x100a22, alpha: 0.2 },
            bossTrigger: false,
            mapPOIs: ['hp_up', 'feelings_up'],
            mapGrid: { x: 3, y: 0 },
        },
        descent: {
            id: 'descent', name: 'THE DESCENT',
            tilemapKey: 'room_descent',
            groundTexture: 'ground_abyss',
            tint: { color: 0x0a0018, alpha: 0.35 },
            bossTrigger: false,
            mapPOIs: ['health'],
            mapGrid: { x: 5, y: 1 },
            cameraProfile: 'shaft',
        },
        sanctum: {
            id: 'sanctum', name: 'SANCTUARY',
            tilemapKey: 'room_sanctum',
            groundTexture: 'ground_mid',
            tint: { color: 0x1a0a0a, alpha: 0.15 },
            bossTrigger: false,
            mapPOIs: ['npc'],
            mapGrid: { x: 4, y: 0 },
            bgmOverride: 'bgm_credits',
        },
        preboss: {
            id: 'preboss', name: 'PRE-BOSS',
            tilemapKey: 'room_preboss',
            groundTexture: 'ground_preboss',
            tint: { color: 0x1a0a0a, alpha: 0.25 },
            bossTrigger: false,
            mapPOIs: ['hp_up', 'feelings_up', 'gate'],
            mapGrid: { x: 4, y: 1 },
        },
        boss: {
            id: 'boss', name: 'BOSS AREA',
            tilemapKey: 'room_boss',
            groundTexture: 'ground_boss',
            tint: { color: 0x0a0018, alpha: 0.25 },
            bossTrigger: true,
            mapPOIs: ['boss'],
            mapGrid: { x: 5, y: 0 },
        },
    };

    static ROOM_ORDER = ['intro', 'ascent', 'secret', 'void', 'lower', 'mid', 'shaft', 'preboss', 'descent', 'sanctum', 'boss'];

    static get(roomId) {
        return RoomDef.ROOMS[roomId] || null;
    }

    /**
     * Room graph connections for the map view.
     * Each entry [roomA, roomB] defines a bidirectional edge.
     * This replaces the old per-room exits array.
     */
    static CONNECTIONS = [
        ['intro', 'ascent'],
        ['ascent', 'lower'],
        ['lower', 'mid'],
        ['mid', 'shaft'],
        ['mid', 'preboss'],
        ['preboss', 'descent'],
        ['descent', 'sanctum'],
        ['sanctum', 'boss'],
        ['ascent', 'secret'],
        ['secret', 'void'],
        ['shaft', 'ascent'],
    ];

    /** Get all rooms adjacent to a given room. */
    static getConnections(roomId) {
        return RoomDef.CONNECTIONS
            .filter(([a, b]) => a === roomId || b === roomId)
            .map(([a, b]) => a === roomId ? b : a);
    }

    static getRoomByGrid(gx, gy) {
        for (const r of RoomDef.ROOM_ORDER) {
            const def = RoomDef.ROOMS[r];
            if (def.mapGrid.x === gx && def.mapGrid.y === gy) return r;
        }
        return null;
    }
}
