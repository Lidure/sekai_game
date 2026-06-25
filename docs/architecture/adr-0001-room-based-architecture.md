# ADR-0001: Room-Based World Architecture (Hollow Knight Style)

## Status
Proposed

## Date
2026-06-25

## Context

### Problem Statement
The game currently uses a single continuous 4400×600 world with free-scrolling camera. This limits:
- **Exploration feel**: No sense of distinct "rooms" or areas; everything blends together
- **Map design**: Can't show interconnected rooms like HK; map is just a flat section overlay
- **Transition feedback**: No dramatic room transitions (fade in/out, area name banners)
- **Performance**: Entire world and all enemies loaded at once
- **Level design**: Hard to create memorable, self-contained rooms with distinct identities

We want to redesign the world to use Hollow Knight's room-based architecture — where each room is a distinct rectangular area with doorways to adjacent rooms, room transitions, and a grid-based map.

### Constraints
- Must work within Phaser 3.87.0 (no engine upgrade possible)
- Must preserve all existing content: 7 zone concepts, enemies, collectibles, abilities, NPCs, boss
- Must continue to work with existing save system (localStorage)
- Must continue to fit within single-file HTML+JS architecture (no build tools)

### Requirements
- Must support room-to-room transitions with fade effects
- Must support doorways connecting rooms in 4 directions (up/down/left/right)
- Must support varying room sizes (not all rooms need to be same size)
- Map must show room grid with connections, explored/unexplored states, player position
- Must be implementable incrementally (don't need all rooms at once)

## Decision

Adopt a room-based architecture where:
- The world is divided into rectangular **rooms** (tiled areas)
- Each room is defined by a **data object** specifying its bounds, exits, and content
- **Exits** connect rooms directionally (left exit → adjacent room's right entrance)
- **Room transitions** use: fade to black → unload current room → load next room → place player → fade in
- **Area name banner** appears on entry (like "INTRO", "ASCENT" etc.)

### Architecture Diagram

```
RoomRegistry (singleton data)
├── RoomDef: INTRO       (0, 800×600)     → LEFT: null, RIGHT: ASCENT
├── RoomDef: ASCENT      (0, 800×600)     → LEFT: INTRO, RIGHT: LOWER
├── RoomDef: SECRET      (0, 300×300)     → ABOVE: n/a, BELOW: LOWER (one-way)
├── RoomDef: LOWER       (0, 800×600)     → LEFT: ASCENT, RIGHT: MID
├── RoomDef: MID         (0, 800×600)     → LEFT: LOWER, RIGHT: PRE_BOSS
├── RoomDef: VERT_SHAFT  (0, 600×800)     → BELOW: MID, ABOVE: PRE_BOSS (tall room)
├── RoomDef: PRE_BOSS    (0, 800×600)     → LEFT: MID, RIGHT: BOSS
└── RoomDef: BOSS        (0, 800×600)     → LEFT: PRE_BOSS, RIGHT: null

GameScene
├── currentRoom: RoomDef
├── roomContainer: Phaser.GameObjects.Container
├── transition(): fade → unload → load → place → fade
└── checkExits(): detect player at door → trigger transition

MapView (overlay)
├── roomGrid: canvas of rooms
├── explored: Set<roomId>
├── drawRoomConnections()
└── drawPlayerPosition()
```

### Key Interfaces

```javascript
// Room definition
{
  id: 'intro',
  name: 'INTRO',
  width: 800,   // room pixel width
  height: 600,  // room pixel height
  exits: [
    { x: 790, y: 500, w: 20, h: 60, targetRoom: 'ascent', targetX: 0, targetY: 500 },
  ],
  platforms: [
    { x: 0, y: 568, w: 37 },  // same format as current
  ],
  groundTexture: 'ground_intro',
  bgLayers: ['bg_far', 'bg_mid', 'bg_near'],
  enemies: [
    { id: 'sf_0', type: 'shadow', x: 450, y: 530 },
  ],
  collectibles: [ ... ],
  benches: [ ... ],
  npcs: [ ... ],
  decorations: [ ... ],
  abilityItems: [ ... ],
  abilityGates: [ ... ],
  bossTrigger: false,
}
```

## Alternatives Considered

### Alternative 1: Keep continuous world, add artificial room awareness
- **Description**: Keep the 4400×600 world but add invisible room bounds with transition triggers
- **Pros**: Minimal code changes, all content stays in place
- **Cons**: Camera can show gaps between rooms; map still can't show clean grid; performance issues remain
- **Rejection Reason**: Half-measure — doesn't truly feel like HK rooms

### Alternative 2: Use Phaser Scenes for each room
- **Description**: Each room = a separate Phaser Scene
- **Pros**: Clean separation, automatic lifecycle management
- **Cons**: Scene creation overhead, can't share physics world, no continuous gameplay feel
- **Rejection Reason**: Phaser scene transitions are too heavyweight for frequent room changes

### Alternative 3: Tilemap-based with Tiled JSON
- **Description**: Use Phaser tilemap system with Tiled editor
- **Pros**: Industry standard, visual editing
- **Cons**: Requires Tiled tool, adds build step, too heavy for current scope
- **Rejection Reason**: Over-engineered for current project size

## Consequences

### Positive
- HK-style exploration feel with distinct, memorable rooms
- Clean room transitions with fade + area name
- Grid-based map that shows room connections
- Better performance (only load current room)
- Easier to add new rooms later
- Natural fit for download-then-use asset pipeline

### Negative
- Major refactor of GameScene.js (currently 1095 lines)
- Need to re-verify all existing content placement
- Save format change (position → roomId + local offset)
- One-time implementation cost (~3-4 days)

### Risks
- **Risk**: Room transitions feel slow if fade+load takes too long
  - **Mitigation**: Preload adjacent rooms in background
- **Risk**: Room bounds clipping with player abilities (dash across a room)
  - **Mitigation**: Doors trigger at room edge, not center; overlap zone sufficient
- **Risk**: Boss scene (overlay) compatibility
  - **Mitigation**: Boss room triggers overlay same as before; overlay pauses room

## Migration Plan

### Phase 1: Room Data + Transition System (current sprint)
1. Create `RoomDef.js` — room data definitions for all 8 rooms
2. Add transition system to GameScene: `_transitionToRoom(roomId, entranceX, entranceY)`
3. Implement door detection in update loop
4. Restructure `_createBackground`, `_createPlatforms` etc. to work per-room
5. Refactor `_createEnemies`, `_createCollectibles`, etc. per-room

### Phase 2: Map System Update (next sprint)
1. Update MapView to show room grid and connections
2. Add fog of war (unexplored rooms hidden)
3. Add room name labels on map

### Phase 3: Polish (next sprint)
1. Area name banner animation
2. Room ambient color/lighting per room
3. Adjacent room preloading

## Validation Criteria
- Room transitions work in all 4 directions
- All 7 zone concepts preserved across 8 rooms
- Save/load works with new room-based format
- Map shows correct room grid and player position
- No regression in enemy AI, boss fight, abilities, collectibles

## Related Decisions
- ADR-0002 (future): Asset integration strategy
