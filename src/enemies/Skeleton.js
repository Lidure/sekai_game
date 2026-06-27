/**
 * Skeleton - Patrol + Approach + Melee Attack enemy with SHIELD BLOCK.
 *
 * The skeleton has a 40% chance to block frontal attacks.
 * Back attacks always connect. Blocked attacks produce orange sparks,
 * a clang sound, and leave the skeleton staggered (0.3s vulnerable).
 *
 * Enrage (HP ≤ 4): faster attacks, no shield block.
 */
class Skeleton extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_skeleton_idle',
            hp: 25,
            contactDamage: 1,
            feelingsDrop: 8,
            bodyWidth: 28,
            bodyHeight: 44,
            leashDistance: 200,
            returnSpeed: 60,
        });

        this.sprite.setScale(1.0);
        this.sprite.setOrigin(0.5, 0.5);
        this._poseKey = 'enemy_skeleton_idle';

        // AI state
        this.patrolDir = Math.random() < 0.5 ? 1 : -1;
        this.state = 'patrol';

        // Attack timing
        this.attackCooldown = 0;
        this._attackTimer = 0;
        this.meleeDamage = 1;
        this._meleeHitDealt = false;

        // Enrage
        this._enraged = false;

        // Shield block
        this._isStaggered = false;
        this._staggerTimer = 0;
    }

    _setPose(key) {
        if (!this.sprite || !this.sprite.active || this._poseKey === key) return;
        this._poseKey = key;
        this.sprite.setTexture(key);
    }

    takeDamage(amount, knockbackX, knockbackY, hitstunFrames = 8) {
        if (this.invulnTimer > 0 || this.dead) return;

        // Shield block: 40% chance if not enraged, player is in front
        if (!this._enraged && this._tryBlock()) return;

        const prevHp = this.hp;
        super.takeDamage(amount, knockbackX, knockbackY, hitstunFrames);

        if (!this._enraged && prevHp > 4 && this.hp <= 4 && this.hp > 0) {
            this._enraged = true;
            this.state = 'patrol';
            this.patrolDir = Math.random() < 0.5 ? 1 : -1;
            this.scene.sound.play('sfx_enemy_attack', { volume: 0.6, detune: -300 });
            this.scene.time.delayedCall(100, () => {
                this._applyEnrageTint();
            });
        } else if (this._enraged && this.hp > 0) {
            this.scene.time.delayedCall(100, () => {
                this._applyEnrageTint();
            });
        }
    }

    /**
     * Attempt to block a frontal attack.
     * Returns true if the attack was blocked.
     */
    _tryBlock() {
        // Determine if player is in front of skeleton
        const player = this.scene.player;
        if (!player || player.dead) return false;

        const dx = player.x - this.x;
        const facingRight = !this.sprite.flipX;
        const playerInFront = facingRight ? (dx > 0) : (dx < 0);

        if (!playerInFront) return false; // back attacks always hit

        // 40% block chance
        if (Math.random() >= 0.4) return false;

        // ── Block successful ──
        // Orange spark burst
        for (let i = 0; i < 6; i++) {
            const spark = this.scene.add.circle(
                this.x + (facingRight ? 12 : -12), this.y - 10,
                Phaser.Math.Between(2, 4), 0xff8800, 0.9,
            ).setDepth(50);
            this.scene.tweens.add({
                targets: spark,
                x: spark.x + Phaser.Math.Between(-25, 25),
                y: spark.y + Phaser.Math.Between(-25, 25),
                alpha: 0,
                duration: 250,
                onComplete: () => { if (spark && spark.active) spark.destroy(); },
            });
        }

        // Clang sound
        this.scene.sound.play('sfx_enemy_hurt', { volume: 0.6, detune: -200 });

        // Stagger 0.3s (vulnerable, no movement)
        this._isStaggered = true;
        this._staggerTimer = 0.3;
        this.body.setVelocity(0, 0);
        this.sprite.setTint(0xffff00); // yellow flash
        if (this.state === 'attack') {
            this.state = 'approach';
            this._attackTimer = 0;
        }

        // Invuln frames so player can't hit again during stagger
        this.invulnTimer = 200;

        return true;
    }

    _applyEnrageTint() {
        if (this._enraged && this.sprite && this.sprite.active && !this.dead) {
            this.sprite.setTint(0xff4444);
        }
    }

    /**
     * @param {number} dt delta time in milliseconds
     * @param {number} playerX
     * @param {number} playerY
     */
    _updateAI(dt, playerX, playerY) {
        const dtSec = dt / 1000;

        // Stagger: frozen in place, vulnerable
        if (this._isStaggered) {
            this._staggerTimer -= dtSec;
            this.body.setVelocity(0, 0);
            if (this._staggerTimer <= 0) {
                this._isStaggered = false;
                this.sprite.clearTint();
                this._applyEnrageTint();
            }
            return;
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dtSec;

        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'patrol':
                this._setPose('enemy_skeleton_idle');
                this.body.setVelocityX(this.patrolDir * 35);

                if (this.body.blocked.left) this.patrolDir = 1;
                if (this.body.blocked.right) this.patrolDir = -1;

                this.sprite.setFlipX(this.patrolDir > 0);

                if (absDist < 160) {
                    this.state = 'approach';
                }
                break;

            case 'approach':
                this._setPose('enemy_skeleton_idle');
                this.body.setVelocityX(Math.sign(dist) * 45);
                this.sprite.setFlipX(dist > 0);

                if (absDist < 50 && this.attackCooldown <= 0) {
                    this.state = 'attack';
                    this._attackTimer = 0;
                    this._meleeHitDealt = false;
                }

                if (absDist > 200) {
                    this.state = 'patrol';
                }
                break;

            case 'attack': {
                this.body.setVelocityX(0);
                this.sprite.setFlipX(dist > 0);
                this._attackTimer += dtSec;

                const atk = this._enraged
                    ? { tel: 0.25, act: 0.1, rec: 0.2, lock: 0.1 }
                    : { tel: 0.40, act: 0.1, rec: 0.5, lock: 0.1 };
                const total = atk.tel + atk.act + atk.rec + atk.lock;

                if (this._attackTimer < atk.tel) {
                    this._setPose('enemy_skeleton_windup');
                    this.sprite.setTint(this._enraged ? 0xff8888 : 0xffffff);
                } else if (this._attackTimer < atk.tel + atk.act) {
                    this._setPose('enemy_skeleton_swing');
                    this.sprite.clearTint();

                    if (!this._meleeHitDealt) {
                        this._meleeHitDealt = true;
                        this.scene.cameras.main.shake(80, 0.02);

                        const dx = playerX - this.x;
                        const dy = Math.abs(this.y - playerY);
                        const facingRight = !this.sprite.flipX;
                        const isInFront = facingRight ? (dx > 0) : (dx < 0);

                        if (isInFront && Math.abs(dx) < 30 && dy < 10) {
                            const knockDir = facingRight ? 1 : -1;
                            this.scene.player.takeDamage(
                                this.meleeDamage,
                                80 * knockDir,
                                -30,
                            );
                        }
                    }
                } else if (this._attackTimer < atk.tel + atk.act + atk.rec) {
                    this._setPose('enemy_skeleton_idle');
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                } else if (this._attackTimer < total) {
                    this._setPose('enemy_skeleton_idle');
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                } else {
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                    this.attackCooldown = 2;
                    this._attackTimer = 0;
                    this.state = 'approach';
                }
                break;
            }
        }
    }

    /* ================================================================== */
    /*  Leash Hooks                                                          */
    /* ================================================================== */

    _onStartReturn() {
        this.sprite.clearTint();
        this._applyEnrageTint();
        this._isStaggered = false;
        this._staggerTimer = 0;
    }

    _onReachedHome() {
        this.state = 'patrol';
        this.patrolDir = Math.random() < 0.5 ? 1 : -1;
        this.attackCooldown = 0;
        this._attackTimer = 0;
        this._meleeHitDealt = false;
        this._isStaggered = false;
        this._staggerTimer = 0;
        this.sprite.clearTint();
        this._applyEnrageTint();
        this._setPose('enemy_skeleton_idle');
    }

    die() {
        this.sprite.clearTint();
        super.die();
    }
}
