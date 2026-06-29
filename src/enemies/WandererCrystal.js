/**
 * WandererCrystal — Stationary turret with LASER BEAM + PULSE BURST attacks.
 *
 * HK-style state machine:
 *   IDLE  → slow rotation bob + breathing pulse scale, stationary
 *         → if player < 140px and cooldown ≤ 0 → decide:
 *            - player < 100px → 30% PULSE_BURST, 70% LASER
 *            - player ≥ 100px → LASER
 *   AIMING → 0.5s telegraph: aim line toward player, sprite pulse
 *          → fire laser
 *   FIRING → 0.4s sustained beam (tightened from 0.5s)
 *          → damage every 250ms (tightened from 300ms)
 *          → teal glow, pulse scale
 *          → IDLE (cooldown 2.0s)
 *   PULSE_BURST_TELEGRAPH → 0.3s bright white flash
 *          → PULSE_ACTIVE: emit 4 expanding teal rings
 *          → 90° intervals, expand from 20→80px radius over 0.6s
 *          → 1 damage each on contact
 *          → IDLE (cooldown 2.0s)
 *
 * POGO: N/A (floating enemy)
 * LEASH: tightened to 160px, return speed 50
 */
class WandererCrystal extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_crystal',
            hp: 10,
            contactDamage: 1,
            feelingsDrop: 6,
            bodyWidth: 24,
            bodyHeight: 28,
            noGravity: true,
            leashDistance: 160,
            returnSpeed: 50,
        });

        this.sprite.setScale(1.5);
        this.sprite.setOrigin(0.5, 0.5);

        this.originX = x;
        this.originY = y;
        this.state = 'idle';

        this._alertTimer = 0;
        this._aimAngle = 0;
        this._laserGraphics = null;
        this._laserDuration = 0;
        this._laserHitTimer = 0;
        this._cooldown = 0;

        // Pulse burst
        this._pulseTimer = 0;
        this._pulseProjectiles = [];
        this._pulseHitTimers = [];
    }

    update(delta, playerX, playerY) {
        if (this.dead) return;
        super.update(delta, playerX, playerY);
        // Update pulse rings even during hitstun
        if (this._pulseProjectiles.length > 0) {
            this._updatePulseRings(delta, playerX, playerY);
        }
    }

    _updateAI(dt, playerX, playerY) {
        const dtSec = dt / 1000;
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        if (this._cooldown > 0) this._cooldown -= dtSec;

        // Slow rotation bob
        const angle = this.scene.time.now / 1000;
        this.sprite.setAngle(Math.sin(angle * 0.5) * 15);

        switch (this.state) {
            case 'idle': {
                this.body.setVelocity(0, 0);
                const pulse = Math.sin(angle * 2) * 0.05 + 1;
                this.sprite.setScale(1.5 * pulse);

                if (absDist < 140 && this._cooldown <= 0) {
                    // Decide attack type based on distance
                    if (absDist < 100 && Math.random() < 0.3) {
                        // Close range → Pulse Burst (30% chance)
                        this.state = 'pulse_telegraph';
                        this._pulseTimer = 0.3;
                        this.sprite.setTint(0xffffff); // bright flash
                        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: 300 });

                        // ── Bright white flash burst ──
                        const flash = this.scene.add.circle(this.x, this.y, 8, 0xffffff, 0.8).setDepth(15);
                        this.scene.tweens.add({
                            targets: flash,
                            scaleX: 3,
                            scaleY: 3,
                            alpha: 0,
                            duration: 200,
                            ease: 'Sine.easeOut',
                            onComplete: () => { if (flash && flash.active) flash.destroy(); },
                        });
                    } else {
                        // Default → Laser
                        this.state = 'aiming';
                        this._alertTimer = 0.5; // tightened from 0.8
                        this.sprite.setTint(0x88ffff);
                    }
                }
                break;
            }

            case 'aiming': {
                this.body.setVelocity(0, 0);
                this._alertTimer -= dtSec;

                // Aim line
                this._aimAngle = Math.atan2(playerY - this.y, playerX - this.x);
                if (this._laserGraphics) this._laserGraphics.destroy();
                this._laserGraphics = this.scene.add.graphics().setDepth(12);
                this._laserGraphics.lineStyle(1.5, 0x66ffff, 0.5);
                this._laserGraphics.beginPath();
                this._laserGraphics.moveTo(this.x, this.y);
                this._laserGraphics.lineTo(
                    this.x + Math.cos(this._aimAngle) * 200,
                    this.y + Math.sin(this._aimAngle) * 200,
                );
                this._laserGraphics.strokePath();

                const pulse = Math.sin(this.scene.time.now / 50) * 0.08 + 1.1;
                this.sprite.setScale(1.5 * pulse);

                if (this._alertTimer <= 0) {
                    this._fireLaser();
                }
                break;
            }

            case 'firing': {
                this._laserDuration -= dtSec;

                if (this._laserGraphics) this._laserGraphics.destroy();
                this._laserGraphics = this.scene.add.graphics().setDepth(12);
                this._laserGraphics.lineStyle(2.5, 0x66ffff, 0.8);
                this._laserGraphics.beginPath();
                this._laserGraphics.moveTo(this.x, this.y);

                const endX = this.x + Math.cos(this._aimAngle) * 300;
                const endY = this.y + Math.sin(this._aimAngle) * 300;
                this._laserGraphics.lineTo(endX, endY);
                this._laserGraphics.strokePath();

                this._laserGraphics.fillStyle(0x66ffff, 0.1);
                this._laserGraphics.fillCircle(this.x, this.y, 16);

                // Damage player every 250ms while in beam path
                this._laserHitTimer -= dtSec;
                if (this._laserHitTimer <= 0 && this.scene.player && !this.scene.player.dead) {
                    const px = this.scene.player.x;
                    const py = this.scene.player.y;
                    const dx = px - this.x;
                    const dy = py - this.y;
                    const beamDist = Math.abs(Math.cos(this._aimAngle) * dy - Math.sin(this._aimAngle) * dx);

                    if (beamDist < 20 && (dx * Math.cos(this._aimAngle) + dy * Math.sin(this._aimAngle)) > 0) {
                        this.scene.player.takeDamage(1, 0, -20);
                        this._laserHitTimer = 0.25; // tightened from 0.3
                    }
                }

                this.sprite.setTint(0xc0ffff);
                const pulse = Math.sin(this.scene.time.now / 30) * 0.1 + 1.15;
                this.sprite.setScale(1.5 * pulse);

                if (this._laserDuration <= 0) {
                    this._endLaser();
                }
                break;
            }

            /* ———— PULSE BURST (new) ———— */
            case 'pulse_telegraph': {
                this.body.setVelocity(0, 0);
                this._pulseTimer -= dtSec;
                // Bright white flash, rapid pulse scale
                const bp = Math.sin(this.scene.time.now / 30) * 0.15 + 1.2;
                this.sprite.setScale(1.5 * bp);
                if (this._pulseTimer <= 0) {
                    this._firePulseBurst();
                }
                break;
            }

            case 'pulse_active': {
                this.body.setVelocity(0, 0);
                this.sprite.setTint(0x66ffff);
                const bp2 = Math.sin(this.scene.time.now / 30) * 0.1 + 1.0;
                this.sprite.setScale(1.5 * bp2);
                // Rings are managed by _updatePulseRings
                if (this._pulseProjectiles.length === 0) {
                    // All rings expired → done
                    this.sprite.clearTint();
                    this.sprite.setScale(1.5);
                    this._cooldown = 2.0;
                    this.state = 'idle';
                }
                break;
            }
        }
    }

    /* ================================================================== */
    /*  LASER                                                               */
    /* ================================================================== */

    _fireLaser() {
        this.state = 'firing';
        this._laserDuration = 0.4; // tightened from 0.5
        this._laserHitTimer = 0;
        this.sprite.setTint(0xc0ffff);
        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -500 });
    }

    _endLaser() {
        this.state = 'idle';
        this.sprite.clearTint();
        this.sprite.setScale(1.5);
        this._cooldown = 2.0; // tightened from 2.5
        this._aimAngle = 0;

        if (this._laserGraphics) {
            this._laserGraphics.destroy();
            this._laserGraphics = null;
        }
    }

    /* ================================================================== */
    /*  PULSE BURST (new) — 4 expanding teal rings                          */
    /* ================================================================== */

    _firePulseBurst() {
        this.state = 'pulse_active';
        this.sprite.clearTint();
        this.sprite.setScale(1.5);

        // 4 directions: 90° intervals
        const directions = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 },
        ];

        for (const dir of directions) {
            const ring = this.scene.add.circle(this.x, this.y, 20, 0x66ffff, 0.4)
                .setDepth(10);
            this._pulseProjectiles.push(ring);
            this._pulseHitTimers.push(0);

            // Expand from radius 20→80 over 0.6s (scale 1→4)
            this.scene.tweens.add({
                targets: ring,
                scaleX: 4,
                scaleY: 4,
                alpha: 0,
                duration: 600,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    if (ring && ring.active) ring.destroy();
                },
            });

            // Move outward at 50px/s
            ring._vx = dir.x * 50;
            ring._vy = dir.y * 50;
            ring._age = 0;
            ring._maxLifetime = 2.0;
        }

        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: 200 });
    }

    _updatePulseRings(delta, playerX, playerY) {
        const dtSec = delta / 1000;

        for (let i = this._pulseProjectiles.length - 1; i >= 0; i--) {
            const ring = this._pulseProjectiles[i];
            if (!ring || !ring.active) {
                this._pulseProjectiles.splice(i, 1);
                this._pulseHitTimers.splice(i, 1);
                continue;
            }

            ring._age += dtSec;

            // Move ring outward
            ring.x += ring._vx * dtSec;
            ring.y += ring._vy * dtSec;

            // Damage check: player within visual radius
            if (this._pulseHitTimers[i] > 0) {
                this._pulseHitTimers[i] -= dtSec;
            } else if (this.scene.player && !this.scene.player.dead) {
                const dx = playerX - ring.x;
                const dy = playerY - ring.y;
                // Approximate visual radius = 20 * current scaleX
                const visualRadius = 20 * ring.scaleX;
                if (dx * dx + dy * dy < (visualRadius + 12) * (visualRadius + 12)) {
                    this.scene.player.takeDamage(1, 0, -40);
                    this._pulseHitTimers[i] = 0.25; // per-ring cooldown
                }
            }

            // Lifetime check
            if (ring._age >= ring._maxLifetime) {
                if (ring && ring.active) ring.destroy();
                this._pulseProjectiles.splice(i, 1);
                this._pulseHitTimers.splice(i, 1);
            }
        }
    }

    /* ── Leash hooks ── */

    _onStartReturn() {
        this._endLaser();
        this._cleanupPulseRings();
        this.sprite.setAlpha(0.8);
    }

    _onReachedHome() {
        this.state = 'idle';
        this._alertTimer = 0;
        this._cooldown = 0;
        this._pulseTimer = 0;
        this.sprite.clearTint();
        this.sprite.setScale(1.5);
        this.sprite.setAlpha(1);
        this._cleanupPulseRings();
        if (this._laserGraphics) {
            this._laserGraphics.destroy();
            this._laserGraphics = null;
        }
    }

    _cleanupPulseRings() {
        this._pulseProjectiles.forEach(r => { if (r && r.active) r.destroy(); });
        this._pulseProjectiles = [];
        this._pulseHitTimers = [];
    }

    die() {
        this._cleanupPulseRings();
        if (this._laserGraphics) {
            this._laserGraphics.destroy();
            this._laserGraphics = null;
        }
        // Crystal fragments burst
        for (let i = 0; i < 6; i++) {
            const frag = this.scene.add.circle(
                this.x, this.y,
                Phaser.Math.Between(2, 4), 0x66ffff, 0.8,
            ).setDepth(50);
            this.scene.tweens.add({
                targets: frag,
                x: frag.x + Phaser.Math.Between(-40, 40),
                y: frag.y + Phaser.Math.Between(-40, 40),
                alpha: 0,
                duration: 400,
                onComplete: () => { if (frag && frag.active) frag.destroy(); },
            });
        }
        super.die();
    }
}
