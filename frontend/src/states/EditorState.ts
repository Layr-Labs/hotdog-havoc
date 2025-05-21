import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';

export class EditorState extends BaseState {
  private backButton: Phaser.GameObjects.Text | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;

  protected onCreate(): void {
    this.setupBackground();
    this.setupBackButton();
  }

  protected onUpdate(): void {
    // Update positions if needed
  }

  protected onDestroy(): void {
    // Clean up game objects
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
  }

  private setupBackground(): void {
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }
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
} 