/**
 * Skeleton - Patrol + Approach + Melee Attack enemy with SHIELD BLOCK + SHIELD BASH.
 *
 * HK-style state machine:
 *   PATROL  → walk at 45px/s, reverse on walls
 *           → player within 120px → APPROACH
 *   APPROACH → walk toward player at 45px/s
 *           → player < 80px → decide:
 *              - 50% SHIELD_BASH (new defensive advance)
 *              - 50% ATTACK (normal melee)
 *           → player > 200px → PATROL
 *   ATTACK  → telegraph (0.15s enraged / 0.28s normal)
 *           → strike (0.12-0.18s)
 *           → recovery (0.12-0.30s) → BACKSTEP
 *   BACKSTEP → hop backward 40px over 0.3s (creates space, HK-style)
 *           → APPROACH
 *   SHIELD_BASH → telegraph (0.3s, yellow flash + sparks)
 *           → advance at 80px/s for 0.4s, knockback 120px
 *           → if hit connects: player 1 damage + knockback
 *           → stagger (0.2s vulnerable) → APPROACH
 *
 * SHIELD BLOCK: 35% chance (down from 40%) to block frontal attacks
 *   - Back attacks always hit
 *   - Blocked: orange sparks, clang, stagger 0.3s
 *
 * ENRAGE (HP ≤ 5, down from ≤4):
 *   - Attacks faster: tel:0.15, act:0.12, rec:0.12 (from 0.20/0.18/0.18)
 *   - No shield block (enraged aggression)
 *   - Red tint
 *
 * POGO: Supported (via base class _isPogoHit)
 * LEASH: tightened to 120px
 */
