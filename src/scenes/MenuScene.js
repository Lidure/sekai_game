/**
 * MenuScene — Main menu for SEKAI: A 25-ji Metroidvania.
 *
 * Features:
 *   - Dark background with subtle grid and floating teal/purple particles
 *   - "SEKAI" title with sine-float animation and shadow glow
 *   - Menu items with stagger-in fade-up animation
 *   - Keyboard navigation (↑↓/WS skip over disabled items)
 *   - Confirm with J / Space
 *   - Fade transition to GameScene via SceneManager
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    /* ------------------------------------------------------------------ */
    /*  Phaser lifecycle                                                   */
    /* ------------------------------------------------------------------ */

    create() {
        this.selectedIndex = 0;          // Index into this.items
        this.inputEnabled = false;        // Disabled until stagger-in completes
        this.settingsOpen = false;
        this.settingsIndex = 0;
        this.items = [];                 // { text, action, disabled }
        this.particles = [];             // { obj, speed, phase }
        this.savePicker = null;
        this.settingsOverlay = null;
        this.settingsPanel = null;
        this.settingsItems = [];
        this.settingsTitle = null;
        this.settingsHelp = null;
        this.settingsValueTexts = [];
        this.settingsBarGraphics = [];
        this.settingsFillGraphics = [];
        this.settingsKnobGraphics = [];
        this.settingsBarHits = [];
        this.settingsFullscreenText = null;
        this.settingsLanguageText = null;
        this.hintText = null;
        this.versionText = null;

        // Defensive cleanup so returning from gameplay never leaves old BGM behind.
        ['bgm_menu', 'bgm_explore', 'bgm_boss_p1', 'bgm_boss_p2'].forEach((key) => {
            this.sound.stopByKey(key);
        });

        this._buildBackground();
        this._buildTitle();
        this._buildMenuItems();
        this._buildHint();
        this._createControls();
        this._bindFullscreenEvents();
        this.events.once('shutdown', () => this._unbindFullscreenEvents());

        // Audio — start menu BGM immediately
        this.bgm = AudioSettings.createBgm(this, 'bgm_menu', 0.35);
        this.bgm.play();
        this.tweens.add({
            targets: this.bgm,
            volume: AudioSettings.scale('bgm', 0.35),
            duration: 1000,
        });
        
        // Fade in on entry
        this.cameras.main.fadeIn(500);

        // Enable input after stagger animation finishes
        // Items animate: 0ms, 200ms, 400ms delays, each takes 400ms
        // => last finishes at 400 + 400 = 800ms, add buffer
        this.time.delayedCall(1000, () => {
            this.inputEnabled = true;
            this._updateSelection();
        });
    }

    update(time, delta) {
        this._updateParticles(delta);
        this._handleInput();
    }

    /* ------------------------------------------------------------------ */
    /*  Background: dark fill + grid lines + floating particles            */
    /* ------------------------------------------------------------------ */

    _buildBackground() {
        const bg = this.add.graphics().setDepth(0);
        const w = this.scale.width;
        const h = this.scale.height;

        // Solid dark fill
        bg.fillStyle(0x0a0a1a);
        bg.fillRect(0, 0, w, h);

        // Subtle grid
        bg.lineStyle(1, 0x1a1a3e, 0.25);
        for (let x = 0; x <= w; x += 50) {
            bg.lineBetween(x, 0, x, h);
        }
        for (let y = 0; y <= h; y += 50) {
            bg.lineBetween(0, y, w, y);
        }

        // Small decorative crosses at grid intersections
        bg.lineStyle(1, 0x1a1a3e, 0.15);
        for (let x = 0; x <= w; x += 50) {
            for (let y = 0; y <= h; y += 50) {
                bg.fillStyle(0x1a1a3e, 0.2);
                bg.fillRect(x - 1, y - 1, 3, 3);
            }
        }

        // Floating particles (teal / purple dots)
        this._createParticles();
    }

    _createParticles() {
        const colors = [0x44ccff, 0x9966ff, 0x66eeff];
        const w = this.scale.width;
        const h = this.scale.height;
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(0, h);
            const size = Phaser.Math.FloatBetween(1, 3);
            const color = Phaser.Utils.Array.GetRandom(colors);
            const speed = Phaser.Math.Between(20, 60);
            const alpha = 0.3 + size * 0.15;

            const circle = this.add.circle(x, y, size, color, alpha)
                .setDepth(1);

            this.particles.push({
                obj: circle,
                speed: speed,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    _updateParticles(delta) {
        const dt = delta / 1000;
        const time = this.time.now / 1000;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.obj.y -= p.speed * dt;
            p.obj.x += Math.sin(time + p.phase) * 0.5;

            // Reset when off-screen top
            if (p.obj.y < -10) {
                p.obj.y = this.scale.height + 10;
                p.obj.x = Phaser.Math.Between(0, this.scale.width);
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Title                                                              */
    /* ------------------------------------------------------------------ */

    _buildTitle() {
        // "SEKAI" with a glow-like shadow
        const title = this.add.text(this.scale.width / 2, 180, 'SEKAI', {
            fontSize: '52px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#2a6a9f',
                blur: 16,
                fill: true,
                stroke: false,
            },
        }).setOrigin(0.5).setDepth(10);

        // Subtle floating animation
        this.tweens.add({
            targets: title,
            y: 188,
            duration: 2800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Subtitle
        this.add.text(this.scale.width / 2, 252, 'A 25-ji Metroidvania', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setDepth(10);

        // Decorative line under the title area
        const deco = this.add.graphics().setDepth(9);
        deco.lineStyle(1, 0x2a6a9f, 0.3);
        deco.lineBetween(this.scale.width / 2 - 180, 300, this.scale.width / 2 + 180, 300);
    }

    /* ------------------------------------------------------------------ */
    /*  Menu items                                                         */
    /* ------------------------------------------------------------------ */

    _buildMenuItems() {
        const itemDefs = [
            { labelKey: 'newGame',  action: 'newGame',  disabled: false },
            { labelKey: 'loadGame', action: 'loadGame', disabled: false },
            { labelKey: 'settings', action: 'settings', disabled: false },
            { labelKey: 'credits',  action: 'credits',  disabled: false },
        ];

        const centerX = this.scale.width / 2;
        const startY = 432;
        const gap = 60;

        itemDefs.forEach((def, i) => {
            const y = startY + i * gap;
            const style = def.disabled
                ? Object.assign({}, GAME_FONTS.menuDisabled)
                : Object.assign({}, GAME_FONTS.menuItem);

            const text = this.add.text(centerX, y, Lang.t(def.labelKey), style)
                .setOrigin(0.5)
                .setDepth(10)
                .setAlpha(0);

            if (!def.disabled) {
                text.setInteractive({ useHandCursor: true });
                text.on('pointerover', () => {
                    if (!this.inputEnabled) return;
                    this.selectedIndex = i;
                    this._updateSelection();
                });
                text.on('pointerup', (pointer) => {
                    if (!this.inputEnabled) return;
                    if (pointer.button !== 0) return;
                    this.selectedIndex = i;
                    this._updateSelection();
                    this._confirmItem();
                });
            }

            // Stagger-in: fade up and slide in from slightly below
            this.tweens.add({
                targets: text,
                alpha: 1,
                y: y,
                duration: 500,
                ease: 'Power2',
                delay: i * 200,
            });

            // Make "NEW GAME" (index 0) pulse subtly after stagger-in
            if (i === 0 && !def.disabled) {
                this.tweens.add({
                    targets: text,
                    alpha: 0.85,
                    duration: 900,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    delay: 1000 + i * 200, // Wait for stagger-in
                });
            }

            this.items.push({
                text: text,
                labelKey: def.labelKey,
                action: def.action,
                disabled: def.disabled,
                baseY: y,
            });
        });

        // Selection highlight rectangle (initially hidden)
        this.selHighlight = this.add.graphics().setDepth(9).setAlpha(0);

        // Pulse the highlight alpha
        this.tweens.add({
            targets: this.selHighlight,
            alpha: { from: 0.25, to: 0.7 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    _updateSelection() {
        const item = this.items[this.selectedIndex];
        if (!item) return;

        this.selHighlight.clear();

        const bounds = item.text.getBounds();
        const px = bounds.x - 24;
        const py = bounds.y - 6;
        const pw = bounds.width + 48;
        const ph = bounds.height + 12;

        // Teal glow rectangle
        this.selHighlight.fillStyle(0x00ffcc, 0.12);
        this.selHighlight.fillRoundedRect(px, py, pw, ph, 4);

        this.selHighlight.lineStyle(1, 0x00ffcc, 0.6);
        this.selHighlight.strokeRoundedRect(px, py, pw, ph, 4);
    }

    /* ------------------------------------------------------------------ */
    /*  Hint text                                                          */
    /* ------------------------------------------------------------------ */

    _getStartHint() {
        return ControlMode.isMobile() ? Lang.t('tapToStart') : Lang.t('pressJToStart');
    }

    _buildHint() {
        this.hintText = this.add.text(this.scale.width / 2, this.scale.height - 60, this._getStartHint(), {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#4a6a9f',
        }).setOrigin(0.5).setDepth(10);

        // Blink
        this.tweens.add({
            targets: this.hintText,
            alpha: { from: 0.3, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Version number
        this.versionText = this.add.text(this.scale.width - 26, this.scale.height - 17, 'v0.5.0', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#3a4a7a',
        }).setOrigin(1, 1).setDepth(10).setAlpha(0.7);
    }

    _refreshLocalizedText() {
        this.items.forEach((item) => {
            if (item && item.text && item.labelKey) {
                item.text.setText(Lang.t(item.labelKey));
            }
        });
        if (this.hintText) {
            this.hintText.setText(this.settingsOpen ? Lang.t('helpMenuSettings') : this._getStartHint());
        }
        if (this.settingsTitle) this.settingsTitle.setText(Lang.t('settings'));
        if (this.settingsHelp) this.settingsHelp.setText(Lang.t('helpMenuSettings'));
        this.settingsItems.forEach((item) => {
            if (item && item.text && item.labelKey) {
                item.text.setText(Lang.t(item.labelKey));
            }
        });
        this._updateSelection();
        this._updateSettingsSelection();
        this._updateSettingsVisuals();
    }

    /* ------------------------------------------------------------------ */
    /*  Controls                                                           */
    /* ------------------------------------------------------------------ */

    _createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.keyS = this.input.keyboard.addKey('S');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyK = this.input.keyboard.addKey('K');
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    _bindFullscreenEvents() {
        this._fullscreenChangeHandler = () => {
            this._updateSettingsVisuals();
        };
        document.addEventListener('fullscreenchange', this._fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this._fullscreenChangeHandler);
    }

    _unbindFullscreenEvents() {
        if (!this._fullscreenChangeHandler) return;
        document.removeEventListener('fullscreenchange', this._fullscreenChangeHandler);
        document.removeEventListener('webkitfullscreenchange', this._fullscreenChangeHandler);
        this._fullscreenChangeHandler = null;
    }

    _handleInput() {
        // Save picker is self-contained with its own key handlers
        if (this.savePicker && !this.savePicker.destroyed) return;
        if (this.settingsOpen) {
            this._handleSettingsInput();
            return;
        }
        if (!this.inputEnabled) return;

        // Navigation — skip disabled items
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keyW)) {
            this._navigate(-1);
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
            Phaser.Input.Keyboard.JustDown(this.keyS)) {
            this._navigate(1);
        }

        // Confirm
        if (Phaser.Input.Keyboard.JustDown(this.keyJ) ||
            Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            this._confirmItem();
        }
    }

    _openSettings() {
        if (this.settingsOpen) return;
        this.settingsOpen = true;
        this.inputEnabled = false;
        this.settingsIndex = 0;

        if (!this.settingsOverlay) {
            this._buildSettingsPanel();
        }
        this.settingsOverlay.setVisible(true);
        this._refreshLocalizedText();
        this._updateSettingsVisuals();
        this._updateSettingsSelection();
    }

    _closeSettings() {
        if (!this.settingsOpen) return;
        this.settingsOpen = false;
        this.inputEnabled = true;
        if (this.settingsOverlay) {
            this.settingsOverlay.setVisible(false);
        }
        if (this.hintText) this.hintText.setText(this._getStartHint());
        this._updateSelection();
    }

    _buildSettingsPanel() {
        const w = this.scale.width;
        const h = this.scale.height;
        const panelW = 408;
        const panelH = 436;
        const px = (w - panelW) / 2;
        const py = (h - panelH) / 2 - 2;
        const cx = w / 2;

        this.settingsOverlay = this.add.container(0, 0).setDepth(30).setVisible(false);

        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.58);
        dim.fillRect(0, 0, w, h);
        this.settingsOverlay.add(dim);

        const panel = this.add.graphics();
        panel.fillStyle(0x0a0a1a, 0.97);
        panel.fillRoundedRect(px, py, panelW, panelH, 12);
        panel.lineStyle(1.5, 0x2EC4B6, 0.34);
        panel.strokeRoundedRect(px, py, panelW, panelH, 12);
        panel.lineStyle(1, 0x7FE0DE, 0.08);
        panel.strokeRoundedRect(px + 4, py + 4, panelW - 8, panelH - 8, 10);
        panel.lineStyle(1, 0x2EC4B6, 0.10);
        panel.lineBetween(px + 18, py + 56, px + panelW - 18, py + 56);
        panel.lineStyle(1, 0x1a1a2e, 0.82);
        panel.lineBetween(px + 20, py + 116, px + panelW - 20, py + 116);
        panel.lineBetween(px + 20, py + 168, px + panelW - 20, py + 168);
        panel.lineBetween(px + 20, py + 220, px + panelW - 20, py + 220);
        panel.lineBetween(px + 20, py + 272, px + panelW - 20, py + 272);
        this.settingsOverlay.add(panel);

        this.settingsPanel = this.add.graphics().setDepth(31);
        this.settingsOverlay.add(this.settingsPanel);

        this.settingsTitle = this.add.text(cx, py + 26, Lang.t('settings'), {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5);
        this.settingsOverlay.add(this.settingsTitle);

        this.settingsHelp = this.add.text(cx, py + panelH - 16, Lang.t('helpMenuSettings'), {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#3a4a6a',
        }).setOrigin(0.5);
        this.settingsOverlay.add(this.settingsHelp);

        const rowLeft = px + 30;
        const rowRight = px + panelW - 30;
        const labelX = rowLeft;
        const valueX = rowRight;
        const sliderX = px + 148;
        const sliderW = 132;
        const sliderH = 6;
        const rowY = [py + 90, py + 142, py + 194, py + 248, py + 292, py + 336, py + 380];
        const rowDefs = [
            { key: 'master', labelKey: 'master', type: 'slider', y: rowY[0], valueText: true },
            { key: 'bgm', labelKey: 'bgm', type: 'slider', y: rowY[1], valueText: true },
            { key: 'sfx', labelKey: 'sfx', type: 'slider', y: rowY[2], valueText: true },
            { key: 'fullscreen', labelKey: 'fullscreen', type: 'toggle', y: rowY[3], valueText: true },
            { key: 'language', labelKey: 'language', type: 'toggle', y: rowY[4], valueText: true },
            { key: 'controls', labelKey: 'controls', type: 'toggle', y: rowY[5], valueText: true },
            { key: 'back', labelKey: 'back', type: 'back', y: rowY[6], valueText: false },
        ];

        this.settingsItems = [];
        this.settingsValueTexts = [];
        this.settingsBarGraphics = [];
        this.settingsFillGraphics = [];
        this.settingsKnobGraphics = [];
        this.settingsBarHits = [];

        rowDefs.forEach((def, index) => {
            const labelStyle = {
                fontSize: def.type === 'back' ? '16px' : '15px',
                fontFamily: 'monospace',
                color: def.type === 'back' ? '#a8d8ff' : '#c8d8ff',
            };
            const label = this.add.text(def.type === 'back' ? cx : labelX, def.y, Lang.t(def.labelKey), labelStyle)
                .setOrigin(def.type === 'back' ? 0.5 : 0, 0.5);
            this.settingsOverlay.add(label);

            const valueText = def.valueText
                ? this.add.text(valueX, def.y, '', {
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    color: '#7FE0DE',
                }).setOrigin(1, 0.5)
                : null;
            if (valueText) this.settingsOverlay.add(valueText);

            const item = {
                key: def.key,
                labelKey: def.labelKey,
                type: def.type,
                text: label,
                valueText,
                y: def.y,
                left: def.type === 'back' ? cx - 66 : rowLeft,
                right: def.type === 'back' ? cx + 66 : rowRight,
                width: def.type === 'back' ? 132 : panelW - 60,
            };

            if (def.type === 'slider') {
                const bar = this.add.graphics();
                const fill = this.add.graphics();
                const knob = this.add.graphics();
                this.settingsOverlay.add(bar);
                this.settingsOverlay.add(fill);
                this.settingsOverlay.add(knob);

                const hit = this.add.zone(sliderX + sliderW / 2, def.y, sliderW, 24)
                    .setOrigin(0.5)
                    .setInteractive({ useHandCursor: true });
                hit.on('pointerdown', (pointer) => {
                    if (!this.settingsOpen || pointer.button !== 0) return;
                    const pct = Phaser.Math.Clamp((pointer.x - sliderX) / sliderW, 0, 1);
                    this._setSettingValue(def.key, pct);
                    this._updateSettingsVisuals();
                });
                this.settingsOverlay.add(hit);

                item.slider = { bar, fill, knob, x: sliderX, y: def.y - sliderH / 2, w: sliderW, h: sliderH };
                item.hit = hit;
                this.settingsBarGraphics.push(bar);
                this.settingsFillGraphics.push(fill);
                this.settingsKnobGraphics.push(knob);
                this.settingsBarHits.push(hit);
            } else {
                const zone = this.add.zone(cx, def.y, def.type === 'back' ? 132 : panelW - 28, 34)
                    .setInteractive({ useHandCursor: true });
                zone.on('pointerover', () => {
                    if (!this.settingsOpen) return;
                    this.settingsIndex = index;
                    this._updateSettingsSelection();
                });
                zone.on('pointerup', (pointer) => {
                    if (!this.settingsOpen || pointer.button !== 0) return;
                    this.settingsIndex = index;
                    this._updateSettingsSelection();
                    this._activateSettingsItem();
                });
                this.settingsOverlay.add(zone);
                item.zone = zone;
            }

            label.setInteractive({ useHandCursor: true });
            label.on('pointerover', () => {
                if (!this.settingsOpen) return;
                this.settingsIndex = index;
                this._updateSettingsSelection();
            });
            label.on('pointerup', (pointer) => {
                if (!this.settingsOpen || pointer.button !== 0) return;
                this.settingsIndex = index;
                this._updateSettingsSelection();
                this._activateSettingsItem();
            });

            this.settingsItems.push(item);
            this.settingsValueTexts.push(valueText);
        });

        this._updateSettingsVisuals();
        this._updateSettingsSelection();
    }

    _handleSettingsInput() {
        if (!this.settingsOpen) return;

        if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            this._closeSettings();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW)) {
            this.settingsIndex = Phaser.Math.Wrap(this.settingsIndex - 1, 0, this.settingsItems.length);
            this._updateSettingsSelection();
            this.sound.play('sfx_ui_navigate', { volume: 0.4 });
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keyS)) {
            this.settingsIndex = Phaser.Math.Wrap(this.settingsIndex + 1, 0, this.settingsItems.length);
            this._updateSettingsSelection();
            this.sound.play('sfx_ui_navigate', { volume: 0.4 });
            return;
        }

        const selected = this.settingsItems[this.settingsIndex];
        if (!selected) return;

        if (selected.type === 'slider') {
            if (Phaser.Input.Keyboard.JustDown(this.keyJ) ||
                Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
                Phaser.Input.Keyboard.JustDown(this.keyD)) {
                this._adjustSetting(selected.key, 0.05);
                this.sound.play('sfx_ui_navigate', { volume: 0.25 });
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keyK) ||
                Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
                Phaser.Input.Keyboard.JustDown(this.keyA)) {
                this._adjustSetting(selected.key, -0.05);
                this.sound.play('sfx_ui_navigate', { volume: 0.25 });
                return;
            }
        } else if (selected.type === 'toggle') {
            if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
                this._closeSettings();
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
                Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
                Phaser.Input.Keyboard.JustDown(this.keyA) ||
                Phaser.Input.Keyboard.JustDown(this.keyD)) {
                this._activateSettingsItem();
                return;
            }
        } else if (selected.type === 'back') {
            if (Phaser.Input.Keyboard.JustDown(this.keyK) ||
                Phaser.Input.Keyboard.JustDown(this.keySpace) ||
                Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
                this._closeSettings();
                this.sound.play('sfx_ui_confirm', { volume: 0.35 });
                return;
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.keyJ) ||
            Phaser.Input.Keyboard.JustDown(this.keySpace) ||
            Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
            this._activateSettingsItem();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
            this._closeSettings();
        }
    }

    _activateSettingsItem() {
        const selected = this.settingsItems[this.settingsIndex];
        if (!selected) return;

        switch (selected.type) {
            case 'slider':
                this._adjustSetting(selected.key, 0.05);
                this.sound.play('sfx_ui_navigate', { volume: 0.25 });
                break;
            case 'toggle':
                if (selected.key === 'fullscreen') {
                    this._toggleMenuFullscreen();
                } else if (selected.key === 'language') {
                    Lang.toggle();
                    this._refreshLocalizedText();
                    this.sound.play('sfx_ui_confirm', { volume: 0.35 });
                } else if (selected.key === 'controls') {
                    ControlMode.toggle();
                    this._updateSettingsVisuals();
                    this.sound.play('sfx_ui_confirm', { volume: 0.35 });
                }
                break;
            case 'back':
                this._closeSettings();
                this.sound.play('sfx_ui_confirm', { volume: 0.35 });
                break;
        }
        this._updateSettingsVisuals();
        this._updateSettingsSelection();
    }

    _getSettingValue(kind) {
        return AudioSettings.get(kind);
    }

    _setSettingValue(kind, next) {
        if (kind !== 'master' && kind !== 'bgm' && kind !== 'sfx') return;
        AudioSettings.set(kind, Phaser.Math.Clamp(next, 0, 1));
        this._updateSettingsVisuals();
        this._updateSettingsSelection();
    }

    _adjustSetting(kind, delta) {
        const current = this._getSettingValue(kind);
        this._setSettingValue(kind, current + delta);
    }

    _toggleMenuFullscreen() {
        const fs = document.fullscreenElement || document.webkitFullscreenElement || this.scale.isFullscreen;
        if (!fs) {
            const el = document.documentElement;
            const request = el.requestFullscreen ? el.requestFullscreen() :
                (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
            if (request && typeof request.then === 'function') {
                request.then(() => this._updateSettingsVisuals()).catch(() => this._updateSettingsVisuals());
            }
        } else {
            const exit = document.exitFullscreen ? document.exitFullscreen() :
                (document.webkitExitFullscreen ? document.webkitExitFullscreen() : null);
            if (exit && typeof exit.then === 'function') {
                exit.then(() => this._updateSettingsVisuals()).catch(() => this._updateSettingsVisuals());
            }
        }
        this.sound.play('sfx_ui_confirm', { volume: 0.25 });
        this.time.delayedCall(50, () => this._updateSettingsVisuals());
    }

    _updateSettingsSelection() {
        if (!this.settingsPanel || !this.settingsItems.length) return;
        this.settingsPanel.clear();

        const current = this.settingsItems[this.settingsIndex];
        if (!current) return;

        const px = current.left || 0;
        const py = current.y - (current.type === 'back' ? 20 : 18);
        const pw = current.width || 0;
        const ph = current.type === 'back' ? 30 : 34;

        this.settingsPanel.fillStyle(0x00ffcc, 0.07);
        this.settingsPanel.fillRoundedRect(px, py, pw, ph, 5);
        this.settingsPanel.lineStyle(1, 0x00ffcc, 0.4);
        this.settingsPanel.strokeRoundedRect(px, py, pw, ph, 5);
        this.settingsItems.forEach((item, index) => {
            if (!item || !item.text) return;
            const selected = index === this.settingsIndex;
            item.text.setColor(selected ? '#ffffff' : (item.type === 'back' ? '#a8d8ff' : '#c8d8ff'));
            if (item.valueText) {
                item.valueText.setColor(selected ? '#ffffff' : '#7FE0DE');
            }
        });
        this._updateSettingsHelpText();
    }

    _updateSettingsVisuals() {
        if (!this.settingsOverlay) return;

        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || this.scale.isFullscreen);
        const langCode = Lang.getCode();
        this.settingsItems.forEach((item) => {
            if (!item) return;

            if (item.type === 'slider' && item.slider) {
                const vol = this._getSettingValue(item.key);
                const pct = Math.round(vol * 100);
                const { bar, fill, knob, x, y, w, h } = item.slider;
                const fillW = w * vol;
                bar.clear();
                bar.fillStyle(0x1a1a2e, 0.86);
                bar.fillRoundedRect(x, y, w, h, 3);
                fill.clear();
                if (fillW > 0) {
                    fill.fillStyle(0x2EC4B6, 0.86);
                    fill.fillRoundedRect(x, y, Math.max(fillW, h), h, 3);
                    if (fillW > h) {
                        fill.fillStyle(0x7FE0DE, 0.16);
                        fill.fillRect(x + h, y, fillW - h, h);
                    }
                }
                knob.clear();
                const knobX = x + fillW;
                knob.fillStyle(0xffffff, 0.92);
                knob.fillCircle(knobX, y + h / 2, 4);
                knob.fillStyle(0x2EC4B6, 0.55);
                knob.fillCircle(knobX, y + h / 2, 2);
                if (item.valueText) item.valueText.setText(`${pct}%`);
            } else if (item.type === 'toggle' && item.valueText) {
                if (item.key === 'fullscreen') {
                    item.valueText.setText(`[${isFs ? Lang.t('on') : Lang.t('off')}]`);
                    item.valueText.setColor(isFs ? '#7FE0DE' : '#4a6a9f');
                } else if (item.key === 'language') {
                    item.valueText.setText(`[${langCode.toUpperCase()}]`);
                    item.valueText.setColor(langCode === 'cn' ? '#7FE0DE' : '#a8d8ff');
                } else if (item.key === 'controls') {
                    const mode = ControlMode.get();
                    item.valueText.setText(`${mode === 'mobile' ? Lang.t('mobile') : Lang.t('pc')}`);
                    item.valueText.setColor(mode === 'mobile' ? '#7FE0DE' : '#a8d8ff');
                }
            }
        });
        this._updateSettingsHelpText();
    }

    _updateSettingsHelpText() {
        if (!this.settingsHelp || !this.settingsItems.length) return;
        const selected = this.settingsItems[this.settingsIndex];
        if (!selected) return;

        if (selected.type === 'slider') {
            this.settingsHelp.setText(Lang.t('helpMenuSettingsSlider'));
        } else {
            this.settingsHelp.setText(Lang.t('helpMenuSettingsToggle'));
        }
    }

    _navigate(dir) {
        let next = this.selectedIndex + dir;

        // Clamp and skip disabled items
        while (next >= 0 && next < this.items.length && this.items[next].disabled) {
            next += dir;
        }
        if (next < 0 || next >= this.items.length) return;

        this.selectedIndex = next;
        this._updateSelection();
        this.sound.play('sfx_ui_navigate', { volume: 0.4 });
    }

    _confirmItem() {
        if (!this.inputEnabled) return;

        const item = this.items[this.selectedIndex];
        if (!item || item.disabled) return;

        this.inputEnabled = false; // Prevent double-confirm

        this.sound.play('sfx_ui_confirm', { volume: 0.5 });

        switch (item.action) {
            case 'newGame':
                this._startNewGame();
                break;
            case 'loadGame':
                this._openLoadPicker();
                break;
            case 'settings':
                this._openSettings();
                break;
            case 'credits':
                if (this.bgm) {
                    this.tweens.add({
                        targets: this.bgm,
                        volume: 0,
                        duration: 500,
                        onComplete: () => { this.bgm.stop(); this.bgm.destroy(); this.bgm = null; },
                    });
                }
                this.time.delayedCall(300, () => {
                    SceneManager.goTo(this, 'CreditsScene');
                });
                break;
            default:
                this.inputEnabled = true;
                break;
        }
    }

    _openLoadPicker() {
        this.inputEnabled = false;
        this.savePicker = new SaveSlotPicker(this, {
            mode: 'load',
            onSelect: (slotIndex) => {
                this.savePicker = null;
                let saveData;
                try {
                    const raw = localStorage.getItem(`sekai_save_${slotIndex}`);
                    if (raw) saveData = JSON.parse(raw);
                } catch (_) {}
                if (saveData) {
                    this._transitionToGame(saveData);
                } else {
                    this.inputEnabled = true;
                }
            },
            onCancel: () => {
                this.savePicker = null;
                this.inputEnabled = true;
            },
        });
    }

    _transitionToGame(saveData) {
        this.sound.play('sfx_ui_start', { volume: 0.55 });
        if (this.bgm) {
            this.tweens.add({
                targets: this.bgm,
                volume: 0,
                duration: 500,
                onComplete: () => { this.bgm.stop(); this.bgm.destroy(); this.bgm = null; },
            });
        }
        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(300, () => {
            SceneManager.goTo(this, 'GameScene', { loadSave: saveData });
        });
    }

    _startNewGame() {
        // Audio — start game SFX, fade BGM out
        this.sound.play('sfx_ui_start', { volume: 0.55 });
        if (this.bgm) {
            this.tweens.add({
                targets: this.bgm,
                volume: 0,
                duration: 500,
                onComplete: () => { this.bgm.stop(); this.bgm.destroy(); this.bgm = null; },
            });
        }

        // Brief flash then transition
        this.cameras.main.flash(200, 255, 255, 255);

        this.time.delayedCall(300, () => {
            SceneManager.goTo(this, 'GameScene');
        });
    }
}
