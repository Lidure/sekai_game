class PauseMenu {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.inputEnabled = false;
        this.destroyed = false;

        this.mode = 'main'; // main | settings | confirm
        this.selectedIndex = 0;
        this.settingsIndex = 0;
        this.confirmChoice = 0;
        this.confirmMode = false;
        this.savePicker = null;
        this._mapOpen = false;

        this.mainItemDefs = [
            { labelKey: 'resume', action: 'resume' },
            { labelKey: 'status', action: 'status' },
            { labelKey: 'map', action: 'map' },
            { labelKey: 'save', action: 'save' },
            { labelKey: 'backpack', action: 'backpack' },
            { labelKey: 'settings', action: 'settings' },
            { labelKey: 'returnToMenu', action: 'mainMenu' },
        ];

        this.settingsItemDefs = [
            { key: 'master', labelKey: 'master', type: 'slider' },
            { key: 'bgm', labelKey: 'bgm', type: 'slider' },
            { key: 'sfx', labelKey: 'sfx', type: 'slider' },
            { key: 'fullscreen', labelKey: 'fullscreen', type: 'toggle' },
            { key: 'language', labelKey: 'language', type: 'toggle' },
            { key: 'back', labelKey: 'back', type: 'back' },
        ];

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(199)
            .setVisible(false);

        this._fullscreenChangeHandler = () => {
            this._updateSettingsVisuals();
            this._updateMainLabels();
        };
        document.addEventListener('fullscreenchange', this._fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this._fullscreenChangeHandler);

        this._build();
        this._buildKeyboard();

        scene.events.once('shutdown', () => this.destroy());
    }

    get paused() { return this.isOpen; }
    get isPaused() { return this.isOpen; }

    _t(key, fallback) {
        const txt = Lang.t(key);
        return txt === key ? (fallback || key) : txt;
    }

    _build() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;

        this._mainRect = {
            pW: 420,
            pH: 436,
            px: Math.round((W - 420) / 2),
            py: Math.round((H - 436) / 2) - 8,
        };
        this._settingsRect = {
            pW: 388,
            pH: 406,
            px: Math.round((W - 388) / 2),
            py: Math.round((H - 406) / 2) - 4,
        };

        const overlay = this.scene.add.graphics();
        overlay.fillStyle(0x0a0a1a, 0.75);
        overlay.fillRect(0, 0, W, H);
        this.container.add(overlay);

        this.mainGroup = this.scene.add.container(0, 0);
        this.container.add(this.mainGroup);

        this._buildMainPanel();
        this._buildSettingsPanel();
        this._buildConfirmation();
    }

    _buildMainPanel() {
        const { px, py, pW, pH } = this._mainRect;
        const cx = px + pW / 2;

        const panel = this.scene.add.graphics();
        panel.fillStyle(0x0a0a1a, 0.96);
        panel.fillRoundedRect(px, py, pW, pH, 14);
        panel.lineStyle(4, 0x2EC4B6, 0.12);
        panel.strokeRoundedRect(px - 3, py - 3, pW + 6, pH + 6, 16);
        panel.lineStyle(1.5, 0x2EC4B6, 0.45);
        panel.strokeRoundedRect(px, py, pW, pH, 14);
        panel.lineStyle(1, 0x7FE0DE, 0.10);
        panel.strokeRoundedRect(px + 4, py + 4, pW - 8, pH - 8, 12);
        this.mainGroup.add(panel);

        this.mainTitle = this.scene.add.text(cx, py + 32, this._t('pauseTitle', 'PAUSED'), {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5);
        this.mainGroup.add(this.mainTitle);

        const deco = this.scene.add.graphics();
        deco.lineStyle(1, 0x2EC4B6, 0.2);
        deco.lineBetween(cx - 84, py + 56, cx - 18, py + 56);
        deco.lineBetween(cx + 18, py + 56, cx + 84, py + 56);
        deco.fillStyle(0xFF87A0, 0.65);
        deco.fillRect(cx - 2, py + 54, 4, 4);
        this.mainGroup.add(deco);

        this.mainGlow = this.scene.add.graphics();
        this.mainGroup.add(this.mainGlow);

        this.mainItems = [];
        this.mainItemTexts = [];
        this.mainItemCarets = [];
        this.mainItemYs = [];

        const startY = py + 92;
        const gap = 42;
        const itemX = cx - 92;

        this.mainItemDefs.forEach((def, i) => {
            const y = startY + i * gap;
            this.mainItemYs.push(y);

            const sub = this.scene.add.container(0, y);
            this.mainGroup.add(sub);

            const caret = this.scene.add.text(-4, 0, '\u25B6', {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#FF87A0',
            }).setOrigin(0.5).setAlpha(0);
            sub.add(caret);

            const txt = this.scene.add.text(itemX, 0, this._t(def.labelKey), {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
            }).setOrigin(0, 0.5);
            sub.add(txt);

            const zone = this.scene.add.zone(cx, 0, pW - 28, 34)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true });
            zone.on('pointerover', () => {
                if (!this._canInteract() || this.mode !== 'main') return;
                this.selectedIndex = i;
                this._updateMainSelection();
                this._updateMainHelpText();
            });
            zone.on('pointerup', (pointer) => {
                if (!this._canInteract() || this.mode !== 'main') return;
                if (pointer.button !== 0) return;
                this.selectedIndex = i;
                this._updateMainSelection();
                this._updateMainHelpText();
                this._confirmMain();
            });
            sub.add(zone);

            this.mainItems.push({
                sub,
                caret,
                text: txt,
                zone,
                y,
                labelKey: def.labelKey,
                action: def.action,
            });
            this.mainItemTexts.push(txt);
            this.mainItemCarets.push(caret);
        });

        this.mainHelpText = this.scene.add.text(cx, py + pH - 16, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#3a4a6a',
        }).setOrigin(0.5);
        this.mainGroup.add(this.mainHelpText);
    }

    _buildSettingsPanel() {
        const { px, py, pW, pH } = this._settingsRect;
        const cx = px + pW / 2;

        this.settingsOverlay = this.scene.add.container(0, 0).setVisible(false);
        this.container.add(this.settingsOverlay);

        const dim = this.scene.add.graphics();
        dim.fillStyle(0x000000, 0.45);
        dim.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
        this.settingsOverlay.add(dim);

        const panel = this.scene.add.graphics();
        panel.fillStyle(0x0a0a1a, 0.97);
        panel.fillRoundedRect(px, py, pW, pH, 12);
        panel.lineStyle(1.5, 0x2EC4B6, 0.34);
        panel.strokeRoundedRect(px, py, pW, pH, 12);
        panel.lineStyle(1, 0x7FE0DE, 0.08);
        panel.strokeRoundedRect(px + 4, py + 4, pW - 8, pH - 8, 10);
        this.settingsOverlay.add(panel);

        this.settingsTitle = this.scene.add.text(cx, py + 24, this._t('settings', 'SETTINGS'), {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5);
        this.settingsOverlay.add(this.settingsTitle);

        this.settingsGlow = this.scene.add.graphics();
        this.settingsOverlay.add(this.settingsGlow);

        this.settingsHelp = this.scene.add.text(cx, py + pH - 16, this._t('helpMenuSettings', 'UP/DOWN Navigate | J Select | K Back'), {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#3a4a6a',
        }).setOrigin(0.5);
        this.settingsOverlay.add(this.settingsHelp);

        const rowLeft = px + 28;
        const rowRight = px + pW - 28;
        const valueRight = rowRight;
        const sliderX = px + 142;
        const sliderW = 128;
        const sliderH = 6;
        const rowY = [py + 82, py + 128, py + 174, py + 226, py + 270, py + 314];

        this.settingsItems = [];
        this.settingsValueTexts = [];
        this.settingsBarGraphics = [];
        this.settingsFillGraphics = [];
        this.settingsKnobGraphics = [];
        this.settingsBarHits = [];

        this.settingsItemDefs.forEach((def, index) => {
            const y = rowY[index];
            const labelStyle = {
                fontSize: def.type === 'back' ? '16px' : '15px',
                fontFamily: 'monospace',
                color: def.type === 'back' ? '#a8d8ff' : '#c8d8ff',
            };

            const label = this.scene.add.text(def.type === 'back' ? cx : rowLeft, y, this._t(def.labelKey), labelStyle)
                .setOrigin(def.type === 'back' ? 0.5 : 0, 0.5);
            this.settingsOverlay.add(label);

            const valueText = def.type === 'back' ? null : this.scene.add.text(valueRight, y, '', {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            }).setOrigin(1, 0.5);
            if (valueText) this.settingsOverlay.add(valueText);

            const item = {
                key: def.key,
                labelKey: def.labelKey,
                type: def.type,
                text: label,
                valueText,
                y,
                left: def.type === 'back' ? cx - 66 : rowLeft,
                right: def.type === 'back' ? cx + 66 : rowRight,
                width: def.type === 'back' ? 132 : pW - 56,
            };

            if (def.type === 'slider') {
                const bar = this.scene.add.graphics();
                const fill = this.scene.add.graphics();
                const knob = this.scene.add.graphics();
                this.settingsOverlay.add(bar);
                this.settingsOverlay.add(fill);
                this.settingsOverlay.add(knob);

                const hit = this.scene.add.zone(sliderX + sliderW / 2, y, sliderW, 24)
                    .setOrigin(0.5)
                    .setInteractive({ useHandCursor: true });
                hit.on('pointerdown', (pointer) => {
                    if (!this.settingsOpen || pointer.button !== 0) return;
                    const pct = Phaser.Math.Clamp((pointer.x - sliderX) / sliderW, 0, 1);
                    this._setSettingValue(def.key, pct);
                });
                this.settingsOverlay.add(hit);

                item.slider = { bar, fill, knob, x: sliderX, y: y - sliderH / 2, w: sliderW, h: sliderH };
                item.hit = hit;
                this.settingsBarGraphics.push(bar);
                this.settingsFillGraphics.push(fill);
                this.settingsKnobGraphics.push(knob);
                this.settingsBarHits.push(hit);
            } else {
                const zone = this.scene.add.zone(cx, y, def.type === 'back' ? 132 : pW - 28, 34)
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

    _buildConfirmation() {
        this.confirmGroup = this.scene.add.container(0, 0).setVisible(false);
        this.container.add(this.confirmGroup);

        const dim = this.scene.add.graphics();
        dim.fillStyle(0x000000, 0.40);
        dim.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
        this.confirmGroup.add(dim);

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

        this.confirmTitle = this.scene.add.text(pcx, popY + 26, this._t('returnToMenuQ', 'RETURN TO MENU?'), {
            fontSize: '15px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5);
        this.confirmGroup.add(this.confirmTitle);

        const sep = this.scene.add.graphics();
        sep.lineStyle(1, 0x2EC4B6, 0.12);
        sep.lineBetween(pcx - 55, popY + 42, pcx + 55, popY + 42);
        this.confirmGroup.add(sep);

        this.confirmTexts = [];
        [this._t('cancel', 'CANCEL'), this._t('confirm', 'CONFIRM')].forEach((label, i) => {
            const x = pcx - 38 + i * 76;
            const txt = this.scene.add.text(x, popY + 66, label, {
                fontSize: '15px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
            }).setOrigin(0.5);
            this.confirmGroup.add(txt);
            this.confirmTexts.push(txt);

            const zone = this.scene.add.zone(x, popY + 66, 56, 24)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true });
            zone.on('pointerover', () => {
                if (!this._canInteract() || !this.confirmMode) return;
                this.confirmChoice = i;
                this._updateConfirmGlow();
            });
            zone.on('pointerup', (pointer) => {
                if (!this._canInteract() || !this.confirmMode) return;
                if (pointer.button !== 0) return;
                this.confirmChoice = i;
                this._updateConfirmGlow();
                this._confirmMain();
            });
            this.confirmGroup.add(zone);
        });

        this.confirmGlow = this.scene.add.graphics();
        this.confirmGroup.add(this.confirmGlow);
    }

    _buildKeyboard() {
        this.keys = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            j: Phaser.Input.Keyboard.KeyCodes.J,
            k: Phaser.Input.Keyboard.KeyCodes.K,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC,
            p: Phaser.Input.Keyboard.KeyCodes.P,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
        });
    }

    _canInteract() {
        if (this.destroyed || !this.isOpen || !this.inputEnabled) return false;
        if (this.savePicker && !this.savePicker.destroyed) return false;
        return true;
    }

    _open() {
        if (this.destroyed) return;
        if (this.isOpen) return;

        this.isOpen = true;
        this.mode = 'main';
        this.confirmMode = false;
        this.settingsOpen = false;
        this._mapOpen = false;
        this.inputEnabled = false;
        this.selectedIndex = 0;
        this.settingsIndex = 0;
        this.confirmChoice = 0;

        if (this.scene.mobileControls) this.scene.mobileControls.hide();

        this._savedZoom = this.scene.cameras.main.zoom;
        this._savedScroll = {
            x: this.scene.cameras.main.scrollX,
            y: this.scene.cameras.main.scrollY,
        };

        this.container.setVisible(true);
        this.container.setAlpha(1);
        this.scene.cameras.main.setZoom(1);
        this.scene.cameras.main.setScroll(0, 0);

        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.pause();
        }
        this._pauseAllBgm();

        this.mainGroup.setVisible(true);
        this.settingsOverlay.setVisible(false);
        this.confirmGroup.setVisible(false);

        this.mainItems.forEach((item, i) => {
            item.sub.setPosition(0, item.y + 20);
            item.sub.setAlpha(0);
        });
        this.mainGlow.setAlpha(0);

        this.mainItems.forEach((item, i) => {
            this.scene.tweens.add({
                targets: item.sub,
                y: item.y,
                alpha: 1,
                duration: 240,
                delay: 80 + i * 60,
                ease: 'Sine.easeOut',
            });
        });

        this.scene.time.delayedCall(520, () => {
            if (this.destroyed || !this.isOpen || this.mode !== 'main') return;
            this.mainGlow.setAlpha(1);
            this._updateMainSelection();
            this._updateMainHelpText();
            this.inputEnabled = true;
        });
    }

    toggle() {
        if (this.destroyed) return;
        if (this._mapOpen) {
            this._closeMapView();
            return;
        }
        if (this.isOpen) this._close();
        else {
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            this._open();
        }
    }

    _close() {
        if (this.destroyed) return;

        if (this._mapOpen) {
            const hud = this.scene.scene.get('HUDScene');
            if (hud && hud.mapView) hud.mapView._close(true);
            this._mapOpen = false;
        }

        this.inputEnabled = false;
        this.isOpen = false;
        this.mode = 'main';
        this.settingsOpen = false;
        this.confirmMode = false;

        this.confirmGroup.setVisible(false);
        this.settingsOverlay.setVisible(false);

        if (this._savedZoom !== undefined) {
            this.scene.cameras.main.setZoom(this._savedZoom);
            this._savedZoom = undefined;
        }
        if (this._savedScroll) {
            this.scene.cameras.main.setScroll(this._savedScroll.x, this._savedScroll.y);
            this._savedScroll = undefined;
        }

        this.container.setVisible(false);
        this.container.setAlpha(1);

        this._resumeAllBgm();
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.resume();
        }

        if (this.scene.mobileControls) {
            this.scene.mobileControls.resetJustPressed();
            if (ControlMode.isMobile()) this.scene.mobileControls.show();
        }

        this.scene.input.keyboard.resetKeys();
    }

    _openSettings() {
        if (this.destroyed || !this.isOpen) return;
        this.mode = 'settings';
        this.settingsOpen = true;
        this.confirmMode = false;
        this.mainGroup.setVisible(false);
        this.settingsOverlay.setVisible(true);
        this.settingsOverlay.setAlpha(1);
        this.settingsIndex = 0;
        this._updateSettingsVisuals();
        this._updateSettingsSelection();
        this.inputEnabled = false;
        this.scene.time.delayedCall(160, () => {
            if (this.destroyed || !this.isOpen || !this.settingsOpen) return;
            this.inputEnabled = true;
        });
    }

    _closeSettings() {
        if (!this.settingsOpen) return;
        this.settingsOpen = false;
        this.mode = 'main';
        this.inputEnabled = false;
        this.settingsOverlay.setVisible(false);
        this.mainGroup.setVisible(true);
        this._updateMainSelection();
        this._updateMainHelpText();
        this.scene.time.delayedCall(80, () => {
            if (this.destroyed || !this.isOpen || this.settingsOpen || this.confirmMode) return;
            this.inputEnabled = true;
        });
    }

    _openMapView() {
        const hud = this.scene.scene.get('HUDScene');
        if (!hud || !hud.mapView) return;
        this._mapOpen = true;
        this.inputEnabled = false;
        hud.mapView.open({
            allowWhilePaused: true,
            onClose: () => {
                this._mapOpen = false;
                if (this.isOpen && !this.settingsOpen && !this.confirmMode && !this.savePicker) {
                    this.inputEnabled = true;
                }
            },
        });
    }

    _closeMapView() {
        const hud = this.scene.scene.get('HUDScene');
        if (!hud || !hud.mapView || !hud.mapView.isOpen) {
            this._mapOpen = false;
            return;
        }
        hud.mapView._close();
    }

    _handlePauseInput() {
        if (!this._canInteract()) return;

        if (this.confirmMode) {
            this._handleConfirmInput();
            return;
        }
        if (this.settingsOpen) {
            this._handleSettingsInput();
            return;
        }

        if (this._mapOpen) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.k) ||
                Phaser.Input.Keyboard.JustDown(this.keys.esc) ||
                Phaser.Input.Keyboard.JustDown(this.keys.p)) {
                this._closeMapView();
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.esc) ||
            Phaser.Input.Keyboard.JustDown(this.keys.p) ||
            Phaser.Input.Keyboard.JustDown(this.keys.k)) {
            this._close();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.up) ||
            Phaser.Input.Keyboard.JustDown(this.keys.w)) {
            this._navigate(-1);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.down) ||
            Phaser.Input.Keyboard.JustDown(this.keys.s)) {
            this._navigate(1);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.left) ||
            Phaser.Input.Keyboard.JustDown(this.keys.a)) {
            this._adjustMainSide(-1);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.right) ||
            Phaser.Input.Keyboard.JustDown(this.keys.d)) {
            this._adjustMainSide(1);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
            Phaser.Input.Keyboard.JustDown(this.keys.space) ||
            Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            this._confirmMain();
        }
    }

    _handleSettingsInput() {
        if (!this._canInteract() || !this.settingsOpen) return;

        if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            this._closeSettings();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.up) ||
            Phaser.Input.Keyboard.JustDown(this.keys.w)) {
            this.settingsIndex = Phaser.Math.Wrap(this.settingsIndex - 1, 0, this.settingsItems.length);
            this._updateSettingsSelection();
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.down) ||
            Phaser.Input.Keyboard.JustDown(this.keys.s)) {
            this.settingsIndex = Phaser.Math.Wrap(this.settingsIndex + 1, 0, this.settingsItems.length);
            this._updateSettingsSelection();
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            return;
        }

        const selected = this.settingsItems[this.settingsIndex];
        if (!selected) return;

        if (selected.type === 'slider') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
                Phaser.Input.Keyboard.JustDown(this.keys.right) ||
                Phaser.Input.Keyboard.JustDown(this.keys.d)) {
                this._adjustSetting(selected.key, 0.05);
                this._tryPlaySound('sfx_ui_navigate', 0.2);
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.k) ||
                Phaser.Input.Keyboard.JustDown(this.keys.left) ||
                Phaser.Input.Keyboard.JustDown(this.keys.a)) {
                this._adjustSetting(selected.key, -0.05);
                this._tryPlaySound('sfx_ui_navigate', 0.2);
                return;
            }
        } else if (selected.type === 'toggle') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
                Phaser.Input.Keyboard.JustDown(this.keys.space) ||
                Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
                Phaser.Input.Keyboard.JustDown(this.keys.left) ||
                Phaser.Input.Keyboard.JustDown(this.keys.right) ||
                Phaser.Input.Keyboard.JustDown(this.keys.a) ||
                Phaser.Input.Keyboard.JustDown(this.keys.d)) {
                this._activateSettingsItem();
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.k)) {
                this._closeSettings();
                return;
            }
        } else if (selected.type === 'back') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
                Phaser.Input.Keyboard.JustDown(this.keys.space) ||
                Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
                Phaser.Input.Keyboard.JustDown(this.keys.k)) {
                this._closeSettings();
                this._tryPlaySound('sfx_ui_confirm', 0.35);
                return;
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
            Phaser.Input.Keyboard.JustDown(this.keys.space) ||
            Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            this._activateSettingsItem();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.k)) {
            this._closeSettings();
        }
    }

    _handleConfirmInput() {
        if (!this._canInteract() || !this.confirmMode) return;

        if (Phaser.Input.Keyboard.JustDown(this.keys.left) ||
            Phaser.Input.Keyboard.JustDown(this.keys.a) ||
            Phaser.Input.Keyboard.JustDown(this.keys.right) ||
            Phaser.Input.Keyboard.JustDown(this.keys.d)) {
            this.confirmChoice = 1 - this.confirmChoice;
            this._updateConfirmGlow();
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.k) ||
            Phaser.Input.Keyboard.JustDown(this.keys.esc) ||
            Phaser.Input.Keyboard.JustDown(this.keys.p)) {
            this._closeConfirm();
            this._tryPlaySound('sfx_ui_navigate', 0.25);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
            Phaser.Input.Keyboard.JustDown(this.keys.space) ||
            Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            this._confirmMain();
        }
    }

    _navigate(dir) {
        if (!this._canInteract() || this.mode !== 'main') return;

        this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + dir, 0, this.mainItems.length);
        this._updateMainSelection();
        this._updateMainHelpText();
        this._tryPlaySound('sfx_ui_navigate', 0.25);
    }

    _adjustMainSide(dir) {
        const item = this.mainItems[this.selectedIndex];
        if (!item || item.action !== 'settings') return;
        if (dir !== 0) this._confirmMain();
    }

    _updateMainSelection() {
        const glow = this.mainGlow;
        glow.clear();
        if (!this.mainItems.length) return;

        const { px, pW } = this._mainRect;
        const hlLeft = px + 14;
        const hlRight = px + pW - 14;
        const hlW = hlRight - hlLeft;
        const hlH = 34;

        this.mainItems.forEach((item, i) => {
            const selected = i === this.selectedIndex;
            item.text.setColor(selected ? '#ffffff' : '#c8d8ff');
            item.caret.setAlpha(selected ? 1 : 0);
            if (selected) {
                const y = item.y;
                glow.fillStyle(0x2EC4B6, 0.08);
                glow.fillRoundedRect(hlLeft, y - hlH / 2, hlW, hlH, 4);
                glow.lineStyle(1, 0x2EC4B6, 0.40);
                glow.strokeRoundedRect(hlLeft, y - hlH / 2, hlW, hlH, 4);
                glow.fillStyle(0x7FE0DE, 0.04);
                glow.fillRoundedRect(hlLeft + 4, y - hlH / 2 + 4, hlW - 8, hlH - 8, 3);
            }
        });
    }

    _updateMainHelpText() {
        const selected = this.mainItems[this.selectedIndex];
        if (!selected) {
            this.mainHelpText.setText(this._t('helpNav', 'UP/DOWN Navigate | J Confirm | K Cancel'));
            return;
        }
        if (selected.action === 'backpack') {
            this.mainHelpText.setText(this._t('comingSoon', 'COMING SOON'));
        } else if (selected.action === 'map') {
            this.mainHelpText.setText(this._t('helpNav', 'UP/DOWN Navigate | J Confirm | K Cancel'));
        } else {
            this.mainHelpText.setText(this._t('helpNav', 'UP/DOWN Navigate | J Confirm | K Cancel'));
        }
    }

    _updateConfirmGlow() {
        const g = this.confirmGlow;
        g.clear();
        if (!this.confirmTexts || this.confirmTexts.length < 2) return;

        const txt = this.confirmTexts[this.confirmChoice];
        const bounds = txt.getBounds();
        g.fillStyle(0x2EC4B6, 0.10);
        g.fillRoundedRect(bounds.x - 12, bounds.y - 8, bounds.width + 24, bounds.height + 16, 4);
        g.lineStyle(1, 0x2EC4B6, 0.45);
        g.strokeRoundedRect(bounds.x - 12, bounds.y - 8, bounds.width + 24, bounds.height + 16, 4);
        this.confirmTexts.forEach((t, i) => {
            t.setColor(i === this.confirmChoice ? '#ffffff' : '#c8d8ff');
        });
    }

    _updateSettingsSelection() {
        if (!this.settingsGlow || !this.settingsItems.length) return;
        this.settingsGlow.clear();

        const current = this.settingsItems[this.settingsIndex];
        if (!current) return;

        const px = current.left || 0;
        const py = current.y - (current.type === 'back' ? 20 : 18);
        const pw = current.width || 0;
        const ph = current.type === 'back' ? 30 : 34;

        this.settingsGlow.fillStyle(0x00ffcc, 0.07);
        this.settingsGlow.fillRoundedRect(px, py, pw, ph, 5);
        this.settingsGlow.lineStyle(1, 0x00ffcc, 0.4);
        this.settingsGlow.strokeRoundedRect(px, py, pw, ph, 5);

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

        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || this.scene.scale.isFullscreen);
        this.settingsItems.forEach((item) => {
            if (!item) return;

            if (item.type === 'slider' && item.slider) {
                const vol = AudioSettings.get(item.key);
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
                    item.valueText.setText(`[${isFs ? this._t('on', 'ON') : this._t('off', 'OFF')}]`);
                    item.valueText.setColor(isFs ? '#7FE0DE' : '#4a6a9f');
                } else if (item.key === 'language') {
                    const code = Lang.getCode();
                    item.valueText.setText(`[${code.toUpperCase()}]`);
                    item.valueText.setColor(code === 'cn' ? '#7FE0DE' : '#a8d8ff');
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
            this.settingsHelp.setText(this._t('helpMenuSettingsSlider', 'UP/DOWN Navigate | J Increase | K Decrease'));
        } else {
            this.settingsHelp.setText(this._t('helpMenuSettingsToggle', 'UP/DOWN Navigate | J Select | K Back'));
        }
    }

    _confirmMain() {
        if (!this._canInteract()) return;

        if (this.confirmMode) {
            if (this.confirmChoice === 1) {
                this._goToMainMenu();
            } else {
                this._closeConfirm();
                this._tryPlaySound('sfx_ui_navigate', 0.25);
            }
            return;
        }

        const item = this.mainItems[this.selectedIndex];
        if (!item) return;
        this._tryPlaySound('sfx_ui_confirm', 0.35);

        switch (item.action) {
            case 'resume':
                this._close();
                break;
            case 'status': {
                const hud = this.scene.scene.get('HUDScene');
                if (hud && hud.characterPanel) {
                    this._close();
                    hud.characterPanel.toggle();
                }
                break;
            }
            case 'map':
                this._openMapView();
                break;
            case 'save':
                this._openSavePicker();
                break;
            case 'backpack':
                break;
            case 'settings':
                this._openSettings();
                break;
            case 'mainMenu':
                this._showConfirm();
                break;
        }
    }

    _activateSettingsItem() {
        const selected = this.settingsItems[this.settingsIndex];
        if (!selected) return;

        switch (selected.type) {
            case 'slider':
                this._adjustSetting(selected.key, 0.05);
                this._tryPlaySound('sfx_ui_navigate', 0.2);
                break;
            case 'toggle':
                if (selected.key === 'fullscreen') {
                    this._toggleFullscreen();
                } else if (selected.key === 'language') {
                    Lang.toggle();
                    this._refreshLocalizedText();
                    this._tryPlaySound('sfx_ui_confirm', 0.35);
                }
                break;
            case 'back':
                this._closeSettings();
                this._tryPlaySound('sfx_ui_confirm', 0.35);
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

    _toggleFullscreen() {
        const fs = document.fullscreenElement || document.webkitFullscreenElement || this.scene.scale.isFullscreen;
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
        this._tryPlaySound('sfx_ui_confirm', 0.25);
        this.scene.time.delayedCall(50, () => this._updateSettingsVisuals());
    }

    _toggleLanguage() {
        Lang.toggle();
        this._refreshLocalizedText();
    }

    _refreshLocalizedText() {
        this.mainTitle.setText(this._t('pauseTitle', 'PAUSED'));
        this.mainItemDefs.forEach((def, i) => {
            const item = this.mainItems[i];
            if (item) item.text.setText(this._t(def.labelKey));
        });
        this.settingsTitle.setText(this._t('settings', 'SETTINGS'));
        this.settingsHelp.setText(this._t('helpMenuSettings', 'UP/DOWN Navigate | J Select | K Back'));
        this.confirmTitle.setText(this._t('returnToMenuQ', 'RETURN TO MENU?'));
        if (this.confirmTexts && this.confirmTexts.length >= 2) {
            this.confirmTexts[0].setText(this._t('cancel', 'CANCEL'));
            this.confirmTexts[1].setText(this._t('confirm', 'CONFIRM'));
        }
        this._updateMainHelpText();
        this._updateSettingsVisuals();
        this._updateSettingsSelection();
    }

    _openSavePicker() {
        this.inputEnabled = false;
        this.savePicker = new SaveSlotPicker(this.scene, {
            mode: 'save',
            onSelect: (slotIndex) => {
                this.scene._saveGame(slotIndex);
                this.savePicker = null;
                this._showSaveFeedback();
                this.scene.time.delayedCall(500, () => {
                    if (this.isOpen && !this.settingsOpen && !this.confirmMode) {
                        this.inputEnabled = true;
                    }
                });
            },
            onCancel: () => {
                this.savePicker = null;
                if (this.isOpen && !this.settingsOpen && !this.confirmMode) {
                    this.inputEnabled = true;
                }
            },
        });
    }

    _showSaveFeedback() {
        if (this._saveText) this._saveText.destroy();
        this._saveText = this.scene.add.text(
            this.scene.scale.width / 2,
            200,
            this._t('saved', 'SAVED'),
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

    _showConfirm() {
        this.confirmMode = true;
        this.confirmChoice = 0;
        this.mode = 'confirm';
        this.confirmGroup.setVisible(true);
        this.confirmGroup.setAlpha(1);
        this.mainHelpText.setText(this._t('helpConfirm', 'LEFT/RIGHT Select | J Confirm | K Cancel'));
        this._updateConfirmGlow();
    }

    _closeConfirm() {
        this.confirmMode = false;
        this.mode = 'main';
        this.confirmGroup.setVisible(false);
        this._updateMainSelection();
        this._updateMainHelpText();
    }

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

    _goToMainMenu() {
        this.inputEnabled = false;

        this._resumeAllBgm();
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.resume();
        }

        ['bgm', 'bgmPhase1', 'bgmPhase2', 'bgm_menu'].forEach((key) => {
            const snd = this.scene[key];
            if (snd) {
                snd.stop();
                snd.destroy();
                this.scene[key] = null;
            }
        });

        if (this.scene.scene.key === 'BossScene') {
            SceneManager.finishOverlay(this.scene, { playerDied: false, goToMenu: true });
            return;
        }

        SceneManager.goTo(this.scene, 'MenuScene');
    }

    _tryPlaySound(key, vol) {
        try {
            if (this.scene.cache.audio && this.scene.cache.audio.exists(key)) {
                this.scene.sound.play(key, { volume: vol ?? 0.3 });
            }
        } catch (_) {}
    }

    update() {
        if (!this.isOpen || this.destroyed) return;

        if (this.savePicker && !this.savePicker.destroyed) return;
        if (this.confirmMode) {
            this._handleConfirmInput();
            return;
        }
        if (this.settingsOpen) {
            this._handleSettingsInput();
            return;
        }
        if (this._mapOpen) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.k) ||
                Phaser.Input.Keyboard.JustDown(this.keys.esc) ||
                Phaser.Input.Keyboard.JustDown(this.keys.p)) {
                this._closeMapView();
            }
            return;
        }
        this._handlePauseInput();
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.isOpen = false;
        this.inputEnabled = false;
        this.confirmMode = false;
        this.settingsOpen = false;

        if (this._pulseTween) {
            this._pulseTween.stop();
            this._pulseTween = null;
        }

        if (this._fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this._fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this._fullscreenChangeHandler);
            this._fullscreenChangeHandler = null;
        }

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.mainGroup = null;
        this.settingsOverlay = null;
        this.confirmGroup = null;
        this.mainGlow = null;
        this.settingsGlow = null;
        this.keys = null;
        this.mainItems = null;
        this.settingsItems = null;
        this.mainItemTexts = null;
        this.mainItemCarets = null;
        this.settingsValueTexts = null;
        this.settingsBarGraphics = null;
        this.settingsFillGraphics = null;
        this.settingsKnobGraphics = null;
        this.settingsBarHits = null;
        this.confirmTexts = null;
        this.confirmGlow = null;
        this.mainHelpText = null;
        this.settingsHelp = null;
        this.settingsTitle = null;
        this.mainTitle = null;
        this._saveText = null;
    }
}
