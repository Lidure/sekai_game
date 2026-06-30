/**
 * BloatedShadow — Heavy golem with SLAM + SWEEP attacks.
 *
 * HK-style state machine:
 *   IDLE → stationary, golem_idle anim
 *        → player within 180px → CHASE
 *   CHASE → walk toward player at 60px/s, golem_run anim
 *        → player < 80px → TELEGRAPH
 *        → player > 350px → IDLE
 *   TELEGRAPH → 0.6s wind-up (golem_attack anim), stationary
 *            → player fled > 180px → cancel back to CHASE
 *            → SLAM
 *   SLAM   → camera shake, dust particles, AOE check (48px, 1 damage)
 *          → 80% → SWEEP_TELEGRAPH  /  20% → VULNERABLE
 *   SWEEP_TELEGRAPH → 0.3s (arm pullback visual, scaleX squish)
 *          → SWEEP_ACTIVE
 *   SWEEP_ACTIVE → horizontal swipe 80×20px in front, 2 damage, knockback 150px
 *          → SWEEP_RECOVERY
 *   SWEEP_RECOVERY → 0.4s pause → VULNERABLE
 *   VULNERABLE → 1.0s (dim alpha, blinking) → IDLE
 *
 * Children: spawn every 4s (from 6s), max 2 (from 3)
 *   ShadowFragment child with leashDistance=150, returnSpeed=40
 *
 * POGO: Supported (via base class _isPogoHit)
 * LEASH: tightened to 150px
 */
