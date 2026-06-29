/**
 * FloatingShard — Hover + Drift enemy with CROSS BARRAGE + QUICK BURST attacks.
 *
 * HK-style state machine:
 *   HOVER  → bobs at origin Y with sine wave, subtle idle drift
 *          → player within 80px horizontally → DRIFT
 *   DRIFT  → slowly moves toward player X
 *          → player within 100px for >1.5s → alternate between:
 *             - HOMING (60%) — cross barrage with homing projectiles
 *             - QUICK_BURST (40%) — 3 rapid projectiles, no homing, 15° spread
 *          → player beyond 150px → RETURN
 *   HOMING → teal glow + spark particles + pulse scale (0.35s tell, tightened)
 *          → fire 4 projectiles in cross pattern, homing after 0.3s
 *          → enter RECOVER (0.3s) → RETURN
 *   QUICK_BURST → brief flash (0.2s tell) → fire 3 rapid projectiles at 130px/s
 *          → no homing, 15° spread, 10 dmg each
 *          → enter RECOVER (0.3s) → RETURN
 *   RECOVER → brief pause after attack, slight backward drift
 *          → RETURN
 *   RETURN → drifts back to origin X at 60px/s
 *          → reaches origin → HOVER
 *
 * Projectiles: teal circle (radius 5), 10 damage, slash-destroyable
 *   - Cross barrage: 4 projectiles, slow-homing (90→110px/s), lifetime 4→2.5s
 *   - Quick burst: 3 projectiles, 130px/s spread, no homing, lifetime 2s
 *
 * POGO: N/A (flying enemy)
 * LEASH: tightened to 120px, return speed 60px/s
 */
