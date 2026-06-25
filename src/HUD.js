class HUD {
    constructor(scene) {
        this.scene = scene;

        this.pipSize = 14;
        this.pipGap = 4;
        this.pipX = 20;
        this.pipY = 20;

        this.heartContainers = [];
        // Pre-allocate enough containers for max possible HP (150 max / 10 = 15)
        for (let i = 0; i < 15; i++) {
            const g = scene.add.graphics().setScrollFactor(0).setDepth(100);
            this.heartContainers.push(g);
        }

        this.bossName = scene.add.text(0, 18, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setAlpha(0);

        this.bossBarBg = scene.add.graphics().setScrollFactor(0).setDepth(100).setAlpha(0);
        this.bossBarFill = scene.add.graphics().setScrollFactor(0).setDepth(101).setAlpha(0);

        this.feelLabel = scene.add.text(0, 0, 'FEELINGS', {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.feelBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
        this.feelFill = scene.add.graphics().setScrollFactor(0).setDepth(101);

        this.comboText = scene.add.text(0, 0, '', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffffff',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

        this.comboTween = null;
        this.scaleTween = null;

        // Ability icons (bottom-right)
        this.abilityGraphics = [];
        for (let i = 0; i < 4; i++) {
            const g = scene.add.graphics().setScrollFactor(0).setDepth(100);
            this.abilityGraphics.push(g);
        }
        this._lastAbilityState = null;

        this._layout();
    }

    _layout() {
        const w = this.scene.scale.width;
        this.bossName.setPosition(w / 2, 18);
        this.bossBarBg.setPosition(0, 0);
        this.bossBarFill.setPosition(0, 0);

        this.feelLabel.setPosition(w / 2, this.scene.scale.height - 30);
        this.feelBg.setPosition(0, 0);
        this.feelFill.setPosition(0, 0);

        this.comboText.setPosition(w / 2 + 80, this.scene.scale.height / 2 - 40);
    }

    drawPips(hp, maxHp) {
        if (maxHp === undefined) maxHp = 100;
        const pipCount = Math.ceil(maxHp / 10);
        // Ensure enough containers for dynamic maxHp
        while (this.heartContainers.length < pipCount) {
            const g = this.scene.add.graphics().setScrollFactor(0).setDepth(100);
            this.heartContainers.push(g);
        }
        for (let i = 0; i < this.heartContainers.length; i++) {
            const g = this.heartContainers[i];
            g.clear();
            if (i >= pipCount) {
                g.setVisible(false);
                continue;
            }
            g.setVisible(true);
            const pipHp = 10;
            const remaining = hp - i * pipHp;
            const x = this.pipX + i * (this.pipSize + this.pipGap);
            const y = this.pipY;

            if (remaining >= pipHp) {
                g.fillStyle(0xffffff, 1);
                this._drawHeart(g, x, y);
            } else if (remaining > 0) {
                g.fillStyle(0xffffff, 0.4);
                this._drawHeart(g, x, y);
                g.fillStyle(0x1a1a2e, 1);
                const halfH = this.pipSize * (1 - remaining / pipHp);
                g.fillRect(x, y + this.pipSize - halfH, this.pipSize, halfH);
            } else {
                g.fillStyle(0x1a1a2e, 1);
                this._drawHeart(g, x, y);
                g.lineStyle(1, 0x333355, 0.5);
                this._drawHeartOutline(g, x, y);
            }
        }
    }

    _drawHeart(g, x, y) {
        const s = this.pipSize;
        g.fillRect(x + 2, y + 4, s - 4, s - 6);
        g.fillRect(x + 1, y + 5, s - 2, s - 8);
        g.fillRect(x + 0, y + 6, s, s - 10);
        g.fillRect(x + 3, y + 3, 3, 2);
        g.fillRect(x + s - 6, y + 3, 3, 2);
    }

    _drawHeartOutline(g, x, y) {
        const s = this.pipSize;
        g.strokeRect(x + 2, y + 4, s - 4, s - 6);
        g.strokeRect(x + 1, y + 5, s - 2, s - 8);
    }

    showBossBar(name, hp, maxHp) {
        this.bossName.setText(name);
        this.bossName.setAlpha(1);
        this.bossBarBg.setAlpha(1);
        this.bossBarFill.setAlpha(1);

        const w = this.scene.scale.width;
        const barW = 200;
        const barH = 10;
        const bx = w / 2 - barW / 2;
        const by = 34;

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
                this.bossBarFill.fillStyle(0xff4444, 0.6 + 0.4 * Math.sin(this.scene.time.now / 150));
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
        const w = this.scene.scale.width;
        const barW = 140;
        const barH = 5;
        const bx = w / 2 - barW / 2;
        const by = this.scene.scale.height - 34;
        const pct = Phaser.Math.Clamp(value / maxValue, 0, 1);

        this.feelBg.clear();
        this.feelBg.fillStyle(0x1a1a2e, 0.8);
        this.feelBg.fillRoundedRect(bx, by, barW, barH, 2);

        this.feelFill.clear();
        if (pct > 0) {
            // Color changes based on fill level
            let color = 0xa8d8ff;
            if (pct >= 1.0) color = 0xFFD700;
            else if (pct > 0.7) color = 0x7FE0DE;

            this.feelFill.fillStyle(color, 1);
            this.feelFill.fillRoundedRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2, 1);

            // Full feelings: pulsing gold glow behind the bar
            if (pct >= 1.0) {
                const glowAlpha = 0.2 + 0.3 * Math.sin(this.scene.time.now / 200);
                this.feelFill.fillStyle(0xFFD700, glowAlpha);
                this.feelFill.fillRoundedRect(bx - 2, by - 2, barW + 4, barH + 4, 4);
            }
        }
    }

    showCombo(count) {
        if (count < 2) { this.comboText.setAlpha(0); return; }

        let fontSize, color;
        if (count >= 10) { fontSize = '24px'; color = '#FF4444'; }
        else if (count >= 5) { fontSize = '20px'; color = '#FFD700'; }
        else { fontSize = '16px'; color = '#ffffff'; }

        this.comboText.setFontSize(parseInt(fontSize));
        this.comboText.setColor(color);
        this.comboText.setText(`RESONANCE ×${count}`);
        this.comboText.setAlpha(1);

        if (this.comboTween) this.comboTween.stop();

        // Scale pop for mid-high combos
        if (count >= 5) {
            if (this.scaleTween) this.scaleTween.stop();
            this.comboText.setScale(1.3);
            this.scaleTween = this.scene.tweens.add({
                targets: this.comboText,
                scale: 1,
                duration: 200,
                ease: 'Back.easeOut',
            });
        }

        this.comboTween = this.scene.tweens.add({
            targets: this.comboText,
            alpha: 0,
            duration: count >= 10 ? 2000 : 1500,
            ease: 'Power2',
        });
    }

    /* ================================================================== */
    /*  Ability Icons                                                        */
    /* ================================================================== */

    /**
     * Draw ability icons at the bottom-right of the screen.
     * @param {{ dash: boolean, doubleJump: boolean, shadowCloak: boolean, sword: boolean }} abilities
     */
    drawAbilities(abilities) {
        if (!abilities) return;

        // Cache: skip redraw if ability state hasn't changed
        const stateKey = [abilities.dash, abilities.doubleJump, abilities.shadowCloak, abilities.sword].join(',');
        if (stateKey === this._lastAbilityState) return;
        this._lastAbilityState = stateKey;

        const iconPositions = [
            { x: 720, y: 540 },  // Dash
            { x: 742, y: 540 },  // Double Jump
            { x: 764, y: 540 },  // Shadow Cloak
            { x: 786, y: 540 },  // Sword
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

    /** Draw a dim, locked ability icon. */
    _drawMissingAbilityIcon(g, x, y) {
        g.fillStyle(0x1a1a2e, 0.3);
        g.fillRect(x, y, 16, 16);
        g.lineStyle(1, 0x2d3561, 0.4);
        g.strokeRect(x, y, 16, 16);
    }

    /** Draw an acquired ability icon with colour and glow. */
    _drawAbilityIcon(g, index, x, y) {
        switch (index) {
            case 0: { // Dash — right-pointing arrow
                g.fillStyle(0x2EC4B6, 0.15);
                g.fillCircle(x + 8, y + 8, 10);
                g.fillStyle(0x2EC4B6, 1);
                g.fillRect(x + 3, y + 5, 8, 6);
                g.fillTriangle(x + 10, y + 3, x + 10, y + 13, x + 15, y + 8);
                break;
            }
            case 1: { // Double Jump — two stacked upward arrows
                g.fillStyle(0x7FE0DE, 0.15);
                g.fillCircle(x + 8, y + 8, 10);
                g.fillStyle(0x7FE0DE, 1);
                // Lower arrow
                g.fillTriangle(x + 6, y + 10, x + 6, y + 15, x + 12, y + 12.5);
                // Upper arrow
                g.fillTriangle(x + 6, y + 3, x + 6, y + 8, x + 12, y + 5.5);
                break;
            }
            case 2: { // Shadow Cloak — diamond / rhombus
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
            case 3: { // Sword — crossed blades (pink)
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

    destroy() {
        this.heartContainers.forEach(g => g.destroy());
        this.bossName.destroy();
        this.bossBarBg.destroy();
        this.bossBarFill.destroy();
        this.feelLabel.destroy();
        this.feelBg.destroy();
        this.feelFill.destroy();
        this.comboText.destroy();
        this.abilityGraphics.forEach(g => g.destroy());
    }
}
