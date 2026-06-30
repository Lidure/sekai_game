/**
 * PauseMenu — A visually polished pause overlay for SEKAI: 25-ji Metroidvania.
 *
 * Visual identity (Nightcord / 25-ji theme):
 *   - Deep navy/purple tones (#0a0a1a, #1a1a3e)
 *   - Accent: teal-cyan (#2EC4B6, #7FE0DE), pale blue (#a8d8ff)
 *   - Pink highlight (#FF87A0) for diamond accent and caret
 *   - Monospace fonts throughout to preserve pixel-art consistency
 *
 * Features:
 *   - Semi-transparent overlay that darkens the game world
 *   - Centered panel with teal border glow (layered rounded rects)
 *   - Title "◆ PAUSED ◆" with decorative line + diamond accent
 *   - 4 menu items with full-width teal selection highlight
 *   - Volume slider (visual bar + fill + knob + percentage)
 *   - Fullscreen toggle with [ON] / [OFF] indicator
 *   - Confirmation dialog for "RETURN TO MENU" (CANCEL / CONFIRM)
 *   - Keyboard: ↑↓/WS navigate, J/Space/Enter confirm, ←→ adjust slider, ESC/P close
 *   - Stagger fade-in animation when opening
 *   - BGM pause/resume integration
 *   - Proper cleanup on scene shutdown
 *
 * All visuals are drawn via the Phaser Graphics API — zero external assets.
 *
 * Depth: 199 (below HUD elements at 200+, above game world at < 100)
 */

class PauseMenu {

    /* ================================================================== */
    /*  Constructor                                                        */
    /* ================================================================== */

    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.inputEnabled = false;
        this.selectedIndex = 0;
        this.destroyed = false;

        // Confirmation sub-state for "Return to Main Menu"
        this.confirmMode = false;
        this.confirmChoice = 0; // 0 = CANCEL, 1 = CONFIRM
        this.savePicker = null;

        // Root container — fixed to camera, rendered above game world
        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(199)
            .setVisible(false);

        this._fullscreenChangeHandler = () => {
            this._updateFSIndicator();
        };
        document.addEventListener('fullscreenchange', this._fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this._fullscreenChangeHandler);

        // Build all visual elements
        this._build();

        // Register keyboard input
        this._buildKeyboard();

