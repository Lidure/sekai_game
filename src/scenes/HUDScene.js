class HUDScene extends Phaser.Scene {
    constructor() {
        super('HUDScene');
    }

    create() {
        this.hpPerMask = 1;
        this.maskSize = 34;
        this.maskGap = 5;
        this.maskStartX = 24;
        this.maskStartY = 18;
        this.masksPerRow = 10;

        this.hpMasks = [];
        for (let i = 0; i < 20; i++) {
            const icon = this.add.image(0, 0, 'ui_hp_mask')
                .setOrigin(0, 0)
                .setDepth(100)
                .setDisplaySize(this.maskSize, this.maskSize);
            this.hpMasks.push(icon);
        }

        this.bossName = this.add.text(0, 22, '', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5, 0).setDepth(100).setAlpha(0);

        this.bossBarBg = this.add.graphics().setDepth(100).setAlpha(0);
        this.bossBarFill = this.add.graphics().setDepth(101).setAlpha(0);

        this.feelLabel = this.add.text(0, 0, 'FEELINGS', {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5).setDepth(100);

        this.feelBg = this.add.graphics().setDepth(100);
        this.feelFill = this.add.graphics().setDepth(101);

        this.comboText = this.add.text(0, 0, '', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(100).setAlpha(0);

        this.comboTween = null;
        this.scaleTween = null;

        this.npcDialogBg = this.add.graphics().setDepth(1000).setAlpha(0);
        this.npcDialogName = this.add.text(0, 0, '', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setDepth(1001).setAlpha(0);
        this.npcDialogText = this.add.text(0, 0, '', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#c8d8ff',
            wordWrap: { width: 520 },
        }).setDepth(1001).setAlpha(0);
        this.npcDialogIndicator = this.add.text(0, 0, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(1, 1).setDepth(1001).setAlpha(0);
        this._npcDialogVisible = false;
        this._npcDialogName = '';
        this._npcDialogText = '';
        this._npcDialogIndicatorText = '';
        this._npcChoiceVisible = false;
        this._npcChoiceOptions = [];
        this._npcChoiceSelected = 0;
        this.npcChoiceTexts = [];

        this.abilityGraphics = [];
        for (let i = 0; i < 4; i++) {
            const g = this.add.graphics().setDepth(100);
            this.abilityGraphics.push(g);
        }
        this._lastAbilityState = null;

        // Character panel & map view (viewport-fixed UI, unaffected by GameScene camera zoom)
        this.characterPanel = new CharacterPanel(this);
        this.mapView = new MapView(this);

        // Mobile controls (viewport-fixed touch buttons)
        this.mobileControls = new MobileControls(this);
        if (ControlMode.isMobile()) this.mobileControls.show();

        this._layout();

        this.isReady = true;
        this.scale.on('resize', this._layout, this);

        // Clean up on scene shutdown
        this.events.once('shutdown', () => {
            if (this.characterPanel) { this.characterPanel.destroy(); this.characterPanel = null; }
            if (this.mapView) { this.mapView.destroy(); this.mapView = null; }
            if (this.mobileControls) { this.mobileControls.destroy(); this.mobileControls = null; }
        });
    }

    showNpcDialogue(name, text, indicator = '') {
        this._npcDialogVisible = true;
        this._npcDialogName = name || '';
        this._npcDialogText = text || '';
        this._npcDialogIndicatorText = indicator || '';
        this._layoutNpcDialogue();
        this.npcDialogBg.setAlpha(1);
        this.npcDialogName.setAlpha(1);
        this.npcDialogText.setAlpha(1);
        this.npcDialogIndicator.setAlpha(1);
    }

    updateNpcDialogue(name, text, indicator = '') {
        this._npcDialogName = name || '';
        this._npcDialogText = text || '';
        this._npcDialogIndicatorText = indicator || '';
        if (!this._npcDialogVisible) return;
        this._layoutNpcDialogue();
    }

    hideNpcDialogue() {
        this._npcDialogVisible = false;
        this.npcDialogBg.setAlpha(0);
        this.npcDialogName.setAlpha(0);
        this.npcDialogText.setAlpha(0);
        this.npcDialogIndicator.setAlpha(0);
        this.hideNpcChoice();
    }

    showNpcChoice(options, selectedIndex) {
        this._npcChoiceVisible = true;
        this._npcChoiceOptions = options || [];
        this._npcChoiceSelected = selectedIndex || 0;
        this._layoutNpcChoice();
    }

    hideNpcChoice() {
        this._npcChoiceVisible = false;
        this._npcChoiceOptions = [];
        this._npcChoiceSelected = 0;
        for (const t of this.npcChoiceTexts) t.setAlpha(0);
    }

    _layoutNpcChoice() {
        const w = this.scale.width;
        const h = this.scale.height;
        const boxW = Math.min(620, w - 48);
        const boxH = 118;
        const boxX = (w - boxW) / 2;
        const boxY = h - boxH - 24;
        const padX = 18;

        const opts = this._npcChoiceOptions;
        if (!opts || opts.length === 0) return;

        // Ensure we have enough text objects
        while (this.npcChoiceTexts.length < opts.length) {
            const idx = this.npcChoiceTexts.length;
            const t = this.add.text(0, 0, '', {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            }).setDepth(1002).setAlpha(0);
            this.npcChoiceTexts.push(t);
        }

        const startY = boxY + 60;
        for (let i = 0; i < opts.length; i++) {
            const prefix = i === this._npcChoiceSelected ? '\u25B6 ' : '  ';
            this.npcChoiceTexts[i].setText(prefix + opts[i].text);
            this.npcChoiceTexts[i].setPosition(boxX + padX + 8, startY + i * 22);
            this.npcChoiceTexts[i].setAlpha(1);
            this.npcChoiceTexts[i].setColor(i === this._npcChoiceSelected ? '#7FF0DE' : '#5a7a7a');
        }

        // Hide excess texts
        for (let i = opts.length; i < this.npcChoiceTexts.length; i++) {
            this.npcChoiceTexts[i].setAlpha(0);
        }
    }

    _layout() {
        const w = this.scale.width;
        const h = this.scale.height;
        this.bossName.setPosition(w / 2, 22);
        this.bossBarBg.setPosition(0, 0);
        this.bossBarFill.setPosition(0, 0);
        this.feelLabel.setPosition(w / 2, h - 36);
        this.feelBg.setPosition(0, 0);
        this.feelFill.setPosition(0, 0);
        this.comboText.setPosition(w / 2 + 100, h / 2 - 50);
        this._layoutNpcDialogue();
        this._layoutHpIcons();
    }

    _layoutHpIcons() {
        for (let i = 0; i < this.hpMasks.length; i++) {
            const icon = this.hpMasks[i];
            const row = Math.floor(i / this.masksPerRow);
            const col = i % this.masksPerRow;
            icon.setDisplaySize(this.maskSize, this.maskSize);
            icon.setPosition(
                this.maskStartX + col * (this.maskSize + this.maskGap),
                this.maskStartY + row * (this.maskSize + 3)
            );
            icon.setTint(0xffffff);
            icon.setAlpha(1);
        }
    }

    _layoutNpcDialogue() {
        if (!this.npcDialogBg) return;

        const w = this.scale.width;
        const h = this.scale.height;
        const boxW = Math.min(620, w - 48);
        const boxH = 118;
        const boxX = (w - boxW) / 2;
        const boxY = h - boxH - 24;
        const padX = 18;
        const padTop = 12;
        const padBottom = 12;

        this.npcDialogBg.clear();
        this.npcDialogBg.fillStyle(0x0a0a1a, 0.92);
        this.npcDialogBg.fillRoundedRect(boxX, boxY, boxW, boxH, 6);
        this.npcDialogBg.lineStyle(1, 0x2ec4b6, 0.55);
        this.npcDialogBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 6);

        this.npcDialogName.setText(this._npcDialogName);
        this.npcDialogText.setText(this._npcDialogText);
        this.npcDialogIndicator.setText(this._npcDialogIndicatorText);

        this.npcDialogName.setPosition(boxX + padX, boxY + padTop);
        this.npcDialogText.setPosition(boxX + padX, boxY + padTop + 28);
        this.npcDialogText.setWordWrapWidth(boxW - padX * 2);
        this.npcDialogIndicator.setPosition(boxX + boxW - padX, boxY + boxH - padBottom);
    }

    drawPips(hp, maxHp) {
        if (maxHp === undefined) maxHp = 5;
        const pipCount = Math.ceil(maxHp / this.hpPerMask);
        while (this.hpMasks.length < pipCount) {
            const icon = this.add.image(0, 0, 'ui_hp_mask')
                .setOrigin(0, 0)
                .setDepth(100)
                .setDisplaySize(this.maskSize, this.maskSize);
            this.hpMasks.push(icon);
        }
        for (let i = 0; i < this.hpMasks.length; i++) {
            const icon = this.hpMasks[i];
            if (i >= pipCount) {
                icon.setVisible(false);
                continue;
            }
            icon.setVisible(true);
            icon.setDisplaySize(this.maskSize, this.maskSize);
            const remaining = Phaser.Math.Clamp(hp - i * this.hpPerMask, 0, this.hpPerMask);
            const ratio = remaining / this.hpPerMask;
            const row = Math.floor(i / this.masksPerRow);
            const col = i % this.masksPerRow;
            icon.setPosition(
                this.maskStartX + col * (this.maskSize + this.maskGap),
                this.maskStartY + row * (this.maskSize + 3)
            );

            if (ratio >= 1) {
                icon.setAlpha(1);
                icon.clearTint();
                icon.setBlendMode(Phaser.BlendModes.ADD);
                icon.setTint(0xffffff);
            } else if (ratio > 0) {
                icon.setAlpha(0.45 + ratio * 0.55);
                icon.setTint(0xbfe9ff);
                icon.setBlendMode(Phaser.BlendModes.ADD);
            } else {
                icon.setAlpha(0.16);
                icon.setTint(0x556177);
                icon.setBlendMode(Phaser.BlendModes.NORMAL);
            }
        }
    }

    refreshFromPlayer(player) {
        if (!player) return;
        this.drawPips(player.hp, player.maxHp);
        this.drawFeelings(player.feelings, player.feelingsMax);
        this.drawAbilities(player.abilities);
    }

    showBossBar(name, hp, maxHp) {
        this.bossName.setText(name);
        this.bossName.setAlpha(1);
        this.bossBarBg.setAlpha(1);
        this.bossBarFill.setAlpha(1);

        const w = this.scale.width;
        const barW = 260;
        const barH = 12;
        const bx = w / 2 - barW / 2;
        const by = 38;

        this.bossBarBg.clear();
        this.bossBarBg.fillStyle(0x1a1a2e, 0.9);
        this.bossBarBg.fillRoundedRect(bx, by, barW, barH, 3);
        this.bossBarBg.lineStyle(1, 0x2d3561, 1);
        this.bossBarBg.strokeRoundedRect(bx, by, barW, barH, 3);

        const pct = Phaser.Math.Clamp(hp / maxHp, 0, 1);
        this.bossBarFill.clear();
        if (pct > 0) {
            const grad = Phaser.Display.Color.Interpolate.ColorWithColor(
                { r: 45, g: 53, b: 97 },
                { r: 168, g: 216, b: 255 },
                100, Math.round(pct * 100)
            );
            this.bossBarFill.fillStyle(Phaser.Display.Color.GetColor(grad.r, grad.g, grad.b), 1);
            this.bossBarFill.fillRoundedRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2, 2);
            if (pct < 0.25) {
                this.bossBarFill.fillStyle(0xff4444, 0.6 + 0.4 * Math.sin(this.time.now / 150));
                this.bossBarFill.fillRoundedRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2, 2);
            }
        }
    }

    hideBossBar() {
        this.bossName.setAlpha(0);
        this.bossBarBg.setAlpha(0);
        this.bossBarFill.setAlpha(0);
    }

    drawFeelings(value, maxValue) {
        if (maxValue === undefined) maxValue = 100;
        const w = this.scale.width;
        const h = this.scale.height;
        const barW = 180;
        const barH = 7;
        const bx = w / 2 - barW / 2;
        const by = h - 42;
        const pct = Phaser.Math.Clamp(value / maxValue, 0, 1);

        this.feelBg.clear();
        this.feelBg.fillStyle(0x1a1a2e, 0.8);
        this.feelBg.fillRoundedRect(bx, by, barW, barH, 2);

        this.feelFill.clear();
        if (pct > 0) {
            let color = 0xa8d8ff;
            if (pct >= 1.0) color = 0xFFD700;
            else if (pct > 0.7) color = 0x7FE0DE;

            this.feelFill.fillStyle(color, 1);
            this.feelFill.fillRoundedRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2, 1);

            if (pct >= 1.0) {
                const glowAlpha = 0.2 + 0.3 * Math.sin(this.time.now / 200);
                this.feelFill.fillStyle(0xFFD700, glowAlpha);
                this.feelFill.fillRoundedRect(bx - 2, by - 2, barW + 4, barH + 4, 4);
            }
        }
    }

    showCombo(count) {
        if (count < 2) { this.comboText.setAlpha(0); return; }

        let fontSize, color;
        if (count >= 10) { fontSize = '28px'; color = '#FF4444'; }
        else if (count >= 5) { fontSize = '24px'; color = '#FFD700'; }
        else { fontSize = '20px'; color = '#ffffff'; }

        this.comboText.setFontSize(parseInt(fontSize));
        this.comboText.setColor(color);
        this.comboText.setText(`RESONANCE ×${count}`);
        this.comboText.setAlpha(1);

        if (this.comboTween) this.comboTween.stop();

        if (count >= 5) {
            if (this.scaleTween) this.scaleTween.stop();
            this.comboText.setScale(1.3);
            this.scaleTween = this.tweens.add({
                targets: this.comboText,
                scale: 1,
                duration: 200,
                ease: 'Back.easeOut',
            });
        }

        this.comboTween = this.tweens.add({
            targets: this.comboText,
            alpha: 0,
            duration: count >= 10 ? 2000 : 1500,
            ease: 'Power2',
        });
    }

    drawAbilities(abilities) {
        if (!abilities) return;
        const w = this.scale.width;
        const h = this.scale.height;

        const stateKey = [abilities.dash, abilities.doubleJump, abilities.shadowCloak, abilities.sword].join(',');
        if (stateKey === this._lastAbilityState) return;
        this._lastAbilityState = stateKey;

        const iconPositions = [
            { x: w - 144, y: h - 60 },
            { x: w - 120, y: h - 60 },
            { x: w - 96, y: h - 60 },
            { x: w - 72, y: h - 60 },
        ];

        const hasAbility = [
            abilities.dash || false,
            abilities.doubleJump || false,
            abilities.shadowCloak || false,
            abilities.sword || false,
        ];

        for (let i = 0; i < 4; i++) {
            const g = this.abilityGraphics[i];
            g.clear();
            const { x, y } = iconPositions[i];

            if (hasAbility[i]) {
                this._drawAbilityIcon(g, i, x, y);
            } else {
                this._drawMissingAbilityIcon(g, x, y);
            }
        }
    }

    _drawMissingAbilityIcon(g, x, y) {
        const s = 16;
        g.fillStyle(0x1a1a2e, 0.3);
        g.fillRect(x, y, s, s);
        g.lineStyle(1, 0x2d3561, 0.4);
        g.strokeRect(x, y, s, s);
    }

    _drawAbilityIcon(g, index, x, y) {
        switch (index) {
            case 0: {
                g.fillStyle(0x2EC4B6, 0.15);
                g.fillCircle(x + 8, y + 8, 10);
                g.fillStyle(0x2EC4B6, 1);
                g.fillRect(x + 3, y + 5, 8, 6);
                g.fillTriangle(x + 10, y + 3, x + 10, y + 13, x + 15, y + 8);
                break;
            }
            case 1: {
                g.fillStyle(0x7FE0DE, 0.15);
                g.fillCircle(x + 8, y + 8, 10);
                g.fillStyle(0x7FE0DE, 1);
                g.fillTriangle(x + 6, y + 10, x + 6, y + 15, x + 12, y + 12.5);
                g.fillTriangle(x + 6, y + 3, x + 6, y + 8, x + 12, y + 5.5);
                break;
            }
            case 2: {
                g.fillStyle(0x9966ff, 0.15);
                g.fillCircle(x + 8, y + 8, 10);
                g.fillStyle(0x9966ff, 1);
                g.beginPath();
                g.moveTo(x + 8, y + 1);
                g.lineTo(x + 15, y + 8);
                g.lineTo(x + 8, y + 15);
                g.lineTo(x + 1, y + 8);
                g.closePath();
                g.fillPath();
                break;
            }
            case 3: {
                g.fillStyle(0xFF87A0, 0.15);
                g.fillCircle(x + 8, y + 8, 10);
                g.fillStyle(0xFF87A0, 1);
                g.lineStyle(2, 0xFF87A0, 1);
                g.lineBetween(x + 3, y + 3, x + 13, y + 13);
                g.lineBetween(x + 13, y + 3, x + 3, y + 13);
                break;
            }
        }
    }
}
