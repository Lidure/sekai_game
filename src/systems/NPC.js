/**
 * NPC — Interactive non-player character for SEKAI: 25-ji Metroidvania.
 *
 * Visual:
 *   - Phaser Graphics character (head + body + hair), ~24×32 world pixels
 *   - 25-ji colour palette: dark teal body, pale skin, teal/character hair
 *
 * Interaction:
 *   - Proximity check within 60px of NPC centre
 *   - Shows "NAME  ◆ TALK (J)" prompt at bottom-center of screen
 *   - Player presses J → dialogue box opens with typewriter effect
 *   - Each J press advances to next line; last line closes dialogue
 *   - Walking away (>100px) resets dialogue index
 *
 * Dialogue UI:
 *   - Dark semi-transparent box at bottom of screen (500×100)
 *   - Name in cyan, dialogue text in white, ▼ / ◆ CLOSE indicator
 *   - Typewriter effect: one character every 30ms
 *   - J during typewriter → complete line immediately
 *
 * Depth: visuals at 5, prompt & dialogue at 200
 */
class NPC {
    /**
     * @param {Phaser.Scene} scene    - Owning GameScene
     * @param {number}       x        - World X position
     * @param {number}       y        - World Y position
     * @param {object}       config
     * @param {string}       config.name      - NPC display name
     * @param {string[]}     config.dialogues - Line-by-line dialogue array
     * @param {number}       [config.hairColor] - Hex colour for hair (default 0x2EC4B6)
     */
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.name = config.name || '???';
        this.dialogues = config.dialogues || ['...'];
        this.hairColor = config.hairColor !== undefined ? config.hairColor : 0x2EC4B6;

        // Dialogue state
        this.dialogueIndex = 0;
        this.isTalking = false;
        this.isTyping = false;
        this.typewriterTimer = 0;
        this.typewriterPos = 0;
        this.currentLine = '';

        this._recalcBox();

