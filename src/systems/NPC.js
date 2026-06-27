class NPC {
    static DIALOGUE_MAP = {
        'The echoes in this place... they sound like her voice.': 'npcAscent_0',
        'She left something behind. I can feel it.': 'npcAscent_1',
        "You're looking for her too, aren't you?": 'npcAscent_2',
        "I've been watching you. You carry her sword well.": 'npcMid_0',
        'The door ahead requires resolve. Not just strength.': 'npcMid_1',
        "When you face her... remember that she's also facing herself.": 'npcMid_2',
    };

    constructor(scene, x, y, config) {
        this.scene = scene;
        this.homeX = x;
        this.homeY = y;
        this.x = x;
        this.y = y;
        this.name = config.name || 'KND';
        this.dialogues = config.dialogues || ['...'];

        this.behavior = config.behavior || 'wander';
        this.walkRadius = config.walkRadius || Phaser.Math.Between(34, 64);
        this.walkSpeed = config.walkSpeed || Phaser.Math.Between(26, 34);
        this.pauseMin = config.pauseMin || 0.7;
        this.pauseMax = config.pauseMax || 1.8;
        this.standSize = config.standSize || 72;
        this.walkWidth = config.walkWidth || 48;
        this.walkHeight = config.walkHeight || 86;
        this.walkFootOffsetY = config.walkFootOffsetY || 14;
        this.standFootOffsetY = config.standFootOffsetY || 8;
        this.facingRight = false;

        this.dialogueIndex = 0;
        this.isTalking = false;
        this.isTyping = false;
        this.typewriterTimer = 0;
        this.typewriterPos = 0;
        this.currentLine = '';

        this._moveState = 'rest';
        this._moveTimer = Phaser.Math.FloatBetween(0.3, 1.2);
        this._targetX = x;
        this._pose = 'stand';
        this._poseOffsetY = this.standFootOffsetY;

        this._createVisuals();
        this._createPrompt();
    }

    static PROXIMITY_RADIUS = 72;
    static RESET_DISTANCE = 112;
    static BOX_W = 360;
    static BOX_H = 90;
    static BOX_MARGIN_BOTTOM = 24;
    static BOX_PAD_X = 14;
    static BOX_PAD_TOP = 10;
    static BOX_PAD_BOTTOM = 10;

    /* ================================================================== */
    /*  Visuals                                                             */
    /* ================================================================== */

    _createVisuals() {
        this.sprite = this.scene.add.sprite(this.x, this.y, 'npc_knd_stand')
            .setOrigin(0.5, 1)
            .setDepth(6)
            .setDisplaySize(this.standSize, this.standSize);
        this.sprite.y = this.homeY + this._poseOffsetY;
        this._setPose('stand');
    }

    _setPose(pose) {
        if (!this.sprite || !this.sprite.active) return;
        this._pose = pose;

        switch (pose) {
            case 'walk':
                if (this.sprite.texture.key !== 'npc_knd_walk' || !this.sprite.anims.isPlaying) {
                    this.sprite.play('npc_knd_walk', true);
                }
                this._poseOffsetY = this.walkFootOffsetY;
                this.sprite.setDisplaySize(this.walkWidth, this.walkHeight);
                break;
            case 'stand':
            default:
                if (this.sprite.anims && this.sprite.anims.isPlaying) {
                    this.sprite.anims.stop();
                }
                this.sprite.setTexture('npc_knd_stand');
                this._poseOffsetY = this.standFootOffsetY;
                this.sprite.setDisplaySize(this.standSize, this.standSize);
                break;
        }

        this.sprite.y = this.homeY + this._poseOffsetY;
        this.sprite.setFlipX(!this.facingRight);
    }

    _syncLayout() {
        if (!this.sprite) return;

        this.x = this.sprite.x;
        this.y = this.sprite.y;

        const topY = this.sprite.y - this.sprite.displayHeight;
        const promptY = topY - 10;
        this.prompt.setPosition(this.sprite.x, promptY);
    }

    /* ================================================================== */
    /*  Prompt (world-space, above NPC)                                     */
    /* ================================================================== */

    _createPrompt() {
        this.prompt = this.scene.add.text(
            this.x, this.y - 104,
            this.name + '  ' + Lang.t('npcTalk'),
            {
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setOrigin(0.5).setDepth(10).setAlpha(0);
    }

    showPrompt(visible) {
        if (visible && this.prompt.alpha < 0.01) {
            this.prompt.setAlpha(1);
            this.scene.tweens.add({
                targets: this.prompt,
                alpha: { from: 1, to: 0.5 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        } else if (!visible && this.prompt.alpha > 0.01) {
            this.scene.tweens.killTweensOf(this.prompt);
            this.prompt.setAlpha(0);
        }
    }

    /* ================================================================== */
    /*  Proximity                                                           */
    /* ================================================================== */

    isPlayerNearby(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= NPC.PROXIMITY_RADIUS * NPC.PROXIMITY_RADIUS;
    }

    isPlayerFar(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) > NPC.RESET_DISTANCE * NPC.RESET_DISTANCE;
    }

    /* ================================================================== */
    /*  Dialogue Logic                                                      */
    /* ================================================================== */

    startDialogue() {
        this.isTalking = true;
        this.dialogueIndex = 0;
        this._moveState = 'rest';
        this._setPose('stand');
        this._startTyping(this.dialogues[0]);
    }

    advanceDialogue() {
        if (this.isTyping) {
            this.typewriterPos = this.currentLine.length;
            this.isTyping = false;
            this._updateDialogueText();
            this._updateIndicator();
            return false;
        }
        this.dialogueIndex++;
        if (this.dialogueIndex >= this.dialogues.length) {
            this._closeDialogue();
            return true;
        }
        this._startTyping(this.dialogues[this.dialogueIndex]);
        return false;
    }

    _startTyping(textOrKey) {
        this.currentLine = this._resolveDialogueLine(textOrKey);
        this.typewriterPos = 0;
        this.typewriterTimer = 0;
        this.isTyping = true;
        this._pushDialogueToHud(true);
    }

    _resolveDialogueLine(textOrKey) {
        if (textOrKey == null) return '';

        if (typeof textOrKey === 'object') {
            const code = Lang.getCode ? Lang.getCode() : 'cn';
            if (code === 'en' && textOrKey.en) return textOrKey.en;
            if (code !== 'en' && textOrKey.cn) return textOrKey.cn;
            return textOrKey.en || textOrKey.cn || '';
        }

        const resolved = Lang.t(textOrKey);
        if (resolved !== textOrKey) return resolved;

        const key = NPC.DIALOGUE_MAP[textOrKey];
        if (key) return Lang.t(key);

        return textOrKey;
    }

    _updateDialogueText() {
        this._pushDialogueToHud(true);
    }

    _updateIndicator() {
        this._pushDialogueToHud(true);
    }

    _closeDialogue() {
        this.isTalking = false;
        this.dialogueIndex = 0;
        this._moveState = 'rest';
        this._moveTimer = Phaser.Math.FloatBetween(0.6, 1.4);
        this._setPose('stand');
        this._pushDialogueToHud(false);
    }

    reset() {
        if (!this.isTalking) {
            this.dialogueIndex = 0;
        }
    }

    /* ================================================================== */
    /*  Movement                                                            */
    /* ================================================================== */

    _chooseWanderTarget() {
        const minX = this.homeX - this.walkRadius;
        const maxX = this.homeX + this.walkRadius;
        let target = Phaser.Math.Between(minX, maxX);
        if (Math.abs(target - this.sprite.x) < 10) {
            target = target < this.homeX ? maxX : minX;
        }
        this._targetX = Phaser.Math.Clamp(target, minX, maxX);
        this._moveState = 'walk';
    }

    _updateWander(dt) {
        if (this.isTalking) return;

        this._moveTimer -= dt;
        if (this._moveState === 'rest') {
            this._setPose('stand');
            if (this._moveTimer <= 0) {
                this._moveTimer = Phaser.Math.FloatBetween(0.8, 2.1);
                this._chooseWanderTarget();
            }
            return;
        }

        const dx = this._targetX - this.sprite.x;
        const dir = Math.sign(dx);
        if (Math.abs(dx) <= 2) {
            this.sprite.x = this._targetX;
            this._moveState = 'rest';
            this._moveTimer = Phaser.Math.FloatBetween(this.pauseMin, this.pauseMax);
            this._setPose('stand');
            return;
        }

        this.facingRight = dir > 0;
        this.sprite.x += dir * this.walkSpeed * dt;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, this.homeX - this.walkRadius, this.homeX + this.walkRadius);
        this._setPose('walk');

        if (this.sprite.x <= this.homeX - this.walkRadius + 2 || this.sprite.x >= this.homeX + this.walkRadius - 2) {
            this._moveState = 'rest';
            this._moveTimer = Phaser.Math.FloatBetween(this.pauseMin, this.pauseMax);
            this._setPose('stand');
        }
    }

    /* ================================================================== */
    /*  Update                                                              */
    /* ================================================================== */

    update(delta) {
        if (!this.sprite || !this.sprite.active) return;

        if (this.isTalking) {
            this._setPose('stand');
            if (this.isTyping) {
                this.typewriterTimer += delta;
                if (this.typewriterTimer >= 30) {
                    const advance = Math.floor(this.typewriterTimer / 30);
                    this.typewriterTimer = this.typewriterTimer % 30;
                    this.typewriterPos = Math.min(
                        this.typewriterPos + advance,
                        this.currentLine.length,
                    );
                    this._updateDialogueText();
                    if (this.typewriterPos >= this.currentLine.length) {
                        this.isTyping = false;
                        this._updateIndicator();
                    }
                }
            }
            return;
        }

        const dt = delta / 1000;
        if (this.behavior === 'wander') {
            this._updateWander(dt);
        } else {
            this._setPose('stand');
        }

        this._syncLayout();
    }

    _pushDialogueToHud(visible) {
        const hud = this.scene.hud;
        if (!hud) return;

        if (!visible) {
            hud.hideNpcDialogue();
            return;
        }

        const indicator = this.isTyping
            ? '\u25BC'
            : (this.dialogueIndex >= this.dialogues.length - 1 ? Lang.t('npcClose') : '\u25BC');

        hud.showNpcDialogue(this.name, this.currentLine.substring(0, this.typewriterPos), indicator);
    }

    /* ================================================================== */
    /*  Cleanup                                                             */
    /* ================================================================== */

    destroy() {
        this.scene.tweens.killTweensOf(this.prompt);
        this.scene.tweens.killTweensOf(this.sprite);
        if (this.sprite) this.sprite.destroy();
        if (this.prompt) this.prompt.destroy();
        if (this.scene.hud) this.scene.hud.hideNpcDialogue();
    }
}
