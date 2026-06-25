/**
 * Bat — Flying patrol/chase/retreat enemy.
 *
 * State machine:
 *   PATROL  → sine-wave horizontal oscillation ±50px from origin at 30px/s,
 *              bob up/down ±8px with 1.5s period
 *           → player within 120px horizontally → CHASE
 *   CHASE   → fly toward player at 55px/s with Y-bobbing
 *           → player closer than 40px (too close) or beyond 180px → RETREAT
 *   RETREAT → fly away from player at 40px/s for 1s → PATROL
 *
 * Narrative: A shrieking memory swarming in the dark. It darts close,
 *            but scatters when cornered — like a thought you almost catch.
 *
 * Design doc: design/enemy-combat-design.md § Bat
 */
class Bat extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_bat',
            hp: 3,
            contactDamage: 6,
            feelingsDrop: 3,
            bodyWidth: 24,
            bodyHeight: 24,
            noGravity: true,
        });

        // Source is 320×320 high-res pixel art; scale to ~24×24 display
        this.sprite.setScale(0.075);

        this.originX = x;
        this.originY = y;
        this.patrolSpeed = 30;
        this.chaseSpeed = 55;
        this.retreatSpeed = 40;
        this.state = 'patrol';
        this.stateTimer = 0;

        // Initial facing
        this.sprite.setFlipX(true);
    }

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);
        const time = this.scene.time.now / 1000;

        // Face movement direction
        const vx = this.body.velocity.x;
        if (Math.abs(vx) > 5) {
            this.sprite.setFlipX(vx > 0);
        }

        switch (this.state) {
            case 'patrol': {
                // Sine-wave horizontal ±50px oscillation at 30px/s
                // Position amplitude = speed / ω ≈ 30 / 0.8 ≈ 37.5px
                this.body.setVelocityX(Math.sin(time * 0.8) * this.patrolSpeed);

                // Vertical bob ±8px with ~1.5s period (velocity-based, Arcade-safe)
                const bobVY = Math.cos(time * (Math.PI * 2 / 1.5)) * 34;
                this.body.setVelocityY(bobVY);

                // Player within detection range
                if (absDist < 120) {
                    this.state = 'chase';
                }
                break;
            }

            case 'chase': {
                // Fly toward player horizontally
                this.body.setVelocityX(Math.sign(dist) * this.chaseSpeed);

                // Vertical bob (slightly faster during chase — agitated, velocity-based)
                const bobVY = Math.cos(time * (Math.PI * 2 / 1.2)) * 42;
                this.body.setVelocityY(bobVY);

                // Player escaped (too far) or too close (flinches away)
                if (absDist > 180 || absDist < 40) {
                    this.stateTimer = 1.0; // retreat for 1 second
                    this.state = 'retreat';
                }
                break;
            }

            case 'retreat': {
                // Fly away from player
                this.body.setVelocityX(Math.sign(-dist) * this.retreatSpeed);

                // Vertical bob (calmer retreat, velocity-based)
                const bobVY = Math.cos(time * (Math.PI * 2 / 1.5)) * 25;
                this.body.setVelocityY(bobVY);

                this.stateTimer -= dt / 1000;
                if (this.stateTimer <= 0) {
                    this.state = 'patrol';
                }
                break;
            }
        }
    }
}
