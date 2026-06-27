/**
 * ShadowFragment — Ambush predator with SPLIT attack.
 *
 * Parent state machine (HK-style):
 *   AMBUSH → translucent α=0.3, stationary. Player within 120px → ALERT
 *   ALERT  → 0.3s telegraph (red glow, scale pulse) → RUSH
 *   RUSH   → 2x speed charge at player, 0.5s or wall hit → DAZE
 *   DAZE   → 0.5s recovery, fully vulnerable → AMBUSH
 *   SPLIT  → first hit: red tint telegraph (0.6s), spawn 2 children
 *
 * Children (ShadowFragmentChild):
 *   - Use old patrol/chase AI, 8-second lifetime
 *   - hp=3, scale 0.8, contactDamage=5
 *
 * Narrative: A fragment of doubt. It hides in the dark and lunges
 *            when you least expect it — like a thought you tried to bury.
 */
class ShadowFragment extends Enemy {
    constructor(scene, x, y, isChild = false) {
        super(scene, x, y, {
            textureKey: 'enemy_shadow',
            hp: isChild ? 3 : 12,
            contactDamage: 1,
            feelingsDrop: isChild ? 1 : 2,
            bodyWidth: 22,
            bodyHeight: 26,
            leashDistance: 200,
            returnSpeed: 60,
        });

        this.sprite.setScale(isChild ? 0.8 : 1.35);
        this.sprite.setOrigin(0.5, 0.5);

        this._isChild = isChild;
        this._splitGfx = []; // temporary graphics to clean up
        this._hasSplit = false;
        this._alertTimer = 0;
        this._rushTimer = 0;
        this._dazeTimer = 0;

        if (isChild) {
            this.patrolSpeed = 60;
            this.chaseSpeed = 97.5;
            this.patrolDir = Math.random() < 0.5 ? 1 : -1;
            this.state = 'patrol';
            this.sprite.setAlpha(1);
        } else {
            this.ambushSpeed = 130; // 2x charge speed
            this.state = 'ambush';
            this.sprite.setAlpha(0.3);
        }

        // Child lifetime countdown (seconds)
        this._childLifetime = isChild ? 8 : 0;
        this._childFading = false;

        // Split telegraph handle (cancellable)
        this._splitDelayedCall = null;

        // Clean up temporary graphics when sprite is destroyed
        // (room transition, game over, etc.)
        this.sprite.on('destroy', () => this._cleanupSplitGfx());
    }

    /* ================================================================== */
    /*  DAMAGE OVERRIDE — intercept first hit to trigger SPLIT               */
    /* ================================================================== */

    takeDamage(amount, knockbackX, knockbackY, hitstunFrames = 8) {
        if (this.invulnTimer > 0 || this.dead) return;

        // First hit on a non-child → SPLIT state instead of normal damage
        if (!this._isChild && !this._hasSplit) {
            this._hasSplit = true;
            this.hp = Math.max(1, this.hp - 1); // visual indicator of damage

            // Hit feedback
            this.invulnTimer = 30;
            this.scene.sound.play('sfx_enemy_hurt', { volume: 0.65, detune: Phaser.Math.Between(-100, 100) });
            this.sprite.setTint(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (this.sprite && this.sprite.active && !this.dead) {
                    this.sprite.clearTint();
                }
            });

            this._enterSplitState();
            return;
        }

