import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import WebFont from 'webfontloader';

// Game states
enum GameState {
  TITLE = 'title',
  MENU = 'menu',
  GAME = 'game',
}

const Game = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#000000',
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    gameRef.current = new Phaser.Game(config);

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh'
      }} 
    />
  );
};

// --- Phaser Scene Functions ---
let currentState: GameState = GameState.TITLE;
let bgImage: Phaser.GameObjects.Image | null = null;
let titleImage: Phaser.GameObjects.Image | null = null;
let startText: Phaser.GameObjects.Text | null = null;
let walletText: Phaser.GameObjects.Text | null = null;
let connectedAddress: string | null = null;
let disconnectText: Phaser.GameObjects.Text | null = null;
let hotdogLeft: Phaser.GameObjects.Image | null = null;
let hotdogRight: Phaser.GameObjects.Image | null = null;

function preload(this: Phaser.Scene) {
  // Load the title image and hotdog images
  this.load.image('title', 'src/images/title.png');
  this.load.image('hotdog-title-left', 'src/images/hotdog-title-left.png');
  this.load.image('hotdog-title-right', 'src/images/hotdog-title-right.png');
}

function create(this: Phaser.Scene) {
  const bgCreated = drawSkyGradientTexture(this);
  if (!bgCreated) {
    console.warn('Could not create gradient background.');
    return;
  }
  if (bgImage) bgImage.destroy();
  bgImage = this.add.image(0, 0, 'sky-gradient').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height);
  bgImage.setDepth(-100);

  // Ensure font is loaded before showing title screen
  WebFont.load({
    google: { families: ['Press Start 2P'] },
    active: () => {
      showTitleScreen(this);
    },
    inactive: () => {
      showTitleScreen(this); // fallback if font fails
    }
  });
}

function update(this: Phaser.Scene) {
  if (currentState === GameState.TITLE) {
    // Title screen logic handled in showTitleScreen
    if (disconnectText) disconnectText.setVisible(false);
    if (hotdogLeft) hotdogLeft.setVisible(true);
    if (hotdogRight) hotdogRight.setVisible(true);
  } else if (currentState === GameState.MENU) {
    // Only show wallet address at top center
    if (titleImage) titleImage.setVisible(false);
    if (startText) startText.setVisible(false);
    if (hotdogLeft) hotdogLeft.setVisible(false);
    if (hotdogRight) hotdogRight.setVisible(false);
    if (!walletText && connectedAddress) {
      walletText = this.add.text(this.scale.width / 2, 24, connectedAddress, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#fff',
        align: 'center',
      });
      walletText.setOrigin(0.5, 0);
    }
    if (walletText) {
      walletText.setText(connectedAddress || '');
      walletText.setPosition(this.scale.width / 2, 24);
      walletText.setVisible(true);
    }
    // Show Disconnect button in upper right
    if (!disconnectText) {
      disconnectText = this.add.text(this.scale.width - 32, 24, 'Disconnect', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#fff',
        align: 'right',
      });
      disconnectText.setOrigin(1, 0);
      disconnectText.setInteractive({ useHandCursor: true });
      // Hover effect
      disconnectText.on('pointerover', () => {
        disconnectText.setColor('#ffe066');
        this.tweens.add({ targets: disconnectText, scale: 1.12, duration: 120, ease: 'Sine.easeOut' });
      });
      disconnectText.on('pointerout', () => {
        disconnectText.setColor('#fff');
        this.tweens.add({ targets: disconnectText, scale: 1, duration: 120, ease: 'Sine.easeIn' });
      });
      disconnectText.on('pointerdown', () => {
        this.tweens.add({ targets: disconnectText, scale: 0.95, duration: 80, yoyo: true, ease: 'Sine.easeInOut' });
        // Disconnect wallet
        connectedAddress = null;
        currentState = GameState.TITLE;
        if (walletText) walletText.setVisible(false);
        if (disconnectText) disconnectText.setVisible(false);
        showTitleScreen(this);
      });
    }
    if (disconnectText) {
      disconnectText.setPosition(this.scale.width - 32, 24);
      disconnectText.setVisible(true);
    }
  }
}

