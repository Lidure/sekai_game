const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 720,
    parent: 'game-container',
    scene: [BootScene, MenuScene, GameScene, BossScene, CreditsScene],
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
