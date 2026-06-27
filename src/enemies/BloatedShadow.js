class BloatedShadow extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_golem',
            hp: 18,
            contactDamage: 1,
            feelingsDrop: 8,
            bodyWidth: 40,
            bodyHeight: 44,
            leashDistance: 250,
            returnSpeed: 40,
        });

        this.sprite.setScale(1.2);
        this.sprite.setOrigin(0.5, 0.5);

        this.originX = x;
        this.originY = y;
        this.state = 'idle';

        this._telegraphTimer = 0;
        this._vulnTimer = 0;
        this._spawnTimer = 0;
        this._childCount = 0;

        this._gfxToCleanup = [];
        this.sprite.on('destroy', () => this._cleanupGfx());
    }

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const dtSec = dt / 1000;

        this._spawnTimer += dtSec;

        // Periodic child spawn (every 6s, max 3 alive)
        if (this._spawnTimer > 6 && this._childCount < 3) {
            this._spawnTimer = 0;
            this._spawnChild();
        }

        switch (this.state) {
            case 'idle': {
                this.body.setVelocity(0, 0);
                const pulse = Math.sin(this.scene.time.now / 200) * 0.05 + 1;
                this.sprite.setScale(1.2 * pulse);

                // Player within 150px → telegraph
                if (absDist < 150) {
                    this.state = 'telegraph';
                    this._telegraphTimer = 0.8;
                    this.sprite.setTint(0xff4444);
                }
                break;
            }

            case 'telegraph': {
                this.body.setVelocity(0, 0);
                this._telegraphTimer -= dtSec;

                // Rapid pulse warning
                const pulse = Math.sin(this.scene.time.now / 80) * 0.1 + 1.15;
                this.sprite.setScale(1.2 * pulse);

                if (this._telegraphTimer <= 0) {
                    this._executeSlam();
                }
                break;
            }

            case 'slam': {
                // Shockwave has landed; brief pause then vulnerable
                this.body.setVelocity(0, 0);
                const pulse = Math.sin(this.scene.time.now / 100) * 0.05 + 1;
                this.sprite.setScale(1.2 * pulse);
                break;
            }

            case 'vulnerable': {
                this.body.setVelocity(0, 0);
                this._vulnTimer -= dtSec;
                this.sprite.setAlpha(Math.sin(this.scene.time.now / 100) * 0.2 + 0.6);
                this.sprite.clearTint();

                if (this._vulnTimer <= 0) {
                    this.state = 'idle';
                    this.sprite.setAlpha(1);
                }
                break;
            }
        }

        this.sprite.setFlipX(dist < 0);
    }

    _executeSlam() {
        this.state = 'slam';
        this.sprite.clearTint();
        this.sprite.setScale(1.2 * 1.15);

        // Camera shake
        this.scene.cameras.main.shake(200, 0.02);

        // Ground shockwave circle
        const wave = this.scene.add.circle(this.x, this.y + 22, 6, 0x88ccff, 0.5).setDepth(15);
        this._gfxToCleanup.push(wave);
        this.scene.tweens.add({
            targets: wave,
            scaleX: 6,
            scaleY: 6,
            alpha: 0,
            duration: 400,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (wave && wave.active) wave.destroy();
                const idx = this._gfxToCleanup.indexOf(wave);
                if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
            },
        });

        // Dust particles
        for (let i = 0; i < 8; i++) {
            const dust = this.scene.add.circle(
                this.x + Phaser.Math.Between(-20, 20),
                this.y + 24,
                Phaser.Math.Between(2, 4), 0x88aacc, 0.6,
            ).setDepth(15);
            this._gfxToCleanup.push(dust);
            this.scene.tweens.add({
                targets: dust,
                x: dust.x + Phaser.Math.Between(-30, 30),
                y: dust.y + Phaser.Math.Between(10, 30),
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    if (dust && dust.active) dust.destroy();
                    const idx = this._gfxToCleanup.indexOf(dust);
                    if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
                },
            });
        }

        // Check if player is on ground near shockwave
        if (this.scene.player && !this.scene.player.dead) {
            const dx = this.scene.player.x - this.x;
            if (Math.abs(dx) < 80 && this.scene.player.body.blocked.down) {
                this.scene.player.takeDamage(2, Math.sign(dx) * 60, -20);
            }
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.6, detune: -200 });

        // Brief visual pause → vulnerable
        this.scene.time.delayedCall(200, () => {
            if (this.dead) return;
            this.state = 'vulnerable';
            this._vulnTimer = 1.5;
            this.sprite.setAlpha(0.6);
        });
    }

    _spawnChild() {
        if (this.dead) return;

        const child = new ShadowFragment(this.scene, this.x + Phaser.Math.Between(-30, 30), this.y - 20, true);
        child.leashDistance = 150;
        child.returnSpeed = 40;
        this.scene.enemyGroup.add(child.sprite);
        this.scene.enemyInstances.push(child);
        this._childCount++;

        // Track child death
        const origDie = child.die.bind(child);
        child.die = () => {
            this._childCount = Math.max(0, this._childCount - 1);
            origDie();
        };
    }

    _cleanupGfx() {
        this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); });
        this._gfxToCleanup = [];
    }

    _onStartReturn() {
        this.sprite.clearTint();
        this.sprite.setScale(1.2);
        this.sprite.setAlpha(1);
        this.state = 'idle';
        this._telegraphTimer = 0;
        this._vulnTimer = 0;
        this._cleanupGfx();
    }

    _onReachedHome() {
        this.state = 'idle';
        this._telegraphTimer = 0;
        this._vulnTimer = 0;
        this._spawnTimer = 0;
        this.sprite.setScale(1.2);
        this.sprite.setAlpha(1);
        this.sprite.clearTint();
    }

    die() {
        this._cleanupGfx();
        super.die();
    }
}