class FloatingShard extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_shard',
            hp: 15,
            contactDamage: 1,
            feelingsDrop: 5,
            bodyWidth: 24,
            bodyHeight: 34,
            noGravity: true,
            leashDistance: 120,
            returnSpeed: 60,
        });

        this.sprite.setScale(0.8);
        this.sprite.setOrigin(0.5, 0.5);

        this.originX = x;
        this.originY = y;
        this.driftSpeed = 35;
        this.state = 'hover';
        this.driftTimer = 0;       // seconds spent in DRIFT state

        // Projectile management
        this._projectiles = [];
        this._gfxToCleanup = [];

        this.sprite.on('destroy', () => this._cleanupProjectiles());
    }

    /* ================================================================== */
    /*  UPDATE OVERRIDE — projectiles update even during hitstun             */
    /* ================================================================== */

    update(delta, playerX, playerY) {
        if (this.dead) return;
        super.update(delta, playerX, playerY);
        if (this._projectiles.length > 0) {
            this._updateProjectiles(delta, playerX, playerY);
        }
    }

    /* ================================================================== */
    /*  AI STATE MACHINE                                                     */
    /* ================================================================== */

    _updateAI(dt, playerX, playerY) {
        const time = this.scene.time.now / 1000;
        this.sprite.y = this.originY + Math.sin(time * Math.PI * 2 / 1.5) * 6;

        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const dtSec = dt / 1000;

        switch (this.state) {
            /* ——————————— HOVER ——————————— */
            case 'hover':
                this.body.setVelocityX(Math.sin(time) * 10);
                if (absDist < 80) {
                    this.driftTimer = 0;
                    this.state = 'drift';
                }
                break;

            /* ——————————— DRIFT ——————————— */
            case 'drift':
                this.driftTimer += dtSec;
                this.body.setVelocityX(Math.sign(dist) * this.driftSpeed);

                // HOMING or QUICK_BURST: player within 100px AND drifting for >1.5s
                if (absDist < 100 && this.driftTimer > 1.5) {
                    // Alternate: 60% cross barrage, 40% quick burst
                    if (Math.random() < 0.6) {
                        this._enterHomingState(playerX, playerY);
                    } else {
                        this._enterQuickBurstState(playerX, playerY);
                    }
                    break;
                }

                // Player lost → return
                if (absDist > 150) {
                    this.driftTimer = 0;
                    this.state = 'return';
                }
                break;

            /* ——————————— HOMING ——————————— */
            case 'homing':
                this.stateTimer -= dtSec;
                this.body.setVelocityX(0);

                if (this.stateTimer > 0) {
                    // Tell phase — handled on enter
                } else if (!this._homingFired) {
                    this._homingFired = true;
                    this.sprite.clearTint();
                    this.sprite.setScale(0.8 * 1.15);
                    this._fireCrossProjectiles(playerX, playerY);
                } else if (!this._homingReleased) {
                    this._homingLockTimer -= dtSec;
                    if (this._homingLockTimer <= 0) {
                        this._homingReleased = true;
                        this._releaseProjectiles(playerX, playerY);
                    }
                } else {
                    // Done → RECOVER then RETURN
                    this.driftTimer = 0;
                    this.sprite.clearTint();
                    this.state = 'recover';
                    this._recoverTimer = 0.3;
                }
                break;

            /* ——————————— QUICK BURST (new) ——————————— */
            case 'quick_burst':
                this.stateTimer -= dtSec;
                this.body.setVelocityX(0);

                if (this.stateTimer > 0) {
                    // Tell phase
                } else if (!this._burstFired) {
                    this._burstFired = true;
                    this.sprite.clearTint();
                    this.sprite.setScale(0.8 * 1.15);
                    this._fireQuickBurst(playerX, playerY);
                } else {
                    // Done → RECOVER then RETURN
                    this.driftTimer = 0;
                    this.sprite.clearTint();
                    this.state = 'recover';
                    this._recoverTimer = 0.3;
                }
                break;

            /* ——————————— RECOVER (new) ——————————— */
            case 'recover':
                this._recoverTimer -= dtSec;
                // Slight backward drift away from player
                this.body.setVelocityX(Math.sign(-dist) * 20);
                this.sprite.setAlpha(0.6);
                this.sprite.setTint(0x5577aa); // recovery: blue tint
                if (this._recoverTimer <= 0) {
                    this.sprite.setAlpha(1);
                    this.sprite.clearTint();
                    this.driftTimer = 0;
                    this.state = 'return';
                }
                break;

            /* ——————————— RETURN ——————————— */
            case 'return':
                const dx = this.originX - this.x;
                this.body.setVelocityX(Math.sign(dx) * this.driftSpeed);
                if (Math.abs(dx) < 10) {
                    this.body.setVelocityX(0);
                    this.driftTimer = 0;
                    this.state = 'hover';
                }
                // Re-detect player during return
                if (absDist < 80) {
                    this.driftTimer = 0;
                    this.state = 'drift';
                }
                break;
        }
    }

    /* ================================================================== */
    /*  Leash Hooks                                                          */
    /* ================================================================== */

    _onStartReturn() {
        if (this.state === 'homing' && !this._homingFired) {
            this.scene.tweens.killTweensOf(this.sprite);
        }
        if (this.state === 'homing' && this._homingFired && !this._homingReleased) {
            this._homingReleased = true;
            if (this.scene.player && !this.scene.player.dead) {
                this._releaseProjectiles(this.scene.player.x, this.scene.player.y);
            }
        }
        this.sprite.clearTint();
        this.sprite.setScale(0.8);
        this.sprite.setAlpha(0.8);
    }

    _onReachedHome() {
        this.state = 'hover';
        this.driftTimer = 0;
        this._homingFired = false;
        this._homingReleased = false;
        this._homingLockTimer = 0;
        this._burstFired = false;
        this._recoverTimer = 0;
        this.sprite.clearTint();
        this.sprite.setScale(0.8);
        this.sprite.setAlpha(1);
        this.body.setVelocity(0, 0);
    }

    /* ================================================================== */
    /*  HOMING TELEGRAPH + PROJECTILE FIRE                                    */
    /* ================================================================== */

    _enterHomingState(playerX, playerY) {
        this.state = 'homing';
        this.stateTimer = 0.35;       // 0.35s tell (tightened from 0.5s)
        this._homingFired = false;
        this._homingReleased = false;
        this._homingLockTimer = 0.3;

        this.body.setVelocityX(0);

        // Visual tell: teal glow
        this.sprite.setTint(0x66ffff);

        // Upward spark particles
        for (let i = 0; i < 3; i++) {
            const spark = this.scene.add.circle(
                this.x + Phaser.Math.Between(-8, 8),
                this.y + Phaser.Math.Between(-4, 4),
                2, 0x66ffff, 1,
            ).setDepth(10);
            this._gfxToCleanup.push(spark);
            this.scene.tweens.add({
                targets: spark,
                y: spark.y - Phaser.Math.Between(15, 25),
                alpha: 0,
                scale: 0.2,
                duration: 350,
                ease: 'Power2',
                onComplete: () => {
                    if (spark && spark.active) spark.destroy();
                    const idx = this._gfxToCleanup.indexOf(spark);
                    if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
                },
            });
        }

        // Pulsing scale tween
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 0.8 * 1.15,
            scaleY: 0.8 * 1.15,
            duration: 175,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.4, detune: 100 });
    }

    _fireCrossProjectiles(targetX, targetY) {
        const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        const spreadSpeed = 40;

        for (const angle of angles) {
            const p = this.scene.add.circle(this.x, this.y, 5, 0x66ffff, 1)
                .setDepth(10);
            this.scene.physics.add.existing(p);
            p.body.setAllowGravity(false);
            p.body.setCircle(5);
            p._damage = 1;
            p._age = 0;
            p._maxLifetime = 2.5; // tightened from 4
            p._isHoming = false;
            p._canBeSlashDestroyed = true;

            p.body.setVelocity(
                Math.cos(angle) * spreadSpeed,
                Math.sin(angle) * spreadSpeed,
            );

            this._projectiles.push(p);
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -100 });
    }

    _releaseProjectiles(targetX, targetY) {
        for (const p of this._projectiles) {
            if (!p || !p.active) continue;
            p._isHoming = true;
            const angle = Math.atan2(targetY - p.y, targetX - p.x);
            p.body.setVelocity(
                Math.cos(angle) * 110, // increased from 90
                Math.sin(angle) * 110,
            );
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: 50 });
    }

    /* ================================================================== */
    /*  QUICK BURST ATTACK (new) — 3 rapid projectiles, no homing            */
    /* ================================================================== */

    _enterQuickBurstState(playerX, playerY) {
        this.state = 'quick_burst';
        this.stateTimer = 0.2;       // 0.2s telegraph
        this._burstFired = false;

        this.body.setVelocityX(0);

        // Brief flash telegraph
        this.sprite.setTint(0x88ffff);
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 0.8 * 1.25,
            scaleY: 0.8 * 1.25,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });

        // ── Cyan flash burst particles (radial) ──
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const spark = this.scene.add.circle(
                this.x, this.y,
                Phaser.Math.Between(2, 4), 0x66ffff, 0.8,
            ).setDepth(10);
            this._gfxToCleanup.push(spark);
            this.scene.tweens.add({
                targets: spark,
                x: spark.x + Math.cos(angle) * Phaser.Math.Between(15, 25),
                y: spark.y + Math.sin(angle) * Phaser.Math.Between(15, 25),
                alpha: 0,
                scale: 0.2,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    if (spark && spark.active) spark.destroy();
                    const idx = this._gfxToCleanup.indexOf(spark);
                    if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
                },
            });
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.35, detune: 200 });
    }

    _fireQuickBurst(targetX, targetY) {
        // Fire 3 projectiles in a 15° spread toward player
        const baseAngle = Math.atan2(targetY - this.y, targetX - this.x);
        const spread = 0.26; // ~15° in radians

        for (let i = -1; i <= 1; i++) {
            const angle = baseAngle + spread * i;
            const p = this.scene.add.circle(this.x, this.y, 4, 0x66ffff, 1)
                .setDepth(10);
            this.scene.physics.add.existing(p);
            p.body.setAllowGravity(false);
            p.body.setCircle(4);
            p._damage = 1;
            p._age = 0;
            p._maxLifetime = 2.0;
            p._isHoming = false;   // no homing
            p._canBeSlashDestroyed = true;

            // Fast linear velocity
            p.body.setVelocity(
                Math.cos(angle) * 130,
                Math.sin(angle) * 130,
            );

            this._projectiles.push(p);
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -50 });
    }

    /* ================================================================== */
    /*  PROJECTILE UPDATE + COLLISION                                        */
    /* ================================================================== */

    _updateProjectiles(delta, playerX, playerY) {
        const dtSec = delta / 1000;

        for (let i = this._projectiles.length - 1; i >= 0; i--) {
            const p = this._projectiles[i];
            if (!p || !p.active) {
                this._projectiles.splice(i, 1);
                continue;
            }

            // Destroy if outside room bounds
            const b = this.scene.physics.world.bounds;
            if (p.x < b.x - 20 || p.x > b.right + 20 || p.y < b.y - 20 || p.y > b.bottom + 20) {
                this._destroyProjectile(p, i);
                continue;
            }

            p._age += dtSec;

            // Homing: only if _isHoming is true
            if (p._isHoming) {
                if (this.scene.player && !this.scene.player.dead) {
                    const angle = Math.atan2(playerY - p.y, playerX - p.x);
                    p.body.setVelocity(
                        Math.cos(angle) * 110,
                        Math.sin(angle) * 110,
                    );
                }
            }

            // Slash destruction
            if (p._canBeSlashDestroyed && this.scene.player && !this.scene.player.dead) {
                this._checkSlashCollision(p, i);
            }

            // Lifetime check
            if (p._age >= p._maxLifetime) {
                this.scene.tweens.add({
                    targets: p,
                    alpha: 0,
                    duration: 200,
                    ease: 'Sine.easeIn',
                    onComplete: () => { if (p && p.active) p.destroy(); },
                });
                this._projectiles.splice(i, 1);
                continue;
            }

            // Player collision
            if (this.scene.player && !this.scene.player.dead) {
                const dx = playerX - p.x;
                const dy = playerY - p.y;
                if (dx * dx + dy * dy < 625) {
                    this.scene.player.takeDamage(p._damage, 80, -40);
                    this._destroyProjectile(p, i);
                }
            }
        }
    }

    _checkSlashCollision(p, index) {
        const player = this.scene.player;
        if (!player.slashHitbox || !player.slashHitbox.active) return;

        const sb = player.slashHitbox.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(sb, p.getBounds())) {
            for (let j = 0; j < 4; j++) {
                const spark = this.scene.add.circle(
                    p.x, p.y, 2, 0x66ffff, 0.8,
                ).setDepth(50);
                this.scene.tweens.add({
                    targets: spark,
                    x: spark.x + Phaser.Math.Between(-20, 20),
                    y: spark.y + Phaser.Math.Between(-20, 20),
                    alpha: 0,
                    duration: 200,
                    onComplete: () => { if (spark && spark.active) spark.destroy(); },
                });
            }
            this.scene.sound.play('sfx_enemy_hurt', { volume: 0.3, detune: 300 });
            this._destroyProjectile(p, index);
        }
    }

    _destroyProjectile(p, index) {
        if (p && p.active) p.destroy();
        if (index >= 0 && index < this._projectiles.length) {
            this._projectiles.splice(index, 1);
        }
    }

    /* ================================================================== */
    /*  CLEANUP                                                               */
    /* ================================================================== */

    _cleanupProjectiles() {
        this._projectiles.forEach(p => { if (p && p.active) p.destroy(); });
        this._projectiles = [];
        this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); });
        this._gfxToCleanup = [];
    }

    die() {
        this._cleanupProjectiles();
        this.sprite.clearTint();
        super.die();
    }
}
