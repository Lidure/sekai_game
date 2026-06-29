const CONTROL_MODE_KEY = 'sekai_control_mode';

const ControlMode = {
    get() {
        try { return localStorage.getItem(CONTROL_MODE_KEY) || 'pc'; } catch (_) { return 'pc'; }
    },
    set(mode) {
        if (mode !== 'pc' && mode !== 'mobile') return;
        try { localStorage.setItem(CONTROL_MODE_KEY, mode); } catch (_) {}
    },
    toggle() {
        const next = this.get() === 'pc' ? 'mobile' : 'pc';
        this.set(next);
        return next;
    },
    isMobile() { return this.get() === 'mobile'; },
};

class MobileControls {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
        this._objs = [];

        this.left = false;
        this.right = false;
        this.jump = false;
        this.jumpJustDown = false;
        this.attack = false;
        this.attackJustDown = false;
        this.dash = false;
        this.dashJustDown = false;

        this._prevJump = false;
        this._prevAttack = false;
        this._prevDash = false;

        this._buildButtons();
        this.setVisible(false);
    }

    _btn(x, y, r, label) {
        const color = 0x2EC4B6;
        const colorBright = 0x7FE0DE;
        const colorBg = 0x0f1a2a;
        const colorBgHi = 0x1a3a4a;

        const g = this.scene.add.graphics().setScrollFactor(0).setDepth(150);
        this._objs.push(g);

        const zone = this.scene.add.zone(x, y, r * 2.4, r * 2.4)
            .setScrollFactor(0).setDepth(152).setInteractive();
        this._objs.push(zone);

        const txt = this.scene.add.text(x, y, label, {
            fontSize: `${Math.round(r * 0.85)}px`,
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151);
        this._objs.push(txt);

        const draw = (pressed) => {
            g.clear();
            if (pressed) {
                g.fillStyle(0x2EC4B6, 0.25);
                g.fillCircle(x, y, r + 6);
                g.fillStyle(colorBgHi, 0.9);
                g.fillCircle(x, y, r);
                g.lineStyle(2, colorBright, 0.9);
                g.strokeCircle(x, y, r);
                txt.setColor('#ffffff');
                txt.setScale(0.92);
            } else {
                g.fillStyle(0x2EC4B6, 0.12);
                g.fillCircle(x, y, r + 6);
                g.fillStyle(colorBg, 0.7);
                g.fillCircle(x, y, r);
                g.lineStyle(2, color, 0.55);
                g.strokeCircle(x, y, r);
                txt.setColor('#7FE0DE');
                txt.setScale(1);
            }
        };
        draw(false);

        zone.on('pointerdown', () => draw(true));
        zone.on('pointerup', () => draw(false));
        zone.on('pointerout', () => draw(false));

        return { zone, setDown: (v) => draw(v) };
    }

    _buildButtons() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        const btnLeft = this._btn(80, h - 80, 44, '\u25C0');
        btnLeft.zone.on('pointerdown', () => { this.left = true; });
        btnLeft.zone.on('pointerup', () => { this.left = false; });
        btnLeft.zone.on('pointerout', () => { this.left = false; });

        const btnRight = this._btn(195, h - 80, 44, '\u25B6');
        btnRight.zone.on('pointerdown', () => { this.right = true; });
        btnRight.zone.on('pointerup', () => { this.right = false; });
        btnRight.zone.on('pointerout', () => { this.right = false; });

        const btnJump = this._btn(w - 80, h - 180, 50, '\u25B2');
        btnJump.zone.on('pointerdown', () => { this.jump = true; this.jumpJustDown = true; });
        btnJump.zone.on('pointerup', () => { this.jump = false; });
        btnJump.zone.on('pointerout', () => { this.jump = false; });

        const btnAttack = this._btn(w - 170, h - 90, 40, '\u2716');
        btnAttack.zone.on('pointerdown', () => { this.attack = true; this.attackJustDown = true; });
        btnAttack.zone.on('pointerup', () => { this.attack = false; });
        btnAttack.zone.on('pointerout', () => { this.attack = false; });

        const btnDash = this._btn(w - 80, h - 70, 32, '\u25C9');
        btnDash.zone.on('pointerdown', () => { this.dash = true; this.dashJustDown = true; });
        btnDash.zone.on('pointerup', () => { this.dash = false; });
        btnDash.zone.on('pointerout', () => { this.dash = false; });
    }

    resetJustPressed() {
        this.jumpJustDown = false;
        this.attackJustDown = false;
        this.dashJustDown = false;
        this._prevJump = this.jump;
        this._prevAttack = this.attack;
        this._prevDash = this.dash;
    }

    refreshJustDown() {
        this.jumpJustDown = this.jump && !this._prevJump;
        this.attackJustDown = this.attack && !this._prevAttack;
        this.dashJustDown = this.dash && !this._prevDash;
        this._prevJump = this.jump;
        this._prevAttack = this.attack;
        this._prevDash = this.dash;
    }

    setVisible(v) {
        this.active = v;
        this._objs.forEach(o => o.setVisible(v));
        if (!v) {
            this.left = false;
            this.right = false;
            this.jump = false;
            this.attack = false;
            this.dash = false;
        }
    }

    show() {
        if (this._objs.length > 0 && this._objs[0].visible) return;
        this.setVisible(true);
    }

    hide() {
        this.setVisible(false);
    }

    toggle() {
        if (this._objs.length > 0 && this._objs[0].visible) this.hide();
        else this.show();
    }

    destroy() {
        this.setVisible(false);
        this._objs.forEach(o => { if (o && o.active) o.destroy(); });
        this._objs = [];
    }
}
