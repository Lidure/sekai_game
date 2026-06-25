/**
 * ShadowFragment — Patrol + Chase enemy.
 *
 * State machine:
 *   PATROL → moves in a direction, reverses at edges/walls
 *         → detects player within 150px → CHASE
 *   CHASE  → moves toward player at increased speed
 *         → player escapes or hits wall → PATROL
 *
 * Narrative: A fragment of doubt. It scatters when confronted,
 *            but always reforms somewhere else.
 */
class ShadowFragment extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_shadow',
            hp: 3,
            contactDamage: 5,
            feelingsDrop: 2,
            bodyWidth: 27,
            bodyHeight: 27,
        });

        // Asset is 32x32 dark forest slime; scale to full 32x32 display for better visibility as a ground enemy
        this.sprite.setScale(1.0);

        this.patrolSpeed = 40;
        this.chaseSpeed = 65;
        this.patrolDir = Math.random() < 0.5 ? 1 : -1;
        this.state = 'patrol';
    }

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'patrol':
                this.body.setVelocityX(this.patrolDir * this.patrolSpeed);

                // Bounce off walls
                if (this.body.blocked.left) this.patrolDir = 1;
                if (this.body.blocked.right) this.patrolDir = -1;

                // Detect player
                if (absDist < 150) {
                    this.state = 'chase';
                }
                break;

            case 'chase':
                this.body.setVelocityX(Math.sign(dist) * this.chaseSpeed);

                // Exit chase: player escaped or hit wall
                if (absDist > 200) {
                    this.state = 'patrol';
                } else if (this.body.blocked.left) {
                    this.patrolDir = 1;
                    this.state = 'patrol';
                } else if (this.body.blocked.right) {
                    this.patrolDir = -1;
                    this.state = 'patrol';
                }
                break;
        }

        // Face movement direction
        this.sprite.setFlipX(this.body.velocity.x > 0);
    }
}