        // Clean up on scene shutdown
        scene.events.once('shutdown', () => this.destroy());
    }

    /* ------------------------------------------------------------------ */
    /*  Getters                                                            */
    /* ------------------------------------------------------------------ */

    get paused() { return this.isOpen; }
    get isPaused() { return this.isOpen; }

    /* ================================================================== */
    /*  VISUAL BUILDING                                                    */
    /* ================================================================== */

    _build() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;

        // Panel dimensions
        const pW = 384;
        const pH = 420;
        const px = (W - pW) / 2;
        const py = (H - pH) / 2 - 10;
        const cx = W / 2;

        this._panelRect = { px, py, pW, pH };

        /* ---- Overlay (full-screen dark rectangle) ---- */
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(0x0a0a1a, 0.75);
        overlay.fillRect(0, 0, W, H);
        this.container.add(overlay);

        /* ---- Panel background + glow layers ---- */
        const panel = this.scene.add.graphics();
        this.container.add(panel);

        // Glow rings (widening strokes at decreasing alpha)
        for (let i = 4; i >= 1; i--) {
            const a = 0.04 * (5 - i);
            panel.lineStyle(i * 2, 0x2EC4B6, a);
            panel.strokeRoundedRect(px - i * 2, py - i * 2, pW + i * 4, pH + i * 4, 14 + i);
        }

        // Main fill
        panel.fillStyle(0x0a0a1a, 0.95);
        panel.fillRoundedRect(px, py, pW, pH, 14);

        // Outer teal border
        panel.lineStyle(1.5, 0x2EC4B6, 0.45);
        panel.strokeRoundedRect(px, py, pW, pH, 14);

        // Inner subtle border
        panel.lineStyle(1, 0x7FE0DE, 0.10);
        panel.strokeRoundedRect(px + 4, py + 4, pW - 8, pH - 8, 12);

        /* ---- Selection glow (moves with selection) ---- */
        this.selectionGlow = this.scene.add.graphics();
        this.container.add(this.selectionGlow);

        // Pulse tween for the glow alpha
        this._pulseTween = this.scene.tweens.add({
            targets: this.selectionGlow,
            alpha: { from: 0.50, to: 1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        /* ---- Title ---- */
        const titleStr = Lang.t('pauseTitle');
        this.titleText = this.scene.add.text(cx, py + 35, titleStr, {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5);
        this.container.add(this.titleText);

        // Title shadow (offset pixel-duplicate for crisp pixel effect)
        const titleShadow = this.scene.add.text(cx + 1, py + 36, titleStr, {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#2EC4B6',
        }).setOrigin(0.5).setAlpha(0.25);
        this.container.add(titleShadow);

        /* ---- Decorative line below title ---- */
        const deco = this.scene.add.graphics();
        const lineY = py + 58;
        // Left and right lines
        deco.lineStyle(1, 0x2EC4B6, 0.20);
        deco.lineBetween(cx - 90, lineY, cx - 18, lineY);
        deco.lineBetween(cx + 18, lineY, cx + 90, lineY);
        // Pink diamond accent at centre
        deco.fillStyle(0xFF87A0, 0.65);
        deco.fillRect(cx - 2, lineY - 2, 4, 4);
        this.container.add(deco);

        /* ---- Menu items ---- */
        const itemDefs = [
            { labelKey: 'resume',        action: 'resume' },
            { labelKey: 'status',        action: 'status' },
            { labelKey: 'save',          action: 'save' },
            { labelKey: 'returnToMenu',  action: 'mainMenu' },
            { labelKey: 'fullscreen',    action: 'fullscreen' },
            { labelKey: 'language',      action: 'language' },
            { labelKey: 'master',        action: null },    // slider handled separately
        ];
        this._itemDefs = itemDefs;

        this.items = [];
        this.itemTexts = [];
        this.itemContainers = []; // sub-containers for stagger animation
        this.itemYs = [];

        const itemX = cx - 90;    // left-aligned text start (390)
        const startY = py + 86;
        const gap = 42;

        itemDefs.forEach((def, i) => {
            const y = startY + i * gap;
            this.itemYs.push(y);

            // Sub-container for independent stagger animation
            const sub = this.scene.add.container(0, y);
            this.container.add(sub);
            this.itemContainers.push(sub);

            // Pink caret indicator (visible when selected)
            const caret = this.scene.add.text(-4, 0, '\u25B6', {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#FF87A0',
            }).setOrigin(0.5).setAlpha(0);
            sub.add(caret);

            // Label
            const txt = this.scene.add.text(itemX, 0, Lang.t(def.labelKey), {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
            }).setOrigin(0, 0.5);
            sub.add(txt);
            this.itemTexts.push(txt);

            if (def.action !== null) {
                const zone = this.scene.add.zone(cx, 0, pW - 28, 34)
                    .setScrollFactor(0)
                    .setInteractive({ useHandCursor: true });
                sub.add(zone);
                zone.on('pointerover', () => {
                    if (!this._canInteract() || this.confirmMode) return;
                    this.selectedIndex = i;
                    this._updateSelection();
                    this._updateHelpText();
                });
                zone.on('pointerup', (pointer) => {
                    if (!this._canInteract() || this.confirmMode) return;
                    if (pointer.button !== 0) return;
                    this.selectedIndex = i;
                    this._updateSelection();
                    this._updateHelpText();
                    this._confirm();
                });
            }

            this.items.push({ sub, caret, text: txt, action: def.action, labelKey: def.labelKey, y });
        });

        /* ---- Fullscreen indicator ---- */
        // "[ON]" or "[OFF]" shown at the right edge of the FULLSCREEN row
            this.fsText = this.scene.add.text(px + pW - 20, startY + 4 * gap, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(1, 0.5);
        this.container.add(this.fsText);

        /* ---- Language indicator ---- */
            this.langText = this.scene.add.text(px + pW - 20, startY + 5 * gap, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(1, 0.5);
        this.container.add(this.langText);

        /* ---- Master volume slider ---- */
        this._buildSlider(cx, startY + 6 * gap);

        /* ---- Confirmation dialog (hidden until triggered) ---- */
        this._buildConfirmation();

        /* ---- Help text at panel bottom ---- */
        this.helpText = this.scene.add.text(cx, py + pH - 16, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#3a4a6a',
        }).setOrigin(0.5);
        this.container.add(this.helpText);
    }

    /* ------------------------------------------------------------------ */
    /*  Volume slider widget                                               */
    /* ------------------------------------------------------------------ */

    _buildSlider(cx, y) {
        const pW = 384;
        const px = (this.scene.scale.width - pW) / 2;
        const barW = 110;
        const barH = 6;
        const barX = px + pW - 20 - barW - 8 - 30; // right-aligned before percentage + padding
        const barY = y - barH / 2;

        this._sliderCfg = { barW, barH, barX, barY };

        // Graphics for track + fill + knob
        this.sliderGfx = this.scene.add.graphics();
        this.container.add(this.sliderGfx);

        // Percentage label to the right of the bar
        this.volPctText = this.scene.add.text(barX + barW + 8, y, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0, 0.5);
        this.container.add(this.volPctText);

        // Initial draw
        this._drawSlider();
    }

    _drawSlider() {
        const g = this.sliderGfx;
        g.clear();

        const vol = AudioSettings.get('master');

        const { barW, barH, barX, barY } = this._sliderCfg;
        const fillW = barW * vol;

        // Track background
        g.fillStyle(0x1a1a2e, 0.80);
        g.fillRoundedRect(barX, barY, barW, barH, 3);

        // Filled portion
        if (fillW > 0) {
            g.fillStyle(0x2EC4B6, 0.85);
            g.fillRoundedRect(barX, barY, Math.max(fillW, barH), barH, 3);
            // Slightly lighter inner gleam
            if (fillW > barH) {
                g.fillStyle(0x7FE0DE, 0.18);
                g.fillRect(barX + barH, barY, fillW - barH, barH);
            }
        }

        // Knob
        const knobX = barX + fillW;
        g.fillStyle(0xffffff, 0.90);
        g.fillCircle(knobX, barY + barH / 2, 4);
        g.fillStyle(0x2EC4B6, 0.50);
        g.fillCircle(knobX, barY + barH / 2, 2);

        // Percentage text
        this.volPctText.setText(`${Math.round(vol * 100)}%`);
    }

    /* ------------------------------------------------------------------ */
    /*  Confirmation dialog                                                */
    /* ------------------------------------------------------------------ */

    _buildConfirmation() {
        this.confirmGroup = this.scene.add.container(0, 0).setVisible(false);
        this.container.add(this.confirmGroup);

        // Dim overlay
        const dim = this.scene.add.graphics();
        dim.fillStyle(0x000000, 0.40);
        dim.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
        this.confirmGroup.add(dim);

        // Popup rectangle
        const popW = 276;
        const popH = 120;
        const popX = (this.scene.scale.width - popW) / 2;
        const popY = (this.scene.scale.height - popH) / 2;
        const pcx = popX + popW / 2;

        const popup = this.scene.add.graphics();
        popup.fillStyle(0x0a0a1a, 0.98);
        popup.fillRoundedRect(popX, popY, popW, popH, 10);
        popup.lineStyle(1.5, 0x2EC4B6, 0.50);
        popup.strokeRoundedRect(popX, popY, popW, popH, 10);
        popup.lineStyle(1, 0xFF87A0, 0.15);
        popup.strokeRoundedRect(popX + 2, popY + 2, popW - 4, popH - 4, 8);
        this.confirmGroup.add(popup);

        // Title text
        const confirmTitle = this.scene.add.text(pcx, popY + 26, Lang.t('returnToMenuQ'), {
            fontSize: '15px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5);
        this.confirmGroup.add(confirmTitle);

        // Subtle separator
        const sep = this.scene.add.graphics();
        sep.lineStyle(1, 0x2EC4B6, 0.12);
        sep.lineBetween(pcx - 55, popY + 42, pcx + 55, popY + 42);
        this.confirmGroup.add(sep);

        // CANCEL / CONFIRM labels
        this.confirmTexts = [];
        const cLabels = [Lang.t('cancel'), Lang.t('confirm')];
        cLabels.forEach((label, i) => {
            const x = pcx - 38 + i * 76;
            const txt = this.scene.add.text(x, popY + 66, label, {
                fontSize: '15px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
            }).setOrigin(0.5);
            this.confirmGroup.add(txt);
            this.confirmTexts.push(txt);

            const confirmZone = this.scene.add.zone(x, popY + 66, 56, 24)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true });
            this.confirmGroup.add(confirmZone);
            confirmZone.on('pointerover', () => {
                if (!this._canInteract() || !this.confirmMode) return;
                this.confirmChoice = i;
                this._updateConfirmGlow();
            });
            confirmZone.on('pointerup', (pointer) => {
                if (!this._canInteract() || !this.confirmMode) return;
                if (pointer.button !== 0) return;
                this.confirmChoice = i;
                this._updateConfirmGlow();
                this._confirm();
            });
        });

        // Selection glow for confirmation choices
        this.confirmGlow = this.scene.add.graphics();
        this.confirmGroup.add(this.confirmGlow);
    }

    /* ================================================================== */
    /*  KEYBOARD INPUT                                                     */
    /* ================================================================== */

    _buildKeyboard() {
        this._toggleHandler = (event) => {
            if (this.destroyed) return;
            // Character panel open → close it instead of toggling pause
            const hud = this.scene.scene.get('HUDScene');
            if (hud && hud.characterPanel && hud.characterPanel.isOpen) {
                hud.characterPanel._close();
                if (event) event.preventDefault();
                return;
            }
            // Save picker open → route ESC to picker
            if (this.savePicker && !this.savePicker.destroyed) {
                this.savePicker._cancel();
                this.savePicker = null;
                if (event) event.preventDefault();
                return;
            }
            // ESC / P in confirm mode → cancel confirmation, return to menu
            if (this.confirmMode) {
                this._closeConfirm();
                if (event) event.preventDefault();
                return;
            }
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            if (this.isOpen) {
                this._close();
            } else {
                this._open();
            }
            if (event) event.preventDefault();
        };

        this._cancelHandler = (event) => {
            if (this.destroyed) return;
            if (this.savePicker && !this.savePicker.destroyed) {
                this.savePicker._cancel();
                this.savePicker = null;
                if (event) event.preventDefault();
                return;
            }
            if (this.isOpen && this.inputEnabled && !this.confirmMode && this.selectedIndex === 6) {
                this._adjustVolume(-0.05);
                if (event) event.preventDefault();
                return;
            }
            if (this.confirmMode) {
                this._closeConfirm();
                if (event) event.preventDefault();
                return;
            }
            if (this.isOpen) {
                this._close();
                if (event) event.preventDefault();
            }
        };

        this.scene.input.keyboard.on('keydown-ESC', this._toggleHandler);
        this.scene.input.keyboard.on('keydown-P', this._toggleHandler);
        this.scene.input.keyboard.on('keydown-K', this._cancelHandler);

        // Navigation
        this._navigateUp = () => { if (this._canInteract()) this._navigate(-1); };
        this._navigateDown = () => { if (this._canInteract()) this._navigate(1); };

        // Volume adjustment (only when MASTER is selected)
        this._adjustLeft = () => { if (this._canInteract()) this._adjustVolume(-0.05); };
        this._adjustRight = () => { if (this._canInteract()) this._adjustVolume(0.05); };

        // Confirm / execute
        this._confirmAction = () => {
            if (!this._canInteract()) return;
            if (!this.confirmMode && this.selectedIndex === 6) {
                this._adjustVolume(0.05);
                return;
            }
            this._confirm();
        };

        this.scene.input.keyboard.on('keydown-UP', this._navigateUp);
        this.scene.input.keyboard.on('keydown-W', this._navigateUp);
        this.scene.input.keyboard.on('keydown-DOWN', this._navigateDown);
        this.scene.input.keyboard.on('keydown-S', this._navigateDown);
        this.scene.input.keyboard.on('keydown-LEFT', this._adjustLeft);
        this.scene.input.keyboard.on('keydown-A', this._adjustLeft);
        this.scene.input.keyboard.on('keydown-RIGHT', this._adjustRight);
        this.scene.input.keyboard.on('keydown-D', this._adjustRight);
        this.scene.input.keyboard.on('keydown-J', this._confirmAction);
        this.scene.input.keyboard.on('keydown-SPACE', this._confirmAction);
        this.scene.input.keyboard.on('keydown-ENTER', this._confirmAction);
    }

    /** Returns true when the menu is open, not destroyed, and input is enabled. */
    _canInteract() {
        // In confirm mode, the main inputEnabled check still gates us;
        // the confirmation popup uses this same flag.
        if (this.savePicker && !this.savePicker.destroyed) return false;
        return this.isOpen && this.inputEnabled && !this.destroyed;
    }

    /* ================================================================== */
    /*  OPEN / CLOSE                                                       */
    /* ================================================================== */

    _open() {
        if (this.destroyed) return;

        this.isOpen = true;
        this.inputEnabled = false;

        this._savedZoom = this.scene.cameras.main.zoom;
        this._savedScroll = { x: this.scene.cameras.main.scrollX, y: this.scene.cameras.main.scrollY };
        this.selectedIndex = 0;
        this.confirmMode = false;

        // Show overlay before changing zoom — masks the viewport shift
        this.container.setVisible(true);
        this.container.setAlpha(1);

        // Change to menu-friendly zoom while dark overlay hides the transition
        this.scene.cameras.main.setZoom(1);
        this.scene.cameras.main.setScroll(0, 0);

        // Pause game world
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.pause();
        }
        this._pauseAllBgm();

        // Reset item positions for stagger animation
        this.itemContainers.forEach((sub, i) => {
            sub.setPosition(0, this.itemYs[i] + 20);
            sub.setAlpha(0);
        });
        this.selectionGlow.setAlpha(0);

        // Stagger items in
        this.itemContainers.forEach((sub, i) => {
            this.scene.tweens.add({
                targets: sub,
                y: this.itemYs[i],
                alpha: 1,
                duration: 250,
                delay: 80 + i * 60,
                ease: 'Sine.easeOut',
            });
        });

        // Full reveal after all stagger completes
        this.scene.time.delayedCall(550, () => {
            if (this.destroyed) return;
            this.selectionGlow.setAlpha(1);
            this._updateSelection();
            this._updateHelpText();
            this._updateFSIndicator();
            this._drawSlider();
            this.inputEnabled = true;
        });
    }

    _close() {
        if (this.destroyed) return;

        this.inputEnabled = false;
        this.isOpen = false;
        this.confirmMode = false;

        this.confirmGroup.setVisible(false);

        // Restore zoom and scroll instantly
        if (this._savedZoom !== undefined) {
            this.scene.cameras.main.setZoom(this._savedZoom);
            this._savedZoom = undefined;
        }
        if (this._savedScroll) {
            this.scene.cameras.main.setScroll(this._savedScroll.x, this._savedScroll.y);
            this._savedScroll = undefined;
        }

        // Hide overlay immediately — no fade to avoid zoom/position flash
        this.container.setVisible(false);
        this.container.setAlpha(1);
        this.itemContainers.forEach((sub) => {
            sub.setAlpha(1);
        });

        // Resume game
        this._resumeAllBgm();
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.resume();
        }

        // Reset mobile controls just-pressed to prevent phantom inputs
        if (this.scene.mobileControls) {
            this.scene.mobileControls.resetJustPressed();
        }
    }

    /* ================================================================== */
    /*  BGM helpers                                                        */
    /* ================================================================== */

    _pauseAllBgm() {
        ['bgm', 'bgmPhase1', 'bgmPhase2', 'bgm_menu'].forEach((key) => {
            this._pauseSound(this.scene[key]);
        });
    }

    _resumeAllBgm() {
        ['bgm', 'bgmPhase1', 'bgmPhase2', 'bgm_menu'].forEach((key) => {
            this._resumeSound(this.scene[key]);
        });
    }

    _pauseSound(snd) {
        if (snd && snd.isPlaying && snd.pause) snd.pause();
    }

    _resumeSound(snd) {
        if (snd && snd.isPaused && snd.resume) snd.resume();
    }

    /* ================================================================== */
    /*  NAVIGATION                                                         */
    /* ================================================================== */

    _navigate(dir) {
        if (!this.inputEnabled) return;

        // Confirm mode navigation (← → or ↑ ↓ between CANCEL / CONFIRM)
        if (this.confirmMode) {
            this.confirmChoice = Phaser.Math.Wrap(this.confirmChoice + dir, 0, 2);
            this._updateConfirmGlow();
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            return;
        }

        this.selectedIndex = Phaser.Math.Wrap(
            this.selectedIndex + dir,
            0,
            this.items.length,
        );
        this._updateSelection();
        this._updateHelpText();
        this._tryPlaySound('sfx_ui_navigate', 0.25);
    }

    _updateSelection() {
        const glow = this.selectionGlow;
        glow.clear();

        const { px, pW } = this._panelRect;

        // Highlight bar dimensions (full width minus margins)
        const hlLeft = px + 14;      // 254
        const hlRight = px + pW - 14; // 546
        const hlW = hlRight - hlLeft;
        const hlH = 34;

        // Colour code each item
        this.items.forEach((item, i) => {
            const isSelected = (i === this.selectedIndex);
            const txt = item.text;

            // Text colour
            txt.setColor(isSelected ? '#ffffff' : '#c8d8ff');

            // Caret visibility
            item.caret.setAlpha(isSelected ? 1 : 0);

            // Draw the highlight bar behind the selected item
            if (isSelected) {
                const y = item.y;
                // Glow fill
                glow.fillStyle(0x2EC4B6, 0.08);
                glow.fillRoundedRect(hlLeft, y - hlH / 2, hlW, hlH, 4);
                // Glow border
                glow.lineStyle(1, 0x2EC4B6, 0.40);
                glow.strokeRoundedRect(hlLeft, y - hlH / 2, hlW, hlH, 4);
                // Inner gleam
                glow.fillStyle(0x7FE0DE, 0.04);
                glow.fillRoundedRect(hlLeft + 4, y - hlH / 2 + 4, hlW - 8, hlH - 8, 3);
            }
        });

        this._updateFSIndicator();
    }

    /** Update the confirm-mode selection glow. */
    _updateConfirmGlow() {
        const g = this.confirmGlow;
        g.clear();

        if (!this.confirmTexts.length) return;

        const txt = this.confirmTexts[this.confirmChoice];
        const bounds = txt.getBounds();

        g.fillStyle(0x2EC4B6, 0.10);
        g.fillRoundedRect(bounds.x - 12, bounds.y - 8, bounds.width + 24, bounds.height + 16, 4);
        g.lineStyle(1, 0x2EC4B6, 0.45);
        g.strokeRoundedRect(bounds.x - 12, bounds.y - 8, bounds.width + 24, bounds.height + 16, 4);

        // Text colour
        this.confirmTexts.forEach((t, i) => {
            t.setColor(i === this.confirmChoice ? '#ffffff' : '#c8d8ff');
        });
    }

    /* ================================================================== */
    /*  HELP TEXT                                                          */
    /* ================================================================== */

    _updateHelpText() {
        if (this.selectedIndex === 6) {
            this.helpText.setText(Lang.t('helpPauseMaster'));
        } else {
            this.helpText.setText(Lang.t('helpNav'));
        }
    }

    /* ================================================================== */
    /*  CONFIRM ACTION                                                     */
    /* ================================================================== */

    _confirm() {
        if (!this.inputEnabled) return;

        // ---- Confirmation mode ----
        if (this.confirmMode) {
            if (this.confirmChoice === 1) {
                // CONFIRM — proceed to main menu
                this._goToMainMenu();
            } else {
                // CANCEL — return to pause menu
                this._closeConfirm();
                this._tryPlaySound('sfx_ui_navigate', 0.25);
            }
            return;
        }

        // ---- Normal mode ----
        const item = this.items[this.selectedIndex];
        if (!item) return;

        this._tryPlaySound('sfx_ui_confirm', 0.35);

        switch (item.action) {
            case 'resume':
                this._close();
                break;
            case 'status':
                this._close();
                const hud = this.scene.scene.get('HUDScene');
                if (hud && hud.characterPanel) {
                    hud.characterPanel.toggle();
                }
                break;
            case 'save':
                this._openSavePicker();
                break;
            case 'mainMenu':
                this._showConfirm();
                break;
            case 'fullscreen':
                this._toggleFullscreen();
                break;
            case 'language':
                this._toggleLanguage();
                break;
        }
    }

    /* ================================================================== */
    /*  LANGUAGE TOGGLE                                                     */
    /* ================================================================== */

    _toggleLanguage() {
        Lang.toggle();
        this._reapplyLabels();
    }

    _reapplyLabels() {
        this.titleText.setText(Lang.t('pauseTitle'));
        this.items.forEach((item, i) => {
            const def = this._itemDefs[i];
            if (def) item.text.setText(Lang.t(def.labelKey));
        });
        this.fsText.setText(this._fsIndicator());
        this.langText.setText(this._langIndicator());
        this._updateHelpText();
        this._updateConfirmLabels();
    }

    _langIndicator() {
        return Lang.getCode() === 'cn' ? '[CN]' : '[EN]';
    }

    _updateConfirmLabels() {
        if (this.confirmTexts && this.confirmTexts.length >= 2) {
            this.confirmTexts[0].setText(Lang.t('cancel'));
            this.confirmTexts[1].setText(Lang.t('confirm'));
        }
    }

    /* ================================================================== */
    /*  SAVE SLOT PICKER                                                    */
    /* ================================================================== */

    _openSavePicker() {
        this.inputEnabled = false;
        this.savePicker = new SaveSlotPicker(this.scene, {
            mode: 'save',
            onSelect: (slotIndex) => {
                this.scene._saveGame(slotIndex);
                this.savePicker = null;
                this._showSaveFeedback();
                this.scene.time.delayedCall(500, () => {
                    this.inputEnabled = true;
                });
            },
            onCancel: () => {
                this.savePicker = null;
                this.inputEnabled = true;
            },
        });
    }

    /* ================================================================== */
    /*  SAVE FEEDBACK                                                       */
    /* ================================================================== */

    _showSaveFeedback() {
        if (this._saveText) this._saveText.destroy();
        this._saveText = this.scene.add.text(
            this.scene.scale.width / 2, 200,
            Lang.t('saved'),
            {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
        this.container.add(this._saveText);

        this.scene.tweens.add({
            targets: this._saveText,
            alpha: { from: 1, to: 0 },
            y: '-=20',
            duration: 1200,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (this._saveText && !this.destroyed) {
                    this._saveText.destroy();
                    this._saveText = null;
                }
            },
        });
    }

    /* ================================================================== */
    /*  CONFIRMATION DIALOG                                                */
    /* ================================================================== */

    _showConfirm() {
        this.confirmMode = true;
        this.confirmChoice = 0;

        // Show the confirmation group
        this.confirmGroup.setVisible(true);
        this.confirmGroup.setAlpha(1);

        // Update glow
        this._updateConfirmGlow();

        // Update help text
        this.helpText.setText(Lang.t('helpConfirm'));
    }

    _closeConfirm() {
        this.confirmMode = false;
        this.confirmGroup.setVisible(false);
        this._updateSelection();
        this._updateHelpText();
        if (this._pulseTween) {
            this.selectionGlow.setAlpha(1);
        }
    }

    /* ================================================================== */
    /*  ACTIONS                                                            */
    /* ================================================================== */

    /** Adjust global sound volume by ±delta (clamped 0-1). */
    _adjustVolume(delta) {
        if (!this.inputEnabled) return;

        // Only respond when MASTER (index 6) is selected and we're not in confirm mode
        if (this.selectedIndex !== 6 || this.confirmMode) return;

        AudioSettings.set('master', AudioSettings.get('master') + delta);
        this._drawSlider();
        this._tryPlaySound('sfx_ui_navigate', 0.12);
    }

    /** Toggle fullscreen mode. */
    _toggleFullscreen() {
        const fs = document.fullscreenElement || document.webkitFullscreenElement || this.scene.scale.isFullscreen;
        if (!fs) {
            const el = document.documentElement;
            const request = el.requestFullscreen ? el.requestFullscreen() :
                (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
            if (request && typeof request.then === 'function') {
                request.then(() => this._updateFSIndicator()).catch(() => this._updateFSIndicator());
            }
        } else {
            const exit = document.exitFullscreen ? document.exitFullscreen() :
                (document.webkitExitFullscreen ? document.webkitExitFullscreen() : null);
            if (exit && typeof exit.then === 'function') {
                exit.then(() => this._updateFSIndicator()).catch(() => this._updateFSIndicator());
            }
        }
        this.scene.time.delayedCall(50, () => this._updateFSIndicator());
        this._updateFSIndicator();
    }

    /** Update the [ON] / [OFF] indicator next to FULLSCREEN. */
    _updateFSIndicator() {
        if (!this.fsText) return;
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || this.scene.scale.isFullscreen);
        this.fsText.setText(isFs ? Lang.t('on') : Lang.t('off'));
        this.fsText.setColor(isFs ? '#7FE0DE' : '#4a6a9f');
    }

    _fsIndicator() {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || this.scene.scale.isFullscreen);
        return isFs ? Lang.t('on') : Lang.t('off');
    }

    /**
     * Transition back to the main menu.
     * Handles both normal scene transitions (GameScene) and overlay
     * scenes (BossScene) via SceneManager.
     */
    _goToMainMenu() {
        this.inputEnabled = false;

        // Resume everything before transitioning
        this._resumeAllBgm();
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.resume();
        }

        // Destroy all BGM references
        ['bgm', 'bgmPhase1', 'bgmPhase2', 'bgm_menu'].forEach((key) => {
            const snd = this.scene[key];
            if (snd) {
                snd.stop();
                snd.destroy();
                this.scene[key] = null;
            }
        });

        // If we're in BossScene (an overlay), finish it with goToMenu flag.
        // GameScene's overlay listener will handle the transition.
        if (this.scene.scene.key === 'BossScene') {
            SceneManager.finishOverlay(this.scene, { playerDied: false, goToMenu: true });
            return;
        }

        // Normal scene transition
        SceneManager.goTo(this.scene, 'MenuScene');
    }

    /* ================================================================== */
    /*  SOUND HELPER                                                       */
    /* ================================================================== */

    /**
     * Attempt to play a UI sound. Swallows errors gracefully so missing
     * audio keys (e.g. before audio assets are loaded) don't break the menu.
     *
     * @param {string} key   - Sound key in the audio cache.
     * @param {number} [vol] - Optional volume (0-1).
     */
    _tryPlaySound(key, vol) {
        try {
            if (this.scene.cache.audio && this.scene.cache.audio.exists(key)) {
                this.scene.sound.play(key, { volume: vol ?? 0.3 });
            }
        } catch (_) {
            // Audio not available — silently skip.
        }
    }

    /* ================================================================== */
    /*  UPDATE LOOP                                                        */
    /* ================================================================== */

    /**
     * Called by the owning scene each frame.
     * Keeps the selection highlight synchronised with the pulse tween.
     */
    update() {
        if (!this.isOpen || this.destroyed) return;

        // The selection glow's alpha is driven by the pulse tween,
        // so we only need to redraw when selection or dimensions change.
        // However, the highlight rect needs to stay visible — nothing to do here
        // since all drawing happens in _updateSelection / _updateConfirmGlow.
    }

    /* ================================================================== */
    /*  CLEANUP                                                            */
    /* ================================================================== */

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.isOpen = false;
        this.inputEnabled = false;
        this.confirmMode = false;

        // Stop tweens
        if (this._pulseTween) {
            this._pulseTween.stop();
            this._pulseTween = null;
        }

        // Remove all keyboard listeners
        const kb = this.scene.input.keyboard;
        if (kb) {
            kb.off('keydown-ESC', this._toggleHandler);
            kb.off('keydown-P', this._toggleHandler);
            kb.off('keydown-K', this._cancelHandler);
            kb.off('keydown-UP', this._navigateUp);
            kb.off('keydown-W', this._navigateUp);
            kb.off('keydown-DOWN', this._navigateDown);
            kb.off('keydown-S', this._navigateDown);
            kb.off('keydown-LEFT', this._adjustLeft);
            kb.off('keydown-A', this._adjustLeft);
            kb.off('keydown-RIGHT', this._adjustRight);
            kb.off('keydown-D', this._adjustRight);
            kb.off('keydown-J', this._confirmAction);
            kb.off('keydown-SPACE', this._confirmAction);
            kb.off('keydown-ENTER', this._confirmAction);
        }

        // Destroy the container tree
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        if (this._fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this._fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this._fullscreenChangeHandler);
            this._fullscreenChangeHandler = null;
        }

        // Null out references
        this.items = null;
        this.itemTexts = null;
        this.itemContainers = null;
        this.selectionGlow = null;
        this.confirmTexts = null;
        this.confirmGlow = null;
        this.sliderGfx = null;
        this.fsText = null;
        this.helpText = null;
        this.volPctText = null;
    }
}
