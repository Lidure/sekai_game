window.GAME_WIDTH = 1280;
window.GAME_HEIGHT = 720;

const config = {
    type: Phaser.AUTO,
    width: window.GAME_WIDTH,
    height: window.GAME_HEIGHT,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.GAME_WIDTH,
        height: window.GAME_HEIGHT,
    },
    scene: [BootScene, MenuScene, GameScene, BossScene, CreditsScene, HUDScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false,
        },
    },
    pixelArt: true,
    backgroundColor: '#0a0a1a',
};

window.sekaiGame = new Phaser.Game(config);
