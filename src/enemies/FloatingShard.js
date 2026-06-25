/**
 * FloatingShard — Hover + Drift enemy.
 *
 * State machine:
 *   HOVER  → bobs at origin Y with sine wave, subtle idle drift
 *          → player within 100px horizontally → DRIFT
 *   DRIFT  → slowly moves toward player X
 *          → player beyond 150px → RETURN
 *   RETURN → drifts back to origin X
 *          → reaches origin → HOVER
 *
 * Narrative: A broken piece of memory. It drifts just beyond reach,
 *            like a forgotten song.
 */
class FloatingShard extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_shard',
            hp: 4,
            contactDamage: 8,
            feelingsDrop: 5,
            bodyWidth: 28,
            bodyHeight: 28,
            noGravity: true,
        });

        // Asset is 31x44 gothic ghost; scale to ~15.5x22 display to match original floating shard size
        this.sprite.setScale(0.5);

        this.originX = x;
        this.originY = y;
        this.driftSpeed = 35;
        this.state = 'hover';
    }

    _updateAI(dt, playerX, playerY) {
        // Cosmetic Y-bob (visual sprite only — physics body stays)
        const time = this.scene.time.now / 1000;
        this.sprite.y = this.originY + Math.sin(time * Math.PI * 2 / 1.5) * 6;

        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'hover':
                // Subtle idle drift
                this.body.setVelocityX(Math.sin(time) * 10);

                // Detect player
                if (absDist < 100) {
                    this.state = 'drift';
                }
                break;

            case 'drift':
                // Move toward player X
                this.body.setVelocityX(Math.sign(dist) * this.driftSpeed);

                // Player lost
                if (absDist > 150) {
                    this.state = 'return';
                }
                break;

            case 'return':
                // Drift back to origin X
                const dx = this.originX - this.x;
                this.body.setVelocityX(Math.sign(dx) * this.driftSpeed);
                if (Math.abs(dx) < 10) {
                    this.body.setVelocityX(0);
                    this.state = 'hover';
                }
                // Re-detect player during return
                if (absDist < 100) {
                    this.state = 'drift';
                }
                break;
        }
    }
}