        this._createVisuals();
        this._createPrompt();
        this._createDialogueBox();
    }

    static PROXIMITY_RADIUS = 60;
    static RESET_DISTANCE = 100;

    /* ================================================================== */
    /*  Visuals                                                             */
    /* ================================================================== */

    _recalcBox() {
        const cam = this.scene.cameras.main;
        const zoom = cam ? cam.zoom : 1;
        const sw = this.scene.scale.width;
        const sh = this.scene.scale.height;
        const w = Math.min(760, sw - 80);
        const h = 120;
        const sx = (sw - w) / 2 / zoom;
        const sy = (sh - h - 30) / zoom;
        this._box = {
            x: sx, y: sy, w: w / zoom, h: h / zoom,
        };
    }

    _createVisuals() {
        this.gfx = this.scene.add.graphics().setDepth(5).setPosition(this.x, this.y);
        this._drawCharacter();
    }

    _drawCharacter() {
        const g = this.gfx;
        g.clear();

        // Hair (rect on top of head)
        g.fillStyle(this.hairColor, 1);
        g.fillRect(-6, -25, 12, 8);

        // Head (circle, pale skin)
        g.fillStyle(0xE8F0F8, 1);
        g.fillCircle(0, -16, 6);

        // Eyes (two teal dots)
        g.fillStyle(0x2EC4B6, 1);
        g.fillCircle(-2, -17, 1.2);
        g.fillCircle(2, -17, 1.2);

        // Body (rounded rect, dark teal)
        g.fillStyle(0x1A3A3A, 1);
        g.fillRoundedRect(-7, -10, 14, 22, 2);

        // Outline (subtle teal)
        g.lineStyle(1, 0x7FE0DE, 0.5);
        g.strokeCircle(0, -16, 6);
        g.strokeRoundedRect(-7, -10, 14, 22, 2);
    }

    /* ================================================================== */
    /*  Prompt                                                              */
    /* ================================================================== */

    _createPrompt() {
        this.prompt = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height - 80,
            this.name + '  \u25C6 TALK (J)',
            {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
    }

    /**
     * Show or hide the talk prompt. Pulses while visible.
     * @param {boolean} visible
     */
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
    /*  Dialogue Box                                                        */
    /* ================================================================== */

    _createDialogueBox() {
        const b = this._box;

        // Background
        this.dialogueBg = this.scene.add.graphics()
            .setDepth(200)
            .setScrollFactor(0)
            .setAlpha(0);

        // Name
        this.dialogueName = this.scene.add.text(
            b.x + 15, b.y + 10,
            this.name,
            {
                fontSize: '15px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setScrollFactor(0).setDepth(201).setAlpha(0);

        // Dialogue text
        this.dialogueText = this.scene.add.text(
            b.x + 15, b.y + 32,
            '',
            {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
                wordWrap: { width: b.w - 30 },
            },
        ).setScrollFactor(0).setDepth(201).setAlpha(0);

        // Indicator (▼ or ◆ CLOSE)
        this.dialogueIndicator = this.scene.add.text(
            b.x + b.w - 15, b.y + b.h - 12,
            '',
            {
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setOrigin(1, 1).setScrollFactor(0).setDepth(201).setAlpha(0);
    }

    /** Redraw the dialogue background (called each time the box appears). */
    _drawDialogueBg() {
        const b = this._box;
        const g = this.dialogueBg;
        g.clear();

        // Dark background
        g.fillStyle(0x0A0A1A, 0.85);
        g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);

        // Border
        g.lineStyle(1, 0x2EC4B6, 0.5);
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4);
    }

    _showDialogueBox(visible) {
        const alpha = visible ? 1 : 0;
        this.dialogueBg.setAlpha(alpha);
        this.dialogueName.setAlpha(alpha);
        this.dialogueText.setAlpha(alpha);
        this.dialogueIndicator.setAlpha(alpha);
        if (visible) {
            this._drawDialogueBg();
        }
    }

    /* ================================================================== */
    /*  Proximity                                                           */
    /* ================================================================== */

    /**
     * Check whether a point is within interaction range of the NPC.
     * @param {number} px - Player X
     * @param {number} py - Player Y
     * @returns {boolean}
     */
    isPlayerNearby(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= NPC.PROXIMITY_RADIUS * NPC.PROXIMITY_RADIUS;
    }

    /**
     * Check whether the player has walked far enough to reset dialogue.
     * @param {number} px - Player X
     * @param {number} py - Player Y
     * @returns {boolean}
     */
    isPlayerFar(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) > NPC.RESET_DISTANCE * NPC.RESET_DISTANCE;
    }

    /* ================================================================== */
    /*  Dialogue Logic                                                      */
    /* ================================================================== */

    /** Open the dialogue box and begin typing the first line. */
    startDialogue() {
        this.isTalking = true;
        this.dialogueIndex = 0;
        this._showDialogueBox(true);
        this._startTyping(this.dialogues[0]);
    }

    /**
     * Advance or complete the current dialogue line.
     * - If still typing: complete the line immediately.
     * - If finished: move to next line, or close if on the last line.
     * @returns {boolean} true if dialogue was closed (reached end of array)
     */
    advanceDialogue() {
        if (this.isTyping) {
            // Reveal full text immediately
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

    _startTyping(text) {
        this.currentLine = text;
        this.typewriterPos = 0;
        this.typewriterTimer = 0;
        this.isTyping = true;
        this._updateDialogueText();
        this._updateIndicator();
    }

    _updateDialogueText() {
        const displayed = this.currentLine.substring(0, this.typewriterPos);
        this.dialogueText.setText(displayed);
    }

    _updateIndicator() {
        if (this.isTyping) {
            this.dialogueIndicator.setText('\u25BC');
        } else if (this.dialogueIndex >= this.dialogues.length - 1) {
            this.dialogueIndicator.setText('\u25C6 CLOSE (J)');
        } else {
            this.dialogueIndicator.setText('\u25BC');
        }
    }

    /** Close dialogue and reset state. */
    _closeDialogue() {
        this.isTalking = false;
        this.dialogueIndex = 0;
        this._showDialogueBox(false);
    }

    /**
     * Reset dialogue index if the player walked away.
     * Does nothing if the NPC is currently in conversation.
     */
    reset() {
        if (!this.isTalking) {
            this.dialogueIndex = 0;
        }
    }

    /* ================================================================== */
    /*  Update (typewriter)                                                 */
    /* ================================================================== */

    /**
     * Called each frame while the NPC is talking.
     * Advances the typewriter effect.
     * @param {number} delta - Frame delta in ms
     */
    update(delta) {
        if (!this.isTalking) return;

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
    }

    /* ================================================================== */
    /*  Cleanup                                                             */
    /* ================================================================== */

    destroy() {
        this.scene.tweens.killTweensOf(this.prompt);
        if (this.gfx) this.gfx.destroy();
        if (this.prompt) this.prompt.destroy();
        if (this.dialogueBg) this.dialogueBg.destroy();
        if (this.dialogueName) this.dialogueName.destroy();
        if (this.dialogueText) this.dialogueText.destroy();
        if (this.dialogueIndicator) this.dialogueIndicator.destroy();
    }
}
