/**
 * FloatingShard — Hover + Drift enemy with HOMING attack.
 *
 * State machine:
 *   HOVER  → bobs at origin Y with sine wave, subtle idle drift
 *          → player within 100px horizontally → DRIFT
 *   DRIFT  → slowly moves toward player X
 *          → player within 120px for >1.5s → HOMING
 *          → player beyond 150px → RETURN
 *   HOMING → teal glow + spark particles + pulse scale (0.5s tell)
 *          → fire 1 homing projectile (80px/s, re-aims every 100ms, 3s life)
 *          → enter RETURN (2s cooldown)
 *   RETURN → drifts back to origin X
 *          → reaches origin → HOVER
 *
 * Projectile: teal circle (radius 5), slow-homing, 10 damage
 *
 * Narrative: A broken piece of memory. It drifts just beyond reach,
 *            like a forgotten song.
 */
class FloatingShard extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_shard',
            hp: 15,
            contactDamage: 5,      // reduced from 8
            feelingsDrop: 5,
            bodyWidth: 24,
            bodyHeight: 34,
            noGravity: true,
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
                    // Teal glow and spark particles — set on entry, continue
                }
                // ── Fire phase (stateTimer crosses 0) ──
                else if (!this._homingFired) {
                    this._homingFired = true;
                    this.sprite.clearTint();
        this.sprite.setScale(1.1);
                    this._fireHomingProjectile(playerX, playerY);
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
    /*  HOMING TELEGRAPH + PROJECTILE FIRE                                    */
    /* ================================================================== */

    _enterHomingState(playerX, playerY) {
        this.state = 'homing';
        this.stateTimer = 0.5;       // 0.5s tell
        this._homingFired = false;

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
     * Fire a single homing projectile with continuous re-aiming.
     */
    _fireHomingProjectile(targetX, targetY) {
        const p = this.scene.add.circle(this.x, this.y, 5, 0x66ffff, 1)
            .setDepth(10);
        this.scene.physics.add.existing(p);
        p.body.setAllowGravity(false);
        p.body.setCircle(5);
        p._damage = 10;
        p._age = 0;
        p._maxLifetime = 3;
        p._homingTimer = 0;

        // Initial velocity toward target
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        p.body.setVelocity(
            Math.cos(angle) * 80,
            Math.sin(angle) * 80,
        );

        this._projectiles.push(p);

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -100 });
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

            p._age += dtSec;

            // ── Homing: re-aim toward player every 100ms ──
            p._homingTimer += dtSec;
            if (p._homingTimer > 0.1) {
                p._homingTimer = 0;
                // Only re-aim while player is alive
                if (this.scene.player && !this.scene.player.dead) {
                    const angle = Math.atan2(playerY - p.y, playerX - p.x);
                    p.body.setVelocity(
                        Math.cos(angle) * 80,
                        Math.sin(angle) * 80,
                    );
                }
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
                const distSq = dx * dx + dy * dy;
                if (distSq < 625) { // 25px radius squared (slightly bigger for homing)
                    this.scene.player.takeDamage(p._damage, 80, -40);
                    if (p && p.active) p.destroy();
                    this._projectiles.splice(i, 1);
                }
            }
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
