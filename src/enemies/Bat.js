/**
 * Bat — Flying patrol/pursuit enemy with DIVE attack.
 *
 * State machine:
 *   PATROL  → sine-wave horizontal oscillation ±50px from origin at 30px/s,
 *              bob up/down ±8px with 1.5s period
 *           → player within 120px horizontally → CHASE
 *   CHASE   → track player at 55px/s with Y-bobbing
 *           → player within 40-100px for >2s → PULL_UP
 *           → player closer than 40px or beyond 180px → RETREAT
 *   PULL_UP → rapid rise toward screen ceiling, pink glow 0.4s tell
 *           → reaches y ≈ 80px → DIVE
 *   DIVE    → fast diagonal rush at player (200px/s)
 *           → hits floor or player dodges → RECOVER
 *   RECOVER → 0.3s stagger on floor → CHASE
 *   RETREAT → fly away from player at 40px/s for 1s → PATROL
 *
 * Narrative: A predatory thought — it circles, baits, then strikes
 *            without warning.
 */
class Bat extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_bat',
            hp: 8,
            contactDamage: 1,
            feelingsDrop: 3,
            bodyWidth: 220,
            bodyHeight: 240,
            noGravity: true,
            leashDistance: 250,
            returnSpeed: 50,
        });

        this.sprite.setScale(0.14);
        this.sprite.setOrigin(0.5, 0.5);

        this.originX = x;
        this.originY = y;
        this.patrolSpeed = 30;
        this.chaseSpeed = 55;
        this.retreatSpeed = 40;
        this.diveSpeed = 200;
        this.state = 'patrol';
        this.stateTimer = 0;
        this.chaseTimer = 0;

        // Visual cleanup
        this._gfxToCleanup = [];

        this.sprite.on('destroy', () => this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); }));

        this.sprite.setFlipX(true);
    }

    /* ================================================================== */
    /*  AI STATE MACHINE                                                     */
    /* ================================================================== */

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const time = this.scene.time.now / 1000;
        const dtSec = dt / 1000;

        const vx = this.body.velocity.x;
        if (Math.abs(vx) > 5) {
            this.sprite.setFlipX(vx > 0);
        }

        switch (this.state) {
            case 'patrol': {
                this.body.setVelocityX(Math.sin(time * 0.8) * this.patrolSpeed);
                this.body.setVelocityY(Math.cos(time * (Math.PI * 2 / 1.5)) * 34);

                if (absDist < 120) {
                    this.chaseTimer = 0;
                    this.state = 'chase';
                }
                break;
            }

            case 'chase': {
                this.chaseTimer += dtSec;
                this.body.setVelocityX(Math.sign(dist) * this.chaseSpeed);
                this.body.setVelocityY(Math.cos(time * (Math.PI * 2 / 1.2)) * 42);

                if (absDist < 40) {
                    this.chaseTimer = 0;
                    this.stateTimer = 1.0;
                    this.state = 'retreat';
                    break;
                }

                if (absDist < 100 && this.chaseTimer > 2) {
                    this._enterPullUp();
                    break;
                }

                if (absDist > 180) {
                    this.chaseTimer = 0;
                    this.stateTimer = 1.0;
                    this.state = 'retreat';
                }
                break;
            }

            case 'pull_up': {
                // Rapidly rise toward ceiling
                const ceilingY = 80;
                this.body.setVelocity(0, -120);

                // Pink glow telegraph
                const glow = Math.sin(time * 12) * 0.3 + 0.7;
                this.sprite.setAlpha(glow);

                if (this.y <= ceilingY || this.body.blocked.up) {
                    this._enterDive(playerX, playerY);
                }
                break;
            }

            case 'dive': {
                // Maintain dive velocity (set on entry)
                // Check for ground hit
                if (this.body.blocked.down) {
                    this._enterRecover();
                }
                break;
            }

            case 'recover': {
                this.stateTimer -= dtSec;
                this.body.setVelocity(0, 0);
                this.sprite.setAlpha(0.6);
                if (this.stateTimer <= 0) {
                    this.sprite.setAlpha(1);
                    this.chaseTimer = 0;
                    this.state = 'chase';
                }
                break;
            }

            case 'retreat': {
                this.body.setVelocityX(Math.sign(-dist) * this.retreatSpeed);
                this.body.setVelocityY(Math.cos(time * (Math.PI * 2 / 1.5)) * 25);

                this.stateTimer -= dtSec;
                if (this.stateTimer <= 0) {
                    this.state = 'patrol';
                }
                break;
            }
        }
    }

    /* ================================================================== */
    /*  DIVE PHASES                                                           */
    /* ================================================================== */

    _enterPullUp() {
        this.state = 'pull_up';
        this.chaseTimer = 0;
        this.body.setVelocity(0, -120);
        this.sprite.setTint(0xff88cc);
        this.sprite.setAlpha(1);

        // Expanding pink ring telegraph
        const ring = this.scene.add.circle(this.x, this.y, 4, 0xff88cc, 0.5).setDepth(10);
        this._gfxToCleanup.push(ring);
        this.scene.tweens.add({
            targets: ring,
            scaleX: 5,
            scaleY: 5,
            alpha: 0,
            duration: 600,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (ring && ring.active) ring.destroy();
                const idx = this._gfxToCleanup.indexOf(ring);
                if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
            },
        });

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -400 });
    }

    _enterDive(playerX, playerY) {
        this.state = 'dive';
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.sprite.setScale(0.14);

        // Diagonal dive toward player
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.body.setVelocity(
            Math.cos(angle) * this.diveSpeed,
            Math.sin(angle) * this.diveSpeed,
        );

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: 100 });
    }

    _enterRecover() {
        this.state = 'recover';
        this.stateTimer = 0.3;
        this.body.setVelocity(0, -30); // small bounce off floor
        this.sprite.setAlpha(0.6);
    }

    /* ================================================================== */
    /*  Leash Hooks                                                          */
    /* ================================================================== */

    _onStartReturn() {
        this.sprite.clearTint();
        this.sprite.setScale(0.14);
        this.sprite.setAlpha(1);
        this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); });
        this._gfxToCleanup = [];
    }

    _onReachedHome() {
        this.state = 'patrol';
        this.chaseTimer = 0;
        this.stateTimer = 0;
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
    }

    /* ================================================================== */
    /*  CLEANUP                                                               */
    /* ================================================================== */

    _gfxToCleanup = [];

    die() {
        this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); });
        this._gfxToCleanup = [];
        this.sprite.clearTint();
        super.die();
    }
}
