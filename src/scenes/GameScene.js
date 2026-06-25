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
        this.loadSaveData = (data && data.loadSave) || null;
    }

    create() {
        this.WORLD_W = 4400; // Expanded from 2400
        this.WORLD_H = 600;

        this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);

        this._createBackground();
        this._createPlatforms();
        this._createPlayer();
        this._createBossTrigger();
        this._createEnemies();
        this._createBenches();
        this._createInput();
        this._createCamera();

        this.hud = new HUD(this);
        this.bossActive = false;
        this.isResting = false;
        this.enemiesKilled = [];

        // Pause menu (ESC to toggle)
        this.pauseMenu = new PauseMenu(this);

        // Map overlay (M to toggle)
        this.mapView = new MapView(this);

        // Audio — start exploration BGM
        this.bgm = this.sound.add('bgm_explore', { loop: true, volume: 0 });
        this.bgm.play();
        this.tweens.add({
            targets: this.bgm,
            volume: 0.30,
            duration: 1000,
        });

        // Fade in from menu transition
        this.cameras.main.fadeIn(500);

        // Listen for overlay (BossScene) results
        this._setupOverlayListener();

        // Apply save data if loading from CONTINUE
        if (this.loadSaveData) {
            this._applySaveData(this.loadSaveData);
        }
    }

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
            SceneManager.goTo(this, 'MenuScene');
            return;
        }

        if (result.victory) {
            this.player.heal(30);
            this.player.feelings = Math.min(100, this.player.feelings + 20);
        }
        if (result.playerDied) {
            this.player.feelings = 0;
            this.player.reset(120, 530.8, 50);
        }
        this.bossActive = false;
    }

    _createBackground() {
        this.bgTiles = this.add.tileSprite(0, 0, this.WORLD_W, this.WORLD_H, 'bg_tile')
            .setOrigin(0, 0).setDepth(-10);
    }

    _createPlatforms() {
        this.platforms = this.physics.add.staticGroup();

        const groundY = 568;
        this._createPlatformRun(0, groundY + 18, Math.ceil(this.WORLD_W / 64));

        const platPositions = [
            // ── Section 1: Intro (0–600) ──────────────────────────────
            // Safe teaching platform — no enemies nearby
            { x: 320, y: 459, w: 3 },

            // ── Section 2: Ascent (600–1100) ──────────────────────────
            // Staircase of rising platforms; first branching point
            { x: 576, y: 429, w: 2 },   // step up
            { x: 704, y: 359, w: 2 },   // step up
            { x: 832, y: 299, w: 2 },   // upper route access — jump right to branch

            // ── Section 3: Upper Branch — Secret Alcove (1024–1600) ──
            // ★ BRANCH PATH: reach from the high platform at x=832, jump right
            { x: 1024, y: 239, w: 3 },  // upper branch bridge
            { x: 1216, y: 189, w: 4 },  // secret corridor
            { x: 1472, y: 159, w: 4 },  // SECRET ALCOVE — reward space
            // TODO: collectible (e.g. HP upgrade / Feelings shard / ability item)

            // ── Section 3: Main Path Lower (1100–1800) ────────────────
            // Ground-level route for players who skip the upper branch
            { x: 1152, y: 459, w: 3 },  // lower path platform
            { x: 1408, y: 369, w: 3 },  // lower path platform
            { x: 1664, y: 429, w: 3 },  // lower path platform

            // ── Section 4: Mid Corridor (1800–2800) ───────────────────
            // Denser platforming, more enemies
            { x: 1920, y: 459, w: 3 },  // low platform
            { x: 2112, y: 349, w: 3 },  // mid platform
            { x: 2368, y: 399, w: 4 },  // mid-wide platform
            { x: 2624, y: 319, w: 3 },  // high platform

            // ── Section 5: Pre-Boss Gauntlet (2800–3800) ──────────────
            // Highest enemy density, requires both combat and platforming
            { x: 2880, y: 429, w: 3 },  // pre-boss low
            { x: 3072, y: 359, w: 3 },  // pre-boss mid
            { x: 3328, y: 409, w: 3 },  // pre-boss mid
            { x: 3584, y: 319, w: 3 },  // pre-boss high

            // ── Section 6: Boss Rest Area (3800–4400) ─────────────────
            { x: 3840, y: 429, w: 3 },  // rest platform before boss room
        ];

        platPositions.forEach(p => this._createPlatformRun(p.x, p.y, p.w));

        this.platforms.refresh();
    }

    _createPlatformRun(x, centerY, tileCount) {
        const tileW = 64;
        const tileH = 36;
        const width = tileCount * tileW;

        for (let i = 0; i < tileCount; i++) {
            this.add.image(x + i * tileW + tileW / 2, centerY, 'ground');
        }

        const collider = this.add.zone(x + width / 2, centerY, width, tileH);
        this.physics.add.existing(collider, true);
        this.platforms.add(collider);
    }

    _createPlayer() {
        this.player = new Player(this, 120, 530.8);
        this.physics.add.collider(
            this.player.sprite,
            this.platforms,
            null,
            this._shouldPlayerCollideWithPlatform,
            this,
        );
    }

    _shouldPlayerCollideWithPlatform(playerSprite, platform) {
        const body = playerSprite.body;
        const platformBody = platform.body;
        const previousBottom = body.bottom - body.deltaY();
        return body.velocity.y >= 0 && previousBottom <= platformBody.top + 8;
    }

    _createEnemies() {
        // Store spawn definitions for reset / save tracking
        this.enemySpawns = [
            // ── Shadow Fragments ──
            { id: 'sf_0',  type: 'shadow',  x: 450,  y: 530 },
            { id: 'sf_1',  type: 'shadow',  x: 1000, y: 530 },
            { id: 'sf_2',  type: 'shadow',  x: 1250, y: 530 },
            { id: 'sf_3',  type: 'shadow',  x: 1500, y: 530 },
            { id: 'sf_4',  type: 'shadow',  x: 2000, y: 530 },
            { id: 'sf_5',  type: 'shadow',  x: 2550, y: 530 },
            { id: 'sf_6',  type: 'shadow',  x: 3050, y: 530 },
            { id: 'sf_7',  type: 'shadow',  x: 3550, y: 530 },
            { id: 'sf_8',  type: 'shadow',  x: 3900, y: 530 },
            // ── Floating Shards ──
            { id: 'fl_0',  type: 'floating', x: 700,  y: 220, noGravity: true },
            { id: 'fl_1',  type: 'floating', x: 1100, y: 130, noGravity: true },
            { id: 'fl_2',  type: 'floating', x: 2200, y: 250, noGravity: true },
            { id: 'fl_3',  type: 'floating', x: 3300, y: 200, noGravity: true },
            { id: 'fl_4',  type: 'floating', x: 3700, y: 260, noGravity: true },
        ];

        // Which spawn IDs are already killed (from save data)?
        const killed = (this.loadSaveData && this.loadSaveData.enemiesKilled) || [];

        this.enemyInstances = [];
        this.enemyGroup = this.physics.add.group();

        this._spawnFromSpawns(killed);

        // Collisions (set up once — group reference stays valid)
        this.physics.add.collider(this.enemyGroup, this.platforms);

        // Player slash → enemy hits
        this.physics.add.overlap(
            this.player.slashHitbox,
            this.enemyGroup,
            (_, enemySprite) => this._onPlayerHitEnemy(enemySprite),
        );

        // Enemy → player contact damage
        this.physics.add.overlap(
            this.player.sprite,
            this.enemyGroup,
            (_, enemySprite) => this._onEnemyTouchPlayer(enemySprite),
        );
    }

    /**
     * Spawn enemy instances from this.enemySpawns, skipping any IDs
     * present in the `skipIds` array (e.g. already-killed enemies).
     * @param {string[]} skipIds - Array of spawn IDs to skip.
     */
    _spawnFromSpawns(skipIds) {
        this.enemySpawns.forEach(spawn => {
            if (skipIds.includes(spawn.id)) return;

            let enemy;
            if (spawn.type === 'shadow') {
                enemy = new ShadowFragment(this, spawn.x, spawn.y);
            } else if (spawn.type === 'floating') {
                enemy = new FloatingShard(this, spawn.x, spawn.y);
            }
            if (enemy) {
                enemy.spawnId = spawn.id;
                this.enemyGroup.add(enemy.sprite);
                this.enemyInstances.push(enemy);
            }
        });
    }

    _onPlayerHitEnemy(enemySprite) {
        const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
        if (!enemy || enemy.dead || enemy.invulnTimer > 0) return;

        let dmg, kbx, kby, shake, hitStop;
        switch (this.player.state) {
            case 'attack1_active':
                dmg = 13; kbx = 130; kby = -45; shake = 3; hitStop = 67;
                break;
            case 'attack2_active':
                dmg = 22; kbx = 200; kby = -70; shake = 5; hitStop = 100;
                break;
            case 'air_attack_active':
                dmg = 18; kbx = 90; kby = -90; shake = 3; hitStop = 67;
                break;
            default:
                return;
        }

        const dir = this.player.facingRight ? 1 : -1;
        enemy.takeDamage(dmg, kbx * dir, kby);
        this.player.onHitEnemy();

        // Audio — combo resonance chime
        if (this.player.comboCount >= 2) {
            this.sound.play('sfx_combo_hit', { volume: 0.5 });
        }

        // Screen shake (reduced vs boss) + particles
        this.cameras.main.shake(hitStop * 0.6 / 1000, shake / 100);
        this._spawnHitParticles(enemy.x, enemy.y - 10);

        // Kill bonus Feelings + tracking
        if (enemy.dead && enemy.feelingsDrop > 0) {
            this.player.feelings = Math.min(100, this.player.feelings + enemy.feelingsDrop);
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
                alpha: 0, scale: 0.2, duration: 250, ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    _createBossTrigger() {
        // Boss area at the far right of the expanded world
        this.bossTrigger = this.physics.add.staticImage(4000, 500, 'bg_tile')
            .setVisible(false).setAlpha(0);
        this.bossTrigger.body.setSize(60, 500);
        this.physics.add.overlap(this.player.sprite, this.bossTrigger, () => {
            if (!this.bossActive) {
                this.bossActive = true;
                this._startBossBattle();
            }
        });
    }

    _startBossBattle() {
        // Audio — pause exploration BGM during boss fight
        if (this.bgm) this.bgm.pause();

        SceneManager.launchOverlay(this, 'BossScene', {
            playerData: {
                hp: this.player.hp,
                feelings: this.player.feelings,
                abilities: { ...this.player.abilities },
            },
        });
    }

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
            if (this.player && !this.bossActive) {
                // Don't attack while near a bench — J is "rest" there
                if (this._getNearbyBench()) return;
                this.player.attackPressed();
            }
        };
        this._attackHandlerZ = () => {
            if (this.pauseMenu && this.pauseMenu.isPaused) return;
            if (this.isResting) return;
            if (this.player && !this.bossActive) {
                if (this._getNearbyBench()) return;
                this.player.attackPressed();
            }
        };

        this.input.keyboard.on('keydown-J', this._attackHandlerJ);
        this.input.keyboard.on('keydown-Z', this._attackHandlerZ);
        this.events.once('shutdown', () => {
            this.input.keyboard.off('keydown-J', this._attackHandlerJ);
            this.input.keyboard.off('keydown-Z', this._attackHandlerZ);
        });
    }

    _createCamera() {
        this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(100, 50);
        this.cameras.main.setBackgroundColor('#0a0a1a');
    }

    update(time, delta) {
        this.pauseMenu.update();

        // Update the map overlay even when paused (so player marker moves)
        if (this.mapView) {
            this.mapView.update(this.player.x, this.player.y);
        }

        if (this.pauseMenu.isPaused || this.scene.isPaused()) return;

        // ---- Bench interaction check ----
        if (!this.isResting && !this.player.dead) {
            const nearbyBench = this._getNearbyBench();
            if (nearbyBench) {
                nearbyBench.showPrompt(true);
                if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
                    this._restAtBench(nearbyBench);
                }
            } else {
                // Hide all bench prompts
                this.benches.forEach(b => b.showPrompt(false));
            }
        }

        this.player.update(delta);

        // Update enemies (filter out dead ones)
        this.enemyInstances = this.enemyInstances.filter(e => !e.dead);
        this.enemyInstances.forEach(e => {
            if (!e.dead) e.update(delta, this.player.x, this.player.y);
        });

        this.hud.drawPips(this.player.hp);
        this.hud.drawFeelings(this.player.feelings);
        this._updateBackground();
    }

    /* ================================================================== */
    /*  Bench system                                                        */
    /* ================================================================== */

    /** Ground surface Y (top of ground collider). */
    get _groundSurfaceY() { return 550; }

    /** Create bench instances at fixed positions across the world. */
    _createBenches() {
        this.benches = [
            new Bench(this, 600,  this._groundSurfaceY),
            new Bench(this, 1800, this._groundSurfaceY),
            new Bench(this, 3000, this._groundSurfaceY),
            new Bench(this, 3850, this._groundSurfaceY),
        ];
    }

    /**
     * Return the nearest bench whose interaction zone contains the player,
     * or null if none are nearby.
     * @returns {Bench|null}
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
     * show text → save → reset enemies.
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
                this.player.feelings = 100;
                this.player.sprite.setAlpha(1);
                this.player.body.setAllowGravity(true);

                // Audio feedback
                this.sound.play('sfx_ui_confirm', { volume: 0.4 });

                // Reset all enemies (before save so save has clean state)
                this._resetEnemies();

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
                fontSize: '12px',
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
    /*  Save / Load                                                         */
    /* ================================================================== */

    /** Persist current game state to localStorage under 'sekai_save'. */
    _saveGame() {
        const data = {
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            feelings: this.player.feelings,
            scene: 'GameScene',
            playerX: this.player.x,
            playerY: this.player.y,
            abilities: { ...this.player.abilities },
            benchesUsed: this.benches
                .filter(b => b.usedCount > 0)
                .map(b => b.x),
            enemiesKilled: [...this.enemiesKilled],
        };
        try {
            localStorage.setItem('sekai_save', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save game:', e);
        }
    }

    /**
     * Apply save data after all systems are initialised.
     * Called from create() when this.loadSaveData is present.
     * @param {object} data - Parsed save object.
     */
    _applySaveData(data) {
        if (!data) return;

        // Restore player stats
        this.player.loadState(data);

        // Reposition player
        if (data.playerX !== undefined && data.playerY !== undefined) {
            this.player.sprite.body.reset(data.playerX, data.playerY);
            this.player.sprite.setPosition(data.playerX, data.playerY);
            this.player.body.setVelocity(0, 0);
        }

        // Mark used benches
        const usedCoords = data.benchesUsed || [];
        this.benches.forEach(b => {
            if (usedCoords.includes(b.x)) {
                b.usedCount++;
            }
        });
    }

    /* ================================================================== */
    /*  Enemy reset                                                         */
    /* ================================================================== */

    /** Destroy all current enemies and respawn them from spawn definitions. */
    _resetEnemies() {
        // Destroy alive enemy sprites
        this.enemyInstances.forEach(e => {
            if (e.sprite && e.sprite.active) {
                this.tweens.killTweensOf(e.sprite);
                e.sprite.destroy();
            }
        });
        this.enemyInstances = [];
        this.enemyGroup.clear(true, true);

        // Clear killed list so ALL enemies respawn
        this.enemiesKilled = [];

        // Recreate from spawn definitions
        this._spawnFromSpawns([]);
    }

    _updateBackground() {
        if (this.cameras.main.scrollX !== undefined) {
            this.bgTiles.tilePositionX = this.cameras.main.scrollX * 0.3;
        }
    }


}
