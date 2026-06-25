class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        this.sprite = scene.physics.add.sprite(x, y, 'player_idle');
        this.sprite.setScale(0.12);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDepth(10);

        this.bodyConfig = {
            width: 200,
            height: 333,
            topFromOrigin: 23,
            maxVelocityY: 800,
        };
        this._applyBodyConfig();

        this.state = 'idle';
        this.stateTimer = 0;
        this.offGroundFrames = 0;  // frames since last on-ground �� prevents flicker
        this.groundedFrames = 0;
        this.airborneFrames = 0;
        this.isGroundedStable = false;
        this.isAirborneStable = false;
        this.facingRight = true;
        this.hp = 100;
        this.maxHp = 100;
        this.feelings = 0;
        this.feelingsMax = 100;
        this.jumpCount = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.feelingsTimer = 3001;
        this.invulnTimer = 0;
        this.bufferAttack = -1;

        this.abilities = { dash: false, doubleJump: false, shadowCloak: false, sword: false };
        this.dashUsedThisJump = false;
        this.dashCooldownTimer = 0;

        this.slashHitbox = scene.add.zone(0, 0, 12, 10);
        scene.physics.add.existing(this.slashHitbox, false);
        this.slashHitbox.body.setAllowGravity(false);
        this.slashHitbox.setVisible(false).setDepth(9);

        this.dead = false;
    }

    get body() { return this.sprite.body; }
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    set x(v) { this.sprite.x = v; }
    set y(v) { this.sprite.y = v; }
    get flipX() { return this.sprite.flipX; }
    set flipX(v) { this.sprite.flipX = v; }
    get onGround() {
        return this.body.touching.down || this.body.blocked.down;
    }

    get canDash() {
        return this.abilities.dash &&
            this.dashCooldownTimer <= 0 &&
            (this.isGroundedStable || !this.dashUsedThisJump);
    }

    _applyBodyConfig() {
        if (!this.sprite || !this.sprite.body || !this.sprite.frame) return;

        const frameW = this.sprite.frame.width;
        const frameH = this.sprite.frame.height;
        const cfg = this.bodyConfig;
        const offsetX = (frameW - cfg.width) / 2;
        const offsetY = (frameH / 2) - cfg.topFromOrigin;

        this.sprite.body.setSize(cfg.width, cfg.height);
        this.sprite.body.setOffset(offsetX, offsetY);
        this.sprite.body.setMaxVelocityY(cfg.maxVelocityY);
    }

    _setTextureStable(textureKey) {
        this.sprite.setTexture(textureKey);
        this._applyBodyConfig();
    }

    _refreshGroundedState() {
        const rawGrounded = this.onGround;

        if (rawGrounded) {
            this.groundedFrames++;
            this.airborneFrames = 0;
        } else {
            this.airborneFrames++;
            this.groundedFrames = 0;
        }

        this.isGroundedStable = this.groundedFrames >= 2;
        this.isAirborneStable = this.airborneFrames >= 2;
        return { grounded: this.isGroundedStable, airborne: this.isAirborneStable, rawGrounded };
    }

    attackPressed() {
        if (this.dead) return;
        this.bufferAttack = 5;
    }

    takeDamage(amount, knockbackX, knockbackY) {
        if (this.invulnTimer > 0 || this.dead || this.state === 'dashing') return;
        this.hp -= amount;
        this.invulnTimer = 60;  // 1s invincibility (60 frames @ 60fps)
        this.feelings = Math.min(this.feelingsMax, this.feelings + 5);
        this.feelingsTimer = 0;
        this.sprite.setTint(0xff6666);
        this.scene.cameras.main.shake(80, 0.005);
        this._spawnHurtParticles();
        this.scene.time.delayedCall(100, () => {
            if (!this.dead) this.sprite.clearTint();
        });
        this.body.velocity.x = this.facingRight ? -knockbackX : knockbackX;
        this.body.velocity.y = knockbackY;
        this.comboCount = 0;
        this.bufferAttack = 0;
        this._enterState('hurt');
        // Audio
        this.scene.sound.play('sfx_player_hurt', { volume: 0.7 });
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        if (this.dead) return;
        this.dead = true;
        this.state = 'dead';
        this.sprite.setVelocity(0, 0);
        this.sprite.body.setAllowGravity(false);
        this.scene.sound.play('sfx_player_death', { volume: 0.8 });

        const scene = this.scene;
        const sprite = this.sprite;

        // Step 1 (0ms): player_down + red tint
        sprite.setTexture('player_down');
        sprite.setTint(0xff0000);
        sprite.setAlpha(1);
        // Reset scale to base in case of leftover from previous death
        sprite.setScale(0.12);

        // Step 2 (500ms): tween tint red→white, squash scale 1.0→0.9
        scene.time.delayedCall(500, () => {
            if (!this.dead) return; // safety: player revived mid-animation
            // Tint from red (0xff0000) to white (0xffffff) using counter tween
            scene.tweens.addCounter({
                from: 0,
                to: 255,
                duration: 300,
                ease: 'Sine.easeOut',
                onUpdate: (tween) => {
                    if (!sprite.active) return;
                    const v = Math.round(tween.getValue());
                    sprite.setTint(Phaser.Display.Color.GetColor(255, v, v));
                },
            });
            // Squash: scale 0.12 → 0.108 (0.9×)
            scene.tweens.add({
                targets: sprite,
                scaleX: 0.12 * 0.9,
                scaleY: 0.12 * 0.9,
                duration: 300,
                ease: 'Power2',
            });
        });

        // Step 3 (800ms): vanish1, alpha 0.9
        scene.time.delayedCall(800, () => {
            if (!this.dead) return;
            if (scene.textures.exists('player_vanish1')) {
                sprite.setTexture('player_vanish1');
            }
            sprite.setAlpha(0.9);
        });

        // Step 4 (1100ms): vanish2, alpha 0.6
        scene.time.delayedCall(1100, () => {
            if (!this.dead) return;
            if (scene.textures.exists('player_vanish2')) {
                sprite.setTexture('player_vanish2');
            }
            sprite.setAlpha(0.6);
        });

        // Step 5 (1400ms): vanish3, alpha 0.3
        scene.time.delayedCall(1400, () => {
            if (!this.dead) return;
            if (scene.textures.exists('player_vanish3')) {
                sprite.setTexture('player_vanish3');
            }
            sprite.setAlpha(0.3);
        });

        // Step 6 (1700ms): alpha 0, disable sprite
        scene.time.delayedCall(1700, () => {
            if (!this.dead) return;
            sprite.setAlpha(0);
            sprite.setActive(false);
        });

        // Step 7 (1800ms): emit player-died event for GameScene to handle
        scene.time.delayedCall(1800, () => {
            scene.events.emit('player-died');
        });

        // Scene (e.g., BossScene) handles death transitions → no auto-restart here
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    update(delta) {
        if (this.dead) return;
        this._applyBodyConfig();

        const dt = delta / 1000;
        const keys = this.scene.keys;
        const left = keys.left.isDown;
        const right = keys.right.isDown;
        const jump = Phaser.Input.Keyboard.JustDown(keys.jump1) || Phaser.Input.Keyboard.JustDown(keys.jump2);
        const attack = this.bufferAttack > 0;

        if (this.bufferAttack > 0) this.bufferAttack--;
        if (this.invulnTimer > 0) this.invulnTimer--;
        if (this.comboTimer > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

        const contact = this._refreshGroundedState();

        // Landing refreshes dash ability
        if (contact.rawGrounded) {
            this.dashUsedThisJump = false;
        }
        const grounded = contact.grounded;
        const airborne = contact.airborne;
        const rawGrounded = contact.rawGrounded;

        const SPEED = 200;
        const JUMP_VEL = -420;
        const ACCEL = 800;
        const DRAG = 900;
        const MAX_SPEED = 200;

        // Dash activation — only from move/air states
        const dashPressed = (
            (keys.dash1 && Phaser.Input.Keyboard.JustDown(keys.dash1)) ||
            (keys.dash2 && Phaser.Input.Keyboard.JustDown(keys.dash2))
        );
        if (dashPressed && this.canDash &&
            (this.state === 'idle' || this.state === 'run' || this.state === 'jump' || this.state === 'fall')) {
            this._enterState('dashing');
        }

        switch (this.state) {
            case 'idle':
            case 'run':
                this._handleMoveState(dt, left, right, jump, attack, grounded, airborne, rawGrounded, SPEED, JUMP_VEL, ACCEL, DRAG, MAX_SPEED);
                break;
            case 'jump':
            case 'fall':
                this._handleAirState(dt, left, right, jump, attack, grounded, airborne, rawGrounded, SPEED, JUMP_VEL, ACCEL, DRAG, MAX_SPEED);
                break;
            case 'dashing':
                this._handleDashState(dt);
                break;
            case 'attack1_startup':
            case 'attack1_recovery':
                this._handleAttack1State(dt, attack, grounded);
                break;
            case 'attack1_active':
                this._handleAttack1Active(dt, attack);
                break;
            case 'attack2_startup':
            case 'attack2_recovery':
                this._handleAttack2State(dt, attack);
                break;
            case 'attack2_active':
                this._handleAttack2Active(dt);
                break;
            case 'air_attack_startup':
            case 'air_attack_active':
                this._handleAirAttackState(dt);
                break;
            case 'air_attack_recovery':
                this._handleAirAttackRecovery(dt);
                break;
            case 'hurt':
                this.stateTimer -= dt;
                this.body.setVelocityX(this.body.velocity.x * 0.85);
                if (this.stateTimer <= 0) {
                    this._enterState(this.isGroundedStable ? 'idle' : 'fall');
                }
                break;
        }

        // Variable jump height — release key to cut upward velocity
        if (this.body.velocity.y < 0) {
            const jumpHeld = keys.jump1.isDown || keys.jump2.isDown;
            if (!jumpHeld) {
                this.body.velocity.y = Math.max(this.body.velocity.y, -200);
            }
        }

        if (this.state !== 'idle' && this.state !== 'run' && this.state !== 'jump' && this.state !== 'fall' && this.state !== 'dashing') {
            this.body.setAccelerationX(0);
            this.body.setDragX(DRAG);
        }

        this.sprite.setFlipX(!this.facingRight);

        if (this.feelings > 0) {
            this.feelingsTimer += delta;
            if (this.feelingsTimer > 3000) {
                this.feelings = Math.max(0, this.feelings - 0.06 * dt);
            }
        }
    }

    _handleMoveState(dt, left, right, jump, attack, grounded, airborne, rawGrounded, SPEED, JUMP_VEL, ACCEL, DRAG, MAX_SPEED) {
        if (attack) {
            if (grounded) {
                this._enterState('attack1_startup');
                return;
            } else {
                this._enterState('air_attack_startup');
                return;
            }
        }
        if (jump && grounded) {
            this.body.setVelocityY(JUMP_VEL);
            this.jumpCount = 1;
            this._enterState('jump');
            return;
        }
        if (rawGrounded) {
            this.offGroundFrames = 0;
            // prevent micro-bounce on ground

            // Hysteresis: prevent idle/run flicker from micro-velocity
            const absVx = Math.abs(this.body.velocity.x);
            if (this.state === 'run') {
                if (absVx < 8) {
                    this.body.velocity.x = 0;
                    this._enterState('idle');
                }
            } else {
                if (absVx > 15) this._enterState('run');
            }
        }

        // Input handled OUTSIDE the onGround check so onGround flicker
        // never blocks movement. When key is held, apply acceleration.
        if (left) {
            this.body.setAccelerationX(-ACCEL);
            this.body.setDragX(0);
            this.facingRight = false;
        } else if (right) {
            this.body.setAccelerationX(ACCEL);
            this.body.setDragX(0);
            this.facingRight = true;
        } else {
            this.body.setAccelerationX(0);
            this.body.setDragX(DRAG);
        }
        if (Math.abs(this.body.velocity.x) > MAX_SPEED) {
            this.body.velocity.x = Math.sign(this.body.velocity.x) * MAX_SPEED;
        }

        // Off-ground detection with hysteresis: only transition after
        // enough consecutive off-ground frames (avoids onGround flicker)
        if (!rawGrounded && airborne) {
            this.offGroundFrames++;
            if (this.offGroundFrames > 4 && this.body.velocity.y > 60) {
                this._enterState('fall');
                this.body.setDragX(DRAG * 0.5);
            }
        } else if (rawGrounded) {
            this.offGroundFrames = 0;
        }
    }

    _handleAirState(dt, left, right, jump, attack, grounded, airborne, rawGrounded, SPEED, JUMP_VEL, ACCEL, DRAG, MAX_SPEED) {
        if (attack && this.body.velocity.y >= -50) {
            this._enterState('air_attack_startup');
            return;
        }

        // Double jump: one additional jump while airborne (if ability unlocked)
        if (jump && this.abilities.doubleJump && this.jumpCount < 2) {
            const vel = this.jumpCount === 0 ? JUMP_VEL : -350;
            this.body.setVelocityY(vel);
            this.jumpCount++;
            this._enterState('jump');
            if (this.jumpCount === 2) {
                this._spawnDoubleJumpVFX();
            }
            return;
        }

        // Input always works �?never blocked by onGround flicker
        if (left) { this.body.setAccelerationX(-ACCEL); this.facingRight = false; }
        else if (right) { this.body.setAccelerationX(ACCEL); this.facingRight = true; }
        else { this.body.setAccelerationX(0); this.body.setDragX(DRAG * 0.3); }
        if (Math.abs(this.body.velocity.x) > MAX_SPEED) {
            this.body.velocity.x = Math.sign(this.body.velocity.x) * MAX_SPEED;
        }

        // Ground check with velocity reset to prevent micro-bounce flicker
        if (rawGrounded) {
            this.offGroundFrames = 0;
            if (grounded) {
                this._enterState('idle');
                // Landing: brief velocity pause for weight
                this.body.setVelocityX(this.body.velocity.x * 0.6);
                // Small landing dust particles
                this._spawnLandingParticles();
                return;
            }
        }

        const vy = this.body.velocity.y;
        if (vy < -30) {
            if (this.state !== 'jump') this._enterState('jump');
        } else if (vy > 30) {
            if (this.state !== 'fall') this._enterState('fall');
        }
        // else keep current state
    }

    _handleAttack1State(dt, attack, grounded) {
        // Only zero X velocity on ground; in air, allow horizontal drift
        if (this.isGroundedStable) {
            this.body.setVelocityX(0);
        }
        if (this.state === 'attack1_startup') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this._enterState('attack1_active');
            }
            return;
        }
        if (this.state === 'attack1_recovery') {
            this.stateTimer -= dt;
            // Combo chain to Attack2 — disabled when sword equipped (single heavy hit)
            if (!this.abilities.sword && attack && this.stateTimer < 0.2) {
                this._enterState('attack2_startup');
                this.bufferAttack = 0;
                return;
            }
            if (this.stateTimer <= 0) {
                this._enterState(this.isGroundedStable ? 'idle' : 'fall');
            }
        }
    }

    _handleAttack1Active(dt, attack) {
        this.stateTimer -= dt;
        this._updateHitbox(1);
        if (this.stateTimer <= 0) {
            this._disableHitbox();
            this._enterState('attack1_recovery');
        }
    }

    _handleAttack2State(dt, attack) {
        // Only zero X velocity on ground; in air, allow horizontal drift
        if (this.isGroundedStable) {
            this.body.setVelocityX(0);
        }
        if (this.state === 'attack2_startup') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this._enterState('attack2_active');
            }
            return;
        }
        if (this.state === 'attack2_recovery') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this._enterState(this.isGroundedStable ? 'idle' : 'fall');
            }
        }
    }

    _handleAttack2Active(dt) {
        this.stateTimer -= dt;
        this._updateHitbox(2);
        if (this.stateTimer <= 0) {
            this._disableHitbox();
            this._enterState('attack2_recovery');
        }
    }

    _handleAirAttackState(dt) {
        if (this.state === 'air_attack_startup') {
            this.stateTimer -= dt;
            this.body.velocity.y += 120 * dt;
            if (this.stateTimer <= 0) {
                this._enterState('air_attack_active');
            }
            return;
        }
        if (this.state === 'air_attack_active') {
            this.stateTimer -= dt;
            this.body.velocity.y += 200 * dt;
            this._updateAirHitbox();
            if (this.isGroundedStable || this.stateTimer <= 0) {
                this._disableHitbox();
                if (this.isGroundedStable) {
                    this._enterState('air_attack_recovery');
                } else {
                    this._enterState('fall');
                }
            }
        }
    }

    _handleAirAttackRecovery(dt) {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            this._enterState(this.isGroundedStable ? 'idle' : 'fall');
        }
    }

    _handleDashState(dt) {
        this.stateTimer -= dt;

        // Wall collision → end dash early
        if (this.body.blocked.left || this.body.blocked.right) {
            this._endDash();
            return;
        }

        // Speed ramp: 400→600 over first 100ms
        const elapsed = 0.25 - this.stateTimer;
        const speedTarget = 600;
        const speedStart = 400;
        const rampTime = 0.1;
        const t = Math.min(elapsed / rampTime, 1);
        const speed = speedStart + (speedTarget - speedStart) * t;

        this.body.setVelocityX(this.facingRight ? speed : -speed);
        this.body.setDragX(0);
        this.body.setAccelerationX(0);

        // Trail particles each frame
        this._spawnDashTrail();

        // Duration expired
        if (this.stateTimer <= 0) {
            this._endDash();
        }
    }

    _endDash() {
        this.sprite.clearTint();
        this.dashCooldownTimer = 0.3;
        this.dashUsedThisJump = true;
        this._enterState(this.isGroundedStable ? 'idle' : 'fall');
    }

    _spawnDashTrail() {
        const offX = this.facingRight ? -20 : 20;
        const trail = this.scene.add.circle(
            this.sprite.x + offX + Phaser.Math.Between(-4, 4),
            this.sprite.y + Phaser.Math.Between(-8, 8),
            Phaser.Math.Between(2, 4),
            0x7FE0DE,
            0.7
        );
        trail.setDepth(5);
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0.1,
            scaleY: 0.1,
            duration: 250,
            ease: 'Power2',
            onComplete: () => trail.destroy(),
        });
    }

    _spawnHurtParticles() {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
            const dist = Phaser.Math.Between(30, 50);
            const p = this.scene.add.circle(
                this.sprite.x + Phaser.Math.Between(-8, 8),
                this.sprite.y + Phaser.Math.Between(-8, 8),
                Phaser.Math.Between(2, 4),
                0xff3333,
                0.9
            );
            p.setDepth(20);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Math.cos(angle) * dist,
                y: p.y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.2,
                duration: 400,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    _spawnLandingParticles() {
        for (let i = 0; i < 3; i++) {
            const p = this.scene.add.circle(
                this.x + Phaser.Math.Between(-10, 10),
                this.y + 10,
                Phaser.Math.Between(1, 3),
                0x7FE0DE,
                0.4
            ).setDepth(5);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-15, 15),
                y: p.y + Phaser.Math.Between(5, 20),
                alpha: 0,
                scale: 0.2,
                duration: 300,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    _enterState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        this.stateTimer = this._getStateDuration(newState);
        this._onStateEnter(newState);
    }

    _getStateDuration(state) {
        const at60fps = frames => frames / 60;
        switch (state) {
            case 'attack1_startup': return at60fps(6);
            case 'attack1_active': return at60fps(5);
            case 'attack1_recovery': return at60fps(6);
            case 'attack2_startup': return at60fps(7);
            case 'attack2_active': return at60fps(6);
            case 'attack2_recovery': return at60fps(8);
            case 'air_attack_startup': return at60fps(5);
            case 'air_attack_active': return at60fps(20);
            case 'air_attack_recovery': return at60fps(6);
            case 'dashing': return 0.25;
            case 'hurt': return 0.3;
            case 'dead': return 99;
            default: return 0;
        }
    }

    _onStateEnter(state) {
        switch (state) {
            case 'idle':
                this.jumpCount = 0;
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this._setTextureStable('player_idle');
                break;
            case 'run':
                this.sprite.play('player_run', true);
                this._applyBodyConfig();
                break;
            case 'jump':
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this._setTextureStable('player_jump');
                this.scene.sound.play('sfx_player_jump', { volume: 0.5 });
                break;
            case 'fall':
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this._setTextureStable('player_jump');
                break;
            case 'attack1_startup':
                if (this.abilities.sword) {
                    // Play the 5-frame sword swing animation
                    this.sprite.play('player_sword_attack');
                    this._applyBodyConfig();
                } else {
                    if (this.sprite.anims && this.sprite.anims.isPlaying) {
                        this.sprite.anims.stop();
                    }
                    this._setTextureStable('player_att1');
                }
                this.scene.sound.play('sfx_sword_att1', { volume: 0.6 });
                break;
            case 'attack1_active':
                // When sword equipped, the animation plays through naturally
                if (!this.abilities.sword) {
                    this._setTextureStable('player_att1');
                }
                break;
            case 'attack1_recovery':
                // When sword equipped, the animation finishes on player_sword_5
                if (!this.abilities.sword) {
                    this._setTextureStable('player_att1');
                }
                break;
            case 'attack2_startup':
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this._setTextureStable('player_att2');
                this.scene.sound.play('sfx_sword_att2', { volume: 0.7 });
                break;
            case 'attack2_recovery':
                this._setTextureStable('player_att2');
                break;
            case 'attack2_active':
                this._setTextureStable('player_att2');
                break;
            case 'air_attack_startup':
                if (this.abilities.sword) {
                    this.sprite.play('player_sword_air_attack');
                    this._applyBodyConfig();
                } else {
                    if (this.sprite.anims && this.sprite.anims.isPlaying) {
                        this.sprite.anims.stop();
                    }
                    this._setTextureStable('player_att1');
                }
                this.scene.sound.play('sfx_sword_air', { volume: 0.55 });
                break;
            case 'air_attack_active':
                if (!this.abilities.sword) {
                    this._setTextureStable('player_att1');
                }
                break;
            case 'air_attack_recovery':
                if (!this.abilities.sword) {
                    this._setTextureStable('player_att1');
                }
                break;
            case 'dashing':
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this.sprite.setTexture('player_run_sheet', 0);
                this.sprite.setTint(0x7FE0DE);
                this._disableHitbox();
                this.scene.sound.play('sfx_player_dash', { volume: 0.5 });
                break;
            case 'hurt':
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this._setTextureStable('player_down');
                break;
            case 'dead':
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this._setTextureStable('player_down');
                break;
        }
    }

    _updateHitbox(attackNum) {
        const dir = this.facingRight ? 1 : -1;
        const bw = this.body.width;
        const gap = 2;
        let w, h, oy;
        if (attackNum === 1) {
            w = 20; h = 18; oy = 12;
        } else {
            w = 28; h = 22; oy = 10;
        }
        this.slashHitbox.body.setSize(w, h);
        if (dir > 0) {
            this.slashHitbox.body.x = this.body.x + bw + gap;
        } else {
            this.slashHitbox.body.x = this.body.x - gap - w;
        }
        this.slashHitbox.body.y = this.body.y + oy;
    }

    _updateAirHitbox() {
        const bw = this.body.width;
        this.slashHitbox.body.setSize(bw - 8, 24);
        this.slashHitbox.body.x = this.body.x + 2;
        this.slashHitbox.body.y = this.body.y + Math.floor(this.body.height * 0.55);
    }

    _disableHitbox() {
        this.slashHitbox.body.setSize(0, 0);
    }

    _spawnDoubleJumpVFX() {
        // White circle burst at feet on double jump activation
        for (let i = 0; i < 6; i++) {
            const p = this.scene.add.circle(
                this.x,
                this.y + 20,
                Phaser.Math.Between(2, 5),
                0xffffff,
                0.8
            );
            p.setDepth(15);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-30, 30),
                y: p.y + Phaser.Math.Between(-30, 0),
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    onHitEnemy() {
        this.comboCount++;
        this.comboTimer = 2000;
        this.feelingsTimer = 0;
        this.feelings = Math.min(this.feelingsMax, this.feelings + 8);
    }

    /* ------------------------------------------------------------------ */
    /*  Save / Load                                                        */
    /* ------------------------------------------------------------------ */

    /** @returns {object} Serializable subset of player state. */
    saveState() {
        return {
            hp: this.hp,
            maxHp: this.maxHp,
            feelings: this.feelings,
            feelingsMax: this.feelingsMax,
            abilities: { ...this.abilities },
        };
    }

    /**
     * Restore player state from a save data object.
     * Does NOT change position or physics — that is handled externally.
     * @param {object} data - Shape matching saveState().
     */
    loadState(data) {
        if (data.hp !== undefined) this.hp = Math.min(data.hp, this.maxHp);
        if (data.maxHp !== undefined) this.maxHp = data.maxHp;
        if (data.feelings !== undefined) this.feelings = data.feelings;
        if (data.feelingsMax !== undefined) this.feelingsMax = data.feelingsMax;
        if (data.abilities) {
            this.abilities.dash = !!data.abilities.dash;
            this.abilities.doubleJump = !!data.abilities.doubleJump;
            this.abilities.shadowCloak = !!data.abilities.shadowCloak;
            this.abilities.sword = !!data.abilities.sword;
        }
    }

    reset(x, y, hp = this.maxHp) {
        // Preserve earned traversal abilities (they persist through death)
        const savedAbilities = { ...this.abilities };
        this.hp = hp;
        this.feelings = 0;
        this.feelingsTimer = 3001;
        this.dead = false;
        this.jumpCount = 0;
        this.state = 'idle';
        this.abilities = savedAbilities;
        this.dashUsedThisJump = false;
        this.dashCooldownTimer = 0;
        this.offGroundFrames = 0;
        this.groundedFrames = 0;
        this.airborneFrames = 0;
        this.isGroundedStable = false;
        this.isAirborneStable = false;
        this.sprite.setAlpha(1);
        this.sprite.clearTint();
        this.sprite.setScale(0.12);
        if (this.sprite.anims && this.sprite.anims.isPlaying) {
            this.sprite.anims.stop();
        }
        this._setTextureStable('player_idle');
        this.sprite.body.setAllowGravity(true);
        this.sprite.body.reset(x, y);
        this.sprite.setPosition(x, y);
        this.body.setVelocity(0, 0);
        this._disableHitbox();
    }
}












