/**
 * FloatingShard — Hover + Drift enemy with CROSS BARRAGE attack.
 *
 * State machine:
 *   HOVER  → bobs at origin Y with sine wave, subtle idle drift
 *          → player within 100px horizontally → DRIFT
 *   DRIFT  → slowly moves toward player X
 *          → player within 120px for >1.5s → HOMING
 *          → player beyond 150px → RETURN
 *   HOMING → teal glow + spark particles + pulse scale (0.5s tell)
 *          → fire 4 projectiles in a cross pattern (up/down/left/right)
 *          → after 0.3s launch they curve toward the player
 *          → enter RETURN (2s cooldown)
 *   RETURN → drifts back to origin X
 *          → reaches origin → HOVER
 *
 * Projectile: teal circle (radius 5), slow-homing, 10 damage
 *             Can be destroyed by player slash attacks
 *
 * Narrative: A broken piece of memory. It scatters when threatened,
 *            like thoughts you can't hold onto.
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
            leashDistance: 200,
            returnSpeed: 40,
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

        // Listen for sprite destruction
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
        // Cosmetic Y-bob (visual sprite only — physics body stays for collisions)
        const time = this.scene.time.now / 1000;
        this.sprite.y = this.originY + Math.sin(time * Math.PI * 2 / 1.5) * 6;

        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const dtSec = dt / 1000;

        switch (this.state) {
            /* ——————————— HOVER ——————————— */
            case 'hover':
                // Subtle idle drift
                this.body.setVelocityX(Math.sin(time) * 10);

                // Detect player
                if (absDist < 100) {
                    this.driftTimer = 0;
                    this.state = 'drift';
                }
                break;

            /* ——————————— DRIFT ——————————— */
            case 'drift':
                this.driftTimer += dtSec;
                this.body.setVelocityX(Math.sign(dist) * this.driftSpeed);

                // HOMING: player within 120px AND drifting for >1.5s
                if (absDist < 120 && this.driftTimer > 1.5) {
                    this._enterHomingState(playerX, playerY);
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
                this.body.setVelocityX(0); // Stop horizontal movement

                // ── Tell phase (stateTimer > 0) ──
                if (this.stateTimer > 0) {
                    // Visual tells set on entry
                }
                // ── Fire phase (stateTimer crosses 0) ──
                else if (!this._homingFired) {
                    this._homingFired = true;
                    this.sprite.clearTint();
                    this.sprite.setScale(0.8 * 1.15);
                    this._fireCrossProjectiles(playerX, playerY);
                }
                // ── Wait 0.3s, then projectiles lock onto player ──
                else if (!this._homingReleased) {
                    this._homingLockTimer -= dtSec;
                    if (this._homingLockTimer <= 0) {
                        this._homingReleased = true;
                        this._releaseProjectiles(playerX, playerY);
                    }
                }
                // ── Done → RETURN ──
                else {
                    this.driftTimer = 0;
                    this.sprite.clearTint();
                    this.state = 'return';
                }
                break;

            /* ——————————— RETURN ——————————— */
            case 'return':
                // Drift back to origin X
                const dx = this.originX - this.x;
                this.body.setVelocityX(Math.sign(dx) * this.driftSpeed);
                if (Math.abs(dx) < 10) {
                    this.body.setVelocityX(0);
                    this.driftTimer = 0;
                    this.state = 'hover';
                }
                // Re-detect player during return
                if (absDist < 100) {
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
        // Release projectiles immediately on leash return (no wait)
        if (this.state === 'homing' && this._homingFired && !this._homingReleased) {
            this._homingReleased = true;
            if (this.scene.player && !this.scene.player.dead) {
                this._releaseProjectiles(this.scene.player.x, this.scene.player.y);
            }
        }
        this.sprite.clearTint();
        this.sprite.setScale(0.8);
    }

    _onReachedHome() {
        this.state = 'hover';
        this.driftTimer = 0;
        this._homingFired = false;
        this._homingReleased = false;
        this._homingLockTimer = 0;
        this.sprite.clearTint();
        this.sprite.setScale(0.8);
        this.body.setVelocity(0, 0);
    }

    /* ================================================================== */
    /*  HOMING TELEGRAPH + PROJECTILE FIRE                                    */
    /* ================================================================== */

    _enterHomingState(playerX, playerY) {
        this.state = 'homing';
        this.stateTimer = 0.5;       // 0.5s tell
        this._homingFired = false;
        this._homingReleased = false;
        this._homingLockTimer = 0.3; // 0.3s before projectiles lock

        // Stop horizontal movement
        this.body.setVelocityX(0);

        // ── Visual tell: teal glow ──
        this.sprite.setTint(0x66ffff);

        // ── Visual tell: upward spark particles ──
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
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    if (spark && spark.active) spark.destroy();
                    const idx = this._gfxToCleanup.indexOf(spark);
                    if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
                },
            });
        }

        // ── Visual tell: pulsing scale 1.0→1.15→1.0 over 0.5s ──
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 0.8 * 1.15,
            scaleY: 0.8 * 1.15,
            duration: 250,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });

        // Audio — charge-up
        this.scene.sound.play('sfx_enemy_attack', { volume: 0.4, detune: 100 });
    }

    /**
     * Fire 4 projectiles in a cross pattern around the enemy.
     * Each projectile drifts outward slowly, then locks onto the player
     * after 0.3s via _releaseProjectiles.
     */
    _fireCrossProjectiles(targetX, targetY) {
        const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // right, down, left, up
        const spreadSpeed = 40;

        for (const angle of angles) {
            const p = this.scene.add.circle(this.x, this.y, 5, 0x66ffff, 1)
                .setDepth(10);
            this.scene.physics.add.existing(p);
            p.body.setAllowGravity(false);
            p.body.setCircle(5);
            p._damage = 1;
            p._age = 0;
            p._maxLifetime = 4;
            p._isHoming = false;
            p._canBeSlashDestroyed = true;

            // Initial outward drift
            p.body.setVelocity(
                Math.cos(angle) * spreadSpeed,
                Math.sin(angle) * spreadSpeed,
            );

            this._projectiles.push(p);
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -100 });
    }

    /**
     * After the lock timer expires, all active projectiles
     * lock toward the player and begin homing.
     */
    _releaseProjectiles(targetX, targetY) {
        for (const p of this._projectiles) {
            if (!p || !p.active) continue;
            p._isHoming = true;
            const angle = Math.atan2(targetY - p.y, targetX - p.x);
            p.body.setVelocity(
                Math.cos(angle) * 90,
                Math.sin(angle) * 90,
            );
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: 50 });
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

            // ── Destroy if outside room bounds ──
            const b = this.scene.physics.world.bounds;
            if (p.x < b.x - 20 || p.x > b.right + 20 || p.y < b.y - 20 || p.y > b.bottom + 20) {
                this._destroyProjectile(p, i);
                continue;
            }

            p._age += dtSec;

            // ── Homing: only if _isHoming is true (after release phase) ──
            if (p._isHoming) {
                if (this.scene.player && !this.scene.player.dead) {
                    const angle = Math.atan2(playerY - p.y, playerX - p.x);
                    p.body.setVelocity(
                        Math.cos(angle) * 90,
                        Math.sin(angle) * 90,
                    );
                }
            }

            // ── Slash destruction (check player attack hitbox overlap) ──
            if (p._canBeSlashDestroyed && this.scene.player && !this.scene.player.dead) {
                this._checkSlashCollision(p, i);
            }

            // ── Lifetime check ──
            if (p._age >= p._maxLifetime) {
                this.scene.tweens.add({
                    targets: p,
                    alpha: 0,
                    duration: 300,
                    ease: 'Sine.easeIn',
                    onComplete: () => { if (p && p.active) p.destroy(); },
                });
                this._projectiles.splice(i, 1);
                continue;
            }

            // ── Player collision ──
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

    /**
     * Check if the player's slash hitbox overlaps this projectile.
     */
    _checkSlashCollision(p, index) {
        const player = this.scene.player;
        if (!player.slashHitbox || !player.slashHitbox.active) return;

        const sb = player.slashHitbox.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(sb, p.getBounds())) {
            // Destroy projectile with a small particle burst
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