class BloatedShadow extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_golem_idle',
            hp: 18,
            contactDamage: 3,
            feelingsDrop: 8,
            bodyWidth: 54,
            bodyHeight: 48,
            leashDistance: 150,
            returnSpeed: 50,
        });

        this.sprite.setScale(1.2);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.play('golem_idle');

        this.originX = x;
        this.originY = y;
        this.state = 'idle';

        this._telegraphTimer = 0;
        this._vulnTimer = 0;
        this._spawnTimer = 0;
        this._childCount = 0;

        // Sweep state
        this._sweepTimer = 0;
        this._sweepHitDealt = false;

        this._gfxToCleanup = [];
        this.sprite.on('destroy', () => this._cleanupGfx());
    }

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const dtSec = dt / 1000;

        this._spawnTimer += dtSec;

        // Periodic child spawn (every 4s, max 2 alive)
        if (this._spawnTimer > 4 && this._childCount < 2) {
            this._spawnTimer = 0;
            this._spawnChild();
        }

        switch (this.state) {
            case 'idle': {
                this.body.setVelocity(0, 0);
                if (!this.sprite.anims.isPlaying || this.sprite.anims.currentAnim.key !== 'golem_idle') {
                    this.sprite.play('golem_idle');
                }

                if (absDist < 180) {
                    this.state = 'chase';
                    this.sprite.play('golem_run');
                }
                break;
            }

            case 'chase': {
                const chaseSpeed = 60;
                this.body.setVelocityX(Math.sign(dist) * chaseSpeed);

                if (!this.sprite.anims.isPlaying || this.sprite.anims.currentAnim.key !== 'golem_run') {
                    this.sprite.play('golem_run');
                }

                // Close enough → start telegraph
                if (absDist < 80) {
                    this.body.setVelocityX(0);
                    this.state = 'telegraph';
                    this._telegraphTimer = 0.6; // tightened from 0.8
                    this.sprite.play('golem_attack');
                    this.sprite.clearTint();
                }

                // Player left detection range
                if (absDist > 350) {
                    this.body.setVelocityX(0);
                    this.state = 'idle';
                    this.sprite.play('golem_idle');
                }
                break;
            }

            case 'telegraph': {
                this.body.setVelocity(0, 0);
                if (absDist > 180) {
                    this.state = 'chase';
                    this.sprite.setScale(1.2);
                    this.sprite.clearTint();
                    this.sprite.play('golem_run');
                    break;
                }
                this._telegraphTimer -= dtSec;
                // Animation drives most of the timing; fallback timer
                if (this._telegraphTimer <= 0) {
                    this._executeSlam();
                }
                break;
            }

            case 'slam': {
                this.body.setVelocity(0, 0);
                break;
            }

            case 'sweep_telegraph': {
                this.body.setVelocity(0, 0);
                this._sweepTimer -= dtSec;
                // Arm pullback visual: scaleX squish
                this.sprite.setScale(1.2 * 0.85, 1.2 * 1.1);
                if (this._sweepTimer <= 0) {
                    this._executeSweep();
                }
                break;
            }

            case 'sweep_active': {
                this.body.setVelocity(0, 0);
                this._sweepTimer -= dtSec;
                this.sprite.setScale(1.2);

                // Check player in sweep zone (once)
                if (!this._sweepHitDealt && this.scene.player && !this.scene.player.dead) {
                    const dx = this.scene.player.x - this.x;
                    const dy = Math.abs(this.scene.player.y - this.y);
                    const frontDir = this.sprite.flipX ? -1 : 1;
                    // Sweep covers 80px × 20px in front
                    if (dx * frontDir > 0 && Math.abs(dx) < 80 && dy < 20) {
                        this._sweepHitDealt = true;
                        this.scene.player.takeDamage(2, frontDir * 150, -20);
                    }
                }

                if (this._sweepTimer <= 0) {
                    this.state = 'sweep_recovery';
                    this._sweepTimer = 0.4;
                }
                break;
            }

            case 'sweep_recovery': {
                this.body.setVelocity(0, 0);
                this._sweepTimer -= dtSec;
                if (this._sweepTimer <= 0) {
                    this.sprite.setAlpha(0.6);
                    this.state = 'vulnerable';
                    this._vulnTimer = 1.0;
                }
                break;
            }

            case 'vulnerable': {
                this.body.setVelocity(0, 0);
                this._vulnTimer -= dtSec;
                this.sprite.setAlpha(Math.sin(this.scene.time.now / 100) * 0.2 + 0.6);
                this.sprite.setTint(0x334466); // vulnerable: dim tint

                if (this._vulnTimer <= 0) {
                    this.state = 'idle';
                    this.sprite.setAlpha(1);
                    this.sprite.clearTint();
                    this.sprite.play('golem_idle');
                }
                break;
            }
        }

        this.sprite.setFlipX(dist < 0);
    }

    takeDamage(amount, knockbackX, knockbackY, hitstunFrames) {
        if (this.invulnTimer > 0 || this.dead) return;

        // Pogo check
        const player = this.scene.player;
        if (player && this._isPogoHit(player)) {
            this._handlePogoHit(amount);
            return;
        }

        super.takeDamage(amount, knockbackX, knockbackY, hitstunFrames);
        if (!this.dead) {
            this.sprite.play('golem_hit');
        }
    }

    _executeSlam() {
        this.state = 'slam';
        this.sprite.clearTint();
        this.sprite.setScale(1.2 * 1.15);

        // Camera shake
        this.scene.cameras.main.shake(200, 0.02);

        // FX sprite at golem's feet
        const fx = this.scene.add.sprite(this.x, this.y + 18, 'enemy_golem_attackFx')
            .setScale(1.2)
            .setDepth(15);
        this._gfxToCleanup.push(fx);
        fx.play('golem_attack_fx');
        fx.on('animationcomplete', () => {
            if (fx.active) fx.destroy();
            const idx = this._gfxToCleanup.indexOf(fx);
            if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
        });

        // Dust particles
        for (let i = 0; i < 8; i++) {
            const dust = this.scene.add.circle(
                this.x + Phaser.Math.Between(-20, 20),
                this.y + 18,
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

        // AOE damage check — tightened from 60px to 48px, damage 1
        if (this.scene.player && !this.scene.player.dead) {
            const dx = this.scene.player.x - this.x;
            const dy = Math.abs(this.scene.player.y - (this.y + 18));
            if (Math.abs(dx) < 42 && dy < 28 && this.scene.player.body.blocked.down) {
                this.scene.player.takeDamage(1, Math.sign(dx) * 60, -20);
            }
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.6, detune: -200 });

        // After slam: 80% → sweep_telegraph, 20% → vulnerable
        this.scene.time.delayedCall(200, () => {
            if (this.dead) return;
            if (Math.random() < 0.8) {
                this.state = 'sweep_telegraph';
                this._sweepTimer = 0.3;
                this._sweepHitDealt = false;
                this.sprite.setTint(0xff8800);

                // ── Dust particles rising from ground on sweep telegraph ──
                for (let i = 0; i < 3; i++) {
                    const dust = this.scene.add.circle(
                        this.x + Phaser.Math.Between(-15, 15),
                        this.y + 18,
                        Phaser.Math.Between(2, 3), 0x887766, 0.4,
                    ).setDepth(15);
                    this._gfxToCleanup.push(dust);
                    this.scene.tweens.add({
                        targets: dust,
                        y: dust.y - Phaser.Math.Between(10, 25),
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            if (dust && dust.active) dust.destroy();
                            const idx = this._gfxToCleanup.indexOf(dust);
                            if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
                        },
                    });
                }
            } else {
                this.state = 'vulnerable';
                this._vulnTimer = 1.0;
                this.sprite.setAlpha(0.6);
            }
        });
    }

    _executeSweep() {
        this.state = 'sweep_active';
        this._sweepTimer = 0.15; // brief active window
        this.sprite.clearTint();
        this.sprite.setScale(1.2 * 1.1, 1.2 * 0.9); // arm forward stretch

        // Sweep sound
        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: 100 });
    }

    _spawnChild() {
        if (this.dead) return;

        const child = new ShadowFragment(this.scene, this.x + Phaser.Math.Between(-30, 30), this.y - 20, true);
        child.leashDistance = 150;
        child.returnSpeed = 40;
        this.scene.enemyGroup.add(child.sprite);
        this.scene.enemyInstances.push(child);
        this._childCount++;

        const origDie = child.die.bind(child);
        child.die = () => {
            this._childCount = Math.max(0, this._childCount - 1);
            origDie();
        };
    }

    _spawnDeathFx() {
        const fx = this.scene.add.sprite(this.x, this.y, 'enemy_golem_deathFx')
            .setScale(1.2)
            .setDepth(15);
        fx.play('golem_death_fx');
        fx.on('animationcomplete', () => {
            if (fx.active) fx.destroy();
        });

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 600,
            onComplete: () => {
                if (this.sprite && this.sprite.active) this.sprite.destroy();
            },
        });
    }

    die() {
        if (this.dead) return;
        this.dead = true;
        this.body.setVelocity(0, 0);
        this.body.setAllowGravity(false);
        this.body.setEnable(false);
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this._cleanupGfx();

        this.scene.sound.play('sfx_enemy_death', { volume: 0.7, detune: Phaser.Math.Between(-200, 0) });

        this._spawnDeathParticles();
        this.sprite.play('golem_death_a');
    }

    _cleanupGfx() {
        this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); });
        this._gfxToCleanup = [];
    }

    _onStartReturn() {
        this.sprite.clearTint();
        this.sprite.setScale(1.2);
        this.sprite.setAlpha(0.8);
        this.state = 'idle';
        this.sprite.play('golem_idle');
        this._telegraphTimer = 0;
        this._vulnTimer = 0;
        this._sweepTimer = 0;
        this._cleanupGfx();
    }

    _onReachedHome() {
        this.state = 'idle';
        this._telegraphTimer = 0;
        this._vulnTimer = 0;
        this._spawnTimer = 0;
        this._sweepTimer = 0;
        this._sweepHitDealt = false;
        this.sprite.setScale(1.2);
        this.sprite.setAlpha(1);
        this.sprite.clearTint();
        this.sprite.play('golem_idle');
    }
}
