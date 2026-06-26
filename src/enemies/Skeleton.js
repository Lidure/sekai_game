/**
 * Skeleton - Patrol + Approach + Melee Attack enemy with enrage mechanic.
 */
class Skeleton extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_skeleton_idle',
            hp: 25,
            contactDamage: 3,
            feelingsDrop: 8,
            bodyWidth: 28,
            bodyHeight: 44,
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
        this.meleeDamage = 12;
        this._meleeHitDealt = false;

        // Enrage
        this._enraged = false;
    }

    _setPose(key) {
        if (!this.sprite || !this.sprite.active || this._poseKey === key) return;
        this._poseKey = key;
        this.sprite.setTexture(key);
    }

    takeDamage(amount, knockbackX, knockbackY, hitstunFrames = 8) {
        const prevHp = this.hp;
        super.takeDamage(amount, knockbackX, knockbackY, hitstunFrames);

        if (!this._enraged && prevHp > 4 && this.hp <= 4 && this.hp > 0) {
            this._enraged = true;
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

    die() {
        this.sprite.clearTint();
        super.die();
    }
}
