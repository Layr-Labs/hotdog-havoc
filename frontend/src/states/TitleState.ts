import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';
import WalletStore from '../utils/WalletStore';

export class TitleState extends BaseState {
  private titleImage: Phaser.GameObjects.Image | null = null;
  private startText: Phaser.GameObjects.Text | null = null;
  private hotdogLeft: Phaser.GameObjects.Image | null = null;
  private hotdogRight: Phaser.GameObjects.Image | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;

  protected onCreate(): void {
    this.setupBackground();
    this.showTitleScreen();
  }

  protected onUpdate(): void {
    // Update positions if needed
  }

  protected onDestroy(): void {
    // Clean up game objects
    if (this.bgImage) this.bgImage.destroy();
    if (this.titleImage) this.titleImage.destroy();
    if (this.startText) this.startText.destroy();
    if (this.hotdogLeft) this.hotdogLeft.destroy();
    if (this.hotdogRight) this.hotdogRight.destroy();
  }

  private setupBackground(): void {
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }
  }

  private showTitleScreen(): void {
    // Show the title image in the center, but start above the screen
    const titleFinalY = this.scene.scale.height / 2;
    this.titleImage = this.scene.add.image(this.scene.scale.width / 2, -200, 'title');
    this.addGameObject(this.titleImage);
    this.titleImage.setOrigin(0.5, 0.5);

    // Scale down if too large
    const maxWidth = this.scene.scale.width * 0.8;
    const maxHeight = this.scene.scale.height * 0.4;
    let scale = 1;
    if (this.titleImage.width > maxWidth) {
      scale = maxWidth / this.titleImage.width;
      this.titleImage.setScale(scale);
    }
    if (this.titleImage.height * this.titleImage.scaleY > maxHeight) {
      scale = maxHeight / this.titleImage.height * this.titleImage.scaleX;
      this.titleImage.setScale(scale);
    }

    // Bounce down from top
    this.scene.tweens.add({
      targets: this.titleImage,
      y: titleFinalY,
      ease: 'Bounce.easeOut',
      duration: 900,
      onComplete: () => {
        // Start floating and pulsing after bounce
        this.scene.tweens.add({
          targets: this.titleImage,
          y: `+=30`,
          scale: scale * 1.08,
          duration: 1400,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
        this.showTitleScreenRest(scale);
      }
    });
  }

  private showTitleScreenRest(scale: number): void {
    // Add connect wallet text
    const textY = this.titleImage!.y + (this.titleImage!.displayHeight / 2) + 40;
    const startTextY = this.scene.scale.height + 100;
    this.startText = this.scene.add.text(this.scene.scale.width / 2, startTextY, 'Connect Wallet to Start', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#fff',
      align: 'center',
    });
    this.addGameObject(this.startText);
    this.startText.setOrigin(0.5, 0);
    this.startText.setDepth(10);

    // Bounce in from the bottom
    this.scene.tweens.add({
      targets: this.startText,
      y: textY,
      ease: 'Bounce.easeOut',
      duration: 900,
      delay: 200,
      onComplete: () => {
        this.setupWalletConnect();
      }
    });

    // Add hotdog images
    this.addHotdogImages();
  }

  private setupWalletConnect(): void {
    if (!this.startText) return;

    this.startText.setInteractive({ useHandCursor: true });
    
    this.startText.on('pointerover', () => {
      this.scene.tweens.add({
        targets: this.startText,
        scale: 1.12,
        duration: 120,
        ease: 'Sine.easeOut',
      });
      this.startText!.setColor('#ffe066');
    });

    this.startText.on('pointerout', () => {
      this.scene.tweens.add({
        targets: this.startText,
        scale: 1,
        duration: 120,
        ease: 'Sine.easeIn',
      });
      this.startText!.setColor('#fff');
    });

    this.startText.on('pointerdown', async () => {
      this.scene.tweens.add({
        targets: this.startText,
        scale: 0.95,
        duration: 80,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });

      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            // Set wallet address globally
            WalletStore.setAddress(accounts[0]);
            // First emit wallet connected event
            GameEventEmitter.emit({
              type: GameEventType.WALLET_CONNECTED,
              data: { address: accounts[0] }
            });

            // Then emit state change event after a short delay to ensure wallet event is processed
            this.scene.time.delayedCall(100, () => {
              GameEventEmitter.emit({
                type: GameEventType.STATE_CHANGE,
                data: { state: GameStateType.MENU }
              });
            });
          }
        } catch (error) {
          console.error('Failed to connect wallet:', error);
        }
      } else {
        alert('Please install MetaMask to use this feature');
      }
    });
  }

  private addHotdogImages(): void {
    const y = this.scene.scale.height / 2 + (this.titleImage?.displayHeight || 0) / 2 + 80;
    const hotdogScale = 0.5;

    // Left hotdog
    this.hotdogLeft = this.scene.add.image(0, y, 'hotdog-title-left');
    this.addGameObject(this.hotdogLeft);
    this.hotdogLeft.setOrigin(0, 0.5);
    this.hotdogLeft.setScale(hotdogScale);
    this.hotdogLeft.x = -this.hotdogLeft.displayWidth;
    this.hotdogLeft.setVisible(true);

    // Right hotdog
    this.hotdogRight = this.scene.add.image(this.scene.scale.width, y, 'hotdog-title-right');
    this.addGameObject(this.hotdogRight);
    this.hotdogRight.setOrigin(0, 0.5);
    this.hotdogRight.setScale(hotdogScale);
    this.hotdogRight.setVisible(true);

    // Animate hotdogs
    this.scene.time.delayedCall(50, () => {
      if (!this.hotdogLeft || !this.hotdogRight) return;
      this.hotdogLeft.x = -this.hotdogLeft.displayWidth;
      const leftTargetX = 0;
      const rightTargetX = this.scene.scale.width - this.hotdogRight.displayWidth;

      this.scene.tweens.add({
        targets: this.hotdogLeft,
        x: leftTargetX,
        ease: 'Bounce.easeOut',
        duration: 900,
        delay: 200
      });

      this.scene.tweens.add({
        targets: this.hotdogRight,
        x: rightTargetX,
        ease: 'Bounce.easeOut',
        duration: 900,
        delay: 200
      });
    });
  }
} 