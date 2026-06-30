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

        // ── Joystick ──
        this.joystickActive = false;
        this.joystickPtrId = -1;
        this._jcx = 130;
        this._jcy = scene.scale.height - 140;
        this._jr = 90;
        this._thumbR = 22;
        this._deadZone = 18;

        this.left = false;
        this.right = false;
        this.up = false;
        this.down = false;
        this.upJustDown = false;
        this.downJustDown = false;
        this._prevUp = false;
        this._prevDown = false;

        // ── Action buttons ──
        this.jump = false;
        this.jumpJustDown = false;
        this.attack = false;
        this.attackJustDown = false;
        this.dash = false;
        this.dashJustDown = false;

        this._prevJump = false;
        this._prevAttack = false;
        this._prevDash = false;

        this._buildJoystick();
        this._buildActionButtons();
        this._buildUtilityButtons();
        this.setVisible(false);
    }

    /* ================================================================ */
    /*  Joystick                                                          */
    /* ================================================================ */

    _buildJoystick() {
        const { scene, _jcx: cx, _jcy: cy, _jr: r, _thumbR: tr } = this;

        // Outer ring
        this._joystickGfx = scene.add.graphics().setScrollFactor(0).setDepth(150);
        this._objs.push(this._joystickGfx);

        // Thumb
        this._thumbGfx = scene.add.graphics().setScrollFactor(0).setDepth(151);
        this._objs.push(this._thumbGfx);

        this._drawJoystickRing();
        this._drawThumb(cx, cy);

        // ── Pointer tracking on scene level (not zone) ──
        this._onDown = (pointer) => {
            if (!this.active) return;
            const dx = pointer.x - cx;
            const dy = pointer.y - cy;
            if (dx * dx + dy * dy <= (r + 20) * (r + 20)) {
                this.joystickActive = true;
                this.joystickPtrId = pointer.id;
                this._updateJoystick(pointer);
            }
        };
        this._onMove = (pointer) => {
            if (!this.active || !this.joystickActive || pointer.id !== this.joystickPtrId) return;
            this._updateJoystick(pointer);
        };
        this._onUp = (pointer) => {
            if (!this.active || !this.joystickActive || pointer.id !== this.joystickPtrId) return;
            this.joystickActive = false;
            this.joystickPtrId = -1;
            this._resetJoystick();
        };

        scene.input.on('pointerdown', this._onDown);
        scene.input.on('pointermove', this._onMove);
        scene.input.on('pointerup', this._onUp);
        this._objs.push({ destroy: () => {
            scene.input.off('pointerdown', this._onDown);
            scene.input.off('pointermove', this._onMove);
            scene.input.off('pointerup', this._onUp);
        }});
    }

    _updateJoystick(pointer) {
        const dx = pointer.x - this._jcx;
        const dy = pointer.y - this._jcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, this._jr);
        const angle = Math.atan2(dy, dx);

        // Thumb follows finger, clamped within ring
        const tx = this._jcx + Math.cos(angle) * clamped;
        const ty = this._jcy + Math.sin(angle) * clamped;
        this._drawThumb(tx, ty);

        // Direction input
        if (dist < this._deadZone) {
            this.left = false;
            this.right = false;
            this.up = false;
            this.down = false;
            return;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        this.left = nx < -0.3;
        this.right = nx > 0.3;
        this.up = ny < -0.3;
        this.down = ny > 0.3;

        this.upJustDown = this.up && !this._prevUp;
        this.downJustDown = this.down && !this._prevDown;
        this._prevUp = this.up;
        this._prevDown = this.down;
    }

    _resetJoystick() {
        this._drawThumb(this._jcx, this._jcy);
        this.left = false;
        this.right = false;
        this.up = false;
        this.down = false;
        this.upJustDown = false;
        this.downJustDown = false;
        this._prevUp = false;
        this._prevDown = false;
    }

    _drawJoystickRing() {
        const g = this._joystickGfx;
        g.clear();
        const cx = this._jcx, cy = this._jcy, r = this._jr;

        // Outer glow
        g.fillStyle(0x2EC4B6, 0.10);
        g.fillCircle(cx, cy, r + 10);

        // Ring fill
        g.fillStyle(0x0f1a2a, 0.60);
        g.fillCircle(cx, cy, r);

        // Ring border
        g.lineStyle(2, 0x2EC4B6, 0.45);
        g.strokeCircle(cx, cy, r);

        // Inner subtle ring
        g.lineStyle(1, 0x7FE0DE, 0.08);
        g.strokeCircle(cx, cy, r * 0.45);

        // Center dot
        g.fillStyle(0x2EC4B6, 0.15);
        g.fillCircle(cx, cy, 4);
    }

    _drawThumb(x, y) {
        const g = this._thumbGfx;
        g.clear();
        g.fillStyle(0x1a3a4a, 0.85);
        g.fillCircle(x, y, this._thumbR);
        g.lineStyle(2, 0x7FE0DE, 0.75);
        g.strokeCircle(x, y, this._thumbR);
    }

    /* ================================================================ */
    /*  Action buttons                                                    */
    /* ================================================================ */

    _actionBtn(x, y, r, label) {
        const g = this.scene.add.graphics().setScrollFactor(0).setDepth(150);
        const txt = this.scene.add.text(x, y, label, {
            fontSize: `${Math.round(r * 0.85)}px`,
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151);

        const zone = this.scene.add.zone(x, y, r * 2.4, r * 2.4)
            .setScrollFactor(0).setDepth(152).setInteractive();

        this._objs.push(g, txt, zone);

        const draw = (pressed) => {
            g.clear();
            if (pressed) {
                g.fillStyle(0x2EC4B6, 0.25);
                g.fillCircle(x, y, r + 6);
                g.fillStyle(0x1a3a4a, 0.9);
                g.fillCircle(x, y, r);
                g.lineStyle(2, 0x7FE0DE, 0.9);
                g.strokeCircle(x, y, r);
                txt.setColor('#ffffff');
                txt.setScale(0.92);
            } else {
                g.fillStyle(0x2EC4B6, 0.12);
                g.fillCircle(x, y, r + 6);
                g.fillStyle(0x0f1a2a, 0.7);
                g.fillCircle(x, y, r);
                g.lineStyle(2, 0x2EC4B6, 0.55);
                g.strokeCircle(x, y, r);
                txt.setColor('#7FE0DE');
                txt.setScale(1);
            }
        };
        draw(false);
        zone.on('pointerdown', () => draw(true));
        zone.on('pointerup', () => draw(false));
        zone.on('pointerout', () => draw(false));
        return { zone };
    }

    _buildActionButtons() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        const btnJump = this._actionBtn(w - 80, h - 180, 50, '\u25B2');
        btnJump.zone.on('pointerdown', () => { this.jump = true; this.jumpJustDown = true; });
        btnJump.zone.on('pointerup', () => { this.jump = false; });
        btnJump.zone.on('pointerout', () => { this.jump = false; });

        const btnAttack = this._actionBtn(w - 170, h - 90, 40, '\u2716');
        btnAttack.zone.on('pointerdown', () => { this.attack = true; this.attackJustDown = true; });
        btnAttack.zone.on('pointerup', () => { this.attack = false; });
        btnAttack.zone.on('pointerout', () => { this.attack = false; });

        const btnDash = this._actionBtn(w - 80, h - 70, 32, '\u25C9');
        btnDash.zone.on('pointerdown', () => { this.dash = true; this.dashJustDown = true; });
        btnDash.zone.on('pointerup', () => { this.dash = false; });
        btnDash.zone.on('pointerout', () => { this.dash = false; });
    }

    /* ================================================================ */
    /*  Utility buttons (map + pause)                                      */
    /* ================================================================ */

    _utilityBtn(x, y, r, icon, label) {
        const g = this.scene.add.graphics().setScrollFactor(0).setDepth(150);
        const txt = this.scene.add.text(x, y, icon, {
            fontSize: `${Math.round(r * 0.85)}px`,
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(151);

        const lbl = this.scene.add.text(x, y + r + 10, label, {
            fontSize: '9px',
            fontFamily: 'monospace',
            color: '#5a7a8a',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(151);

        const zone = this.scene.add.zone(x, y, r * 3.2, r * 3.2)
            .setScrollFactor(0).setDepth(152).setInteractive();

        this._objs.push(g, txt, lbl, zone);

        const draw = (pressed) => {
            g.clear();
            if (pressed) {
                g.fillStyle(0x2EC4B6, 0.20);
                g.fillCircle(x, y, r + 4);
                g.fillStyle(0x1a3a4a, 0.9);
                g.fillCircle(x, y, r);
                g.lineStyle(2, 0x7FE0DE, 0.9);
                g.strokeCircle(x, y, r);
                txt.setColor('#ffffff');
                txt.setScale(0.92);
                lbl.setAlpha(1);
                lbl.setColor('#8aa8ba');
            } else {
                g.fillStyle(0x2EC4B6, 0.08);
                g.fillCircle(x, y, r + 4);
                g.fillStyle(0x0f1a2a, 0.65);
                g.fillCircle(x, y, r);
                g.lineStyle(1.5, 0x2EC4B6, 0.45);
                g.strokeCircle(x, y, r);
                txt.setColor('#7FE0DE');
                txt.setScale(1);
                lbl.setAlpha(0.7);
                lbl.setColor('#5a7a8a');
            }
        };
        draw(false);
        zone.on('pointerdown', () => draw(true));
        zone.on('pointerup', () => draw(false));
        zone.on('pointerout', () => draw(false));
        return { zone };
    }

    _buildUtilityButtons() {
        const w = this.scene.scale.width;

        // ── Map button (top-left) ──
        const btnMap = this._utilityBtn(55, 52, 22, '\u25C8', 'MAP');
        btnMap.zone.on('pointerdown', () => {
            if (!this.active) return;
            const hud = this.scene;
            const gameScene = this.scene.scene.get('GameScene');
            if (gameScene && gameScene.pauseMenu && gameScene.pauseMenu.isPaused) return;
            if (hud && hud.mapView) hud.mapView.toggle();
        });

        // ── Pause button (top-right) ──
        const btnPause = this._utilityBtn(w - 55, 52, 22, '\u23F8', 'PAUSE');
        btnPause.zone.on('pointerdown', () => {
            if (!this.active) return;
            const gameScene = this.scene.scene.get('GameScene');
            if (gameScene && gameScene.pauseMenu) gameScene.pauseMenu.toggle();
        });
    }

    /* ================================================================ */
    /*  Lifecycle                                                         */
    /* ================================================================ */

    resetJustPressed() {
        this.jumpJustDown = false;
        this.attackJustDown = false;
        this.dashJustDown = false;
        this.upJustDown = false;
        this.downJustDown = false;
        this._prevJump = this.jump;
        this._prevAttack = this.attack;
        this._prevDash = this.dash;
        this._prevUp = this.up;
        this._prevDown = this.down;
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
        this._objs.forEach(o => { if (o && o.setVisible) o.setVisible(v); });
        if (!v) this._resetJoystick();
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
        this._objs.forEach(o => { if (o && o.destroy) o.destroy(); });
        this._objs = [];
        this.joystickActive = false;
        this._resetJoystick();
    }
}
