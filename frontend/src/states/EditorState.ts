import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';

export class EditorState extends BaseState {
  private backButton: Phaser.GameObjects.Text | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private coordText: Phaser.GameObjects.Text | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;

  protected onCreate(): void {
    this.setupBackground();
    this.drawGrid();
    this.setupBackButton();
    this.setupCoordDisplay();
    this.scene.input.on('pointermove', this.updateCoordDisplay, this);
    this.scene.scale.on('resize', this.handleResize, this);
  }

  protected onUpdate(): void {
    // No need to update here, handled by pointermove event
  }

  protected onDestroy(): void {
    // Clean up game objects
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.coordText) this.coordText.destroy();
    if (this.gridGraphics) this.gridGraphics.destroy();
    this.scene.input.off('pointermove', this.updateCoordDisplay, this);
    this.scene.scale.off('resize', this.handleResize, this);
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
    grid.lineStyle(1, 0x9b59b6, 0.25); // purple-ish, semi-transparent
    // Vertical lines
    for (let x = 0; x <= width; x += 50) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
      grid.strokePath();
    }
    // Horizontal lines
    for (let y = 0; y <= height; y += 50) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(width, y);
      grid.strokePath();
    }
    this.gridGraphics = grid;
    this.addGameObject(grid);
  }

  private handleResize(): void {
    this.drawGrid();
    // Optionally reposition other UI elements if needed
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

    // Hover effect
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

      // Emit state change event to return to menu
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
    const x = Math.round(pointer.x);
    const y = Math.round(this.scene.scale.height - pointer.y); // invert y for bottom-left origin
    this.coordText.setText(`(${x}, ${y})`);
  }
} 