/**
 * MovingPlatform — A vertically-traveling platform (elevator).
 *
 * Player stands on it and rides up/down between floor levels.
 * Uses Arcade Physics velocity for smooth collision carrying.
 */
class MovingPlatform {
    constructor(scene, x, y, width, rangeY, speed) {
        this.scene = scene;
        this.minY = y - rangeY;
        this.maxY = y;
        this.halfW = width / 2;
        this.dir = speed > 0 ? -1 : 1;
        this.absSpeed = Math.abs(speed);
        this._carryingPlayer = false;

        this.gfx = scene.add.graphics().setDepth(5);
        this._draw(width);

        this.body = scene.add.zone(x, y, width, 16);
        scene.physics.add.existing(this.body, false);
        this.body.body.setAllowGravity(false);
        this.body.body.setImmovable(true);
        this.body.body.setSize(width, 16);

        this.body.body.setVelocityY(this.dir * this.absSpeed);

        this.gfx.setPosition(this.body.x - this.halfW, this.body.y - 8);
    }

    _draw(width) {
        const g = this.gfx;
        g.clear();
        g.fillStyle(0x1a1a2e, 0.9);
        g.fillRect(0, 3, width, 13);
        g.fillStyle(0x7FE0DE, 1);
        g.fillRect(0, 0, width, 3);
    }

    update(time, delta) {
        const body = this.body.body;

        if (this.body.y <= this.minY) {
            this.body.y = this.minY;
            this.dir = 1;
        } else if (this.body.y >= this.maxY) {
            this.body.y = this.maxY;
            this.dir = -1;
        }

        body.setVelocityY(this.dir * this.absSpeed);

        this.gfx.setPosition(this.body.x - this.halfW, this.body.y - 8);

        this._carryPlayer(delta);
    }

    _carryPlayer(delta) {
        const player = this.scene.player;
        if (!player) return;
        const ps = player.sprite;
        const vy = this.body.body.velocity.y;
        if (vy === 0) return;

        const dist = vy * (delta / 1000);
        const touching = ps.body.touching.down &&
            ps.body.blocked.down !== undefined &&
            Math.abs(ps.y - this.body.y) < 24;

        const overPlatform = ps.x > this.body.x - this.halfW - ps.body.width &&
                             ps.x < this.body.x + this.halfW + ps.body.width;

        if (touching && overPlatform) {
            ps.body.y += dist;
            this._carryingPlayer = true;
        } else {
            this._carryingPlayer = false;
        }
    }

    destroy() {
        if (this.gfx && this.gfx.active) this.gfx.destroy();
        if (this.body && this.body.active) this.body.destroy();
    }
}
