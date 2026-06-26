/**
 * Bat — Flying patrol/chase/retreat enemy with SCREAM attack.
 *
 * State machine:
 *   PATROL  → sine-wave horizontal oscillation ±50px from origin at 30px/s,
 *              bob up/down ±8px with 1.5s period
 *           → player within 120px horizontally → CHASE
 *   CHASE   → fly toward player at 55px/s with Y-bobbing
 *           → player within 40-100px for >2s → SCREAM
 *           → player closer than 40px or beyond 180px → RETREAT
 *   SCREAM  → stop, pink tint + expanding ring tell (0.8s)
 *           → fire 5-7 projectile fan (60deg spread, 120px/s, teal)
 *           → enter RETREAT (1s)
 *   RETREAT → fly away from player at 40px/s for 1s → PATROL
 *
 * Projectiles: small teal circles (radius 4), 120px/s, 1.5s lifetime, 6 dmg
 *
 * Narrative: A shrieking memory swarming in the dark. It darts close,
 *            but scatters when cornered — like a thought you almost catch.
 *
 * Design doc: design/enemy-combat-design.md § Bat
 */
class Bat extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_bat',
            hp: 8,
            contactDamage: 4,     // reduced from 6
            feelingsDrop: 3,
            bodyWidth: 220,
            bodyHeight: 240,
            noGravity: true,
        });

        this.sprite.setScale(0.14);
        this.sprite.setOrigin(0.5, 0.5);

        this.originX = x;
        this.originY = y;
        this.patrolSpeed = 30;
        this.chaseSpeed = 55;
        this.retreatSpeed = 40;
        this.state = 'patrol';
        this.stateTimer = 0;
        this.chaseTimer = 0;       // seconds spent in CHASE (resets on leaving)

        // Projectile management
        this._projectiles = [];
        this._gfxToCleanup = [];   // temporary display objects

        // Listen for sprite destruction (room transition, game over)
        this.sprite.on('destroy', () => this._cleanupProjectiles());

        // Initial facing
        this.sprite.setFlipX(true);
    }

    /* ================================================================== */
    /*  UPDATE OVERRIDE — projectiles update even during hitstun             */
    /* ================================================================== */

    update(delta, playerX, playerY) {
        if (this.dead) return;
        super.update(delta, playerX, playerY);
        // Projectiles move independently of enemy hitstun
        if (this._projectiles.length > 0) {
            this._updateProjectiles(delta, playerX, playerY);
        }
    }

    /* ================================================================== */
    /*  AI STATE MACHINE                                                     */
    /* ================================================================== */

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const time = this.scene.time.now / 1000;
        const dtSec = dt / 1000;

        // Face movement direction (only when moving)
        const vx = this.body.velocity.x;
        if (Math.abs(vx) > 5) {
            this.sprite.setFlipX(vx > 0);
        }

        switch (this.state) {
            /* ——————————— PATROL ——————————— */
            case 'patrol': {
                this.body.setVelocityX(Math.sin(time * 0.8) * this.patrolSpeed);
                const bobVY = Math.cos(time * (Math.PI * 2 / 1.5)) * 34;
                this.body.setVelocityY(bobVY);

                if (absDist < 120) {
                    this.chaseTimer = 0;
                    this.state = 'chase';
                }
                break;
            }

            /* ——————————— CHASE ——————————— */
            case 'chase': {
                this.chaseTimer += dtSec;
                this.body.setVelocityX(Math.sign(dist) * this.chaseSpeed);

                // Vertical bob (agitated during chase)
                const bobVY = Math.cos(time * (Math.PI * 2 / 1.2)) * 42;
                this.body.setVelocityY(bobVY);

                // Too close → retreat immediately (flinches away)
                if (absDist < 40) {
                    this.chaseTimer = 0;
                    this.stateTimer = 1.0;
                    this.state = 'retreat';
                    break;
                }

                // SCREAM: player within mid-range for >2s
                if (absDist < 100 && this.chaseTimer > 2) {
                    this._enterScreamState(playerX, playerY);
                    break;
                }

                // Player escaped → retreat
                if (absDist > 180) {
                    this.chaseTimer = 0;
                    this.stateTimer = 1.0;
                    this.state = 'retreat';
                }
                break;
            }

            /* ——————————— SCREAM ——————————— */
            case 'scream': {
                this.stateTimer -= dtSec;

                // ── Tell phase (stateTimer > 0.2) ──
                if (this.stateTimer > 0.2) {
                    // Stop movement — tell is playing
                    this.body.setVelocity(0, 0);
                    // Tint stays pink (set on entry)
                }
                // ── Fire phase (stateTimer crosses 0.2) ──
                else if (!this._screamFired) {
                    this._screamFired = true;
                    this.sprite.clearTint();
                    this._fireProjectileFan(this._screamTargetX, this._screamTargetY);
                }
                // ── Done → retreat ──
                else {
                    this.chaseTimer = 0;
                    this.sprite.clearTint();
                    this.state = 'retreat';
                    this.stateTimer = 1.0;
                }
                break;
            }

            /* ——————————— RETREAT ——————————— */
            case 'retreat': {
                this.body.setVelocityX(Math.sign(-dist) * this.retreatSpeed);

                // Vertical bob (calmer retreat)
                const bobVY = Math.cos(time * (Math.PI * 2 / 1.5)) * 25;
                this.body.setVelocityY(bobVY);

                this.stateTimer -= dtSec;
                if (this.stateTimer <= 0) {
                    this.state = 'patrol';
                }
                break;
            }
        }
    }

    /* ================================================================== */
    /*  SCREAM TELEGRAPH + PROJECTILE FIRE                                    */
    /* ================================================================== */

    _enterScreamState(playerX, playerY) {
        this.state = 'scream';
        this.stateTimer = 1.0;         // 1.0s total: 0.8s tell + 0.2s pause
        this._screamFired = false;
        this._screamTargetX = playerX; // snapshot player position for fan aim
        this._screamTargetY = playerY;

        // Stop movement
        this.body.setVelocity(0, 0);

        // ── Visual tell: pink tint ──
        this.sprite.setTint(0xff88cc);

        // ── Visual tell: expanding ring ──
        const ring = this.scene.add.circle(this.x, this.y, 4, 0xff88cc, 0.5)
            .setDepth(10);
        this._gfxToCleanup.push(ring);
        this.scene.tweens.add({
            targets: ring,
            scaleX: 4,
            scaleY: 4,
            alpha: 0,
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (ring && ring.active) ring.destroy();
                const idx = this._gfxToCleanup.indexOf(ring);
                if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
            },
        });

        // Audio — scream warning
        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -400 });
    }

    /**
     * Fire 5-7 projectiles in a forward-facing 60° fan.
     */
    _fireProjectileFan(targetX, targetY) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const spread = Math.PI / 6; // 30° each side = 60° total
        const count = Phaser.Math.Between(5, 7);
        const countSafe = Math.max(count - 1, 1);

        for (let i = 0; i < count; i++) {
            const a = angle - spread + (spread * 2 * i / countSafe);
            this._spawnProjectile(
                this.x, this.y,
                Math.cos(a) * 120,
                Math.sin(a) * 120,
                6,     // damage
                1.5,   // lifespan (seconds)
            );
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.45, detune: -200 });
    }

    /**
     * Create a single projectile with physics body.
     */
    _spawnProjectile(x, y, vx, vy, damage, lifespan) {
        const p = this.scene.add.circle(x, y, 4, 0x40e0d0, 1)
            .setDepth(10);
        this.scene.physics.add.existing(p);
        p.body.setAllowGravity(false);
        p.body.setCircle(4);
        p.body.setVelocity(vx, vy);
        p._damage = damage;
        p._lifespan = lifespan;
        p._age = 0;
        this._projectiles.push(p);
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

            // Lifetime
            p._age += dtSec;
            if (p._age >= p._lifespan) {
                // Fade out
                this.scene.tweens.add({
                    targets: p,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => { if (p && p.active) p.destroy(); },
                });
                this._projectiles.splice(i, 1);
                continue;
            }

            // Player collision (skip if player is dead or during hitStop)
            if (this.scene.player && !this.scene.player.dead) {
                const dx = playerX - p.x;
                const dy = playerY - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 400) { // 20px radius squared
                    this.scene.player.takeDamage(p._damage, 60, -30);
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
