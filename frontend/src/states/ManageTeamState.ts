import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';

export class ManageTeamState extends BaseState {
  private bgImage: Phaser.GameObjects.Image | null = null;
  private backButton: Phaser.GameObjects.Image | null = null;

  protected onCreate(): void {
    // Sky gradient background
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }

    // Show back button in upper right corner
    this.showBackButton();
  }

  protected onUpdate(): void {
    // Update positions if needed
  }

  protected onDestroy(): void {
    // Clean up game objects
    if (this.bgImage) { this.bgImage.destroy(); this.bgImage = null; }
    if (this.backButton) { this.backButton.destroy(); this.backButton = null; }
    this.gameObjects = [];
  }

  private showBackButton(): void {
    this.backButton = this.scene.add.image(this.scene.scale.width - 32, 24, 'back');
    this.backButton.setOrigin(0.5, 0.5);
    this.backButton.setScale(0.5);
    this.backButton.setScrollFactor(0);
    this.backButton.setInteractive({ useHandCursor: true });

    this.backButton.on('pointerover', () => {
      if (this.backButton) {
        this.scene.tweens.add({
          targets: this.backButton,
          scale: 0.55,
          duration: 120,
          ease: 'Sine.easeOut'
        });
      }
    });

    this.backButton.on('pointerout', () => {
      if (this.backButton) {
        this.scene.tweens.add({
          targets: this.backButton,
          scale: 0.5,
          duration: 120,
          ease: 'Sine.easeIn'
        });
      }
    });

    this.backButton.on('pointerdown', () => {
      if (this.backButton) {
        this.scene.tweens.add({
          targets: this.backButton,
          scale: 0.45,
          duration: 80,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      }
    });

    this.backButton.on('pointerup', () => {
      GameEventEmitter.emit({
        type: GameEventType.STATE_CHANGE,
        data: { state: GameStateType.MENU }
      });
    });

    this.addGameObject(this.backButton);
  }
} 