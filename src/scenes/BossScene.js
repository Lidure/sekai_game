class BossScene extends Phaser.Scene {
    constructor() {
        super('BossScene');
    }

    init(data) {
        this.playerData = data.playerData || { hp: 5, maxHp: 5, feelings: 0, feelingsMax: 100 };
    }

    create() {
        this.cameras.main.setBackgroundColor('#0a0a1a');

        this.arenaW = 1600;
        this.arenaH = 600;
        this.physics.world.setBounds(0, 0, this.arenaW, this.arenaH);

        this._createArena();
        this._createPlayer();
        this._createBoss();
        this._createCollisions();
        this._createUI();
        this._createInput();

        this.cameras.main.setBounds(0, 0, this.arenaW, this.arenaH);
        this.cameras.main.setZoom(0.98);
        this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(140, 76);
        this._cameraLookOffsetY = 0;
        this._cameraLookTargetOffsetY = 0;
        this._baseCameraOffsetY = 0;

        this.bossDefeated = false;
        this.playerDied = false;

        // Pause menu (ESC to toggle)
        this.pauseMenu = new PauseMenu(this);

        // Audio — start boss Phase 1 BGM
        this.bgmPhase1 = AudioSettings.createBgm(this, 'bgm_boss_p1', 0.40);
        this.bgmPhase1.play();
        this.tweens.add({
            targets: this.bgmPhase1,
            volume: AudioSettings.scale('bgm', 0.40),
            duration: 1000,
        });
        this.bgmPhase2 = null; // Created on phase transition

        // Fade in on entry
        this.cameras.main.fadeIn(500);

        this.events.once('shutdown', () => {
            this._stopBossBgm();
        });
    }

    _createArena() {
        const platforms = this.physics.add.staticGroup();
        this._createArenaPlatformRun(platforms, 0, 586, Math.ceil(this.arenaW / 64));
        this._createArenaPlatformRun(platforms, 400, 429, 3);
        this._createArenaPlatformRun(platforms, 1100, 369, 3);
        platforms.refresh();
        this.arenaPlatforms = platforms;

        const bg = this.add.tileSprite(0, 0, this.arenaW, this.arenaH, 'bg_tile')
            .setOrigin(0, 0).setDepth(-10);
        this.arenaBg = bg;

        const wall = this.add.graphics().setDepth(5);
        wall.fillStyle(0x1a1a2e, 0.8);
        wall.fillRect(0, 0, this.arenaW, 4);
        wall.fillRect(0, 596, this.arenaW, 4);
        wall.fillRect(0, 0, 4, this.arenaH);
        wall.fillRect(this.arenaW - 4, 0, 4, this.arenaH);
    }

    _createArenaPlatformRun(platforms, x, centerY, tileCount) {
        const tileW = 64;
        const tileH = 36;
        const width = tileCount * tileW;

        for (let i = 0; i < tileCount; i++) {
            this.add.image(x + i * tileW + tileW / 2, centerY, 'ground');
        }

        const collider = this.add.zone(x + width / 2, centerY, width, tileH);
        this.physics.add.existing(collider, true);
        platforms.add(collider);
    }

    _createPlayer() {
        this.player = new Player(this, 200, 480);
        this.player.maxHp = Phaser.Math.Clamp(this.playerData.maxHp ?? 5, 1, 9);
        this.player.hp = Phaser.Math.Clamp(this.playerData.hp ?? this.player.maxHp, 1, this.player.maxHp);
        this.player.feelings = this.playerData.feelings || 0;
        this.player.feelingsMax = this.playerData.feelingsMax || 100;
        if (this.playerData.abilities) {
            Object.assign(this.player.abilities, this.playerData.abilities);
        }
    }

    _createBoss() {
        this.boss = new BossMafuyu(this, 800, 480);
    }

    _createCollisions() {
        this.physics.add.collider(
            this.player.sprite,
            this.arenaPlatforms,
        );
        this.physics.add.collider(this.boss.sprite, this.arenaPlatforms);

        this.physics.add.overlap(
            this.player.slashHitbox,
            this.boss.sprite,
            (_, __) => this._onPlayerHitBoss(),
        );

        this.physics.add.overlap(
            this.player.sprite,
            this.boss.sprite,
            () => this._onBossTouchPlayer(),
        );
    }

    _createUI() {
        this.hud = this.scene.get('HUDScene');
    }

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
            this.player.attackPressed();
        };
        this.input.keyboard.on('keydown-J', this._attackHandlerJ);
        this.events.once('shutdown', () => {
            this.input.keyboard.off('keydown-J', this._attackHandlerJ);
        });
    }

    _updateCameraLook(delta) {
        const cam = this.cameras.main;
        if (!cam || !this.keys) return;

        const canLook = !this.pauseMenu?.isPaused && this.player && !this.player.dead;
        if (!canLook) {
            this._cameraLookTargetOffsetY = 0;
        } else {
            const lookingUp = this.keys.up && this.keys.up.isDown;
            const lookingDown = this.keys.down && this.keys.down.isDown;
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
        cam.setFollowOffset(0, this._baseCameraOffsetY + this._cameraLookOffsetY);
    }

    _onPlayerHitBoss() {
        if (!this.boss || this.boss.defeated || !this.boss.vulnerable || this.boss.invulnTimer > 0) return;

        let dmg, kbx, kby, shake, hitStop;
        const sword = this.player.abilities.sword;
        switch (this.player.state) {
            case 'attack1_active':
                dmg = sword ? 28 : 13; kbx = 130; kby = -45; shake = 3; hitStop = 67;
                break;
            case 'attack2_active':
                dmg = 22; kbx = 200; kby = -70; shake = 5; hitStop = 100;
                break;
            case 'air_attack_active':
                dmg = sword ? 22 : 18; kbx = 90; kby = -90; shake = 3; hitStop = 67;
                break;
            default:
                return;
        }

        this.boss.takeDamage(dmg, kbx, kby);
        this.player.onHitEnemy();

        // Audio — combo resonance chime
        if (this.player.comboCount >= 2) {
            this.sound.play('sfx_combo_hit', { volume: 0.5 });
        }

        this.cameras.main.shake(hitStop, shake / 100);
        this.hud.showCombo(this.player.comboCount);
        this._spawnHitParticles(this.boss.x, this.boss.y - 20);
        this._showDamageNumber(this.boss.x, this.boss.y - 20, dmg);
    }

    _stopBossBgm() {
        if (this.bgmPhase1) {
            this.bgmPhase1.stop();
            this.bgmPhase1.destroy();
            this.bgmPhase1 = null;
        }
        if (this.bgmPhase2) {
            this.bgmPhase2.stop();
            this.bgmPhase2.destroy();
            this.bgmPhase2 = null;
        }
    }

    _spawnHitParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            const p = this.add.circle(x, y, 3, 0xffffff)
                .setDepth(50).setAlpha(1);
            this.tweens.add({
                targets: p,
                x: x + Phaser.Math.Between(-30, 30),
                y: y + Phaser.Math.Between(-30, 30),
                alpha: 0,
                scale: 0.2,
                duration: 300,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    _onBossTouchPlayer() {
        if (!this.boss || this.boss.defeated || this.boss.transitioning) return;
        if (this.boss.state === 'melee_active' || this.boss.state === 'dash_active' || this.boss.state === 'liberation_active') {
            let dmg = 1;
            if (this.boss.state === 'dash_active') dmg = 1;
            if (this.boss.state === 'liberation_active') dmg = 2;
            this.player.takeDamage(dmg, 80, -40);
            return;
        }
        this.player.takeDamage(1, 60, -30);
    }

    update(time, delta) {
        // Pause menu always runs (ESC to toggle)
        this.pauseMenu.update();
        if (this.pauseMenu.isPaused) return;

        this._updateCameraLook(delta);
        if (this.bossDefeated || this.playerDied) return;

        this.player.update(delta);
        this.boss.update(delta);
        this._updateHUD();
        this._checkEndConditions();
        this._updateArenaBg();
    }

    _updateHUD() {
        this.hud.drawPips(this.player.hp, this.player.maxHp);
        this.hud.drawFeelings(this.player.feelings, this.player.feelingsMax);
        this.hud.drawAbilities(this.player.abilities);
        this.hud.showBossBar('Mafuyu', this.boss.hp, this.boss.maxHp);
    }

    _checkEndConditions() {
        if (this.player.hp <= 0 && !this.playerDied) {
            this.playerDied = true;
            this._handlePlayerDeath();
        }
    }

    _handlePlayerDeath() {
        // Mark player dead without calling player.die() (which would restart the scene).
        // Instead, we handle death visuals ourselves and report back via SceneManager.
        this.player.dead = true;
        this.player.state = 'dead';
        this.player.sprite.setVelocity(0, 0);
        this.player.sprite.body.setAllowGravity(false);
        // Audio — stop boss BGM on player death
        if (this.bgmPhase1) { this.bgmPhase1.stop(); this.bgmPhase1.destroy(); this.bgmPhase1 = null; }
        if (this.bgmPhase2) { this.bgmPhase2.stop(); this.bgmPhase2.destroy(); this.bgmPhase2 = null; }

        // Death fade animation
        this.tweens.add({
            targets: this.player.sprite,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
        });

        // After the death animation, return to GameScene
        this.time.delayedCall(2000, () => {
            SceneManager.finishOverlay(this, { playerDied: true });
        });
    }

    _updateArenaBg() {
        if (this.boss && this.boss.phase === 2) {
            const progress = Math.max(0, 1 - this.boss.hp / (this.boss.maxHp / 2));
            const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
                { r: 10, g: 10, b: 26 },
                { r: 20, g: 5, b: 40 },
                100, Math.round(progress * 100)
            );
            this.cameras.main.setBackgroundColor(
                Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b)
            );
        }
    }

    /* ================================================================== */
    /*  Damage Numbers                                                      */
    /* ================================================================== */

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

    onBossDefeated() {
        this.bossDefeated = true;
        this.hud.hideBossBar();
        // Audio — stop boss BGM (victory chime is played by BossMafuyu._die)
        if (this.bgmPhase1) { this.bgmPhase1.stop(); this.bgmPhase1.destroy(); this.bgmPhase1 = null; }
        if (this.bgmPhase2) { this.bgmPhase2.stop(); this.bgmPhase2.destroy(); this.bgmPhase2 = null; }

        const victoryText = this.add.text(this.arenaW / 2, 200, 'MEMORY FRAGMENT\nACQUIRED', {
            fontSize: '34px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
            align: 'center',
        }).setOrigin(0.5).setDepth(200).setAlpha(0);

        this.tweens.add({
            targets: victoryText,
            alpha: 1,
            y: 180,
            duration: 1500,
            ease: 'Power2',
        });

        this.time.delayedCall(3000, () => {
            this.cameras.main.fadeOut(1500, 255, 255, 255);
            this.time.delayedCall(1600, () => {
                SceneManager.finishOverlay(this, { victory: true });
            });
        });
    }
}