class Skeleton extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y - 12, {
            textureKey: 'enemy_skeleton_idle_01',
            hp: 25,
            contactDamage: 1,
            feelingsDrop: 8,
            bodyWidth: 18,
            bodyHeight: 24,
            leashDistance: 120,
            returnSpeed: 70,
        });

        this.sprite.setScale(0.34);
        this.sprite.setOrigin(0.5, 0.5);
        this._poseKey = 'enemy_skeleton_idle_anim';
        this._facingRight = true;
        this._attackReach = 80;      // tightened from 88
        this._attackHeight = 24;
        this._strikeFired = false;

        // AI state
        this.patrolDir = Math.random() < 0.5 ? 1 : -1;
        this.state = 'patrol';
        this._setFacingRight(this.patrolDir > 0);
        if (this.sprite && this.sprite.body) {
            this.sprite.body.setOffset(8, 18);
        }

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

        // Backstep
        this._backstepTimer = 0;

        // Shield bash
        this._bashTimer = 0;
        this._bashHitDealt = false;
    }

    _setPose(key) {
        if (!this.sprite || !this.sprite.active || this._poseKey === key) return;
        this._poseKey = key;
        this.sprite.play(key, true);
    }

    _setFacingRight(facingRight) {
        this._facingRight = !!facingRight;
        if (this.sprite && this.sprite.active) {
            this.sprite.setFlipX(!this._facingRight);
        }
    }

    takeDamage(amount, knockbackX, knockbackY, hitstunFrames = 8) {
        if (this.invulnTimer > 0 || this.dead) return;

        // Pogo check
        const player = this.scene.player;
        if (player && this._isPogoHit(player)) {
            this._handlePogoHit(amount);
            return;
        }

        // Shield block: 35% chance if not enraged, player is in front
        if (!this._enraged && this._tryBlock()) return;

        const prevHp = this.hp;
        super.takeDamage(amount, knockbackX, knockbackY, hitstunFrames);

        if (!this._enraged && prevHp > 5 && this.hp <= 5 && this.hp > 0) {
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

    _tryBlock() {
        const player = this.scene.player;
        if (!player || player.dead) return false;

        const dx = player.x - this.x;
        const facingRight = this._facingRight;
        const playerInFront = facingRight ? (dx > 0) : (dx < 0);

        if (!playerInFront) return false;

        // 35% block chance (reduced from 40%)
        if (Math.random() >= 0.35) return false;

        // Block successful
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

        this.scene.sound.play('sfx_enemy_hurt', { volume: 0.6, detune: -200 });

        this._isStaggered = true;
        this._staggerTimer = 0.3;
        this.body.setVelocity(0, 0);
        this.sprite.setTint(0xffff00);
        if (this.state === 'attack' || this.state === 'shield_bash') {
            this.state = 'approach';
            this._attackTimer = 0;
            this._strikeFired = false;
            this._bashHitDealt = false;
        }

        this.invulnTimer = 200;

        return true;
    }

    _applyEnrageTint() {
        if (this._enraged && this.sprite && this.sprite.active && !this.dead) {
            this.sprite.setTint(0xff4444);
        }
    }

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
                this._setPose('enemy_skeleton_run_anim');
                this.body.setVelocityX(this.patrolDir * 45); // increased from 35
                if (this.body.blocked.left) this.patrolDir = 1;
                if (this.body.blocked.right) this.patrolDir = -1;
                this._setFacingRight(this.patrolDir > 0);
                if (absDist < 120) { // tightened from 160
                    this.state = 'approach';
                }
                break;

            case 'approach':
                this._setPose('enemy_skeleton_run_anim');
                this.body.setVelocityX(Math.sign(dist) * 45);
                this._setFacingRight(dist > 0);

                if (absDist < 80 && this.attackCooldown <= 0) {
                    // 50% shield bash, 50% normal attack (new)
                    if (!this._enraged && Math.random() < 0.5) {
                        this.state = 'shield_bash';
                        this._bashTimer = 0;
                        this._bashHitDealt = false;
                        this._setPose('enemy_skeleton_idle_anim');
                    } else {
                        this.state = 'attack';
                        this._attackTimer = 0;
                        this._meleeHitDealt = false;
                        this._strikeFired = false;
                    }
                }

                if (absDist > 200) {
                    this.state = 'patrol';
                }
                break;

            /* ————— NORMAL ATTACK ————— */
            case 'attack': {
                this.body.setVelocityX(0);
                this._setFacingRight(dist > 0);
                this._attackTimer += dtSec;

                const atk = this._enraged
                    ? { tel: 0.15, act: 0.12, rec: 0.12, lock: 0.08 }  // faster enrage
                    : { tel: 0.28, act: 0.16, rec: 0.30, lock: 0.10 };
                const total = atk.tel + atk.act + atk.rec + atk.lock;

                if (this._attackTimer < atk.tel) {
                    this._setPose('enemy_skeleton_attack_windup_anim');
                    this.sprite.setTint(this._enraged ? 0xff8888 : 0xffffff);
                } else if (this._attackTimer < atk.tel + atk.act) {
                    this._setPose('enemy_skeleton_attack_strike_anim');
                    this.sprite.clearTint();

                    if (!this._strikeFired) {
                        this._strikeFired = true;
                        const forwardDist = this._facingRight
                            ? (playerX - this.x)
                            : (this.x - playerX);
                        const verticalDist = Math.abs(playerY - this.y);

                        if (forwardDist >= -6 && forwardDist <= this._attackReach && verticalDist <= this._attackHeight) {
                            const knockDir = this._facingRight ? 1 : -1;
                            this.scene.player.takeDamage(
                                this.meleeDamage,
                                90 * knockDir,
                                -28,
                            );
                        }
                    }
                } else if (this._attackTimer < atk.tel + atk.act + atk.rec) {
                    this._setPose('enemy_skeleton_idle_anim');
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                } else if (this._attackTimer < total) {
                    this._setPose('enemy_skeleton_idle_anim');
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                } else {
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                    this._attackTimer = 0;
                    this._strikeFired = false;
                    // Go to BACKSTEP instead of directly to APPROACH
                    this.state = 'backstep';
                    this._backstepTimer = 0.3;
                    this.attackCooldown = 1.35;
                }
                break;
            }

            /* ————— BACKSTEP (new) ————— */
            case 'backstep': {
                this._backstepTimer -= dtSec;
                this._setPose('enemy_skeleton_run_anim');
                // Hop backward (away from player)
                this.body.setVelocityX(Math.sign(-dist) * 133); // ~40px over 0.3s
                if (this._backstepTimer <= 0) {
                    this.body.setVelocityX(0);
                    this.state = 'approach';
                }
                break;
            }

            /* ————— SHIELD BASH (new) ————— */
            case 'shield_bash': {
                this._bashTimer += dtSec;
                this._setFacingRight(dist > 0);
                const bashTel = 0.3;
                const bashAct = 0.4;
                const bashRec = 0.2;
                const bashTotal = bashTel + bashAct + bashRec;

                if (this._bashTimer < bashTel) {
                    // Telegraph: yellow flash + orange spark particles
                    this.body.setVelocityX(0);
                    this.sprite.setTint(0xffff00);
                    if (this._bashTimer < dtSec) {
                        // Burst of orange sparks on entry
                        for (let i = 0; i < 4; i++) {
                            const spark = this.scene.add.circle(
                                this.x + (this._facingRight ? 10 : -10), this.y - 8,
                                Phaser.Math.Between(2, 3), 0xff8800, 0.8,
                            ).setDepth(50);
                            this.scene.tweens.add({
                                targets: spark,
                                x: spark.x + Phaser.Math.Between(-20, 20),
                                y: spark.y + Phaser.Math.Between(-15, 15),
                                alpha: 0,
                                duration: 300,
                                onComplete: () => { if (spark && spark.active) spark.destroy(); },
                            });
                        }
                    }
                } else if (this._bashTimer < bashTel + bashAct) {
                    // Advance forward at 80px/s
                    this.sprite.clearTint();
                    const bashDir = this._facingRight ? 1 : -1;
                    this.body.setVelocityX(bashDir * 80);
                    this._setPose('enemy_skeleton_run_anim');

                    // Check bash connect with player (once)
                    if (!this._bashHitDealt && this.scene.player && !this.scene.player.dead) {
                        const kbDir = this._facingRight ? 1 : -1;
                        const fDist = this._facingRight
                            ? (playerX - this.x)
                            : (this.x - playerX);
                        const vDist = Math.abs(playerY - this.y);
                        if (fDist >= -4 && fDist <= 50 && vDist <= 28) {
                            this._bashHitDealt = true;
                            this.scene.player.takeDamage(1, kbDir * 120, -20);
                        }
                    }
                } else if (this._bashTimer < bashTotal) {
                    // Stagger (vulnerable)
                    this.body.setVelocityX(0);
                    this.sprite.setAlpha(0.6);
                    this.sprite.setTint(0x5577aa); // recovery: blue tint
                } else {
                    // Done → approach
                    this.body.setVelocityX(0);
                    this.sprite.setAlpha(1);
                    this.sprite.clearTint();
                    this._applyEnrageTint();
                    this._bashTimer = 0;
                    this._bashHitDealt = false;
                    this.attackCooldown = 1.5;
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
        this.sprite.setAlpha(0.8);
        this._isStaggered = false;
        this._staggerTimer = 0;
    }

    _updateReturnHome() {
        const dx = this.spawnX - this.x;
        if (Math.abs(dx) < 8) {
            this.body.setVelocityX(0);
            const dy = this.spawnY - this.y;
            if (this.body.allowGravity === false && Math.abs(dy) > 8) {
                this.body.setVelocityY(Math.sign(dy) * this.returnSpeed);
                return;
            }
            if (this.body.allowGravity === false) {
                this.body.setVelocityY(0);
            }
            this.isReturning = false;
            this.sprite.clearTint();
            this.sprite.setAlpha(1);
            this._onReachedHome();
            return;
        }

        this.body.setVelocityX(Math.sign(dx) * this.returnSpeed);
        this._setFacingRight(dx > 0);

        if (this.body.allowGravity === false) {
            const dy = this.spawnY - this.y;
            this.body.setVelocityY(Math.sign(dy) * this.returnSpeed);
        }
    }

    _onReachedHome() {
        this.state = 'patrol';
        this.patrolDir = Math.random() < 0.5 ? 1 : -1;
        this.attackCooldown = 0;
        this._attackTimer = 0;
        this._meleeHitDealt = false;
        this._strikeFired = false;
        this._isStaggered = false;
        this._staggerTimer = 0;
        this._bashTimer = 0;
        this._bashHitDealt = false;
        this._backstepTimer = 0;
        this.sprite.clearTint();
        this._applyEnrageTint();
        this.sprite.setAlpha(1);
        this._setFacingRight(this.patrolDir > 0);
        this._setPose('enemy_skeleton_idle_anim');
    }

    die() {
        if (this.dead) return;
        this.dead = true;
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);
        this.body.setEnable(false);

        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.sprite.play('enemy_skeleton_death_anim', true);

        this.scene.sound.play('sfx_enemy_death', { volume: 0.7, detune: Phaser.Math.Between(-200, 0) });
        this._spawnDeathParticles();

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
}
