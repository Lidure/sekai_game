/**
 * GAME_FONTS — Globally accessible font style presets.
 * All gameplay text uses monospace for pixel-art consistency.
 */
const GAME_FONTS = {
    title:       { fontSize: '52px', fontFamily: 'monospace', color: '#a8d8ff' },
    subtitle:    { fontSize: '16px', fontFamily: 'monospace', color: '#7FE0DE' },
    menuItem:    { fontSize: '24px', fontFamily: 'monospace', color: '#c8d8ff' },
    menuDisabled:{ fontSize: '24px', fontFamily: 'monospace', color: '#3a3a5a' },
    hint:        { fontSize: '14px', fontFamily: 'monospace', color: '#4a6a9f' },
    hud:         { fontSize: '16px', fontFamily: 'monospace', color: '#a8d8ff' },
    bossName:    { fontSize: '16px', fontFamily: 'monospace', color: '#a8d8ff' },
};

/**
 * SceneManager — Centralized scene transition utility.
 *
 * Decouples scenes by using Phaser's global game event bus (game.events)
 * instead of direct scene.get() references.  Provides clean fade transitions
 * and a publish/subscribe overlay pattern.
 *
 * Usage:
 *   // Transition to a new scene
 *   SceneManager.goTo(this, 'GameScene', { some: 'data' });
 *
 *   // Launch an overlay (current scene pauses, overlay runs on top)
 *   SceneManager.launchOverlay(this, 'BossScene', { playerData: {...} });
 *
 *   // Inside the overlay scene when done
 *   SceneManager.finishOverlay(this, { victory: true });
 *
 *   // Inside the scene that launched the overlay (listen for result)
 *   SceneManager.onOverlayResult(this, (data) => { ... });
 */
class SceneManager {

    /**
     * Transition to a target scene with a fade-out effect.
     * The target scene should call cameras.main.fadeIn() in its create().
     *
     * @param {Phaser.Scene} scene       - The current scene.
     * @param {string}       targetKey   - Scene key to transition to.
     * @param {object}       [data={}]   - Data passed to the target scene's init().
     * @param {number}       [duration=500] - Fade-out duration in ms.
     */
    static goTo(scene, targetKey, data = {}, duration = 500) {
        scene.cameras.main.fadeOut(duration, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
            scene.scene.start(targetKey, data);
        });
    }

    /**
     * Launch an overlay scene (e.g. boss arena) while pausing the current scene.
     * The overlay scene is started via scene.launch() so both scenes coexist.
     *
     * @param {Phaser.Scene} scene       - The current (pausing) scene.
     * @param {string}       overlayKey  - Scene key of the overlay.
     * @param {object}       [data={}]   - Data passed to overlay's init().
     */
    static launchOverlay(scene, overlayKey, data = {}) {
        scene.scene.launch(overlayKey, data);
        scene.scene.pause();
    }

    /**
     * Finish an overlay scene and emit the result back to the paused scene.
     * Stops the overlay scene and fires an 'overlay:result' event on game.events.
     * The launching scene should listen via onOverlayResult().
     *
     * @param {Phaser.Scene} overlayScene - The overlay scene that is finishing.
     * @param {object}       [result={}]  - Arbitrary result data.
     */
    static finishOverlay(overlayScene, result = {}) {
        overlayScene.game.events.emit('overlay:result', {
            from: overlayScene.scene.key,
            result: result,
        });
        overlayScene.scene.stop();
    }

    /**
     * Register a callback to receive overlay results.
     * Automatically cleans up the listener when the scene shuts down.
     *
     * @param {Phaser.Scene} scene    - The scene that should receive results.
     * @param {Function}     callback - Called with data: { from, result }.
     */
    static onOverlayResult(scene, callback) {
        const handler = (data) => callback.call(scene, data);
        scene.game.events.on('overlay:result', handler);
        scene.events.once('shutdown', () => {
            scene.game.events.off('overlay:result', handler);
        });
    }
}
