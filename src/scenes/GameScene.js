/**
 * GameScene — Main gameplay scene.
 *
 * Refactored to room-based architecture (March 2026):
 *   - 8 rooms of 800×600 each (shaft is 600×800)
 *   - Room transitions via fade-out/fade-in
 *   - All room-specific objects rebuilt per room
 *   - Save/load stores roomId + local player position
 *
 * Design doc: Room-based metroidvania with ability-gated progression.
 * Original: Single 4400×600 scrolling world.
 */
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

        // Player + input (once, scene-level)
        this._createPlayer();
        this._createInput();

        // Camera (bounds set per-room in _buildRoom)
        this.cameras.main.setZoom(1);
        this.cameras.main.setBackgroundColor('#0a0a1a');

        // UI systems
        this.hud = new HUD(this);
        this.pauseMenu = new PauseMenu(this);
        this.mapView = new MapView(this);

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
            this._stopBgm();
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

        // Persistent state (survives room transitions)
        this.bossActive = false;
        this.isResting = false;
        this.isTalking = false;
        this.talkingNPC = null;
        this.enemiesKilled = [];
        this.collectedPersistentItems = [];
        this.abilityItemsCollected = [];
        this._usedBenchKeys = [];
        this._bossTriggered = false;
        this._bossDefeated = false;

        // Room-scoped arrays (rebuilt per room)
        this.enemyInstances = [];
        this.benches = [];
        this.npcs = [];
        this.collectibles = [];
        this.platforms = null;
        this.enemyGroup = null;
        this.collectibleGroup = null;
        this.abilityItems = [];
        this.abilityGates = [];
        this.oneWayDoorZone = null;
        this.bossTriggerZone = null;

        // Decoration arrays
        this._stalactites = [];
        this._crystals = [];
        this._torches = [];
        this._vines = [];
        this._runeGlows = [];
        this._ambientLights = [];

        // Room-specific graphics
        this.bgFar = null;
        this.bgMid = null;
        this.bgNear = null;
        this.bgTint = null;
        this.roomContainer = null;
        this.roomBgContainer = null;
        this._oneWayDoorGfx = null;
        this._roomBanner = null;
        this._roomBannerTimer = null;
        this.exitZones = [];
        this._exitMarkers = [];
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
            if (data.from !== 'BossScene') return;
            this._onBossResult(data.result);
        });
    }

    /** Handle result emitted by BossScene. */
    _onBossResult(result) {
        this.scene.resume();
        this.input.keyboard.resetKeys();
        // Audio — resume exploration BGM
        if (this.bgm && !this.bgm.isPlaying) this.bgm.resume();

        // If user chose "MAIN MENU" from pause during boss fight
        if (result.goToMenu) {
            this._stopBgm();
            SceneManager.goTo(this, 'MenuScene');
            return;
        }

        if (result.victory) {
            this.player.heal(30);
            this.player.feelings = Math.min(this.player.feelingsMax, this.player.feelings + 20);
            this._bossDefeated = true;
        }
        if (result.playerDied) {
            this.player.feelings = 0;
            // Reset in current room at a safe position near the entrance
            this.player.reset(48, 636, 50);
        }
        this.bossActive = false;
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
        const goText = this.add.text(480, 360, 'GAME OVER', {
            fontSize: '38px',
            fontFamily: 'monospace',
            color: '#ff6666',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        // After 2 seconds, respawn player and restore world
        this.time.delayedCall(2000, () => {
            goText.destroy();
            this.player.reset(144, 636, 50);
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
        this.bgm = this.sound.add('bgm_explore', { loop: true, volume: 0 });
        this.bgm.play();
        this.tweens.add({
            targets: this.bgm,
            volume: 0.30,
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
     * Build all room content from a RoomDef.
     * Destroys previous room content first if any.
     */
    _buildRoom(roomDef) {
        // Set physics world bounds
        this.physics.world.setBounds(0, 0, roomDef.width, roomDef.height);
        this.cameras.main.setBounds(0, 0, roomDef.width, roomDef.height);

        // Room containers for cleanup
        this.roomBgContainer = this.add.container(0, 0).setDepth(-20);
        this.roomContainer = this.add.container(0, 0).setDepth(0);

        // Background (3 parallax layers + tint overlay)
        this._buildBackground(roomDef);

        // Platforms (ground + elevated)
        this.platforms = this.physics.add.staticGroup();
        this._buildGround(roomDef);
        this._buildPlatforms(roomDef);

        // Player-platform collider (recreated each room)
        const pCollider = this.physics.add.collider(
            this.player.sprite,
            this.platforms,
            null,
            this._shouldPlayerCollideWithPlatform,
            this,
        );
        this._roomColliders.push(pCollider);

        // Enemies
        this.enemyGroup = this.physics.add.group();
        this.enemyInstances = [];
        this._buildEnemies(roomDef);

        // Benches
        this.benches = [];
        this._buildBenches(roomDef);

        // NPCs
        this.npcs = [];
        this._buildNPCs(roomDef);

        // Collectibles
        this.collectibles = [];
        if (this.collectibleGroup) this.collectibleGroup.destroy(true);
        this.collectibleGroup = this.physics.add.staticGroup();
        this._buildCollectibles(roomDef);

        // Ability items
        this.abilityItems = [];
        this._buildAbilityItems(roomDef);

        // Ability gates
        this.abilityGates = [];
        this._buildAbilityGates(roomDef);

        // One-way doors
        this._buildOneWayDoors(roomDef);

        // Boss trigger
        this._buildBossTrigger(roomDef);

        // Decorations (visual only)
        this._buildDecorations(roomDef);
        this._buildExitMarkers(roomDef);

        // Camera follow behavior
        this._setupCameraForRoom(roomDef);

        // Room banner
        this._showRoomBanner(roomDef.name);
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
        if (this.platforms) { this.platforms.destroy(true); this.platforms = null; }
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

        // Destroy benches
        if (this.benches) {
            this.benches.forEach(b => b.destroy());
            this.benches = [];
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

        // Destroy one-way door zone + graphics
        if (this.oneWayDoorZone) {
            this.oneWayDoorZone.destroy();
            this.oneWayDoorZone = null;
        }
        if (this._oneWayDoorGfx) {
            this._oneWayDoorGfx.destroy();
            this._oneWayDoorGfx = null;
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
        if (this.bgFar) { this.bgFar.destroy(); this.bgFar = null; }
        if (this.bgMid) { this.bgMid.destroy(); this.bgMid = null; }
        if (this.bgNear) { this.bgNear.destroy(); this.bgNear = null; }
        if (this.bgTint) { this.bgTint.destroy(); this.bgTint = null; }

        // Destroy containers
        if (this.roomContainer) { this.roomContainer.destroy(true); this.roomContainer = null; }
        if (this.roomBgContainer) { this.roomBgContainer.destroy(true); this.roomBgContainer = null; }

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
    _transitionToRoom(targetRoomId, spawnX, spawnY) {
        if (this._transitioning) return;

        const roomDef = this._roomDef(targetRoomId);
        if (!roomDef) {
            console.warn('Room not found:', targetRoomId);
            return;
        }

        this._transitioning = true;

        // Fade to black
        this.cameras.main.fadeOut(200, 0, 0, 0);
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

            // Position player
            this.player.x = spawnX;
            this.player.y = spawnY;
            this.player.sprite.setPosition(spawnX, spawnY);
            if (this.player.body) {
                this.player.body.reset(spawnX, spawnY);
                this.player.body.setVelocity(0, 0);
            }

            // Fade in
            this.cameras.main.fadeIn(200, 0, 0, 0);
            this.cameras.main.once('camerafadeincomplete', () => {
                this._transitioning = false;
            });
        });
    }

    /**
     * Check if the player is overlapping any exit zone.
     * Called every frame from update().
     */
    _checkExits() {
        if (this._transitioning || !this.player) return;
        if (this.player.isHurt || this.player.dead) return;

        const roomDef = this._roomDef(this.currentRoomId);
        if (!roomDef || !roomDef.exits || roomDef.exits.length === 0) return;

        const px = this.player.x;
        const py = this.player.y;
        const margin = 20;

        for (const exit of roomDef.exits) {
            const ex = exit.x;
            const ey = exit.y;
            const ew = exit.w;
            const eh = exit.h;

            if (px > ex - margin && px < ex + ew + margin &&
                py > ey - margin && py < ey + eh + margin) {
                this._transitionToRoom(exit.targetRoom, exit.targetX, exit.targetY);
                return;
            }
        }
    }

    /**
     * Set up camera follow behavior based on room size.
     * Rooms exactly 800×600 (matching viewport) don't scroll.
     * Larger rooms (shaft: 600×800) allow vertical follow.
     */
    _setupCameraForRoom(roomDef) {
        const followX = roomDef.width > 800;
        const followY = roomDef.height > 600;
        if (followX || followY) {
            this.cameras.main.startFollow(this.player.sprite, followX, followY, 0.1, 0.1);
            this.cameras.main.setDeadzone(100, 50);
        } else {
            this.cameras.main.stopFollow();
            this.cameras.main.scrollX = 0;
            this.cameras.main.scrollY = 0;
        }
    }

    /* ================================================================== */
    /*  Room builder: Background                                             */
    /* ================================================================== */

    _buildBackground(roomDef) {
        const w = roomDef.width;
        const h = roomDef.height;

        const isFirstChapter = this.textures.exists('broken_seikai_bg');
        if (isFirstChapter) {
            this.bgFar = this.add.tileSprite(0, 0, w, h, 'broken_seikai_bg')
                .setOrigin(0, 0).setScrollFactor(0.04).setDepth(-4);
            this.bgFar.setTileScale(0.75, 0.75);
            this.bgMid = this.add.rectangle(w / 2, h / 2, w, h, 0x04060c, 0.20)
                .setDepth(-3);
            this.bgNear = this.add.tileSprite(0, 0, w, h, 'bg_near')
                .setOrigin(0, 0).setScrollFactor(0.2).setDepth(-2);
        } else {
            this.bgFar = this.add.tileSprite(0, 0, w, h, 'bg_far')
                .setOrigin(0, 0).setScrollFactor(0.05).setDepth(-3);
            this.bgMid = this.add.tileSprite(0, 0, w, h, 'bg_mid')
                .setOrigin(0, 0).setScrollFactor(0.15).setDepth(-2);
            this.bgNear = this.add.tileSprite(0, 0, w, h, 'bg_near')
                .setOrigin(0, 0).setScrollFactor(0.3).setDepth(-1);
        }

        if (roomDef.tint) {
            this.bgTint = this.add.rectangle(w / 2, h / 2, w, h, roomDef.tint.color, roomDef.tint.alpha)
                .setDepth(1);
        }
    }

    /* ================================================================== */
    /*  Room builder: Ground & Platforms                                     */
    /* ================================================================== */

    /**
     * Build ground tiles from roomDef.ground data.
     * ground: [{ x: tileCol, w: tileCount }]
     * Each tile is 64×64, placed at center positions.
     * Ground Y = 720 - 32 = 688 (center of bottom tile row).
     */
    _buildGround(roomDef) {
        if (!roomDef.ground) return;
        const groundY = 688;

        for (const g of roomDef.ground) {
            for (let i = 0; i < g.w; i++) {
                const tile = this.platforms.create(
                    g.x * 64 + i * 64 + 32,
                    groundY,
                    roomDef.groundTexture,
                );
                tile.setDisplaySize(64, 64);
                tile.refreshBody();
            }
        }
    }

    /**
     * Build elevated platforms from roomDef.platforms data.
     * platforms: [{ x: leftEdgePx, y: centerY, w: tileCount }]
     */
    _buildPlatforms(roomDef) {
        if (!roomDef.platforms) return;

        for (const p of roomDef.platforms) {
            for (let i = 0; i < p.w; i++) {
                const tile = this.platforms.create(
                    p.x + i * 64 + 32,
                    p.y,
                    roomDef.groundTexture,
                );
                tile.setDisplaySize(64, 64);
                tile.refreshBody();
            }
        }
    }

    /* ================================================================== */
    /*  Room builder: Enemies                                                */
    /* ================================================================== */

    _buildEnemies(roomDef) {
        if (!roomDef.enemies || roomDef.enemies.length === 0) return;

        for (const eDef of roomDef.enemies) {
            // Skip if already killed
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
                default:
                    console.warn('Unknown enemy type:', eDef.type);
                    continue;
            }

            if (enemy) {
                enemy.spawnId = eDef.id;
                this.enemyGroup.add(enemy.sprite);
                this.enemyInstances.push(enemy);
            }
        }

        // Enemy-platform collider
        if (this.enemyGroup.getLength() > 0) {
            const eCollider = this.physics.add.collider(this.enemyGroup, this.platforms);
            this._roomColliders.push(eCollider);

            // Player slash → enemy hits
            const pOverlap = this.physics.add.overlap(
                this.player.slashHitbox,
                this.enemyGroup,
                (_, enemySprite) => this._onPlayerHitEnemy(enemySprite),
                null,
                this,
            );
            this._roomColliders.push(pOverlap);

            // Enemy → player contact damage
            const tOverlap = this.physics.add.overlap(
                this.player.sprite,
                this.enemyGroup,
                (_, enemySprite) => this._onEnemyTouchPlayer(enemySprite),
                null,
                this,
            );
            this._roomColliders.push(tOverlap);
        }
    }

    /* ================================================================== */
    /*  Room builder: Benches                                                */
    /* ================================================================== */

    _buildBenches(roomDef) {
        if (!roomDef.benches || roomDef.benches.length === 0) return;
        const benchY = 642; // ground surface Y (top of ground collider)

        roomDef.benches.forEach((bDef, index) => {
            const bench = new Bench(this, bDef.x, benchY);
            bench._roomBenchIndex = index;

            // Restore used state from save data
            const saveKey = this.currentRoomId + '_bench_' + index;
            if (this._usedBenchKeys && this._usedBenchKeys.includes(saveKey)) {
                bench.usedCount++;
            }

            this.benches.push(bench);
        });
    }

    /* ================================================================== */
    /*  Room builder: NPCs                                                   */
    /* ================================================================== */

    _buildNPCs(roomDef) {
        if (!roomDef.npcs || roomDef.npcs.length === 0) return;

        for (const nDef of roomDef.npcs) {
            const npc = new NPC(this, nDef.x, nDef.y, {
                name: nDef.name,
                dialogues: nDef.dialogues,
                hairColor: nDef.hairColor,
            });
            this.npcs.push(npc);
        }
    }

    /* ================================================================== */
    /*  Room builder: Collectibles                                           */
    /* ================================================================== */

    _buildCollectibles(roomDef) {
        if (!roomDef.collectibles || roomDef.collectibles.length === 0) return;

        for (const cDef of roomDef.collectibles) {
            // Skip persistent items that were already collected
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
                this.player.sprite,
                collectible.sprite,
                (playerSprite, collectibleSprite) => {
                    const c = collectibleSprite.collectibleRef;
                    if (c && !c.collected) {
                        c.pickup(this.player);
                        this._onCollectiblePicked(c);
                    }
                },
                null,
                this,
            );
            this._roomColliders.push(overlap);
        }
    }

    /* ================================================================== */
    /*  Room builder: Ability Items                                          */
    /* ================================================================== */

    _buildAbilityItems(roomDef) {
        if (!roomDef.abilityItems || roomDef.abilityItems.length === 0) return;

        for (const aDef of roomDef.abilityItems) {
            // Skip if already collected
            if (this.abilityItemsCollected.includes(aDef.key)) continue;

            const item = new AbilityItem(this, aDef.x, aDef.y, aDef.key, aDef.name);
            this.abilityItems.push(item);
        }
    }

    /* ================================================================== */
    /*  Room builder: Ability Gates                                          */
    /* ================================================================== */

    _buildAbilityGates(roomDef) {
        if (!roomDef.abilityGates || roomDef.abilityGates.length === 0) return;

        for (const gDef of roomDef.abilityGates) {
            // Skip if player already has the ability (gate would auto-unlock anyway,
            // but this avoids creating unnecessary objects)
            if (this.player.abilities[gDef.key]) continue;

            const gate = new AbilityGate(this, gDef.x, gDef.y, gDef.w, gDef.h, gDef.key);
            this.abilityGates.push(gate);
            // Note: AbilityGate constructor already creates its own collider
            // with scene.player.sprite and this.gateBody. That collider is
            // cleaned up in gate.destroy() during _clearRoom().
        }
    }

    /* ================================================================== */
    /*  Room builder: One-Way Doors                                          */
    /* ================================================================== */

    _buildOneWayDoors(roomDef) {
        if (!roomDef.oneWayDoors || roomDef.oneWayDoors.length === 0) return;

        const d = roomDef.oneWayDoors[0];
        const dx = d.x;
        const dh = d.h;
        const dy = d.y || 390;

        // Visual barrier
        this._oneWayDoorGfx = this.add.graphics().setDepth(20);
        this._oneWayDoorGfx.fillStyle(0x2d3561, 0.8);
        this._oneWayDoorGfx.fillRect(dx - 3, dy - dh / 2, 6, dh);
        this._oneWayDoorGfx.lineStyle(1.5, 0x7FE0DE, 0.4);
        this._oneWayDoorGfx.strokeRect(dx - 3, dy - dh / 2, 6, dh);
        this._oneWayDoorGfx.lineStyle(1, 0x7FE0DE, 0.15);
        this._oneWayDoorGfx.lineBetween(dx, dy - dh / 2, dx, dy + dh / 2);

        // Physics zone (static body)
        this.oneWayDoorZone = this.add.zone(dx, dy, 6, dh);
        this.physics.add.existing(this.oneWayDoorZone, true);

        // Collider with direction-based process callback
        const doorCollider = this.physics.add.collider(
            this.player.sprite,
            this.oneWayDoorZone,
            null,
            (playerSprite, zone) => {
                // Block left→right; allow right→left and all other cases
                if (playerSprite.x > zone.x && playerSprite.body.velocity.x < 0) {
                    return true; // collide (block movement)
                }
                return false; // pass through freely
            },
            this,
        );
        this._roomColliders.push(doorCollider);
    }

    /* ================================================================== */
    /*  Room builder: Boss Trigger                                           */
    /* ================================================================== */

    _buildBossTrigger(roomDef) {
        if (!roomDef.bossTrigger || this._bossDefeated) return;

        this.bossTriggerZone = this.add.zone(480, 360, 960, 720);
        this.physics.add.existing(this.bossTriggerZone, true);

        const overlap = this.physics.add.overlap(
            this.player.sprite,
            this.bossTriggerZone,
            () => {
                if (!this._bossTriggered) {
                    this._bossTriggered = true;
                    this.bossActive = true;
                    this._startBossBattle();
                }
            },
            null,
            this,
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

    _buildDecorations(roomDef) {
        const dec = roomDef.decorations;
        if (!dec) return;

        // Torches
        if (dec.torches) {
            dec.torches.forEach(t => {
                const torch = this.add.image(t.x, t.y, 'deco_torch')
                    .setDepth(1).setOrigin(0.5, 1);
                this.tweens.add({
                    targets: torch,
                    alpha: { from: 0.6, to: 1 },
                    duration: 400 + Math.random() * 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
                this._torches.push(torch);
            });
        }

        // Stalactites
        if (dec.stalactites) {
            dec.stalactites.forEach(s => {
                const st = this.add.image(s.x, 0, 'deco_stalactite')
                    .setOrigin(0.5, 0).setScale(1, s.h / 24 || 1).setDepth(-4);
                this._stalactites.push(st);
            });
        }

        // Crystals
        if (dec.crystals) {
            dec.crystals.forEach(c => {
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
            });
        }

        // Vines
        if (dec.vines) {
            dec.vines.forEach(v => {
                const vine = this.add.image(v.x, 556, 'deco_vine')
                    .setOrigin(0.5, 0).setDepth(-3);
                this._vines.push(vine);
            });
        }

        // Rune glows
        if (dec.runeGlows) {
            const rg = dec.runeGlows;
            const startX = rg.startX || 100;
            const count = rg.count || 4;
            for (let i = 0; i < count; i++) {
                const rx = startX + i * 80 + Phaser.Math.Between(-4, 4);
                const ry = 555 + Phaser.Math.Between(-5, 5);
                const rune = this.add.circle(rx, ry, Phaser.Math.Between(2, 4), 0x7FE0DE, 0.2)
                    .setDepth(-3);
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

        // Ambient lights
        if (dec.ambientLights) {
            dec.ambientLights.forEach(al => {
                const color = al.color || 0x7FE0DE;
                for (let i = 0; i < (al.count || 3); i++) {
                    const lx = al.x + i * 60 + Phaser.Math.Between(-8, 8);
                    const ly = al.y + Phaser.Math.Between(-15, 15);
                    const dot = this.add.circle(lx, ly, Phaser.Math.Between(3, 5), color, al.alpha || 0.3)
                        .setDepth(-4);
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

    _buildExitMarkers(roomDef) {
        if (!roomDef.exits || roomDef.exits.length === 0) return;

        roomDef.exits.forEach(exit => {
            const marker = this.add.graphics().setDepth(-2);
            const isVertical = exit.dir === 'up' || exit.dir === 'down';
            const glow = exit.targetRoom === 'boss' ? 0xb84c4c : 0x7FE0DE;

            if (isVertical) {
                const lipY = exit.dir === 'up' ? exit.y + 10 : exit.y - 10;
                const centerX = exit.x + exit.w / 2;
                marker.fillStyle(0x03050b, 0.35);
                marker.fillRect(exit.x - 18, 0, exit.w + 36, exit.dir === 'up' ? lipY + 4 : 600 - (exit.y - 4));
                marker.fillStyle(0x08101a, 0.95);
                marker.fillRect(exit.x - 12, lipY - 8, exit.w + 24, 16);
                marker.lineStyle(2, glow, 0.35);
                marker.strokeRect(exit.x - 12, lipY - 8, exit.w + 24, 16);
                marker.fillStyle(glow, 0.1);
                marker.fillEllipse(centerX, lipY, exit.w + 36, 20);

                for (let i = -1; i <= 1; i++) {
                    const guide = this.add.triangle(
                        centerX + i * 16,
                        lipY + (exit.dir === 'up' ? -18 : 18),
                        0, exit.dir === 'up' ? 9 : -9,
                        -5, 0,
                        5, 0,
                        glow,
                        0.32,
                    ).setDepth(-2);
                    this._exitMarkers.push(guide);
                }
            } else {
                const rightSide = exit.dir === 'right';
                const frameX = rightSide ? exit.x - 12 : exit.x + exit.w - 4;
                const innerX = rightSide ? exit.x + 2 : exit.x - 14;
                const glowX = rightSide ? exit.x - 18 : exit.x + exit.w - 6;

                marker.fillStyle(0x03050b, 0.35);
                marker.fillRect(rightSide ? exit.x - 42 : 0, exit.y - 54, rightSide ? 42 : exit.x + exit.w + 42, exit.h + 108);
                marker.fillStyle(0x07101a, 0.96);
                marker.fillRect(frameX, exit.y - 34, 16, exit.h + 68);
                marker.fillStyle(0x05070f, 0.9);
                marker.fillRect(innerX, exit.y - 20, 18, exit.h + 40);
                marker.lineStyle(2, glow, 0.3);
                marker.strokeRect(innerX, exit.y - 20, 18, exit.h + 40);
                marker.fillStyle(glow, 0.08);
                marker.fillRect(glowX, exit.y - 10, 24, exit.h + 20);

                for (let i = 0; i < 3; i++) {
                    const arrow = this.add.triangle(
                        rightSide ? exit.x - 26 : exit.x + exit.w + 26,
                        exit.y + 10 + i * 18,
                        rightSide ? -7 : 7, 0,
                        rightSide ? 5 : -5, -5,
                        rightSide ? 5 : -5, 5,
                        glow,
                        0.28,
                    ).setDepth(-2);
                    this._exitMarkers.push(arrow);
                }
            }

            this._exitMarkers.push(marker);
        });
    }

    /* ================================================================== */
    /*  Room Banner                                                          */
    /* ================================================================== */

    _showRoomBanner(title) {
        if (this._roomBanner) {
            this.tweens.killTweensOf(this._roomBanner);
            this._roomBanner.destroy();
        }

        const banner = this.add.text(400, 200, title, {
            fontFamily: GAME_FONTS?.ui || 'monospace',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(200);

        this._roomBanner = banner;

        this.tweens.add({
            targets: banner,
            alpha: 1,
            y: 180,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this.tweens.add({
                    targets: banner,
                    alpha: 0,
                    y: 160,
                    duration: 600,
                    ease: 'Power2',
                    delay: 1000,
                    onComplete: () => {
                        if (banner && banner.active) banner.destroy();
                        if (this._roomBanner === banner) this._roomBanner = null;
                    },
                });
            },
        });
    }

    /* ================================================================== */
    /*  Player Creation (once, no platform collider — done per-room)         */
    /* ================================================================== */

    _createPlayer() {
        this.player = new Player(this, 120, 530);
    }

    _shouldPlayerCollideWithPlatform(playerSprite, platform) {
        const body = playerSprite.body;
        const platformBody = platform.body;
        const previousBottom = body.bottom - body.deltaY();
        return body.velocity.y >= 0 && previousBottom <= platformBody.top + 8;
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
            jump1: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            jump2: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            attack: this.input.keyboard.addKey('J'),
            attack2: this.input.keyboard.addKey('Z'),
            dash1: this.input.keyboard.addKey('K'),
            dash2: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        };

        this._attackHandlerJ = () => {
            if (this.pauseMenu && this.pauseMenu.isPaused) return;
            if (this.isResting) return;
            if (this.isTalking) return;
            if (this.player && !this.bossActive) {
                // Don't attack while near a bench or NPC — J is "rest" / "talk" there
                if (this._getNearbyBench()) return;
                if (this._getNearbyNPC()) return;
                this.player.attackPressed();
            }
        };
        this._attackHandlerZ = () => {
            if (this.pauseMenu && this.pauseMenu.isPaused) return;
            if (this.isResting) return;
            if (this.isTalking) return;
            if (this.player && !this.bossActive) {
                if (this._getNearbyBench()) return;
                if (this._getNearbyNPC()) return;
                this.player.attackPressed();
            }
        };

        this.input.keyboard.on('keydown-J', this._attackHandlerJ);
        this.input.keyboard.on('keydown-Z', this._attackHandlerZ);

        this._pointerActionHandler = (pointer) => {
            if (!pointer || pointer.button !== 0) return;
            if (this.pauseMenu && this.pauseMenu.isPaused) return;
            if (this.isResting || this.player.dead) return;
            if (this.isTalking) {
                if (this.talkingNPC) {
                    const closed = this.talkingNPC.advanceDialogue();
                    if (closed) {
                        this.isTalking = false;
                        this.talkingNPC = null;
                    }
                }
                return;
            }
            if (this.player && !this.bossActive) {
                const nearbyNPC = this._getNearbyNPC();
                if (nearbyNPC) {
                    const nearbyBench = this._getNearbyBench();
                    if (nearbyBench) nearbyBench.showPrompt(false);
                    nearbyNPC.showPrompt(false);
                    this.talkingNPC = nearbyNPC;
                    this.isTalking = true;
                    nearbyNPC.startDialogue();
                    return;
                }

                const nearbyBench = this._getNearbyBench();
                if (nearbyBench) {
                    nearbyBench.showPrompt(false);
                    this._restAtBench(nearbyBench);
                    return;
                }

                this.player.attackPressed();
            }
        };
        this.input.on('pointerdown', this._pointerActionHandler);

        this.events.once('shutdown', () => {
            this.input.keyboard.off('keydown-J', this._attackHandlerJ);
            this.input.keyboard.off('keydown-Z', this._attackHandlerZ);
            if (this.input) this.input.off('pointerdown', this._pointerActionHandler);
            if (this.npcs) this.npcs.forEach(n => n.destroy());
        });
    }

    /* ================================================================== */
    /*  Bench System                                                         */
    /* ================================================================== */

    /** Ground surface Y (top of ground collider). */
    get _groundSurfaceY() { return 550; }

    /**
     * Return the nearest bench whose interaction zone contains the player,
     * or null if none are nearby.
     */
    _getNearbyBench() {
        if (!this.player || !this.benches) return null;
        for (let i = 0; i < this.benches.length; i++) {
            if (this.benches[i].isPlayerNearby(this.player.x, this.player.y)) {
                return this.benches[i];
            }
        }
        return null;
    }

    /**
     * Rest at a bench: freeze player → alpha pulse → full restore →
     * show text → save → reset enemies/collectibles.
     * @param {Bench} bench
     */
    _restAtBench(bench) {
        if (this.isResting) return;
        this.isResting = true;

        // Hide all prompts
        this.benches.forEach(b => b.showPrompt(false));

        // Freeze player
        this.player.body.setVelocity(0, 0);
        this.player.body.setAllowGravity(false);

        // Bench visual pulse
        bench.playRestEffect();

        // Player alpha pulse
        this.tweens.add({
            targets: this.player.sprite,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            ease: 'Sine.easeInOut',
            hold: 100,
            onComplete: () => {
                // Full restore
                this.player.heal(this.player.maxHp);
                this.player.feelings = this.player.feelingsMax;
                this.player.sprite.setAlpha(1);
                this.player.body.setAllowGravity(true);

                // Audio feedback
                this.sound.play('sfx_ui_confirm', { volume: 0.4 });

                // Track bench usage globally
                if (bench._roomBenchIndex !== undefined) {
                    const key = this.currentRoomId + '_bench_' + bench._roomBenchIndex;
                    if (!this._usedBenchKeys.includes(key)) {
                        this._usedBenchKeys.push(key);
                    }
                }

                // Reset all enemies (before save so save has clean state)
                this._resetEnemies();
                // Reset non-persistent collectibles (health orbs respawn, items stay)
                this._resetCollectibles();

                // Save game
                this._saveGame();

                // Floating "RESTORED" text
                this._showRestoredText();

                // Re-enable controls
                this.isResting = false;
            },
        });
    }

    /** Show a brief floating "◆ RESTORED ◆" text above the player. */
    _showRestoredText() {
        const txt = this.add.text(
            this.player.x,
            this.player.y - 40,
            '\u25C6 RESTORED \u25C6',
            {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: txt,
            y: txt.y - 24,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => txt.destroy(),
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
    /*  Combat: Player hits enemy                                            */
    /* ================================================================== */

    _onPlayerHitEnemy(enemySprite) {
        const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
        if (!enemy || enemy.dead || enemy.invulnTimer > 0) return;

        let dmg, kbx, kby, shake, hitStop;
        const sword = this.player.abilities.sword;
        switch (this.player.state) {
            case 'attack1_active':
                dmg = sword ? 28 : 13;
                kbx = 130;
                kby = -45;
                shake = 3;
                hitStop = 67;
                break;
            case 'attack2_active':
                dmg = 22;
                kbx = 200;
                kby = -70;
                shake = 5;
                hitStop = 100;
                break;
            case 'air_attack_active':
                dmg = sword ? 22 : 18;
                kbx = 90;
                kby = -90;
                shake = 3;
                hitStop = 67;
                break;
            default:
                return;
        }

        const dir = this.player.facingRight ? 1 : -1;
        enemy.takeDamage(dmg, kbx * dir, kby);
        this.player.onHitEnemy();
        this.hud.showCombo(this.player.comboCount);

        // Audio — combo resonance chime
        if (this.player.comboCount >= 2) {
            this.sound.play('sfx_combo_hit', { volume: 0.5 });
        }

        // Screen shake (reduced vs boss) + particles
        this.cameras.main.shake(hitStop * 0.6 / 1000, shake / 100);
        this._spawnHitParticles(enemy.x, enemy.y - 10);
        this._showDamageNumber(enemy.x, enemy.y - 20, dmg);

        // Kill bonus Feelings + tracking
        if (enemy.dead && enemy.feelingsDrop > 0) {
            this.player.feelings = Math.min(this.player.feelingsMax, this.player.feelings + enemy.feelingsDrop);
        }
        if (enemy.dead && enemy.spawnId) {
            if (!this.enemiesKilled.includes(enemy.spawnId)) {
                this.enemiesKilled.push(enemy.spawnId);
            }
        }
    }

    _onEnemyTouchPlayer(enemySprite) {
        const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
        if (!enemy || enemy.dead) return;
        this.player.takeDamage(enemy.contactDamage, 60, -30);
    }

    _spawnHitParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            const p = this.add.circle(x, y, 3, 0xffffff).setDepth(50).setAlpha(1);
            this.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-20, 20),
                y: p.y + Phaser.Math.Between(-20, 20),
                alpha: 0,
                scale: 0.2,
                duration: 250,
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

        // Rebuild enemies from current room data
        const roomDef = this._roomDef(this.currentRoomId);
        if (roomDef) {
            this._buildEnemies(roomDef);
        }
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

        // Rebuild collectibles from current room data
        const roomDef = this._roomDef(this.currentRoomId);
        if (roomDef) {
            this._buildCollectibles(roomDef);
        }
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

    /** Persist current game state to localStorage under 'sekai_save'. */
    _saveGame() {
        const data = {
            roomId: this.currentRoomId,
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            feelings: this.player.feelings,
            feelingsMax: this.player.feelingsMax,
            abilities: { ...this.player.abilities },
            benchesUsed: [...this._usedBenchKeys],
            enemiesKilled: [...this.enemiesKilled],
            collectedItems: [...this.collectedPersistentItems],
            abilityItemsCollected: [...this.abilityItemsCollected],
            visitedRooms: [...(this.visitedRooms || [this.currentRoomId])],
            bossDefeated: this._bossDefeated || false,
        };
        try {
            localStorage.setItem('sekai_save', JSON.stringify(data));
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
        if (data.visitedRooms) {
            this.visitedRooms = data.visitedRooms;
        }
        if (data.bossDefeated) {
            this._bossDefeated = true;
        }
        if (data.benchesUsed) {
            this._usedBenchKeys = data.benchesUsed;
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

        // Fade in
        this.cameras.main.fadeIn(400, 0, 0, 0);

        this._transitioning = false;
    }

    /* ================================================================== */
    /*  UPDATE                                                               */
    /* ================================================================== */

    update(time, delta) {
        this.pauseMenu.update();

        // Update the map overlay even when paused (so player marker moves)
        if (this.mapView) {
            this.mapView.update(this.currentRoomId, this.player.x, this.player.y, this.visitedRooms);
        }

        if (this.pauseMenu.isPaused || this.scene.isPaused()) return;

        // ---- Exit detection ----
        this._checkExits();

        // ---- NPC dialogue (freezes gameplay while talking) ----
        if (this.isTalking && this.talkingNPC) {
            const talkingNPC = this.talkingNPC;
            if (Phaser.Input.Keyboard.JustDown(this.keys.attack) || Phaser.Input.Keyboard.JustDown(this.keys.attack2)) {
                const closed = talkingNPC.advanceDialogue();
                if (closed) {
                    this.isTalking = false;
                    this.talkingNPC = null;
                }
            }
            if (this.isTalking && this.talkingNPC === talkingNPC) {
                this.talkingNPC.update(delta);
            }
            this.hud.drawPips(this.player.hp, this.player.maxHp);
            this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
            return;
        }

        // ---- Bench interaction check ----
        if (!this.isResting && !this.player.dead) {
            const nearbyBench = this._getNearbyBench();
            if (nearbyBench) {
                nearbyBench.showPrompt(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.attack) || Phaser.Input.Keyboard.JustDown(this.keys.attack2)) {
                    this._restAtBench(nearbyBench);
                }
            } else {
                // Hide all bench prompts
                this.benches.forEach(b => b.showPrompt(false));
            }
        }

        // ---- NPC proximity & interaction ----
        if (!this.isResting && !this.player.dead) {
            const nearbyNPC = this._getNearbyNPC();
            if (nearbyNPC) {
                // Prioritise NPC prompt over bench prompt
                const nearbyBench = this._getNearbyBench();
                if (nearbyBench) nearbyBench.showPrompt(false);

                nearbyNPC.showPrompt(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
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

        this.hud.drawPips(this.player.hp, this.player.maxHp);
        this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
        this.hud.drawAbilities(this.player.abilities);
    }
}