function showTitleScreen(scene: Phaser.Scene) {
  // Show the title image in the center
  if (titleImage) titleImage.destroy();
  titleImage = scene.add.image(scene.scale.width / 2, scene.scale.height / 2, 'title');
  titleImage.setOrigin(0.5, 0.5);
  // Optionally, scale down if too large
  const maxWidth = scene.scale.width * 0.8;
  const maxHeight = scene.scale.height * 0.4;
  let scale = 1;
  if (titleImage.width > maxWidth) {
    scale = maxWidth / titleImage.width;
    titleImage.setScale(scale);
  }
  if (titleImage.height * titleImage.scaleY > maxHeight) {
    scale = maxHeight / titleImage.height * titleImage.scaleX;
    titleImage.setScale(scale);
  }

  // Floating and pulsing animation
  scene.tweens.add({
    targets: titleImage,
    y: `+=30`,
    scale: scale * 1.08,
    duration: 1400,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1
  });

  // Add 16-bit style text below the title image as a button
  if (startText) startText.destroy();
  let textY = titleImage.y + (titleImage.displayHeight / 2) + 40;
  if (!isFinite(textY) || isNaN(textY)) {
    textY = scene.scale.height * 0.7;
  }
  startText = scene.add.text(scene.scale.width / 2, textY, 'Connect Wallet to Start', {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '20px',
    color: '#fff',
    align: 'center',
  });
  startText.setOrigin(0.5, 0);
  startText.setInteractive({ useHandCursor: true });
  startText.setDepth(10);

  // Hover effect
  startText.on('pointerover', () => {
    scene.tweens.add({
      targets: startText,
      scale: 1.12,
      duration: 120,
      ease: 'Sine.easeOut',
    });
    startText.setColor('#ffe066');
 
  });
  startText.on('pointerout', () => {
    scene.tweens.add({
      targets: startText,
      scale: 1,
      duration: 120,
      ease: 'Sine.easeIn',
    });
    startText.setColor('#fff');
    ;
  });
  // Click effect and wallet connect
  startText.on('pointerdown', async () => {
    scene.tweens.add({
      targets: startText,
      scale: 0.95,
      duration: 80,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
    // Connect wallet
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          connectedAddress = accounts[0];
          currentState = GameState.MENU;
          // Hide title and button
          if (titleImage) titleImage.setVisible(false);
          if (startText) startText.setVisible(false);
        }
      } catch (error) {
        // Optionally show error
      }
    } else {
      alert('Please install MetaMask to use this feature');
    }
  });

  // Add hotdog images, animate them in from the sides
  const y = scene.scale.height / 2 + (titleImage?.displayHeight || 0) / 2 + 80;
  const hotdogScale = 0.5;
  // Left hotdog
  if (hotdogLeft) hotdogLeft.destroy();
  hotdogLeft = scene.add.image(-200, y, 'hotdog-title-left');
  hotdogLeft.setOrigin(0, 0.5);
  hotdogLeft.setScale(hotdogScale);
  // Right hotdog
  if (hotdogRight) hotdogRight.destroy();
  hotdogRight = scene.add.image(scene.scale.width + 200, y, 'hotdog-title-right');
  hotdogRight.setOrigin(1, 0.5);
  hotdogRight.setScale(hotdogScale);
  // Calculate final positions after scaling
  scene.time.delayedCall(50, () => {
    const leftTargetX = 0;
    const rightTargetX = scene.scale.width;
    scene.tweens.add({
      targets: hotdogLeft,
      x: leftTargetX,
      ease: 'Bounce.easeOut',
      duration: 900,
      delay: 200
    });
    scene.tweens.add({
      targets: hotdogRight,
      x: rightTargetX,
      ease: 'Bounce.easeOut',
      duration: 900,
      delay: 200
    });
  });
}

function drawSkyGradientTexture(scene: Phaser.Scene): boolean {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#2a2251');
  gradient.addColorStop(0.5, '#4e3c7c');
  gradient.addColorStop(1, '#8a7bbd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  if (scene.textures.exists('sky-gradient')) {
    scene.textures.remove('sky-gradient');
  }
  scene.textures.addCanvas('sky-gradient', canvas);
  return true;
}

export default Game; 