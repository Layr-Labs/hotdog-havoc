import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Game states
enum GameState {
  TITLE = 'title',
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

function preload(this: Phaser.Scene) {
  // Load the title image
  this.load.image('title', 'src/images/title.png');
}

function create(this: Phaser.Scene) {
  // Draw gradient background for title screen
  drawSkyGradientTexture(this);
  if (bgImage) bgImage.destroy();
  bgImage = this.add.image(0, 0, 'sky-gradient').setOrigin(0, 0).setDisplaySize(this.scale.width, this.scale.height);
  bgImage.setDepth(-100); // Ensure it's always at the back

  // Show the title image in the center
  if (titleImage) titleImage.destroy();
  titleImage = this.add.image(this.scale.width / 2, this.scale.height / 2, 'title');
  titleImage.setOrigin(0.5, 0.5);
  // Optionally, scale down if too large
  const maxWidth = this.scale.width * 0.8;
  const maxHeight = this.scale.height * 0.4;
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
  this.tweens.add({
    targets: titleImage,
    y: `+=30`, // float up and down
    scale: scale * 1.08, // pulse a bit
    duration: 1400,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1
  });
}

function update(this: Phaser.Scene) {
  // If state changes, update background accordingly
  if (currentState === GameState.TITLE) {
    // Could animate clouds, etc. here
  } else if (currentState === GameState.GAME) {
    // Main game logic will go here
  }
}

function drawSkyGradientTexture(scene: Phaser.Scene) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#2a2251'); // deep blue/purple
  gradient.addColorStop(0.5, '#4e3c7c'); // mid
  gradient.addColorStop(1, '#8a7bbd'); // light near horizon
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  // Add as Phaser texture
  if (scene.textures.exists('sky-gradient')) {
    scene.textures.remove('sky-gradient');
  }
  scene.textures.addCanvas('sky-gradient', canvas);
}

export default Game; 