        super.takeDamage(amount, knockbackX, knockbackY, hitstunFrames);
    }

    /* ================================================================== */
    /*  SPLIT TELEGRAPH + EXECUTION                                          */
    /* ================================================================== */

    _enterSplitState() {
        this.state = 'split';
        this.body.setVelocity(0, 0);

        // Stop any patrol tween-like movement
        this.scene.sound.play('sfx_enemy_hurt', { volume: 0.7, detune: Phaser.Math.Between(-200, 0) });
        this.sprite.setTint(0xff4444);

        // ── Telegraph: grow 1.0→1.3 scale over 0.6s ──
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 600,
            ease: 'Sine.easeIn',
        });

        // ── Telegraph: flash pulse (alpha blink) ──
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: { from: 1, to: 0.4 },
            duration: 120,
            yoyo: true,
            repeat: 4,
            ease: 'Sine.easeInOut',
        });

        // ── Spawn children after 0.6s ──
        this._splitDelayedCall = this.scene.time.delayedCall(600, () => {
            // Guard: if enemy was killed during telegraph, or scene changed
            if (this.dead || !this.sprite || !this.sprite.active) return;
            this._doSplit();
        });
    }

    _doSplit() {
        const offsets = [-30, 30];

        for (const off of offsets) {
            const child = new ShadowFragment(this.scene, this.x + off, this.y, true);
            this.scene.enemyGroup.add(child.sprite);
            this.scene.enemyInstances.push(child);
            // Child auto-fades via frame-based _childLifetime in _updateAI
        }

        // ── Split burst particle effect ──
        for (let i = 0; i < 6; i++) {
            const p = this.scene.add.circle(
                this.x, this.y,
                Phaser.Math.Between(2, 4),
                0xff4444, 0.9,
            ).setDepth(50);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-40, 40),
                y: p.y + Phaser.Math.Between(-40, 40),
                alpha: 0,
                scale: 0.2,
                duration: 350,
                ease: 'Power2',
                onComplete: () => { if (p && p.active) p.destroy(); },
            });
        }

        // Audio — split sound
        this.scene.sound.play('sfx_enemy_death', { volume: 0.6, detune: 200 });

        // ── Destroy parent (instant vanish, no death particles) ──
        this.dead = true;
        this.body.setEnable(false);
        this._cleanupSplitGfx();
        if (this.sprite && this.sprite.active) this.sprite.destroy();
    }

    _startFadeOut() {
        if (this.dead || this._childFading) return;
        this._childFading = true;
        this.dead = true;
        this.body.setEnable(false);
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                if (this.sprite && this.sprite.active) this.sprite.destroy();
            },
        });
    }

    _cleanupSplitGfx() {
        this._splitGfx.forEach(g => { if (g && g.active) g.destroy(); });
        this._splitGfx = [];
    }

    /* ================================================================== */
    /*  AI STATE MACHINE                                                     */
    /* ================================================================== */

    _updateAI(dt, playerX, playerY) {
        // Child: patrol/chase with lifetime (same as before)
        if (this._isChild) {
            if (!this._childFading) {
                this._childLifetime -= dt / 1000;
                if (this._childLifetime <= 0) {
                    this._startFadeOut();
                    return;
                }
            }
            switch (this.state) {
                case 'patrol':
                    this.body.setVelocityX(this.patrolDir * this.patrolSpeed);
                    if (this.body.blocked.left) this.patrolDir = 1;
                    if (this.body.blocked.right) this.patrolDir = -1;
                    if (Math.abs(playerX - this.x) < 150) this.state = 'chase';
                    break;
                case 'chase':
                    this.body.setVelocityX(Math.sign(playerX - this.x) * this.chaseSpeed);
                    if (Math.abs(playerX - this.x) > 200) {
                        this.state = 'patrol';
                    } else if (this.body.blocked.left) {
                        this.patrolDir = 1;
                        this.state = 'patrol';
                    } else if (this.body.blocked.right) {
                        this.patrolDir = -1;
                        this.state = 'patrol';
                    }
                    break;
            }
            this.sprite.setFlipX(this.body.velocity.x > 0);
            return;
        }

        // ────────── Parent: ambush → alert → rush → daze ──────────

        if (this.state === 'split') return;

        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'ambush':
                this.body.setVelocity(0, 0);
                if (absDist < 120) {
                    this.state = 'alert';
                    this._alertTimer = 300; // 0.3s
                    this.sprite.setAlpha(1);
                    this.sprite.setTint(0xff6666);
                }
                break;

            case 'alert':
                this.body.setVelocity(0, 0);
                this._alertTimer -= dt;
                if (this._alertTimer <= 0) {
                    this.state = 'rush';
                    this._rushTimer = 500; // 0.5s max charge
                    this.sprite.clearTint();
                    this.body.setVelocityX(Math.sign(dist) * this.ambushSpeed);
                }
                break;

            case 'rush':
                this._rushTimer -= dt;
                if (this._rushTimer <= 0 || this.body.blocked.left || this.body.blocked.right) {
                    this.state = 'daze';
                    this._dazeTimer = 500; // 0.5s recovery
                    this.body.setVelocity(0, 0);
                    this.sprite.setAlpha(0.6);
                }
                break;

            case 'daze':
                this.body.setVelocity(0, 0);
                this._dazeTimer -= dt;
                if (this._dazeTimer <= 0) {
                    this.state = 'ambush';
                    this.sprite.setAlpha(0.3);
                    this.sprite.clearTint();
                }
                break;
        }

        this.sprite.setFlipX(this.body.velocity.x > 0);
    }

    /* ================================================================== */
    /*  Leash Hooks                                                          */
    /* ================================================================== */

    _onStartReturn() {
        // Cancel split telegraph
        if (this._splitDelayedCall) {
            this._splitDelayedCall.remove();
            this._splitDelayedCall = null;
        }
        // Kill any split-related tweens on the sprite
        this.scene.tweens.killTweensOf(this.sprite);
        // Reset visual state
        this.sprite.setScale(1.35);
        this.sprite.setAlpha(1);
        this.sprite.clearTint();
        this._cleanupSplitGfx();
    }

    _onReachedHome() {
        if (this._isChild) return;
        // Reset to ambush
        this.state = 'ambush';
        this._hasSplit = false;
        this._alertTimer = 0;
        this._rushTimer = 0;
        this._dazeTimer = 0;
        this.sprite.setScale(1.35);
        this.sprite.setAlpha(0.3);
        this.sprite.clearTint();
        this.body.setVelocity(0, 0);
    }

    /* ================================================================== */
    /*  DEATH CLEANUP                                                        */
    /* ================================================================== */

    die() {
        this._cleanupSplitGfx();
        super.die();
    }
}
