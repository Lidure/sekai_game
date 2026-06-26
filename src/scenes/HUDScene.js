class HUDScene extends Phaser.Scene {
    constructor() {
        super('HUDScene');
    }

    create() {
        this.pipSize = 16;
        this.pipGap = 5;
        this.pipX = 24;
        this.pipY = 24;

        this.heartContainers = [];
        for (let i = 0; i < 20; i++) {
            const g = this.add.graphics().setDepth(100);
            this.heartContainers.push(g);
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

        this.abilityGraphics = [];
        for (let i = 0; i < 4; i++) {
            const g = this.add.graphics().setDepth(100);
            this.abilityGraphics.push(g);
        }
        this._lastAbilityState = null;

        this._layout();
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
    }

    drawPips(hp, maxHp) {
        if (maxHp === undefined) maxHp = 100;
        const pipCount = Math.ceil(maxHp / 10);
        while (this.heartContainers.length < pipCount) {
            const g = this.add.graphics().setDepth(100);
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
