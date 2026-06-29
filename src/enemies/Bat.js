/**
 * Bat — Flying patrol/pursuit enemy with DIVE + SWOOP attacks.
 *
 * HK-style state machine:
 *   PATROL  → sine-wave horizontal oscillation ±50px from origin at 30px/s,
 *              bob up/down ±8px with 1.5s period
 *           → player within 100px horizontally → CHASE
 *   CHASE   → track player at 70px/s with Y-bobbing
 *           → player within 40-100px for >2s → PULL_UP (or SWOOP)
 *           → player closer than 40px or beyond 180px → RETREAT
 *           → player facing away & < 100px → SWOOP (cooldown 2s)
 *   SWOOP   → quick diagonal sweep (0.2s telegraph, no pull-up)
 *           → 140px/s toward player, 1 damage
 *           → sweeps across, then RECOVER
 *   PULL_UP → rapid rise toward screen ceiling (y ≈ 120px), pink glow 0.4s tell
 *           → reaches ceiling → DIVE
 *   DIVE    → fast diagonal rush at player (250px/s)
 *           → hits floor → RECOVER
 *   RECOVER → 0.5s stagger on floor, slight backward shuffle → CHASE
 *   RETREAT → fly away from player at 40px/s for 1s → PATROL
 *
 * POGO: N/A (flying enemy, but dive can be avoided by pogo-like downward strike)
 * LEASH: tightened to 150px
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
            leashDistance: 150,
            returnSpeed: 60,
        });

        this.sprite.setScale(0.14);
        this.sprite.setOrigin(0.5, 0.5);

        this.originX = x;
        this.originY = y;
        this.patrolSpeed = 30;
        this.chaseSpeed = 70;        // increased from 55
        this.retreatSpeed = 40;
        this.diveSpeed = 250;        // increased from 200
        this.swoopSpeed = 140;       // new
        this.state = 'patrol';
        this.stateTimer = 0;
        this.chaseTimer = 0;
        this._swoopCooldown = 0;

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

        if (this._swoopCooldown > 0) this._swoopCooldown -= dtSec;

        const vx = this.body.velocity.x;
        if (Math.abs(vx) > 5) {
            this.sprite.setFlipX(vx > 0);
        }

        switch (this.state) {
            case 'patrol': {
                this.body.setVelocityX(Math.sin(time * 0.8) * this.patrolSpeed);
                this.body.setVelocityY(Math.cos(time * (Math.PI * 2 / 1.5)) * 34);

                if (absDist < 100) {
                    this.chaseTimer = 0;
                    this.state = 'chase';
                }
                break;
            }

            case 'chase': {
                this.chaseTimer += dtSec;
                this.body.setVelocityX(Math.sign(dist) * this.chaseSpeed);
                this.body.setVelocityY(Math.cos(time * (Math.PI * 2 / 1.2)) * 42);

                // SWOOP check: player facing away, close, cooldown ready
                if (absDist < 100 && this._swoopCooldown <= 0 && this._playerFacingAway()) {
                    this._enterSwoop(playerX, playerY);
                    break;
                }

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

            /* ———— SWOOP (new) ———— */
            case 'swoop_telegraph': {
                this.body.setVelocity(0, 0);
                this.stateTimer -= dtSec;
                // Visual: pink pulse flash
                const glow = Math.sin(time * 16) * 0.3 + 0.7;
                this.sprite.setAlpha(glow);
                this.sprite.setTint(0xff88cc);
                if (this.stateTimer <= 0) {
                    this._executeSwoop(playerX, playerY);
                }
                break;
            }

            case 'swoop': {
                // Maintain velocity set on entry; check for floor or timeout
                this.stateTimer -= dtSec;
                if (this.stateTimer <= 0 || this.body.blocked.down) {
                    this._swoopCooldown = 2.0;
                    this._enterSwoopRecover();
                }
                break;
            }

            case 'pull_up': {
                // Rapid rise toward ceiling
                const ceilingY = 120;   // increased from 80 for steeper dive
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
                if (this.body.blocked.down) {
                    this._enterRecover();
                }
                break;
            }

            case 'recover': {
                this.stateTimer -= dtSec;
                // Shuffle backward slightly while recovering
                this.body.setVelocity(Math.sign(-dist) * 20, -20);
                this.sprite.setAlpha(0.6);
                this.sprite.setTint(0x5577aa); // recovery: blue tint
                if (this.stateTimer <= 0) {
                    this.sprite.setAlpha(1);
                    this.sprite.clearTint();
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
    /*  Helper — check if player is facing away from the bat                */
    /* ================================================================== */

    _playerFacingAway() {
        const player = this.scene.player;
        if (!player || player.dead) return false;
        // Determine player facing direction from flipX
        const playerFacingRight = !player.sprite.flipX;
        // If bat is left of player and player faces right → facing away
        // If bat is right of player and player faces left → facing away
        const batIsLeft = (player.x - this.x) > 0;
        return batIsLeft === playerFacingRight;
    }

    /* ================================================================== */
    /*  SWOOP PHASES (new)                                                   */
    /* ================================================================== */

    _enterSwoop(playerX, playerY) {
        this.state = 'swoop_telegraph';
        this.stateTimer = 0.2; // Quick telegraph
        this.chaseTimer = 0;
        this.body.setVelocity(0, 0);
        this.sprite.setTint(0xff88cc);
        this.sprite.setAlpha(1);

        // Quick pink flash (no expanding ring — this is fast)
        this.scene.sound.play('sfx_enemy_attack', { volume: 0.4, detune: -300 });

        // ── Pink glow trailing particles ──
        for (let i = 0; i < 3; i++) {
            const glow = this.scene.add.circle(
                this.x - (this.sprite.flipX ? -8 : 8),
                this.y + Phaser.Math.Between(-4, 4),
                Phaser.Math.Between(2, 3), 0xff88cc, 0.6,
            ).setDepth(10);
            this._gfxToCleanup.push(glow);
            this.scene.tweens.add({
                targets: glow,
                x: glow.x + Phaser.Math.Between(-10, 10),
                y: glow.y + Phaser.Math.Between(-10, 10),
                alpha: 0,
                scale: 0.2,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    if (glow && glow.active) glow.destroy();
                    const idx = this._gfxToCleanup.indexOf(glow);
                    if (idx !== -1) this._gfxToCleanup.splice(idx, 1);
                },
            });
        }
    }

    _executeSwoop(playerX, playerY) {
        this.state = 'swoop';
        this.stateTimer = 0.4;
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.sprite.setScale(0.14);

        // Diagonal sweep toward player (shallower angle than dive)
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.body.setVelocity(
            Math.cos(angle) * this.swoopSpeed,
            Math.sin(angle) * this.swoopSpeed,
        );

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.4, detune: 50 });
    }

    _enterSwoopRecover() {
        this.state = 'recover';
        this.stateTimer = 0.5;
        this.body.setVelocity(0, -20);
        this.sprite.setAlpha(0.6);
        this.sprite.clearTint();
        this.sprite.setTint(0x5577aa); // recovery: blue tint
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
            duration: 400,
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
        this.stateTimer = 0.5;       // increased from 0.3
        this.body.setVelocity(0, -30);
        this.sprite.setAlpha(0.6);
        this.sprite.setTint(0x5577aa); // recovery: blue tint
    }

    /* ================================================================== */
    /*  Leash Hooks                                                          */
    /* ================================================================== */

    _onStartReturn() {
        this.sprite.clearTint();
        this.sprite.setScale(0.14);
        this.sprite.setAlpha(0.8);
        this._gfxToCleanup.forEach(g => { if (g && g.active) g.destroy(); });
        this._gfxToCleanup = [];
    }

    _onReachedHome() {
        this.state = 'patrol';
        this.chaseTimer = 0;
        this.stateTimer = 0;
        this._swoopCooldown = 0;
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
