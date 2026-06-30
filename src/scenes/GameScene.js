/**
 * GameScene — Main gameplay scene.
 *
 * Refactored to room-based architecture (March 2026):
 *   - 8 rooms of 1280×720 each (shaft scales proportionally)
 *   - Room transitions via fade-out/fade-in
 *   - All room-specific objects rebuilt per room
 *   - Save/load stores roomId + local player position
 *
 * Design doc: Room-based metroidvania with ability-gated progression.
 * Original: Single 4400×600 scrolling world.
 */
/**
 * Camera profiles for different room types.
 * Each profile controls zoom, deadzone, follow lerp, and y-offset.
 */
const CameraProfiles = {
    default: { zoom: 2.6, deadzoneX: 70, deadzoneY: 52, lerpX: 0.10, lerpY: 0.09, yOffset: -24 },
    shaft:   { zoom: 1.6, deadzoneX: 80, deadzoneY: 53, lerpX: 0.08, lerpY: 0.07, yOffset: -32 },
    boss:    { zoom: 1.3, deadzoneX: 106, deadzoneY: 57, lerpX: 0.12, lerpY: 0.12, yOffset: -8 },
};

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    /**
     * Called before create() when the scene starts or restarts.
     * Receives data passed from SceneManager.goTo() or scene.start().
     * @param {object} data - May contain { loadSave: {...} } from CONTINUE.
     */
    init(data) {
        this._loadSaveData = (data && data.loadSave) || null;
    }

    /* ================================================================== */
    /*  CREATE                                                              */
    /* ================================================================== */

    create() {
        // Room system init
        this._initRoomSystem();

        // Mobile controls (created in HUDScene for viewport-fixed rendering)
        this.mobileControls = null;

        // Player + input (once, scene-level)
        this._createPlayer();
        this._createInput();

        // Camera (bounds set per-room in _buildRoom)
        this.cameras.main.setZoom(1);
        this.cameras.main.setBackgroundColor('#0a0a1a');

        // Persistent chapter backdrop
        this._buildChapterBackground();

        // UI systems
        this.scene.launch('HUDScene');
        this.hud = this.scene.get('HUDScene');
        this.pauseMenu = new PauseMenu(this);

        // Audio — start exploration BGM
        this._setupBGM();

        // Fade in from menu transition
        this.cameras.main.fadeIn(500);

        // Listen for overlay (BossScene) results
        this._setupOverlayListener();

        // Listen for player death — show game over, then respawn
        this.events.on('player-died', () => this._handleGameOver());

        // Build initial room
        const initialRoom = this._roomDef('intro');
        this._buildRoom(initialRoom);

        // Apply save data if loading from CONTINUE
        if (this._loadSaveData) {
            this._applySaveData(this._loadSaveData);
        }

        // Clean up on shutdown
        this.events.once('shutdown', () => {
            this.scene.stop('HUDScene');
            this._stopBgm();
            if (this.pauseMenu) { this.pauseMenu.destroy(); this.pauseMenu = null; }
        });
    }

    /* ================================================================== */
    /*  Room System Initialisation                                           */
    /* ================================================================== */

    _initRoomSystem() {
        this.currentRoomId = 'intro';
        this.visitedRooms = ['intro'];
        this._roomColliders = [];
        this._transitioning = false;
        this._isLoadingRoom = false;
        this._spawnLockFrames = 0;
        this._cameraLookOffsetY = 0;
        this._cameraLookTargetOffsetY = 0;
        this._pendingHudRefresh = false;

        // Persistent state (survives room transitions)
        this.bossActive = false;
        this.isResting = false;
        this.isTalking = false;
        this.talkingNPC = null;
        this.enemiesKilled = [];
        this.collectedPersistentItems = [];
        this.abilityItemsCollected = [];
        this.claimedNpcRewards = [];
        this._bossTriggered = false;
        this._bossDefeated = false;
        this._spawnedWallIds = [];

        // Room-scoped arrays (rebuilt per room)
        this.enemyInstances = [];
        this.npcs = [];
        this.collectibles = [];
        this.enemyGroup = null;
        this.collectibleGroup = null;
        this.abilityItems = [];
        this.abilityGates = [];
        this.destructibleWalls = [];
        this._oneWayDoorZones = [];
        this._oneWayDoorGraphics = [];
        this.bossTriggerZone = null;

        // Decoration arrays
        this._stalactites = [];
        this._crystals = [];
        this._torches = [];
        this._vines = [];
        this._runeGlows = [];
        this._ambientLights = [];

        // Locked room (arena) state
        this._lockedRoom = null;
        this._lockBarrierGraphics = null;

        // Room-specific graphics
        this.bgFar = null;
        this.bgMid = null;
        this.bgNear = null;
        this.bgTint = null;
        this.bgWash = null;
        this.chapterBg = null;
        this.chapterBgParallax = 0.18;
        this.roomContainer = null;
        this.roomBgContainer = null;
        this._roomBoundaryGfx = null;
        this._oneWayDoorGraphics = [];
        this._roomBanner = null;
        this._roomBannerTimer = null;
        this._platformLineGfx = null;
        this._fgSilhouette = null;
        this._dustEmitter = null;
        this.exitZones = [];
        this._exitMarkers = [];

        // Hit-stop freeze frame counter (0 = not frozen)
        this._hitStopFrames = 0;

        // Landing bounce tracking
        this._lastAirborne = false;
        this._fallStartY = 0;
    }

    /** Convenience: get RoomDef for a room ID. */
    _roomDef(roomId) {
        return RoomDef.get(roomId);
    }

    /* ================================================================== */
    /*  Overlay Listener (BossScene)                                         */
    /* ================================================================== */

    /** Register listener for overlay scene results with automatic cleanup. */
    _setupOverlayListener() {
        SceneManager.onOverlayResult(this, (data) => {
            if (data.from === 'BossScene') {
                this._onBossResult(data.result);
                return;
            }
            if (data.from === 'DemoCompleteScene') {
                this._onDemoCompleteResult(data.result);
            }
        });
    }

    /** Handle result emitted by BossScene. */
    _onBossResult(result) {
        this.scene.resume();
        this.input.keyboard.resetKeys();
        // Audio — resume exploration BGM
        if (this.bgm && !this.bgm.isPlaying) this.bgm.resume();

        // If user chose "MAIN MENU" or returned from the demo-complete overlay
        if (result.goToMenu) {
            this._stopBgm();
            SceneManager.goTo(this, 'MenuScene');
            return;
        }

        if (result.victory) {
            this.player.heal(15);
            this.player.feelings = Math.min(this.player.feelingsMax, this.player.feelings + 20);
            this.player.resetToIdle();
            this._bossDefeated = true;
            this._showDemoCompleteScreen();
        }
        if (result.playerDied) {
            this.player.feelings = 0;
            // Reset in current room at a safe position near the entrance
            this.player.reset(48, 636, this.player.maxHp);
        }
        this.bossActive = false;
    }

    _showDemoCompleteScreen() {
        SceneManager.launchOverlay(this, 'DemoCompleteScene', {
            playerData: {
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                feelings: this.player.feelings,
                feelingsMax: this.player.feelingsMax,
                abilities: { ...this.player.abilities },
            },
        });
    }

    _onDemoCompleteResult(result) {
        this.scene.resume();
        this.input.keyboard.resetKeys();
        if (result.goToMenu) {
            this._stopBgm();
            SceneManager.goTo(this, 'MenuScene');
        }
    }

    /* ================================================================== */
    /*  Game Over                                                            */
    /* ================================================================== */

    /** Handle player death: show game over text, then respawn. */
    _handleGameOver() {
        // Fade out BGM
        if (this.bgm) {
            this.tweens.add({ targets: this.bgm, volume: 0, duration: 800 });
        }

        // Show GAME OVER text centered on screen (fixed to camera)
        const goText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER', {
            fontSize: '38px',
            fontFamily: 'monospace',
            color: '#ff6666',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        // After 2 seconds, respawn player and restore world
        this.time.delayedCall(2000, () => {
            goText.destroy();
            this.player.reset(144, 636, this.player.maxHp);
            this._resetEnemies();
            this._resetCollectibles();
            if (this.bgm) {
                this.bgm.stop();
                this.bgm.play();
                this.tweens.add({ targets: this.bgm, volume: 0.30, duration: 1000 });
            }
        });
    }

    _stopBgm() {
        if (!this.bgm) return;
        this.bgm.stop();
        this.bgm.destroy();
        this.bgm = null;
    }

    _setupBGM() {
        this._currentBgmKey = 'bgm_explore';
        this.bgm = AudioSettings.createBgm(this, this._currentBgmKey, 0.30);
        this.bgm.play();
        this.tweens.add({
            targets: this.bgm,
            volume: AudioSettings.scale('bgm', 0.30),
            duration: 1000,
        });
    }

    _onWake() {
        // Called when scene wakes from sleep (reserved for overlay integration)
    }

    /* ================================================================== */
    /*  ROOM BUILDING                                                        */
    /* ================================================================== */

    /**
     * Build all room content from a RoomDef + tilemap.
     * Tilemap .tmj files contain all geometry (tile layers) and
     * entity spawn points (object layers). Destroys previous room first.
     */
    _buildRoom(roomDef) {
        // ── Load tilemap ──
        const map = this.make.tilemap({ key: roomDef.tilemapKey });
        const tileset = map.addTilesetImage(roomDef.groundTexture, roomDef.groundTexture);
        const TILE_OFFSET_Y = -16;

        this._tileGround = map.createLayer('Ground', tileset, 0, TILE_OFFSET_Y + 8);
        this._tilePlatforms = map.createLayer('Platforms', tileset, 0, 0);
        this._tileGround.setCollisionByProperty({ collides: true });
        this._tilePlatforms.setCollisionByProperty({ collides: true });
        this._tilePlatforms.setAlpha(0);

        this._roomPixelWidth = map.widthInPixels;
        this._roomPixelHeight = map.heightInPixels;
        this._currentTilemap = map;

        // ── Physics & camera bounds ──
        this.physics.world.setBounds(0, 0, this._roomPixelWidth, this._roomPixelHeight);
        this.cameras.main.setBounds(0, 0, this._roomPixelWidth, this._roomPixelHeight);

        // ── Camera profile (set zoom BEFORE any objects are created) ──
        this._setupCameraForRoom(roomDef);

        // ── Room containers ──
        this.roomBgContainer = this.add.container(0, 0).setDepth(-20);
        this.roomContainer = this.add.container(0, 0).setDepth(0);

        // ── Parse object layers FIRST (populates this._spawn*) ──
        this._parseObjectLayers(map);

        // ── Background ──
        this._buildBackground(roomDef);
        this._setupRoomBoundary(roomDef);

        // ── Player-platform collider ──
        const pGnd = this.physics.add.collider(this.player.sprite, this._tileGround);
        const pPlat = this.physics.add.collider(this.player.sprite, this._tilePlatforms);
        this._roomColliders.push(pGnd, pPlat);

        // ── Foreground silhouette (HK-style black fill + bright outline) ──
        this._drawForegroundSilhouette();

        // ── Dust particles ──
        this._createDustEmitter();

        // ── Enemies ──
        this.enemyGroup = this.physics.add.group();
        this.enemyInstances = [];
        this._buildEnemiesFromSpawns();

        // ── Locked room (arena) setup ──
        this._setupLockedRoom(roomDef);

        // ── NPCs ──
        this.npcs = [];
        this._buildNPCsFromSpawns();

        // ── Collectibles ──
        this.collectibles = [];
        if (this.collectibleGroup) this.collectibleGroup.destroy(true);
        this.collectibleGroup = this.physics.add.staticGroup();
        this._buildCollectiblesFromSpawns();

        // ── Ability items ──
        this.abilityItems = [];
        this._buildAbilityItemsFromSpawns();

        // ── Ability gates ──
        this.abilityGates = [];
        this._buildGatesFromSpawns();

        // ── One-way doors ──
        this._buildDoorsFromSpawns();

        // ── Destructible walls ──
        this.destructibleWalls = [];
        this._buildDestructibleWallsFromSpawns();

        // ── Moving platforms ──
        this._movingPlatforms = [];
        this._buildMovingPlatformsFromSpawns();

        // ── Boss trigger ──
        this._buildBossTriggerFromSpawns();

        // ── Decorations ──
        this._buildDecorationsFromSpawns(roomDef);

        // ── Exit markers ──
        this._buildExitMarkers();

        // ── Banner ──
        this._showRoomBanner(roomDef.name);
    }

    /**
     * Parse all object layers from the current tilemap into this._spawn* arrays.
     */
    _parseObjectLayers(map) {
        this._roomExits = [];
        this._spawnEnemies = [];
        this._spawnCollectibles = [];
        this._spawnBenches = [];
        this._spawnNPCs = [];
        this._spawnAbilityItems = [];
        this._spawnGates = [];
        this._spawnDoors = [];
        this._spawnDestructibleWalls = [];
        this._spawnMovingPlatforms = [];
        this._spawnStalactites = [];
        this._spawnCrystals = [];
        this._spawnTorches = [];
        this._spawnVines = [];
        this._bossTriggerRect = null;

        // Exits layer
        const exitLayer = map.getObjectLayer('Exits');
        if (exitLayer) {
            for (const obj of exitLayer.objects) {
                const p = this._tiledProps(obj);
                this._roomExits.push({
                    x: obj.x, y: obj.y, w: obj.width, h: obj.height,
                    dir: p.dir || obj.name, targetRoom: p.targetRoom,
                    targetX: p.targetX, targetY: p.targetY,
                });
            }
        }

        // SpawnPoints layer
        const spawnLayer = map.getObjectLayer('SpawnPoints');
        if (spawnLayer) {
            for (const obj of spawnLayer.objects) {
                const p = this._tiledProps(obj);
                switch (p.spawnType) {
                    case 'enemy':
                        this._spawnEnemies.push({ id: p.spawnId, type: p.enemyType, x: obj.x, y: obj.y, noGravity: p.noGravity });
                        break;
                    case 'collectible':
                        this._spawnCollectibles.push({ type: p.collectType, saveId: p.saveId, x: obj.x, y: obj.y, value: p.value, persistent: p.persistent });
                        break;
                    case 'bench':
                        this._spawnBenches.push({ x: obj.x });
                        break;
                    case 'npc':
                        this._spawnNPCs.push({ x: obj.x, y: obj.y, name: p.npcName, npcKey: p.npcKey || p.npcName, hairColor: p.hairColor, dialogues: JSON.parse(p.dialogues || '[]') });
                        break;
                    case 'abilityItem':
                        this._spawnAbilityItems.push({ x: obj.x, y: obj.y, key: p.abilityKey, name: p.abilityName });
                        break;
                }
            }
        }

        // Gates layer
        const gateLayer = map.getObjectLayer('Gates');
        if (gateLayer) {
            for (const obj of gateLayer.objects) {
                const p = this._tiledProps(obj);
                this._spawnGates.push({ x: obj.x, y: obj.y, w: obj.width, h: obj.height, key: p.abilityKey });
            }
        }

        // Doors layer
        const doorLayer = map.getObjectLayer('Doors');
        if (doorLayer) {
            for (const obj of doorLayer.objects) {
                const p = this._tiledProps(obj);
                this._spawnDoors.push({ x: obj.x, y: obj.y, w: obj.width, h: obj.height });
            }
        }

        // DestructibleWalls layer
        const wallLayer = map.getObjectLayer('DestructibleWalls');
        if (wallLayer) {
            for (const obj of wallLayer.objects) {
                const p = this._tiledProps(obj);
                this._spawnDestructibleWalls.push({
                    x: obj.x, y: obj.y, w: obj.width, h: obj.height,
                    wallId: p.wallId, maxHp: p.maxHp || 6,
                });
            }
        }

        // MovingPlatforms layer
        const mpLayer = map.getObjectLayer('MovingPlatforms');
        if (mpLayer) {
            for (const obj of mpLayer.objects) {
                const p = this._tiledProps(obj);
                this._spawnMovingPlatforms.push({
                    x: obj.x, y: obj.y, width: obj.width,
                    rangeY: p.rangeY, speed: p.speed,
                });
            }
        }

        // Decorations layer
        const decoLayer = map.getObjectLayer('Decorations');
        if (decoLayer) {
            for (const obj of decoLayer.objects) {
                const p = this._tiledProps(obj);
                switch (p.decoType) {
                    case 'stalactite': this._spawnStalactites.push({ x: obj.x, h: p.h }); break;
                    case 'crystal': this._spawnCrystals.push({ x: obj.x, y: obj.y }); break;
                    case 'torch': this._spawnTorches.push({ x: obj.x, y: obj.y }); break;
                    case 'vine': this._spawnVines.push({ x: obj.x }); break;
                }
            }
            const bossObj = decoLayer.objects.find(o => o.type === 'bossTrigger');
            if (bossObj) {
                this._bossTriggerRect = { x: bossObj.x, y: bossObj.y, w: bossObj.width, h: bossObj.height };
            }
        }
    }

    /**
     * Convert Tiled properties array to a plain object.
     * Tiled JSON format stores properties as [{ name, type, value }, ...]
     */
    _tiledProps(obj) {
        if (!obj || !obj.properties) return {};
        const out = {};
        for (const prop of obj.properties) {
            out[prop.name] = prop.value;
        }
        return out;
    }

    /**
     * Clear all room-specific objects.
     * Called before building a new room.
     */
    _clearRoom() {
        this._transitioning = true;

        // Destroy room-specific colliders
        if (this._roomColliders) {
            this._roomColliders.forEach(c => { if (c) c.destroy(); });
            this._roomColliders = [];
        }

        // Destroy physics groups
        if (this.enemyGroup) { this.enemyGroup.destroy(true); this.enemyGroup = null; }
        if (this.collectibleGroup) { this.collectibleGroup.destroy(true); this.collectibleGroup = null; }

        // Destroy enemy instances sprites (and kill tweens)
        if (this.enemyInstances) {
            this.enemyInstances.forEach(e => {
                this.tweens.killTweensOf(e.sprite);
                if (e.sprite && e.sprite.active) e.sprite.destroy();
            });
            this.enemyInstances = [];
        }

        // Destroy NPCs
        if (this.npcs) {
            this.npcs.forEach(n => n.destroy());
            this.npcs = [];
        }

        // Destroy collectibles
        if (this.collectibles) {
            this.collectibles.forEach(c => c.destroy());
            this.collectibles = [];
        }

        // Destroy ability items
        if (this.abilityItems) {
            this.abilityItems.forEach(a => a.destroy());
            this.abilityItems = [];
        }

        // Destroy ability gates
        if (this.abilityGates) {
            this.abilityGates.forEach(g => g.destroy());
            this.abilityGates = [];
        }

        // Destroy one-way door zones + graphics
        if (this._oneWayDoorZones) {
            this._oneWayDoorZones.forEach(z => z.destroy());
            this._oneWayDoorZones = [];
        }
        if (this._oneWayDoorGraphics) {
            this._oneWayDoorGraphics.forEach(g => g.destroy());
            this._oneWayDoorGraphics = [];
        }

        // Destroy destructible walls
        if (this.destructibleWalls) {
            this.destructibleWalls.forEach(w => w.destroy());
            this.destructibleWalls = [];
        }

        // Destroy gap bridge group (shaft enemy-only collision)
        if (this._gapBridgeGroup) {
            this._gapBridgeGroup.destroy(true);
            this._gapBridgeGroup = null;
        }

        // Destroy moving platforms
        if (this._movingPlatforms) {
            this._movingPlatforms.forEach(mp => mp.destroy());
            this._movingPlatforms = [];
        }

        // Destroy boss trigger zone
        if (this.bossTriggerZone) {
            this.bossTriggerZone.destroy();
            this.bossTriggerZone = null;
        }

        // Destroy decorations
        if (this._stalactites) { this._stalactites.forEach(s => s.destroy()); this._stalactites = []; }
        if (this._crystals) { this._crystals.forEach(c => c.destroy()); this._crystals = []; }
        if (this._torches) { this._torches.forEach(t => t.destroy()); this._torches = []; }
        if (this._vines) { this._vines.forEach(v => v.destroy()); this._vines = []; }
        if (this._runeGlows) { this._runeGlows.forEach(r => r.destroy()); this._runeGlows = []; }
        if (this._ambientLights) { this._ambientLights.forEach(a => a.destroy()); this._ambientLights = []; }
        if (this._exitMarkers) { this._exitMarkers.forEach(m => m.destroy()); this._exitMarkers = []; }

        // Destroy background elements
        if (this.bgTint) { this.bgTint.destroy(); this.bgTint = null; }
        if (this._roomBoundaryGfx) { this._roomBoundaryGfx.destroy(); this._roomBoundaryGfx = null; }
        if (this._fgSilhouette) { this._fgSilhouette.destroy(); this._fgSilhouette = null; }

        // Destroy dust emitter
        if (this._dustEmitter) { this._dustEmitter.destroy(); this._dustEmitter = null; }

        // Destroy containers
        if (this.roomContainer) { this.roomContainer.destroy(true); this.roomContainer = null; }
        if (this.roomBgContainer) { this.roomBgContainer.destroy(true); this.roomBgContainer = null; }

        // Destroy lock barrier
        if (this._lockBarrierGraphics) {
            this.tweens.killTweensOf(this._lockBarrierGraphics);
            this._lockBarrierGraphics.destroy();
            this._lockBarrierGraphics = null;
        }

        // Destroy room banner
        if (this._roomBanner) {
            this.tweens.killTweensOf(this._roomBanner);
            this._roomBanner.destroy();
            this._roomBanner = null;
        }
        if (this._roomBannerTimer) {
            this.time.removeEvent(this._roomBannerTimer);
            this._roomBannerTimer = null;
        }

        // Destroy exit zone debug graphics
        if (this.exitZones) {
            this.exitZones.forEach(z => z.destroy());
            this.exitZones = [];
        }
    }

    /**
     * Transition to a target room with fade-out/in.
     * @param {string} targetRoomId
     * @param {number} spawnX - Local X position in target room
     * @param {number} spawnY - Local Y position in target room
     */
    _transitionToRoom(targetRoomId, spawnX, spawnY, fromDir = null) {
        if (this._transitioning) return;

        const roomDef = this._roomDef(targetRoomId);
        if (!roomDef) {
            console.warn('Room not found:', targetRoomId);
            return;
        }

        this._transitioning = true;

        // Ultra-fast black cut (80ms each way, 4f spawn lock) — closer to HK transitions
        this.cameras.main.fadeOut(80, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Clear old room
            this._clearRoom();

            // Update room tracking
            this.currentRoomId = targetRoomId;
            if (!this.visitedRooms.includes(targetRoomId)) {
                this.visitedRooms.push(targetRoomId);
            }

            // Build new room
            this._buildRoom(roomDef);

            // BGM override — switch to room-specific BGM if defined
            const targetBgmKey = roomDef.bgmOverride || 'bgm_explore';
            const targetBgmVol = roomDef.bgmOverride ? 0.25 : 0.30;
            if (targetBgmKey !== this._currentBgmKey) {
                if (this.bgm) {
                    this.tweens.add({
                        targets: this.bgm,
                        volume: 0,
                        duration: 150,
                        onComplete: () => {
                            this.bgm.stop();
                            this.bgm.destroy();
                            this.bgm = null;
                        },
                    });
                }
                this.time.delayedCall(200, () => {
                    if (this.destroyed) return;
                    this.bgm = AudioSettings.createBgm(this, targetBgmKey, targetBgmVol);
                    this.bgm.play();
                    this.tweens.add({
                        targets: this.bgm,
                        volume: AudioSettings.scale('bgm', targetBgmVol),
                        duration: 800,
                        ease: 'Sine.easeIn',
                    });
                    this._currentBgmKey = targetBgmKey;
                });
            }

            const entry = this._getRoomEntryPoint(roomDef, spawnX, spawnY, fromDir);

            // Position player
            this.player.teleport(entry.x, entry.y);
            this.player.facingRight = fromDir !== 'left';
            this.player.sprite.setFlipX(!this.player.facingRight);
            this._spawnLockFrames = fromDir === 'up' || fromDir === 'down' ? 8 : 6;

            // Quick return from black
            this.cameras.main.fadeIn(80, 0, 0, 0);
            this.cameras.main.once('camerafadeincomplete', () => {
                this._transitioning = false;
            });
        });
    }

    /**
     * Horizontal exits should re-enter on top of the target room's floor.
     * This avoids relying on hand-authored targetY values, which can drift
     * below the collider after scaling or body reset.
     */
    _getRoomEntryPoint(roomDef, spawnX, spawnY, fromDir) {
        if (!roomDef || !this.player || !this.player.sprite) {
            return { x: spawnX, y: spawnY };
        }

        const roomW = this._roomPixelWidth || roomDef.width || 1280;
        const roomH = this._roomPixelHeight || roomDef.height || 720;
        const marginX = 56;
        const marginY = 60;

        // Use the authored target coordinates as the primary source of truth.
        // The exit direction only affects facing / lock timing, not the landing
        // position. That keeps room transitions bidirectional and prevents
        // "door leads into floor" cases when a hand-authored room wants the
        // entry point to land on a specific platform or landing.
        let x = Phaser.Math.Clamp(spawnX ?? roomW / 2, marginX, roomW - marginX);
        let y = Phaser.Math.Clamp(spawnY ?? roomH / 2, marginY, roomH - marginY);

        // Keep a tiny safety buffer away from extreme edges so the player does
        // not spawn inside wall trim or exit frame geometry.
        if (x < marginX) x = marginX;
        if (x > roomW - marginX) x = roomW - marginX;
        if (y < marginY) y = marginY;
        if (y > roomH - marginY) y = roomH - marginY;

        return { x, y };
    }

    /**
     * Check if the player is overlapping any exit zone.
     * Called every frame from update().
     */
    _checkExits() {
        if (this._transitioning || !this.player) return;
        if (this.player.isHurt || this.player.dead) return;
        if (!this._roomExits || this._roomExits.length === 0) return;
        if (this._lockedRoom) return; // arena locked — exits sealed

        const px = this.player.x;
        const py = this.player.y;
        const margin = 20;

        for (const exit of this._roomExits) {
            if (px > exit.x - margin && px < exit.x + exit.w + margin &&
                py > exit.y - margin && py < exit.y + exit.h + margin) {
                this._transitionToRoom(exit.targetRoom, exit.targetX, exit.targetY, exit.dir);
                return;
            }
        }
    }

    /**
     * Set up camera follow behavior based on room size.
     * Rooms exactly matching the viewport do not scroll.
     * Larger rooms allow follow on the over-sized axis.
     */
    _setupCameraForRoom(roomDef) {
        const cam = this.cameras.main;

        // Select profile based on room type
        let profile;
        if (roomDef.id === 'shaft' || roomDef.id === 'descent') {
            profile = CameraProfiles.shaft;
        } else if (roomDef.id === 'boss') {
            profile = CameraProfiles.boss;
        } else {
            profile = CameraProfiles.default;
        }

        cam.setZoom(profile.zoom);

        // The current chapter uses room-sized spaces, so follow the player in
        // every room and keep the camera biased slightly above them.
        cam.startFollow(this.player.sprite, true, true, profile.lerpX, profile.lerpY);
        cam.setDeadzone(profile.deadzoneX, profile.deadzoneY);
        cam.setFollowOffset(0, profile.yOffset);

        this._cameraLookOffsetY = 0;
        this._cameraLookTargetOffsetY = 0;
        this._currentCameraProfile = profile;
    }

    _updateCameraLook(delta) {
        const cam = this.cameras.main;
        const profile = this._currentCameraProfile;
        if (!cam || !profile || !this.keys) return;

        const canLook = !this.pauseMenu?.isPaused && !this.isResting && !this.isTalking && this.player && !this.player.dead;
        if (!canLook) {
            this._cameraLookTargetOffsetY = 0;
        } else {
            const mobileUp = this.mobileControls && this.mobileControls.up;
            const mobileDown = this.mobileControls && this.mobileControls.down;
            const lookingUp = (this.keys.up && this.keys.up.isDown) || mobileUp;
            const lookingDown = (this.keys.down && this.keys.down.isDown) || mobileDown;
            if (lookingUp && !lookingDown) {
                this._cameraLookTargetOffsetY = 160;
            } else if (lookingDown && !lookingUp) {
                this._cameraLookTargetOffsetY = -220;
            } else {
                this._cameraLookTargetOffsetY = 0;
            }
        }

        const t = Math.min(1, (delta / 1000) * 18);
        this._cameraLookOffsetY = Phaser.Math.Linear(this._cameraLookOffsetY, this._cameraLookTargetOffsetY, t);
        if (Math.abs(this._cameraLookOffsetY - this._cameraLookTargetOffsetY) < 0.25) {
            this._cameraLookOffsetY = this._cameraLookTargetOffsetY;
        }
        cam.setFollowOffset(0, profile.yOffset + this._cameraLookOffsetY);
    }

    /* ================================================================== */
    /*  Room builder: Background                                             */
    /* ================================================================== */

    _buildChapterBackground() {
        if (!this.textures.exists('broken_seikai_bg')) return;
        if (this.chapterBg) return;

        const bgSource = this.textures.get('broken_seikai_bg').getSourceImage();
        const bgWidth = bgSource && bgSource.width ? bgSource.width : this.scale.width;
        const bgHeight = bgSource && bgSource.height ? bgSource.height : this.scale.height;
        const coverScale = Math.max(this.scale.width / bgWidth, this.scale.height / bgHeight);

        this.chapterBgParallax = 0.18;
        this.chapterBg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'broken_seikai_bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-5)
            .setAlpha(0.98);
        this.chapterBg.tileScaleX = coverScale;
        this.chapterBg.tileScaleY = coverScale;

        // 3-layer cave parallax backgrounds (already loaded in BootScene)
        this.bgFar = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'bg_far')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-10)
            .setAlpha(0.6);
        this.bgMid = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'bg_mid')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-8)
            .setAlpha(0.5);
        this.bgNear = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'bg_near')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-6)
            .setAlpha(0.3);

        this._updateChapterBackground();
    }

    /**
     * Convert the current room + camera scroll into a continuous chapter-space X.
     * This keeps horizontally connected rooms aligned to the same background phase
     * instead of restarting the pattern at each room boundary.
     */
    _getChapterScrollX() {
        const cam = this.cameras && this.cameras.main ? this.cameras.main : null;
        if (!cam) return 0;

        const roomIndex = Math.max(0, RoomDef.ROOM_ORDER.indexOf(this.currentRoomId));
        const roomStride = this._roomPixelWidth || this.scale.width || 1280;
        return roomIndex * roomStride + cam.scrollX;
    }

    _updateChapterBackground() {
        const scrollX = this._getChapterScrollX();
        if (this.bgFar) this.bgFar.tilePositionX = scrollX * 0.02;
        if (this.bgMid) this.bgMid.tilePositionX = scrollX * 0.07;
        if (this.bgNear) this.bgNear.tilePositionX = scrollX * 0.14;
        if (this.chapterBg) this.chapterBg.tilePositionX = scrollX * this.chapterBgParallax;
    }

    _buildBackground(roomDef) {
        const w = this._roomPixelWidth || roomDef.width;
        const h = this._roomPixelHeight || roomDef.height;
        const tintAlpha = roomDef.id === 'intro'
            ? Math.min(roomDef.tint ? roomDef.tint.alpha : 0, 0.04)
            : Math.min(roomDef.tint ? roomDef.tint.alpha : 0, 0.10);
        if (roomDef.tint) {
            this.bgTint = this.add.rectangle(w / 2, h / 2, w, h, roomDef.tint.color, tintAlpha)
                .setDepth(-2);
        }
    }

    _drawForegroundSilhouette() {
        if (!this._tileGround && !this._tilePlatforms) return;

        // Ground tiles: faint texture hint (mostly shows through black silhouette below)
        if (this._tileGround) this._tileGround.setAlpha(0.2);

        this._fgSilhouette = this.add.graphics().setDepth(-1);

        const OUTLINE_COLOR = 0x7FE0DE;
        const OUTLINE_ALPHA = 0.5;
        const LINE_WIDTH = 1;

        const drawLayer = (layer) => {
            if (!layer) return;
            layer.forEachTile(tile => {
                if (tile.index === -1) return;
                const px = tile.pixelX;
                const py = tile.pixelY;
                const tw = tile.width;
                const th = tile.height;

                // Pure black fill (HK-style silhouette)
                this._fgSilhouette.fillStyle(0x000000, 1);
                this._fgSilhouette.fillRect(px, py, tw, th);

                // Edge-aware outline: only draw edges facing empty space
                const col = tile.x;
                const row = tile.y;

                this._fgSilhouette.lineStyle(LINE_WIDTH, OUTLINE_COLOR, OUTLINE_ALPHA);

                if (!layer.hasTileAt(col, row - 1))
                    this._fgSilhouette.lineBetween(px, py, px + tw, py);
                if (!layer.hasTileAt(col, row + 1))
                    this._fgSilhouette.lineBetween(px, py + th, px + tw, py + th);
                if (!layer.hasTileAt(col - 1, row))
                    this._fgSilhouette.lineBetween(px, py, px, py + th);
                if (!layer.hasTileAt(col + 1, row))
                    this._fgSilhouette.lineBetween(px + tw, py, px + tw, py + th);
            });
        };

        drawLayer(this._tileGround);
        drawLayer(this._tilePlatforms);
    }

    _createDustEmitter() {
        // Generate a tiny 4×4 soft circle texture once
        if (!this.textures.exists('particle_dust')) {
            const g = this.make.graphics();
            g.fillStyle(0xffffff);
            g.fillCircle(3, 3, 2);
            g.fillStyle(0xffffff, 0.4);
            g.fillCircle(3, 3, 3);
            g.generateTexture('particle_dust', 6, 6);
            g.destroy();
        }

        const w = this._roomPixelWidth || this.scale.width;
        const h = this._roomPixelHeight || this.scale.height;

        this._dustEmitter = this.add.particles(0, 0, 'particle_dust', {
            x: { min: 0, max: w },
            y: { min: h * 0.5, max: h },
            speed: { min: 8, max: 22 },
            angle: { min: 270, max: 290 },
            scale: { start: 0.8, end: 0.1 },
            alpha: { start: 0.35, end: 0 },
            lifespan: { min: 6000, max: 12000 },
            frequency: 100,
            blendMode: 'ADD',
            tint: 0xa0d8ff,
            quantity: 1,
        }).setDepth(-1);
    }

    /* ================================================================== */
    /*  Room builder: Enemies                                                */
    /* ================================================================== */

    _buildEnemiesFromSpawns() {
        if (!this._spawnEnemies || this._spawnEnemies.length === 0) return;

        for (const eDef of this._spawnEnemies) {
            if (this.enemiesKilled.includes(eDef.id)) continue;

            let enemy;
            switch (eDef.type) {
                case 'shadow':
                    enemy = new ShadowFragment(this, eDef.x, eDef.y);
                    break;
                case 'floating':
                    enemy = new FloatingShard(this, eDef.x, eDef.y);
                    break;
                case 'bat':
                    enemy = new Bat(this, eDef.x, eDef.y);
                    break;
                case 'skeleton':
                    enemy = new Skeleton(this, eDef.x, eDef.y);
                    break;
                case 'bloated':
                    enemy = new BloatedShadow(this, eDef.x, eDef.y);
                    break;
                case 'crystal':
                    enemy = new WandererCrystal(this, eDef.x, eDef.y);
                    break;
                default:
                    continue;
            }

            if (enemy) {
                enemy.spawnId = eDef.id;
                this.enemyGroup.add(enemy.sprite);
                this.enemyInstances.push(enemy);
            }
        }

        if (this.enemyGroup.getLength() > 0) {
            const eGndCollider = this.physics.add.collider(this.enemyGroup, this._tileGround);
            this._roomColliders.push(eGndCollider);
            const eCollider = this.physics.add.collider(this.enemyGroup, this._tilePlatforms);
            this._roomColliders.push(eCollider);

            const pOverlap = this.physics.add.overlap(
                this.player.slashHitbox, this.enemyGroup,
                (_, enemySprite) => this._onPlayerHitEnemy(enemySprite), null, this,
            );
            this._roomColliders.push(pOverlap);

            const tOverlap = this.physics.add.overlap(
                this.player.sprite, this.enemyGroup,
                (_, enemySprite) => this._onEnemyTouchPlayer(enemySprite), null, this,
            );
            this._roomColliders.push(tOverlap);

            // ── Shaft room: invisible enemy-only collision bridges in floor gaps ──
            if (this.currentRoomId === 'shaft') {
                this._gapBridgeGroup = this.physics.add.staticGroup();
                const gapBridges = [
                    // Each bridge covers the full gap between left slab (cols 0-14, x=0-240)
                    // and right slab (cols 28-51, x=448-832). Gap = x=240-448 (208px).
                    // Bridge center at x=344, width=208. Elevator passes through bridge
                    // freely (no collider set up between elevator and bridge).
                    { x: 344, y: 152, w: 208, h: 16 },  // F5: surface 144
                    { x: 344, y: 312, w: 208, h: 16 },  // F4: surface 304
                    { x: 344, y: 472, w: 208, h: 16 },  // F3: surface 464
                    { x: 344, y: 600, w: 208, h: 16 },  // F2: surface 592
                    { x: 344, y: 744, w: 208, h: 16 },  // F1: surface 736
                ];
                for (const g of gapBridges) {
                    const zone = this.add.zone(g.x, g.y, 1, 1);
                    this.physics.add.existing(zone, true);
                    zone.body.setSize(g.w, g.h);
                    this._gapBridgeGroup.add(zone);
                }
                const bridgeColl = this.physics.add.collider(this.enemyGroup, this._gapBridgeGroup);
                this._roomColliders.push(bridgeColl);
            }
        }
    }

    /* ================================================================== */
    /*  Locked room (arena) system                                           */
    /* ================================================================== */

    _setupLockedRoom(roomDef) {
        // Only the shaft room uses locked-arena mechanic
        if (roomDef.id !== 'shaft') {
            this._lockedRoom = null;
            return;
        }

        // Check if all enemies for this room are already killed (permanent)
        const allDead = this._spawnEnemies.every(e => this.enemiesKilled.includes(e.id));
        if (allDead) {
            this._lockedRoom = null;
            return;
        }

        this._lockedRoom = roomDef.id;
        this._drawLockBarriers();
    }

    _drawLockBarriers() {
        if (this._lockBarrierGraphics) this._lockBarrierGraphics.destroy();
        this._lockBarrierGraphics = this.add.graphics().setDepth(20);

        // Top exit barrier
        this._lockBarrierGraphics.fillStyle(0x8800aa, 0.5);
        this._lockBarrierGraphics.fillRect(420, 0, 120, 16);
        this._lockBarrierGraphics.fillStyle(0xaa44ff, 0.3);
        this._lockBarrierGraphics.fillRect(440, 0, 80, 16);

        // Bottom exit barrier (behind ground)
        this._lockBarrierGraphics.fillStyle(0x8800aa, 0.5);
        this._lockBarrierGraphics.fillRect(420, 700, 120, 20);
        this._lockBarrierGraphics.fillStyle(0xaa44ff, 0.3);
        this._lockBarrierGraphics.fillRect(440, 700, 80, 20);

        // Lock animation
        this.tweens.add({
            targets: this._lockBarrierGraphics,
            alpha: 0.7,
            yoyo: true,
            duration: 800,
            repeat: -1,
        });
    }

    _checkLockedRoom() {
        if (!this._lockedRoom) return;

        // Check if all enemies in the current room are dead
        const aliveCount = this.enemyInstances.filter(e => !e.dead).length;
        if (aliveCount === 0) {
            this._unlockRoom();
        }
    }

    _unlockRoom() {
        // Destroy barrier visuals
        if (this._lockBarrierGraphics) {
            this._lockBarrierGraphics.destroy();
            this._lockBarrierGraphics = null;
        }

        // Screen shake + flash to signal unlock
        this.cameras.main.shake(300, 0.015);
        this.cameras.main.flash(200, 136, 0, 170);

        // Sound
        this.sound.play('sfx_enemy_death', { volume: 0.6, detune: -400 });

        this._lockedRoom = null;
    }

    /* ================================================================== */
    /*  Room builder: NPCs                                                   */
    /* ================================================================== */

    _buildNPCsFromSpawns() {
        if (!this._spawnNPCs || this._spawnNPCs.length === 0) return;

        for (const nDef of this._spawnNPCs) {
            const npc = new NPC(this, nDef.x, nDef.y, {
                name: nDef.name,
                npcKey: nDef.npcKey || nDef.name || 'npc_' + (this.npcs.length),
                dialogues: nDef.dialogues,
                hairColor: nDef.hairColor,
                behavior: nDef.behavior,
                walkRadius: nDef.walkRadius,
            });
            this.npcs.push(npc);
        }
    }

    /* ================================================================== */
    /*  Room builder: Collectibles                                           */
    /* ================================================================== */

    _buildCollectiblesFromSpawns() {
        if (!this._spawnCollectibles || this._spawnCollectibles.length === 0) return;

        for (const cDef of this._spawnCollectibles) {
            if (cDef.persistent !== false && this.collectedPersistentItems.includes(cDef.saveId)) continue;

            const collectible = new Collectible(this, cDef.x, cDef.y, {
                type: cDef.type,
                value: cDef.value,
                saveId: cDef.saveId,
                persistent: cDef.persistent !== false,
            });
            this.collectibles.push(collectible);
            this.collectibleGroup.add(collectible.sprite);

            const overlap = this.physics.add.overlap(
                this.player.sprite, collectible.sprite,
                (_, cs) => {
                    const c = cs.collectibleRef;
                    if (c && !c.collected) {
                        c.pickup(this.player);
                        this._onCollectiblePicked(c);
                    }
                }, null, this,
            );
            this._roomColliders.push(overlap);
        }
    }

    _giveNpcReward(reward) {
        if (!reward || !this.player) return;
        if (reward.type === 'hp_up') {
            const hp = reward.value || 10;
            this.player.maxHp += hp;
            this.player.hp = Math.min(this.player.hp + hp, this.player.maxHp);
            if (this.hud) this.hud.refreshFromPlayer();
        } else {
            console.warn('_giveNpcReward: unknown reward type:', reward.type);
        }
    }

    /* ================================================================== */
    /*  Room builder: Ability Items                                          */
    /* ================================================================== */

    _buildAbilityItemsFromSpawns() {
        if (!this._spawnAbilityItems || this._spawnAbilityItems.length === 0) return;

        for (const aDef of this._spawnAbilityItems) {
            if (this.abilityItemsCollected.includes(aDef.key)) continue;
            this.abilityItems.push(new AbilityItem(this, aDef.x, aDef.y, aDef.key, aDef.name));
        }
    }

    /* ================================================================== */
    /*  Room builder: Ability Gates                                          */
    /* ================================================================== */

    _buildGatesFromSpawns() {
        if (!this._spawnGates || this._spawnGates.length === 0) return;

        for (const gDef of this._spawnGates) {
            if (this.player.abilities[gDef.key]) continue;
            this.abilityGates.push(new AbilityGate(this, gDef.x, gDef.y, gDef.w, gDef.h, gDef.key));
        }
    }

    /* ================================================================== */
    /*  Room builder: One-Way Doors                                          */
    /* ================================================================== */

    _buildDoorsFromSpawns() {
        if (!this._spawnDoors || this._spawnDoors.length === 0) return;
        this._oneWayDoorGraphics = [];
        this._oneWayDoorZones = [];

        for (const d of this._spawnDoors) {
            const dx = d.x;
            const dy = d.y || 390;
            const dh = d.h || 320;

            const gfx = this.add.graphics().setDepth(20);
            gfx.fillStyle(0x2d3561, 0.8);
            gfx.fillRect(dx - 3, dy - dh / 2, 6, dh);
            gfx.lineStyle(1.5, 0x7FE0DE, 0.4);
            gfx.strokeRect(dx - 3, dy - dh / 2, 6, dh);
            gfx.lineStyle(1, 0x7FE0DE, 0.15);
            gfx.lineBetween(dx, dy - dh / 2, dx, dy + dh / 2);
            this._oneWayDoorGraphics.push(gfx);

            const zone = this.add.zone(dx, dy, 6, dh);
            this.physics.add.existing(zone, true);
            this._oneWayDoorZones.push(zone);

            const doorCollider = this.physics.add.collider(
                this.player.sprite, zone, null,
                (playerSprite, z) => {
                    if (playerSprite.x > z.x && playerSprite.body.velocity.x < 0) return true;
                    return false;
                }, this,
            );
            this._roomColliders.push(doorCollider);
        }
    }

    /* ================================================================== */
    /*  Room builder: Destructible Walls                                      */
    /* ================================================================== */

    _buildDestructibleWallsFromSpawns() {
        if (!this._spawnDestructibleWalls || this._spawnDestructibleWalls.length === 0) return;

        for (const wDef of this._spawnDestructibleWalls) {
            if (this._spawnedWallIds.includes(wDef.wallId)) continue;

            const wall = new DestructibleWall(
                this, wDef.x, wDef.y, wDef.w, wDef.h, wDef.wallId, wDef.maxHp,
            );
            this.destructibleWalls.push(wall);
        }
    }

    _onPlayerHitWall(wallZone) {
        const wall = this.destructibleWalls.find(w => w.body === wallZone);
        if (!wall || wall.destroyed) return;

        const player = this.player;
        const isAttacking = player.state === 'attack1_active' ||
                            player.state === 'attack2_active' ||
                            player.state === 'air_attack_active';
        if (!isAttacking) return;

        const sword = player.abilities.sword;
        let dmg;
        switch (player.state) {
            case 'attack1_active': dmg = sword ? 8 : 3; break;
            case 'attack2_active': dmg = sword ? 7 : 5; break;
            case 'air_attack_active': dmg = sword ? 6 : 4; break;
            default: dmg = 3;
        }

        wall.takeDamage(dmg, player.facingRight ? 1 : -1);
    }

    /* ================================================================== */
    /*  Room builder: Moving Platforms (elevators)                          */
    /* ================================================================== */

    _buildMovingPlatformsFromSpawns() {
        if (!this._spawnMovingPlatforms || this._spawnMovingPlatforms.length === 0) return;
        if (!this._movingPlatforms) this._movingPlatforms = [];

        for (const mpDef of this._spawnMovingPlatforms) {
            const mp = new MovingPlatform(
                this, mpDef.x, mpDef.y, mpDef.width, mpDef.rangeY, mpDef.speed,
            );
            this._movingPlatforms.push(mp);
            const collider = this.physics.add.collider(this.player.sprite, mp.body);
            this._roomColliders.push(collider);
        }
    }

    /* ================================================================== */
    /*  Room builder: Boss Trigger                                           */
    /* ================================================================== */

    _buildBossTriggerFromSpawns() {
        if (!this._bossTriggerRect || this._bossDefeated) return;
        const r = this._bossTriggerRect;

        this.bossTriggerZone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
        this.physics.add.existing(this.bossTriggerZone, true);

        const overlap = this.physics.add.overlap(
            this.player.sprite, this.bossTriggerZone,
            () => {
                if (!this._bossTriggered) {
                    this._bossTriggered = true;
                    this.bossActive = true;
                    this._startBossBattle();
                }
            }, null, this,
        );
        this._roomColliders.push(overlap);
    }

    _startBossBattle() {
        // Audio — pause exploration BGM during boss fight
        if (this.bgm) this.bgm.pause();

        SceneManager.launchOverlay(this, 'BossScene', {
            playerData: {
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                feelings: this.player.feelings,
                feelingsMax: this.player.feelingsMax,
                abilities: { ...this.player.abilities },
            },
        });
    }

    /* ================================================================== */
    /*  Room builder: Decorations                                            */
    /* ================================================================== */

    _buildDecorationsFromSpawns(roomDef) {
        const stalTex = this.textures.get('deco_stalactite').getSourceImage();
        const stalH = stalTex ? stalTex.height : 24;

        // Torches
        for (const t of this._spawnTorches) {
            const torch = this.add.image(t.x, t.y, 'deco_torch').setDepth(1).setOrigin(0.5, 1);
            this.tweens.add({
                targets: torch,
                alpha: { from: 0.6, to: 1 },
                duration: 400 + Math.random() * 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            this._torches.push(torch);
        }

        // Stalactites
        for (const s of this._spawnStalactites) {
            const st = this.add.image(s.x, 0, 'deco_stalactite')
                .setOrigin(0.5, 0).setScale(1, s.h / stalH || 1).setDepth(-4);
            this._stalactites.push(st);
        }

        // Crystals
        for (const c of this._spawnCrystals) {
            const crystal = this.add.image(c.x, c.y, 'deco_crystal').setDepth(-3);
            this.tweens.add({
                targets: crystal,
                alpha: { from: 0.5, to: 1 },
                scale: { from: 0.8, to: 1.1 },
                duration: 2500 + Math.random() * 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            this._crystals.push(crystal);
        }

        // Vines
        for (const v of this._spawnVines) {
            const vine = this.add.image(v.x, 556, 'deco_vine').setOrigin(0.5, 0).setDepth(-3);
            this._vines.push(vine);
        }

        // Rune glows + ambient lights (still from roomDef for now)
        if (roomDef && roomDef.decorations) {
            const dec = roomDef.decorations;
            if (dec.runeGlows) {
                const rg = dec.runeGlows;
                const startX = rg.startX || 100;
                const count = rg.count || 4;
                for (let i = 0; i < count; i++) {
                    const rx = startX + i * 80 + Phaser.Math.Between(-4, 4);
                    const ry = 555 + Phaser.Math.Between(-5, 5);
                    const rune = this.add.circle(rx, ry, Phaser.Math.Between(2, 4), 0x7FE0DE, 0.2).setDepth(-3);
                    this.tweens.add({
                        targets: rune,
                        alpha: { from: 0.1, to: 0.35 },
                        scale: { from: 0.6, to: 1.3 },
                        duration: 1800 + i * 300,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut',
                    });
                    this._runeGlows.push(rune);
                }
            }
            if (dec.ambientLights) {
                dec.ambientLights.forEach(al => {
                    const color = al.color || 0x7FE0DE;
                    for (let i = 0; i < (al.count || 3); i++) {
                        const lx = al.x + i * 60 + Phaser.Math.Between(-8, 8);
                        const ly = al.y + Phaser.Math.Between(-15, 15);
                        const dot = this.add.circle(lx, ly, Phaser.Math.Between(3, 5), color, al.alpha || 0.3).setDepth(-4);
                        this.tweens.add({
                            targets: dot,
                            alpha: { from: (al.alpha || 0.3) * 0.3, to: (al.alpha || 0.3) },
                            scale: { from: 0.5, to: 1.2 },
                            duration: 2000 + Phaser.Math.Between(0, 1000),
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut',
                            delay: i * 400,
                        });
                        this._ambientLights.push(dot);
                    }
                });
            }
        }
    }

    _buildExitMarkers() {
        if (!this._roomExits || this._roomExits.length === 0) return;

        for (const exit of this._roomExits) {
            const marker = this.add.graphics().setDepth(-2);
            const isVertical = exit.dir === 'up' || exit.dir === 'down';
            const glow = exit.targetRoom === 'boss' ? 0xb84c4c : 0x7FE0DE;

            if (isVertical) {
                const lipY = exit.dir === 'up' ? exit.y + 10 : exit.y - 10;
                const centerX = exit.x + exit.w / 2;
                marker.fillStyle(0x05070d, 0.96);
                marker.fillRect(exit.x - 12, lipY - 8, exit.w + 24, 16);
                marker.fillStyle(0x11151f, 0.95);
                marker.fillRect(exit.x - 4, lipY - 12, exit.w + 8, 24);
                marker.lineStyle(1, glow, 0.22);
                marker.strokeRect(exit.x - 4, lipY - 12, exit.w + 8, 24);
                marker.lineStyle(2, 0x000000, 1);
                marker.strokeRect(exit.x - 1, lipY - 9, exit.w + 2, 18);

                const rim = this.add.graphics().setDepth(-1);
                rim.lineStyle(1, glow, 0.35);
                rim.strokeLineShape(new Phaser.Geom.Line(centerX - 14, lipY - 16, centerX + 14, lipY - 16));
                rim.strokeLineShape(new Phaser.Geom.Line(centerX - 14, lipY + 16, centerX + 14, lipY + 16));
                this._exitMarkers.push(rim);
            } else {
                const rightSide = exit.dir === 'right';
                const frameX = rightSide ? exit.x - 16 : exit.x + exit.w + 2;
                const innerX = rightSide ? exit.x - 2 : exit.x + 2;
                const slitX = rightSide ? exit.x + 2 : exit.x + exit.w - 10;

                marker.fillStyle(0x05070d, 0.96);
                marker.fillRect(frameX, exit.y - 20, 16, exit.h + 40);
                marker.fillStyle(0x11151f, 0.96);
                marker.fillRect(innerX, exit.y - 14, 10, exit.h + 28);
                marker.lineStyle(1, glow, 0.22);
                marker.strokeRect(innerX, exit.y - 14, 10, exit.h + 28);
                marker.lineStyle(2, 0x000000, 1);
                marker.strokeRect(slitX, exit.y - 10, 4, exit.h + 20);

                const rim = this.add.graphics().setDepth(-1);
                rim.lineStyle(1, glow, 0.32);
                rim.strokeLineShape(new Phaser.Geom.Line(frameX + 2, exit.y - 16, frameX + 2, exit.y + exit.h + 16));
                rim.strokeLineShape(new Phaser.Geom.Line(frameX + 12, exit.y - 16, frameX + 12, exit.y + exit.h + 16));
                this._exitMarkers.push(rim);
            }

            this._exitMarkers.push(marker);
        }
    }

    /* ================================================================== */
    /*  Room Banner                                                          */
    /* ================================================================== */

    _showRoomBanner(title) {
        if (this._roomBanner) {
            this.tweens.killTweensOf(this._roomBanner);
            this._roomBanner.destroy();
        }

        const banner = this.add.text(this.scale.width / 2, 200, title, {
            fontFamily: GAME_FONTS?.ui || 'monospace',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(200);

        this._roomBanner = banner;

        this.tweens.add({
            targets: banner,
            alpha: 1,
            y: 188,
            duration: 180,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: banner,
                    alpha: 0,
                    y: 172,
                    duration: 220,
                    ease: 'Sine.easeIn',
                    delay: 700,
                    onComplete: () => {
                        if (banner && banner.active) banner.destroy();
                        if (this._roomBanner === banner) this._roomBanner = null;
                    },
                });
            },
        });
    }

    _setupRoomBoundary(roomDef) {
        if (!this._roomExits || this._roomExits.length === 0) return;
        if (this._roomBoundaryGfx) {
            this._roomBoundaryGfx.destroy();
        }
        this._roomBoundaryGfx = this.add.graphics().setDepth(-3);
        const gfx = this._roomBoundaryGfx;
        const w = this._roomPixelWidth || roomDef.width;
        const h = this._roomPixelHeight || roomDef.height;
        gfx.lineStyle(1, 0x23324a, 0.35);
        gfx.strokeRect(1, 1, w - 2, h - 2);
    }

    /* ================================================================== */
    /*  Player Creation (once, no platform collider — done per-room)         */
    /* ================================================================== */

    _createPlayer() {
        this.player = new Player(this, 120, 530);
    }

    /* ================================================================== */
    /*  Input                                                                */
    /* ================================================================== */

    _createInput() {
        this.keys = {
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D'),
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            attack: this.input.keyboard.addKey('J'),
            jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            dash: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
        };

        this._attackHandlerJ = () => {
            if (this.pauseMenu && this.pauseMenu.isPaused) return;
            if (this.isResting) return;
            if (this.isTalking) return;
            if (this.player && !this.bossActive) {
                if (this._getNearbyNPC()) return;
                this.player.attackPressed();
            }
        };
        this.input.keyboard.on('keydown-J', this._attackHandlerJ);

        this._pointerActionHandler = (pointer) => {
            if (!pointer || pointer.button !== 0) return;
            if (this.pauseMenu && this.pauseMenu.isPaused) return;
            if (this.isResting || this.player.dead) return;
            if (this.isTalking) {
                if (this.talkingNPC) {
                    let closed = false;
                    if (this.talkingNPC._choiceData) {
                        closed = this.talkingNPC.confirmChoice();
                    } else {
                        closed = this.talkingNPC.advanceDialogue();
                    }
                    if (closed) {
                        this.isTalking = false;
                        this.talkingNPC = null;
                        this.player.resetToIdle();
                    }
                }
                return;
            }
            if (this.player && !this.bossActive) {
                const nearbyNPC = this._getNearbyNPC();
                if (nearbyNPC) {
                    nearbyNPC.showPrompt(false);
                    this.talkingNPC = nearbyNPC;
                    this.isTalking = true;
                    nearbyNPC.startDialogue();
                    return;
                }

                this.player.attackPressed();
            }
        };
        this.input.on('pointerdown', this._pointerActionHandler);

        // Character panel toggle (Tab)
        this._tabHandler = (event) => {
            event.preventDefault();
            const hud = this.scene.get('HUDScene');
            if (hud && hud.characterPanel) hud.characterPanel.toggle();
        };
        this.input.keyboard.on('keydown-TAB', this._tabHandler);

        this.events.once('shutdown', () => {
            this.input.keyboard.off('keydown-J', this._attackHandlerJ);
            this.input.keyboard.off('keydown-TAB', this._tabHandler);
            if (this.input) this.input.off('pointerdown', this._pointerActionHandler);
            if (this.npcs) this.npcs.forEach(n => n.destroy());
            if (this.chapterBg) { this.chapterBg.destroy(); this.chapterBg = null; }
        });
    }

    /* ================================================================== */
    /*  NPC System                                                           */
    /* ================================================================== */

    /**
     * Return the nearest NPC whose interaction zone contains the player,
     * or null if none are nearby.
     */
    _getNearbyNPC() {
        if (!this.player || !this.npcs) return null;
        for (let i = 0; i < this.npcs.length; i++) {
            if (this.npcs[i].isPlayerNearby(this.player.x, this.player.y)) {
                return this.npcs[i];
            }
        }
        return null;
    }

    /* ================================================================== */
    /*  Hit Feedback Helpers                                                 */
    /* ================================================================== */

    /**
     * Freeze all game logic for a set number of frames (hitStop).
     * Physics is paused via `physics.world.isPaused` so bodies freeze,
     * but visual tweens, particles, and camera effects continue.
     * @param {number} frames - Number of 60fps frames to freeze (0 = no-op)
     */
    _doHitStop(frames) {
        if (frames <= 0) return;
        if (this._transitioning) return;           // Skip during room transition
        if (this.pauseMenu && this.pauseMenu.isPaused) return; // Skip if paused
        if (this._hitStopFrames > 0) return;       // Don't stack hitStops
        this._hitStopFrames = frames;
        this.physics.world.isPaused = true;
    }

    /**
     * Camera zoom pulse — brief zoom-in on big hits for dramatic effect.
     * @param {number} amount - Zoom delta (e.g. 0.01 = +1%)
     * @param {number} duration - Total tween duration in ms
     */
    _cameraZoomPulse(amount, duration) {
        const cam = this.cameras.main;
        const baseZoom = cam.zoom;
        this.tweens.add({
            targets: cam,
            zoom: baseZoom + amount,
            duration: duration * 0.3,
            yoyo: true,
            ease: 'Quad.easeOut',
            hold: duration * 0.4,
        });
    }

    /**
     * Landing camera catch-up bounce.
     * When the player lands from a significant fall (>100px), the camera
     * briefly overshoots downward by a small amount then settles, giving
     * a gentle "oof" feel.
     */
    _checkLandingBounce() {
        if (!this.player || this.player.dead) return;

        // Track the Y where the player first left the ground
        if (!this._lastAirborne && this.player.isAirborneStable) {
            this._fallStartY = this.player.y;
        }

        // Detect landing: was airborne, now grounded
        if (this._lastAirborne && !this.player.isAirborneStable && !this.player.dead) {
            const fallDistance = this.player.y - (this._fallStartY || this.player.y);

            if (fallDistance > 100) {
                const intensity = Math.min(fallDistance / 500, 0.8);
                const bounceY = -4 * intensity;  // Negative = camera shifts up (camera catches up)
                const bounceDuration = Math.min(100 + intensity * 80, 180);

                this.tweens.add({
                    targets: this.cameras.main,
                    scrollY: this.cameras.main.scrollY + bounceY,
                    duration: bounceDuration * 0.5,
                    ease: 'Quad.easeOut',
                    yoyo: true,
                });
            }
        }

        this._lastAirborne = this.player.isAirborneStable;
    }

    /* ================================================================== */
    /*  Combat: Player hits enemy                                            */
    /* ================================================================== */

    _onPlayerHitEnemy(enemySprite) {
        const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
        if (!enemy || enemy.dead || enemy.invulnTimer > 0) return;

        let dmg, kbx, kby, shake, hitStopFrames, hitstunFrames;
        let particleConfig;
        const sword = this.player.abilities.sword;
        const dir = this.player.facingRight ? 1 : -1;

        switch (this.player.state) {
            case 'attack1_active':
                if (sword) {
                    // Attack3: sword finisher — heavy hit
                    dmg = 8;
                    kbx = 160;
                    kby = -60;
                    shake = 6;
                    hitStopFrames = 6;
                    hitstunFrames = 24;
                    particleConfig = {
                        dirX: dir, count: 10, spread: 80,
                        color: 0xa8d8ff, sizeMin: 3, sizeMax: 5, lifetime: 300,
                    };
                    this.cameras.main.flash(100, 255, 255, 255);
                    this._cameraZoomPulse(0.01, 150);
                } else {
                    // Attack1 (no sword): quick light hit
                    dmg = 3;
                    kbx = 130;
                    kby = -45;
                    shake = 2;
                    hitStopFrames = 3;
                    hitstunFrames = 12;
                    particleConfig = {
                        dirX: dir, count: 3, spread: 30,
                        color: 0xffffff, sizeMin: 2, sizeMax: 3, lifetime: 200,
                    };
                }
                break;

            case 'attack2_active':
                dmg = sword ? 7 : 5;
                kbx = 200;
                kby = -70;
                shake = 5;
                hitStopFrames = 5;
                hitstunFrames = 18;
                particleConfig = {
                    dirX: dir, count: 7, spread: 80,
                    color: 0xffffff, sizeMin: 3, sizeMax: 5, lifetime: 300,
                };
                break;

            case 'air_attack_active':
                if (sword) {
                    dmg = 6;
                } else {
                    dmg = 4;
                }
                kbx = 90;
                kby = -90;
                shake = 4;
                hitStopFrames = 4;
                hitstunFrames = 15;
                if (this.player.isGroundedStable) {
                    // Air slam landing: 360° ground-level radial burst
                    particleConfig = {
                        dirX: dir, count: 8, spread: 360,
                        color: 0xffffff, sizeMin: 3, sizeMax: 4, lifetime: 300,
                        isRadial: true,
                    };
                    this.cameras.main.flash(80, 255, 255, 255);
                } else {
                    // Mid-air hit: downward spray
                    particleConfig = {
                        dirX: dir, count: sword ? 5 : 3, spread: sword ? 60 : 40,
                        color: sword ? 0xa8d8ff : 0xffffff, sizeMin: 2, sizeMax: 4, lifetime: 250,
                        speedMin: 40, speedMax: 90,
                    };
                }
                break;

            default:
                return;
        }

        // ── Apply hit feedback ────────────────────────────────────────

        // HitStop: freeze frame (prevents stacking via _doHitStop guard)
        this._doHitStop(hitStopFrames);

        // Camera shake (duration matches hitStop feel)
        const shakeDuration = hitStopFrames * 16.67; // ms at ~60fps
        this.cameras.main.shake(shakeDuration, shake / 100);

        // Directional hit particles
        this._spawnHitParticles(enemy.x, enemy.y - 10, particleConfig);

        // Damage number
        this._showDamageNumber(enemy.x, enemy.y - 20, dmg);

        // Enemy takes damage with hitstun frames (knockback + AI freeze)
        enemy.takeDamage(dmg, kbx * dir, kby, hitstunFrames);

        // Player combo tracking
        this.player.onHitEnemy();
        this.hud.showCombo(this.player.comboCount);

        // Audio — combo resonance chime
        if (this.player.comboCount >= 2) {
            this.sound.play('sfx_combo_hit', { volume: 0.5 });
        }

        // Kill bonus Feelings + tracking
        if (enemy.dead && enemy.feelingsDrop > 0) {
            this.player.feelings = Math.min(this.player.feelingsMax, this.player.feelings + enemy.feelingsDrop);
        }
        if (enemy.dead && enemy.spawnId) {
            if (!this.enemiesKilled.includes(enemy.spawnId)) {
                this.enemiesKilled.push(enemy.spawnId);
            }
        }

        // Check if locked room should unlock
        this._checkLockedRoom();
    }

    _onEnemyTouchPlayer(enemySprite) {
        const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
        if (!enemy || enemy.dead) return;
        this.player.takeDamage(enemy.contactDamage, 60, -30);
    }

    /**
     * Spawn a directional or radial burst of hit particles.
     *
     * @param {number}  x           - Center X
     * @param {number}  y           - Center Y
     * @param {object}  [config]    - Particle configuration
     * @param {number}  [config.dirX=1]     - Facing direction (±1)
     * @param {number}  [config.count=5]    - Number of particles
     * @param {number}  [config.spread=60]  - Cone spread in degrees (ignored if isRadial)
     * @param {number}  [config.color=0xffffff] - Particle color
     * @param {number}  [config.sizeMin=2]  - Min particle radius (px)
     * @param {number}  [config.sizeMax=4]  - Max particle radius (px)
     * @param {number}  [config.lifetime=250] - Tween duration (ms)
     * @param {boolean} [config.isRadial=false] - 360° burst instead of directional cone
     * @param {number}  [config.speedMin=30] - Min particle speed
     * @param {number}  [config.speedMax=80] - Max particle speed
     */
    _spawnHitParticles(x, y, config = {}) {
        const {
            dirX = 1,
            count = 5,
            spread = 60,
            color = 0xffffff,
            sizeMin = 2,
            sizeMax = 4,
            lifetime = 250,
            isRadial = false,
            speedMin = 30,
            speedMax = 80,
        } = config;

        for (let i = 0; i < count; i++) {
            const size = Phaser.Math.Between(sizeMin, sizeMax);
            let angle, speed;

            if (isRadial) {
                // 360° burst — used for air slam ground impact
                angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                speed = Phaser.Math.Between(speedMin - 10, speedMax - 10);
            } else {
                // Directional cone — cone center is the attack direction
                const halfSpread = (spread / 2) * Math.PI / 180;
                angle = Phaser.Math.FloatBetween(-halfSpread, halfSpread);
                speed = Phaser.Math.Between(speedMin, speedMax);
            }

            const vx = Math.cos(angle) * speed * (isRadial ? 1 : Math.sign(dirX));
            const vy = isRadial
                ? Math.sin(angle) * speed
                : Math.sin(angle) * speed - Phaser.Math.Between(10, 30);

            const p = this.add.circle(x, y, size, color, 1)
                .setDepth(50).setAlpha(1);

            this.tweens.add({
                targets: p,
                x: p.x + vx,
                y: p.y + vy,
                alpha: 0,
                scaleX: 0.3,
                scaleY: 0.3,
                duration: lifetime,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    /** Show floating damage number. */
    _showDamageNumber(x, y, amount) {
        const txt = this.add.text(x + Phaser.Math.Between(-8, 8), y, `${amount}`, {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: txt,
            y: txt.y - 30,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    /* ================================================================== */
    /*  Collectible Tracking                                                 */
    /* ================================================================== */

    _onCollectiblePicked(collectible) {
        if (collectible.persistent !== false && collectible.saveId) {
            if (!this.collectedPersistentItems.includes(collectible.saveId)) {
                this.collectedPersistentItems.push(collectible.saveId);
            }
        }
    }

    /* ================================================================== */
    /*  Reset Methods (called on bench rest / game over)                     */
    /* ================================================================== */

    /**
     * Destroy all current enemies and respawn them from the current room's data.
     * Also clears the enemiesKilled array so ALL enemies respawn.
     */
    _resetEnemies() {
        // Destroy alive enemy sprites
        this.enemyInstances.forEach(e => {
            if (e.sprite && e.sprite.active) {
                this.tweens.killTweensOf(e.sprite);
                e.sprite.destroy();
            }
        });
        this.enemyInstances = [];
        if (this.enemyGroup) this.enemyGroup.clear(true, true);

        // Clear killed list so ALL enemies respawn
        this.enemiesKilled = [];

        this._buildEnemiesFromSpawns();
    }

    /**
     * Reset collectibles on bench rest.
     * Destroys all existing collectible sprites, then respawns
     * non-persistent ones (health orbs). Persistent items stay collected.
     */
    _resetCollectibles() {
        // Destroy all active collectibles
        this.collectibles.forEach(c => c.destroy());
        this.collectibles = [];
        if (this.collectibleGroup) {
            this.collectibleGroup.clear(true, true);
        }

        this._buildCollectiblesFromSpawns();
    }

    /**
     * Sync room state after applying save data.
     * Re-checks gates, bench state, enemy kill state, collectible state.
     */
    _syncRoomStates() {
        // Remove already-killed enemies (visibility filter)
        // _buildEnemies already skips killed ones, but double-check for safety
        this.enemyInstances = this.enemyInstances.filter(e => {
            if (e.spawnId && this.enemiesKilled.includes(e.spawnId)) {
                if (e.sprite && e.sprite.active) e.sprite.destroy();
                return false;
            }
            return true;
        });

        // Re-check ability gates (player might have abilities from save data)
        this.abilityGates.forEach(gate => {
            if (!gate.unlocked) gate.checkUnlock();
        });
    }

    /* ================================================================== */
    /*  Save / Load                                                          */
    /* ================================================================== */

    /** Persist current game state to localStorage at the given slot (0-4). */
    _saveGame(slotIndex = 0) {
        const data = {
            version: 2,
            roomId: this.currentRoomId,
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            feelings: this.player.feelings,
            feelingsMax: this.player.feelingsMax,
            abilities: { ...this.player.abilities },
            enemiesKilled: [...this.enemiesKilled],
            collectedItems: [...this.collectedPersistentItems],
            abilityItemsCollected: [...this.abilityItemsCollected],
            destroyedWalls: [...this._spawnedWallIds],
            visitedRooms: [...(this.visitedRooms || [this.currentRoomId])],
            bossDefeated: this._bossDefeated || false,
            claimedNpcRewards: [...(this.claimedNpcRewards || [])],
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem(`sekai_save_${slotIndex}`, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save game:', e);
        }
    }

    /**
     * Apply save data after all systems are initialised.
     * Called from create() when this._loadSaveData is present.
     * @param {object} data - Parsed save object.
     */
    _applySaveData(data) {
        if (!data) return;

        // Restore all tracking data BEFORE building rooms
        if (data.abilityItemsCollected) {
            this.abilityItemsCollected = data.abilityItemsCollected;
        }
        if (data.collectedItems) {
            this.collectedPersistentItems = data.collectedItems;
        }
        if (data.enemiesKilled) {
            this.enemiesKilled = data.enemiesKilled;
        }
        if (data.destroyedWalls) {
            this._spawnedWallIds = data.destroyedWalls;
        }
        if (data.visitedRooms) {
            this.visitedRooms = data.visitedRooms;
        }
        if (data.bossDefeated) {
            this._bossDefeated = true;
        }
        if (data.claimedNpcRewards) {
            this.claimedNpcRewards = data.claimedNpcRewards;
        }

        // Determine target room
        const targetRoom = data.roomId && this._roomDef(data.roomId)
            ? data.roomId
            : 'intro';

        // If we're already in the initial room (intro) and the save says a different room,
        // transition to the correct room
        if (targetRoom !== this.currentRoomId) {
            this._clearRoom();
            this.currentRoomId = targetRoom;
            const roomDef = this._roomDef(targetRoom);
            this._buildRoom(roomDef);
        }

        // Position player
        const px = data.x || 120;
        const py = data.y || 530;
        this.player.x = px;
        this.player.y = py;
        if (this.player.body) {
            this.player.body.reset(px, py);
            this.player.body.setVelocity(0, 0);
        }

        // Restore abilities and stats
        this.player.loadState(data);

        // Sync room state
        this._syncRoomStates();

        // Refresh HUD from restored player state
        if (this.hud && this.hud.isReady && this.player) {
            this.hud.refreshFromPlayer(this.player);
        } else {
            this._pendingHudRefresh = true;
        }

        // Fade in
        this.cameras.main.fadeIn(400, 0, 0, 0);

        this._transitioning = false;
    }

    /* ================================================================== */
    /*  UPDATE                                                               */
    /* ================================================================== */

    update(time, delta) {
        if (this._spawnLockFrames > 0) this._spawnLockFrames--;
        this._updateChapterBackground();
        this.pauseMenu.update();

        if (this._pendingHudRefresh && this.hud && this.hud.isReady && this.player) {
            this.hud.refreshFromPlayer(this.player);
            this._pendingHudRefresh = false;
        }

        // Lazy-init mobile controls proxy from HUDScene (created there for viewport-fixed rendering)
        if (!this.mobileControls && this.hud && this.hud.mobileControls) {
            this.mobileControls = this.hud.mobileControls;
            if (ControlMode.isMobile()) this.mobileControls.show();
        }

        // Update the map overlay even when paused (so player marker moves)
        const hud = this.scene.get('HUDScene');
        if (hud && hud.mapView) {
            hud.mapView.update(this.currentRoomId, this.player.x, this.player.y, this.visitedRooms, this.player ? !this.player.sprite.flipX : undefined);
        }

        // Update character panel if open
        if (hud && hud.characterPanel && hud.characterPanel.isOpen) {
            hud.characterPanel.refresh(this.player, this.visitedRooms, this.enemiesKilled);
        }

        if (this.pauseMenu.isPaused || this.scene.isPaused()) return;
        this._updateCameraLook(delta);

        // ── HitStop freeze-frame ─────────────────────────────────────
        // Freezes all game logic (player, enemies, exits, interactions)
        // while allowing visual tweens and camera effects to continue.
        if (this._hitStopFrames > 0) {
            this._hitStopFrames--;
            if (this._hitStopFrames <= 0) {
                this.physics.world.isPaused = false;
            }
            // Keep HUD updated during freeze
            this.hud.drawPips(this.player.hp, this.player.maxHp);
            this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
            this.hud.drawAbilities(this.player.abilities);
            return;
        }

        if (this._spawnLockFrames > 0) {
            this._spawnLockFrames--;
            this.hud.drawPips(this.player.hp, this.player.maxHp);
            this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
            this.hud.drawAbilities(this.player.abilities);
            return;
        }

        // ---- Mobile controls just-pressed refresh ----
        if (this.mobileControls) this.mobileControls.refreshJustDown();

        // ---- Exit detection ----
        this._checkExits();

        // ---- NPC ambient updates ----
        if (!this.isTalking && this.npcs && this.npcs.length > 0) {
            this.npcs.forEach(npc => npc.update(delta));
        }

        // ---- Destructible walls ----
        if (this.destructibleWalls && this.destructibleWalls.length > 0) {
            this.destructibleWalls.forEach(w => w.update());
            this.destructibleWalls = this.destructibleWalls.filter(w => !w.destroyed);
        }

        // ---- NPC dialogue (freezes gameplay while talking) ----
        if (this.isTalking && this.talkingNPC) {
            const talkingNPC = this.talkingNPC;
            const mcAdvance = this.mobileControls && this.mobileControls.attackJustDown;

            // Choice navigation
            if (talkingNPC._choiceData) {
                const mcUp = this.mobileControls && this.mobileControls.upJustDown;
                const mcDown = this.mobileControls && this.mobileControls.downJustDown;
                if (Phaser.Input.Keyboard.JustDown(this.keys.up) || mcUp) {
                    talkingNPC.navigateChoice(-1);
                }
                if (Phaser.Input.Keyboard.JustDown(this.keys.down) || mcDown) {
                    talkingNPC.navigateChoice(1);
                }
            }

            // Advance dialogue or confirm choice
            if (Phaser.Input.Keyboard.JustDown(this.keys.attack) || mcAdvance) {
                let closed = false;
                if (talkingNPC._choiceData) {
                    closed = talkingNPC.confirmChoice();
                } else {
                    closed = talkingNPC.advanceDialogue();
                }
                if (closed) {
                    this.isTalking = false;
                    this.talkingNPC = null;
                    this.player.resetToIdle();
                }
            }
            if (this.isTalking && this.talkingNPC === talkingNPC) {
                this.talkingNPC.update(delta);
            }
            this.hud.drawPips(this.player.hp, this.player.maxHp);
            this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
            return;
        }

        // ---- NPC proximity & interaction ----
        if (!this.player.dead) {
            const nearbyNPC = this._getNearbyNPC();
            const mcInteract = this.mobileControls && this.mobileControls.attackJustDown;
            if (nearbyNPC) {
                nearbyNPC.showPrompt(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.attack) || mcInteract) {
                    this.talkingNPC = nearbyNPC;
                    this.isTalking = true;
                    nearbyNPC.showPrompt(false);
                    nearbyNPC.startDialogue();
                }
            } else {
                this.npcs.forEach(n => {
                    n.showPrompt(false);
                    n.reset();
                });
            }
        }

        this.player.update(delta);

        // Landing camera catch-up bounce (after player state is updated)
        this._checkLandingBounce();

        // Update enemies (filter out dead ones)
        this.enemyInstances = this.enemyInstances.filter(e => !e.dead);
        this.enemyInstances.forEach(e => {
            if (!e.dead) e.update(delta, this.player.x, this.player.y);
        });

        // Update ability items & gates
        this.abilityItems = this.abilityItems.filter(item => !item.collected);
        this.abilityItems.forEach(item => item.update(time));

        this.abilityGates = this.abilityGates.filter(gate => !gate.unlocked);
        this.abilityGates.forEach(gate => gate.update(time));

        // Update moving platforms
        if (this._movingPlatforms) {
            this._movingPlatforms.forEach(mp => mp.update(time, delta));
        }

        this.hud.drawPips(this.player.hp, this.player.maxHp);
        this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
        this.hud.drawAbilities(this.player.abilities);
    }
}
