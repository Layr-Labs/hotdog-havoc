import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';

interface Block {
  x: number;
  y: number;
}

export class EditorState extends BaseState {
  private backButton: Phaser.GameObjects.Text | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private coordText: Phaser.GameObjects.Text | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private blocks: Set<string> = new Set(); // Using string keys like "x,y" for easy lookup
  private blockGraphics: Phaser.GameObjects.Graphics | null = null;
  private shouldIgnoreNextClick: boolean = true;

  protected onCreate(): void {
    this.shouldIgnoreNextClick = true;
    this.setupBackground();
    this.drawGrid();
    this.setupBackButton();
    this.setupCoordDisplay();
    this.setupBlockGraphics();
    this.scene.input.on('pointermove', this.updateCoordDisplay, this);
    this.scene.input.on('pointerdown', this.handleBlockClick, this);
    this.scene.scale.on('resize', this.handleResize, this);
  }

  protected onUpdate(): void {
    // No need to update here, handled by events
  }

  protected onDestroy(): void {
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.coordText) this.coordText.destroy();
    if (this.gridGraphics) this.gridGraphics.destroy();
    if (this.blockGraphics) this.blockGraphics.destroy();
    this.scene.input.off('pointermove', this.updateCoordDisplay, this);
    this.scene.input.off('pointerdown', this.handleBlockClick, this);
    this.scene.scale.off('resize', this.handleResize, this);
    this.blocks.clear();
    this.drawBlocks();
  }

  private setupBlockGraphics(): void {
    this.blockGraphics = this.scene.add.graphics();
    this.blockGraphics.setDepth(-40); // Just above the grid
    this.addGameObject(this.blockGraphics);
  }

  private handleBlockClick(pointer: Phaser.Input.Pointer): void {
    if (this.shouldIgnoreNextClick) {
      this.shouldIgnoreNextClick = false;
      return;
    }
    
    // Convert screen coordinates to block coordinates
    const blockX = Math.floor(pointer.x / 16) * 16;
    const blockY = Math.floor((this.scene.scale.height - pointer.y) / 16) * 16;
    
    // Toggle block state
    const blockKey = `${blockX/16},${blockY/16}`;
    if (this.blocks.has(blockKey)) {
      this.blocks.delete(blockKey);
    } else {
      this.blocks.add(blockKey);
    }
    
    // Redraw blocks
    this.drawBlocks();
  }

  private drawBlocks(): void {
    if (!this.blockGraphics) return;
    this.blockGraphics.clear();
    this.blockGraphics.fillStyle(0x00ff00, 0.5); // Semi-transparent green
    this.blocks.forEach(blockKey => {
      const [x, y] = blockKey.split(',').map(Number);
      // Convert block coordinates to screen coordinates
      const screenX = x * 16;
      const screenY = this.scene.scale.height - (y + 1) * 16;
      this.blockGraphics.fillRect(screenX, screenY, 16, 16);
    });
  }

  private setupBackground(): void {
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }
  }

  private drawGrid(): void {
    if (this.gridGraphics) this.gridGraphics.destroy();
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const grid = this.scene.add.graphics();
    grid.setDepth(-50);
    grid.lineStyle(1, 0x9b59b6, 0.25);
    for (let x = 0; x <= width; x += 16) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height - 5);
      grid.strokePath();
    }
    for (let y = 0; y <= height; y += 16) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(width, y - 5);
      grid.strokePath();
    }
    this.gridGraphics = grid;
    this.addGameObject(grid);
  }

  private handleResize(): void {
    this.drawGrid();
    this.drawBlocks();
  }

  private setupBackButton(): void {
    this.backButton = this.scene.add.text(this.scene.scale.width - 32, 24, 'Back', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#fff',
      align: 'right',
    });
    this.addGameObject(this.backButton);
    this.backButton.setOrigin(1, 0);
    this.backButton.setInteractive({ useHandCursor: true });
    this.backButton.on('pointerover', () => {
      if (this.backButton) {
        this.backButton.setColor('#ffe066');
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 1.12, 
          duration: 120, 
          ease: 'Sine.easeOut' 
        });
      }
    });
    this.backButton.on('pointerout', () => {
      if (this.backButton) {
        this.backButton.setColor('#fff');
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 1, 
          duration: 120, 
          ease: 'Sine.easeIn' 
        });
      }
    });
    this.backButton.on('pointerdown', () => {
      this.scene.tweens.add({ 
        targets: this.backButton, 
        scale: 0.95, 
        duration: 80, 
        yoyo: true, 
        ease: 'Sine.easeInOut' 
      });
      GameEventEmitter.emit({
        type: GameEventType.STATE_CHANGE,
        data: { state: GameStateType.MENU }
      });
    });
  }

  private setupCoordDisplay(): void {
    this.coordText = this.scene.add.text(16, 16, '(0, 0)', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#fff',
      align: 'left',
      backgroundColor: 'rgba(0,0,0,0.3)'
    });
    this.coordText.setOrigin(0, 0);
    this.coordText.setDepth(20);
    this.addGameObject(this.coordText);
  }

  private updateCoordDisplay(pointer: Phaser.Input.Pointer): void {
    if (!this.coordText) return;
    const blockX = Math.floor(pointer.x / 16);
    const blockY = Math.floor((this.scene.scale.height - pointer.y) / 16);
    this.coordText.setText(`(${blockX}, ${blockY})`);
  }
} 