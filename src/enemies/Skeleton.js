/**
 * Skeleton — Patrol + Approach + Melee Attack enemy.
 *
 * State machine:
 *   PATROL   → walks left-right at 35px/s, reverses at walls
 *            → player within 160px → APPROACH
 *   APPROACH → walks toward player at 45px/s
 *            → player within 50px + cooldown ready → ATTACK
 *            → player beyond 200px → PATROL
 *   ATTACK   → stops, telegraphs 0.4s (white tint),
 *              swings (0.1s active hitbox dealing 12 dmg),
 *              recovers 0.6s → back to APPROACH
 *            → 2s cooldown after attack completes
 *
 * Melee hit detection uses self-contained distance check
 * during the active hitbox window (no physics overlap with
 * a separate zone/group).
 *
 * Narrative: A forgotten soldier of a forgotten war.
 *            It still remembers how to swing a blade.
 *
 * Design doc: design/enemy-combat-design.md (Skeleton section)
 */
class Skeleton extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_skeleton',
            hp: 8,
            contactDamage: 3,
            feelingsDrop: 8,
            bodyWidth: 28,
            bodyHeight: 44,
        });

        // Spritesheet frame is 48×56, scale to ~41×48 display pixels
        this.sprite.setScale(0.85);
        // Center the origin for easier hitbox alignment
        this.sprite.setOrigin(0.5, 0.5);

        // AI state
        this.patrolDir = Math.random() < 0.5 ? 1 : -1;
        this.state = 'patrol';

        // Attack timing
        this.attackCooldown = 0;       // seconds remaining before next attack
        this.stateTimer = 0;           // seconds countdown within attack state
        this.meleeDamage = 12;
        this._meleeHitDealt = false;   // prevents multi-hit per swing
    }

    /**
     * Override Enemy._updateAI — frame-rate independent state machine.
     * @param {number} dt — delta time in MILLISECONDS (from Phaser update)
     * @param {number} playerX
     * @param {number} playerY
     */
    _updateAI(dt, playerX, playerY) {
        // Convert ms to seconds for countdown-based timing
        const dtSec = dt / 1000;

        // Update cooldown (independent of state)
        if (this.attackCooldown > 0) this.attackCooldown -= dtSec;

        // Direction to player
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'patrol':
                // Walk in patrol direction
                this.body.setVelocityX(this.patrolDir * 35);

                // Reverse at walls
                if (this.body.blocked.left) this.patrolDir = 1;
                if (this.body.blocked.right) this.patrolDir = -1;

                // Detect player
                if (absDist < 160) {
                    this.state = 'approach';
                }
                break;

            case 'approach':
                // Walk toward player
                this.body.setVelocityX(Math.sign(dist) * 45);
                this.sprite.setFlipX(dist > 0);

                // Close enough → attack (if cooldown expired)
                if (absDist < 50 && this.attackCooldown <= 0) {
                    this.state = 'attack';
                    this.stateTimer = 1.1;  // total attack duration in seconds
                    this._meleeHitDealt = false;
                }

                // Player escaped → patrol
                if (absDist > 200) {
                    this.state = 'patrol';
                }
                break;

            case 'attack':
                // Stop moving during attack
                this.body.setVelocityX(0);
                this.sprite.setFlipX(dist > 0);

                // Count down
                this.stateTimer -= dtSec;

                // ── Telegraph phase (0.0–0.4s): white tint ──
                if (this.stateTimer > 0.7) {
                    this.sprite.setTint(0xffffff);
                }
                // ── Active hitbox (0.4–0.5s = 0.1s ≈ 6 frames) ──
                else if (this.stateTimer > 0.6) {
                    this.sprite.clearTint();

                    // Deal damage once per swing
                    if (!this._meleeHitDealt) {
                        const hDist = Math.abs(this.x - playerX);
                        const vDist = Math.abs(this.y - playerY);

                        // Hitbox is 30px wide × 20px tall in front of skeleton
                        if (hDist < 30 && vDist < 10) {
                            const knockDir = this.sprite.flipX ? 1 : -1;
                            this.scene.player.takeDamage(
                                this.meleeDamage,
                                80 * knockDir,
                                -30,
                            );
                            this._meleeHitDealt = true;
                        }
                    }
                }
                // ── Recovery phase (0.5–1.1s) ──
                else if (this.stateTimer > 0) {
                    this.sprite.clearTint();
                }

                // ── Attack complete ──
                if (this.stateTimer <= 0) {
                    this.sprite.clearTint();
                    this.attackCooldown = 2;  // 2s before next attack
                    this.state = 'approach';
                }
                break;
        }
    }

    /** Clean up any tint when dying. */
    die() {
        this.sprite.clearTint();
        super.die();
    }
}
