class HUD {
    constructor(scene) {
        this.scene = scene;

        this.pipCount = 10;
        this.pipSize = 14;
        this.pipGap = 4;
        this.pipX = 20;
        this.pipY = 20;

        this.heartContainers = [];
        for (let i = 0; i < this.pipCount; i++) {
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

    drawPips(hp) {
        const maxHp = 100;
        for (let i = 0; i < this.pipCount; i++) {
            const g = this.heartContainers[i];
            g.clear();
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

    drawFeelings(value) {
        const w = this.scene.scale.width;
        const barW = 140;
        const barH = 5;
        const bx = w / 2 - barW / 2;
        const by = this.scene.scale.height - 34;

        this.feelBg.clear();
        this.feelBg.fillStyle(0x1a1a2e, 0.8);
        this.feelBg.fillRoundedRect(bx, by, barW, barH, 2);

        const pct = Phaser.Math.Clamp(value / 100, 0, 1);
        this.feelFill.clear();
        if (pct > 0) {
            this.feelFill.fillStyle(0xa8d8ff, 1);
            this.feelFill.fillRoundedRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2, 1);
        }
    }

    showCombo(count) {
        if (count < 2) { this.comboText.setAlpha(0); return; }
        this.comboText.setText(`RESONANCE ×${count}`);
        this.comboText.setAlpha(1);
        if (this.comboTween) this.comboTween.stop();
        this.comboTween = this.scene.tweens.add({
            targets: this.comboText,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
        });
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
    }
}
