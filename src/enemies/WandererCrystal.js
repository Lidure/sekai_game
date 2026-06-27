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
            leashDistance: 280,
            returnSpeed: 30,
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

                if (absDist < 180 && this._cooldown <= 0) {
                    this.state = 'aiming';
                    this._alertTimer = 0.8;
                    this.sprite.setTint(0x88ffff);
                }
                break;
            }

            case 'aiming': {
                this.body.setVelocity(0, 0);
                this._alertTimer -= dtSec;

                // Aim line: thin teal beam pointing at player
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

                // Pulse faster during aiming
                const pulse = Math.sin(this.scene.time.now / 50) * 0.08 + 1.1;
                this.sprite.setScale(1.5 * pulse);

                if (this._alertTimer <= 0) {
                    this._fireLaser();
                }
                break;
            }

            case 'firing': {
                this._laserDuration -= dtSec;

                // Draw sustained laser beam
                if (this._laserGraphics) this._laserGraphics.destroy();
                this._laserGraphics = this.scene.add.graphics().setDepth(12);
                this._laserGraphics.lineStyle(2.5, 0x66ffff, 0.8);
                this._laserGraphics.beginPath();
                this._laserGraphics.moveTo(this.x, this.y);

                const endX = this.x + Math.cos(this._aimAngle) * 300;
                const endY = this.y + Math.sin(this._aimAngle) * 300;
                this._laserGraphics.lineTo(endX, endY);
                this._laserGraphics.strokePath();

                // Glow aura
                this._laserGraphics.fillStyle(0x66ffff, 0.1);
                this._laserGraphics.fillCircle(this.x, this.y, 16);

                // Damage player every 300ms while in beam path
                this._laserHitTimer -= dtSec;
                if (this._laserHitTimer <= 0 && this.scene.player && !this.scene.player.dead) {
                    const px = this.scene.player.x;
                    const py = this.scene.player.y;

                    // Check if player is near the beam line
                    const dx = px - this.x;
                    const dy = py - this.y;
                    const beamDist = Math.abs(Math.cos(this._aimAngle) * dy - Math.sin(this._aimAngle) * dx);

                    if (beamDist < 20 && (dx * Math.cos(this._aimAngle) + dy * Math.sin(this._aimAngle)) > 0) {
                        this.scene.player.takeDamage(1, 0, -20);
                        this._laserHitTimer = 0.3;
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
        }
    }

    _fireLaser() {
        this.state = 'firing';
        this._laserDuration = 0.5;
        this._laserHitTimer = 0;
        this.sprite.setTint(0xc0ffff);

        // Firing sound
        this.scene.sound.play('sfx_enemy_attack', { volume: 0.5, detune: -500 });
    }

    _endLaser() {
        this.state = 'idle';
        this.sprite.clearTint();
        this.sprite.setScale(1.5);
        this._cooldown = 2.5;
        this._aimAngle = 0;

        if (this._laserGraphics) {
            this._laserGraphics.destroy();
            this._laserGraphics = null;
        }
    }

    /* ── Leash hooks ── */

    _onStartReturn() {
        this._endLaser();
    }

    _onReachedHome() {
        this.state = 'idle';
        this._alertTimer = 0;
        this._cooldown = 0;
        this.sprite.clearTint();
        this.sprite.setScale(1.5);
        if (this._laserGraphics) {
            this._laserGraphics.destroy();
            this._laserGraphics = null;
        }
    }

    die() {
        if (this._laserGraphics) {
            this._laserGraphics.destroy();
            this._laserGraphics = null;
        }
        // Burst into crystal fragments
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
