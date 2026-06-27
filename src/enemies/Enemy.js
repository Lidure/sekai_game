/**
 * Enemy — Base class for all overworld enemies.
 *
 * Provides shared functionality:
 *   - Physics sprite creation and body setup
 *   - takeDamage() with hit flash, invulnerability, knockback, death
 *   - die() with particle burst + fade-out
 *   - Overridable _updateAI() for per-enemy state machines
 *
 * Subclasses override _updateAI() and set their own stats via super() config.
 */
class Enemy {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {object} config
     * @param {string}  config.textureKey    — sprite key registered in BootScene
     * @param {number}  config.hp            — hit points
     * @param {number}  config.contactDamage — damage dealt on touching player
     * @param {number}  config.feelingsDrop  — Feelings gained on kill
     * @param {number}  [config.bodyWidth]   — physics body width (defaults to sprite width)
     * @param {number}  [config.bodyHeight]  — physics body height
     * @param {boolean} [config.noGravity]   — true for floating enemies
     */
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.state = 'idle';
        this.dead = false;
        this.invulnTimer = 0;
        this.hitstun = 0;

        // Stats
        this.hp = config.hp || 1;
        this.maxHp = config.hp || 1;
        this.contactDamage = config.contactDamage || 5;
        this.feelingsDrop = config.feelingsDrop || 0;

        // ── Anchor / Leash ──
        this.spawnX = x;
        this.spawnY = y;
        this.isReturning = false;
        this.leashDistance = config.leashDistance || 200;
        this.returnSpeed = config.returnSpeed || 80;

        // Sprite
        this.sprite = scene.physics.add.sprite(x, y, config.textureKey);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDepth(5);

        // Custom physics body size
        if (config.bodyWidth && config.bodyHeight) {
            this.sprite.body.setSize(config.bodyWidth, config.bodyHeight);
        }
        if (config.noGravity) {
            this.sprite.body.setAllowGravity(false);
        }
    }

    /** Accessors matching the Player pattern */
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    get body() { return this.sprite.body; }

    /**
     * Called every frame from GameScene update loop.
     * Calls _updateAI() for the subclass state machine.
     * @param {number} delta — frame delta in ms
     * @param {number} playerX
     * @param {number} playerY
     */
    update(delta, playerX, playerY) {
        if (this.dead) return;
        if (this.invulnTimer > 0) this.invulnTimer--;

        // Hitstun: enemy freezes (no AI) while knockback slides them
        if (this.hitstun > 0) {
            this.hitstun--;
            return;
        }

        // ── Return-to-spawn (leash) ──
        if (this.isReturning) {
            this._updateReturnHome();
            return;
        }

        const dx = this.x - this.spawnX;
        const dy = this.y - this.spawnY;
        if (dx * dx + dy * dy > this.leashDistance * this.leashDistance) {
            this._startReturnHome();
            return;
        }

        this._updateAI(delta, playerX, playerY);
    }

    /**
     * Override in subclass with state-machine logic.
     * @protected
     */
    _updateAI(delta, playerX, playerY) {
        // no-op in base
    }

    /* ================================================================== */
    /*  Leash / Return-to-Spawn                                              */
    /* ================================================================== */

    /**
     * Called by update() when the enemy is too far from spawn.
     * Override in subclass to cancel telegraphs / clean up temporary state.
     * @protected
     */
    _startReturnHome() {
        this.isReturning = true;
        this.body.setVelocity(0, 0);
        this._onStartReturn();
    }

    /**
     * Moves the enemy back toward its spawn position every frame while returning.
     * Flying enemies move on both axes; grounded enemies move only on X (gravity handles Y).
     */
    _updateReturnHome() {
        const dx = this.spawnX - this.x;
        if (Math.abs(dx) < 8) {
            // Reached home
            this.body.setVelocityX(0);
            const dy = this.spawnY - this.y;
            if (this.body.allowGravity === false && Math.abs(dy) > 8) {
                // Still need to descend
                this.body.setVelocityY(Math.sign(dy) * this.returnSpeed);
                return;
            }
            if (this.body.allowGravity === false) {
                this.body.setVelocityY(0);
            }
            this.isReturning = false;
            this._onReachedHome();
            return;
        }

        this.body.setVelocityX(Math.sign(dx) * this.returnSpeed);

        if (this.body.allowGravity === false) {
            const dy = this.spawnY - this.y;
            this.body.setVelocityY(Math.sign(dy) * this.returnSpeed);
        }

        if (this.sprite) {
            this.sprite.setFlipX(this.body.velocity.x > 0);
        }
    }

    /**
     * Hook called when return-to-spawn begins.
     * Cancel telegraphs, kill delayed calls, clean up temp VFX.
     * @protected
     */
    _onStartReturn() {
        // Override in subclass
    }

    /**
     * Hook called when the enemy has arrived back at its spawn position.
     * Reset state machine to default (patrol / hover).
     * @protected
     */
    _onReachedHome() {
        // Override in subclass
    }

    /**
     * Called when the player's slash hitbox overlaps this enemy.
     * @param {number} amount — raw damage from the attack
     * @param {number} knockbackX
     * @param {number} knockbackY
     * @param {number} [hitstunFrames=8] — frames of AI freeze during knockback
     */
    takeDamage(amount, knockbackX, knockbackY, hitstunFrames = 8) {
        if (this.invulnTimer > 0 || this.dead) return;
        this.hp -= amount;
        this.invulnTimer = 30; // 0.5s i-frames

        // Audio
        this.scene.sound.play('sfx_enemy_hurt', { volume: 0.65, detune: Phaser.Math.Between(-100, 100) });

        // Hit flash (white tint for 100ms)
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.sprite && this.sprite.active && !this.dead) {
                this.sprite.clearTint();
            }
        });

        // Knockback velocity (slides enemy during hitStop/hitstun)
        this.body.velocity.x += knockbackX;
        this.body.velocity.y += knockbackY;

        // Ensure a small vertical pop so the enemy visibly lifts off the ground.
        // This adds to any existing knockbackY for a satisfying knockback arc.
        this.body.velocity.y = Math.min(this.body.velocity.y, -80);

        // Hitstun: freeze AI for given frames, enemy slides from knockback velocity
        this.hitstun = hitstunFrames;

        // Death check
        if (this.hp <= 0) {
            this.die();
        }
    }

    /** Plays death effect and marks enemy for removal. */
    die() {
        this.dead = true;
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);
        this.body.setEnable(false);

        // Audio
        this.scene.sound.play('sfx_enemy_death', { volume: 0.7, detune: Phaser.Math.Between(-200, 0) });

        this._spawnDeathParticles();

        // Fade out and destroy
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (this.sprite && this.sprite.active) this.sprite.destroy();
            },
        });
    }

    /** Burst of 5 small white→blue particles. */
    _spawnDeathParticles() {
        for (let i = 0; i < 5; i++) {
            const p = this.scene.add.circle(
                this.x, this.y,
                Phaser.Math.Between(2, 4),
                0xa8d8ff, 0.8
            ).setDepth(50);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-25, 25),
                y: p.y + Phaser.Math.Between(-25, 25),
                alpha: 0,
                scale: 0.2,
                duration: 400,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }
}
