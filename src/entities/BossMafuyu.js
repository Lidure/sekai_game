class BossMafuyu {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'boss_idle');
        this.sprite.setScale(0.18);
        // Texture source: 720x720, scale 0.18 → ~130x130 visual; body 267x356 in texture space → 48x64 physics body
        this.sprite.body.setSize(267, 356);
        // Offset centers the 48x64 body on the 129.6x129.6 scaled sprite
        this.sprite.body.setOffset(227, 188);
        this.sprite.setDepth(15);
        this.sprite.setCollideWorldBounds(true);

        this.maxHp = 300;
        this.hp = this.maxHp;
        this.phase = 1;
        this.state = 'idle';
        this.aiTimer = 0;
        this.aiCooldowns = { A: 0, B: 0, C: 0, D: 0 };
        this.stateTimer = 0;
        this.facingRight = false;
        this.vulnerable = true;
        this.invulnTimer = 0;
        this.targetX = x;
        this.targetY = y;

        this.meleeHitbox = scene.add.zone(0, 0, 40, 30);
        scene.physics.add.existing(this.meleeHitbox, false);
        this.meleeHitbox.body.setAllowGravity(false);
        this.meleeHitbox.setVisible(false).setDepth(14);

        this.desperate = false;
        this.transitioning = false;
        this.defeated = false;

        this.yBobTween = scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y + 12,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    get body() { return this.sprite.body; }
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }

    takeDamage(amount, knockbackX, knockbackY) {
        if (!this.vulnerable || this.invulnTimer > 0 || this.defeated) return;
        this.hp -= amount;
        this.invulnTimer = 8;
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => this.sprite.clearTint());
        this.body.velocity.x = this.facingRight ? -knockbackX : knockbackX;
        this.body.velocity.y = knockbackY;
        // Audio — metal clang on boss hit
        this.scene.sound.play('sfx_boss_hit', { volume: 0.6, detune: Phaser.Math.Between(-80, 80) });

        if (this.hp <= this.maxHp / 2 && this.phase === 1) {
            this._startPhaseTransition();
        }
        if (this.hp <= 50 && this.phase === 2) {
            this.desperate = true;
        }
        if (this.hp <= 0) {
            this._die();
        }
    }

    _startPhaseTransition() {
        if (this.transitioning) return;
        this.transitioning = true;
        if (this.yBobTween) this.yBobTween.stop();
        this.vulnerable = false;
        this.state = 'phase_transition';
        this.body.setVelocity(0, 0);
        this.sprite.setTexture('boss_liberation');

        // Simple camera flash only
        this.scene.cameras.main.flash(300, 255, 255, 255);

        // Audio — fade out Phase 1 BGM, fade in Phase 2 BGM
        const scene = this.scene;
        if (scene.bgmPhase1) {
            scene.tweens.add({
                targets: scene.bgmPhase1,
                volume: 0,
                duration: 1500,
                onComplete: () => { scene.bgmPhase1.stop(); scene.bgmPhase1.destroy(); scene.bgmPhase1 = null; },
            });
        }
        scene.time.delayedCall(800, () => {
            if (!scene.bgmPhase2) {
                scene.bgmPhase2 = scene.sound.add('bgm_boss_p2', { loop: true, volume: 0 });
                scene.bgmPhase2.play();
                scene.tweens.add({
                    targets: scene.bgmPhase2,
                    volume: 0.45,
                    duration: 1500,
                });
            }
        });

        this.scene.time.delayedCall(500, () => {
            // Use velocity to fly upward instead of tweening sprite position
            this.body.setVelocityY(-180);  // Fly up
            this.scene.time.delayedCall(1000, () => {
                this.body.setVelocityY(0);
                this.phase = 2;
                this.desperate = false;
                this.transitioning = false;
                this.vulnerable = true;
                this.state = 'idle';
                this.sprite.setTexture('boss_liberation');
            });
        });
    }

    _die() {
        this.defeated = true;
        this.vulnerable = false;
        this.state = 'dead';
        this.body.setVelocity(0, 0);
        this.body.setAllowGravity(false);
        this.body.enable = false;
        this.sprite.setTexture('boss_cower');
        if (this.yBobTween) this.yBobTween.stop();

        // Audio — boss defeat SFX, then victory chime
        this.scene.sound.play('sfx_boss_death', { volume: 0.75 });
        this.scene.time.delayedCall(1200, () => {
            this.scene.sound.play('sfx_combo_victory', { volume: 0.6 });
        });

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            y: this.sprite.y - 30,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.scene.onBossDefeated();
            },
        });
    }

    update(delta) {
        if (this.defeated || this.transitioning) return;

        const dt = delta / 1000;
        if (this.invulnTimer > 0) this.invulnTimer--;

        // Decrement timers once per frame here (not in _updatePhase1/_updatePhase2)
        // to prevent double-decrement when Phase 2 delegates to Phase 1 states (M-01)
        this.aiTimer -= dt;
        for (const k in this.aiCooldowns) {
            if (this.aiCooldowns[k] > 0) {
                const desperateMod = (this.phase === 2 && this.desperate) ? 0.7 : 1;
                this.aiCooldowns[k] -= dt * desperateMod;
            }
        }

        if (this.phase === 1) this._updatePhase1(dt);
        else this._updatePhase2(dt);
    }

    _updatePhase1(dt) {
        // Note: aiTimer and aiCooldowns decremented in update() to avoid double-decrement (M-01)

        const player = this.scene.player;
        if (!player || player.dead) return;
        const dx = player.x - this.x;
        const dist = Math.abs(dx);
        this.facingRight = dx > 0;

        switch (this.state) {
            case 'idle':
                this.sprite.setTexture('boss_idle');
                if (this.aiTimer <= 0 && this.onGround) this._evaluatePhase1AI(dist, player);
                if (this.onGround && dist > 60) {
                    this.body.setVelocityX(Math.sign(dx) * 80);
                } else {
                    this.body.setVelocityX(0);
                }
                break;
            case 'melee_telegraph':
                this.sprite.setTexture('boss_attack');
                this.body.setVelocityX(0);
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this._enterBossState('melee_active');
                break;
            case 'melee_active':
                this.body.setVelocityX(0);
                this.stateTimer -= dt;
                this._updateMeleeHitbox();
                if (this.stateTimer <= 0) {
                    this._disableMeleeHitbox();
                    this._enterBossState('melee_recovery');
                }
                break;
            case 'melee_recovery':
                this.body.setVelocityX(0);
                this.sprite.setTexture('boss_idle');
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this._enterBossState('idle');
                break;
            case 'dash_telegraph':
                this.sprite.setTexture('boss_dash');
                this.body.setVelocityX(0);
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    const dashDir = this.facingRight ? 1 : -1;
                    this.body.setVelocityX(dashDir * 350);
                    this._enterBossState('dash_active');
                }
                break;
            case 'dash_active':
                this.sprite.setTexture('boss_dash');
                this._updateDashHitbox();
                this.stateTimer -= dt;
                if (this.stateTimer <= 0 || this.body.blocked.left || this.body.blocked.right) {
                    this._disableMeleeHitbox();
                    this.body.setVelocityX(0);
                    this._enterBossState('dash_recovery');
                }
                break;
            case 'dash_recovery':
                this.sprite.setTexture('boss_cower');
                this.body.setVelocityX(0);
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this._enterBossState('idle');
                break;
            case 'stun':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this._enterBossState('idle');
                break;
        }
    }

    _updatePhase2(dt) {
        // Note: aiTimer and aiCooldowns decremented in update() to avoid double-decrement (M-01)

        const player = this.scene.player;
        if (!player || player.dead) return;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.abs(dx);
        this.facingRight = dx > 0;

        switch (this.state) {
            case 'idle': {
                this.sprite.setTexture('boss_liberation');
                if (this.aiTimer <= 0) {
                    if (this.aiCooldowns.C <= 0 && dist > 100 && Math.random() < 0.4) {
                        this._enterBossState('liberation_telegraph');
                        break;
                    }
                    if (this.aiCooldowns.D <= 0 && this.sprite.y < 250 && Math.random() < 0.35) {
                        this._enterBossState('dash_telegraph');
                        break;
                    }
                    if (this.onGround && this.aiCooldowns.A <= 0 && Math.random() < 0.4) {
                        this._enterBossState('melee_telegraph');
                        break;
                    }
                    if (this.aiCooldowns.B <= 0 && dist < 80 && Math.random() < 0.3) {
                        this._enterBossState('dash_telegraph');
                        break;
                    }
                }
                if (!this.onGround) {
                    const targetY = 200;
                    if (Math.abs(this.sprite.y - targetY) > 10) {
                        this.body.setVelocityY(Math.sign(targetY - this.sprite.y) * 60);
                    } else this.body.setVelocityY(0);
                    this.body.setVelocityX(Math.sign(dx) * 80);
                } else {
                    this.body.setVelocityX(Math.sign(dx) * 60);
                    if (this.aiTimer <= 0) {
                        // Stronger upward impulse to reliably get airborne (M-02)
                        this.body.setVelocityY(-350);
                        this.scene.time.delayedCall(400, () => {
                            if (this.state === 'idle') this.body.setVelocityY(0);
                        });
                        this.aiTimer = 2;
                    }
                }
                break;
            }
            case 'melee_telegraph':
            case 'melee_active':
            case 'melee_recovery':
                this._updatePhase1(dt);
                break;
            case 'dash_telegraph':
                this.sprite.setTexture('boss_dash');
                this.body.setVelocityX(0);
                this.body.setVelocityY(0);
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    const dir = this.facingRight ? 1 : -1;
                    this.body.setVelocityX(dir * 400);
                    this.body.setVelocityY(0);
                    this._enterBossState('dash_active');
                }
                break;
            case 'dash_active':
                this.body.setVelocityY(0);
                this.stateTimer -= dt;
                this._updateDashHitbox();
                if (this.stateTimer <= 0 || this.body.blocked.left || this.body.blocked.right) {
                    this._disableMeleeHitbox();
                    this.body.setVelocityX(0);
                    this.dashCount = (this.dashCount || 0) + 1;
                    if (this.dashCount < 3) {
                        this._enterBossState('dash_telegraph');
                    } else {
                        this.dashCount = 0;
                        this._enterBossState('dash_recovery');
                    }
                }
                break;
            case 'dash_recovery':
                this.sprite.setTexture('boss_cower');
                this.body.setVelocityX(0);
                this.body.setVelocityY(0);
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this._enterBossState('idle');
                break;
            case 'liberation_telegraph':
                this.sprite.setTexture('boss_liberation');
                this.body.setVelocity(0, 0);
                this.body.setAllowGravity(false);
                // Lift boss if touching ground so dive can complete (M-04)
                if (this.body.blocked.down) {
                    this.sprite.y = Math.min(this.sprite.y, 100);
                }
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this._enterBossState('liberation_active');
                }
                break;
            case 'liberation_active':
                this.sprite.setTexture('boss_liberation');
                this.body.setAllowGravity(true);
                const diveDir = this.facingRight ? 1 : -1;
                this.body.setVelocityX(diveDir * 300);
                this.body.setVelocityY(500);
                this._updateLiberationHitbox();
                this.stateTimer -= dt;
                if (this.stateTimer <= 0 || this.body.blocked.down) {
                    this._disableMeleeHitbox();
                    this.body.setVelocity(0, 0);
                    this._enterBossState('liberation_recovery');
                }
                break;
            case 'liberation_recovery':
                this.sprite.setTexture('boss_cower');
                this.body.setAllowGravity(true);
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this._enterBossState('idle');
                break;
        }
    }

    get onGround() {
        return this.body.touching.down || this.body.blocked.down;
    }

    _evaluatePhase1AI(dist, player) {
        this.aiTimer = 1.5;
        if (this.aiCooldowns.A <= 0 && dist > 80 && Math.random() < 0.6) {
            this._enterBossState('melee_telegraph');
        } else if (this.aiCooldowns.B <= 0 && dist < 80 && Math.random() < 0.3) {
            this._enterBossState('dash_telegraph');
        } else if (dist < 40 && Math.random() < 0.7) {
            this._enterBossState('melee_telegraph');
        }
    }

    _enterBossState(newState) {
        this.state = newState;
        this.stateTimer = this._getBossStateDuration(newState);
        this._onBossStateEnter(newState);
    }

    _getBossStateDuration(state) {
        const at60 = frames => frames / 60;
        switch (state) {
            case 'melee_telegraph': return 0.5;
            case 'melee_active': return at60(6);
            case 'melee_recovery': return 0.8;
            case 'dash_telegraph': return 0.8;
            case 'dash_active': return 0.8;
            case 'dash_recovery': return 0.6;
            case 'stun': return 0.4;
            case 'liberation_telegraph': return this.desperate ? 1.0 : 1.5;
            case 'liberation_active': return 1.5;
            case 'liberation_recovery': return 1.0;
            default: return 0;
        }
    }

    _onBossStateEnter(state) {
        switch (state) {
            case 'melee_telegraph':
                this.aiCooldowns.A = 2.5;
                this.scene.sound.play('sfx_boss_roar', { volume: 0.55, rate: this.phase === 2 ? 1.15 : 1.0 });
                break;
            case 'dash_telegraph':
                if (this.phase === 1) this.aiCooldowns.B = 3;
                else this.aiCooldowns.D = 5;
                break;
            case 'liberation_telegraph':
                this.aiCooldowns.C = 6;
                break;
        }
    }

    _updateMeleeHitbox() {
        const dir = this.facingRight ? 1 : -1;
        this.meleeHitbox.body.setSize(40, 30);
        this.meleeHitbox.body.x = this.body.x + (dir > 0 ? 48 : -40);
        this.meleeHitbox.body.y = this.body.y + 4;
    }

    _updateDashHitbox() {
        const dir = this.facingRight ? 1 : -1;
        this.meleeHitbox.body.setSize(36, 30);
        this.meleeHitbox.body.x = this.body.x + (dir > 0 ? 48 : -36);
        this.meleeHitbox.body.y = this.body.y + 4;
    }

    _updateLiberationHitbox() {
        this.meleeHitbox.body.setSize(80, 80);
        this.meleeHitbox.body.x = this.body.x - 40;
        this.meleeHitbox.body.y = this.body.y - 40;
    }

    _disableMeleeHitbox() {
        this.meleeHitbox.body.setSize(0, 0);
    }

    reset(x, y) {
        this.hp = this.maxHp;
        this.phase = 1;
        this.state = 'idle';
        this.defeated = false;
        this.transitioning = false;
        this.vulnerable = true;
        this.desperate = false;
        this.dashCount = 0;
        this.invulnTimer = 0;
        this.aiTimer = 0;
        for (const k in this.aiCooldowns) this.aiCooldowns[k] = 0;
        this.sprite.setPosition(x, y);
        this.sprite.setAlpha(1);
        this.sprite.clearTint();
        this.sprite.body.setAllowGravity(true);
        this.body.setVelocity(0, 0);
        this.sprite.setTexture('boss_idle');
        this._disableMeleeHitbox();
        if (this.yBobTween) this.yBobTween.stop();
        this.yBobTween = this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y + 12,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}
