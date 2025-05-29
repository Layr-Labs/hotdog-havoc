import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { createSkyGradient } from '../utils/gradientUtils';
import { ScrollList } from '../components/ScrollList';
import { LevelPreview } from '../components/LevelPreview';
import { ethers } from 'ethers';
import * as contractUtils from '../utils/contractUtils';
import { ButtonComponent } from '../components/ButtonComponent';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { GameStateType } from './GameState';
import { LabelComponent } from '../components/LabelComponent';

export class CreateGameState extends BaseState {
  private bgImage: Phaser.GameObjects.Image | null = null;
  private scrollList: ScrollList | null = null;
  private levelPreview: LevelPreview | null = null;
  private selectedLevelId: number | null = null;
  private createGameImage: Phaser.GameObjects.Image | null = null;
  private backButton: Phaser.GameObjects.Image | null = null;
  private chooseLevelText: Phaser.GameObjects.Text | null = null;
  private levelPreviewText: Phaser.GameObjects.Text | null = null;

  protected async onCreate(): Promise<void> {
    // Sky gradient background
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }

    // Show createGame image with bounce-in animation
    this.showCreateGameTitle();

    // Show back button in upper right corner
    this.showBackButton();

    // Layout constants
    const scrollListWidth = 500;
    const scrollListHeight = 336;
    const previewWidth = 400;
    const previewHeight = 220;
    const gap = 40;
    const totalWidth = scrollListWidth + gap + previewWidth;
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    // Add 'Choose Level' text above the ScrollList
    this.chooseLevelText = this.scene.add.text(
      centerX - totalWidth / 2,
      centerY - scrollListHeight / 2 - 20,
      'Choose Level',
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#fff',
        align: 'left',
      }
    );
    this.chooseLevelText.setOrigin(0, 0.5);
    this.scene.add.existing(this.chooseLevelText);
    this.addGameObject(this.chooseLevelText);

    // Create ScrollList (left)
    this.scrollList = new ScrollList(this.scene, {
      width: scrollListWidth,
      height: scrollListHeight,
      items: [],
      fontSize: 16,
      itemHeight: 28
    });
    this.scrollList.displayObject.setPosition(
      centerX - totalWidth / 2,
      centerY - scrollListHeight / 2
    );
    this.scene.add.existing(this.scrollList.displayObject);
    this.addGameObject(this.scrollList.displayObject);

    // Create LevelPreview (right)
    this.levelPreview = new LevelPreview(this.scene, {
      blocks: [],
      width: previewWidth,
      height: previewHeight
    });
    this.levelPreview.displayObject.setPosition(
      centerX - totalWidth / 2 + scrollListWidth + gap,
      centerY - scrollListHeight / 2
    );
    this.scene.add.existing(this.levelPreview.displayObject);
    this.addGameObject(this.levelPreview.displayObject);

    // Add 'Level Preview' text above the LevelPreview
    this.levelPreviewText = this.scene.add.text(
      centerX - totalWidth / 2 + scrollListWidth + gap,
      centerY - scrollListHeight / 2 - 20,
      'Level Preview',
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#fff',
        align: 'left',
      }
    );
    this.levelPreviewText.setOrigin(0, 0.5);
    this.scene.add.existing(this.levelPreviewText);
    this.addGameObject(this.levelPreviewText);

    // Load all levels
    try {
      if (!window.ethereum) {
        console.error('No Ethereum provider found.');
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const levelCount = Number(await contractUtils.getLevelCount());
      const levelData = await Promise.all(
        Array.from({ length: levelCount }, (_, i) => i).map(async (id: number) => {
          const level = await contractUtils.getLevel(id);
          return { id, name: level.name };
        })
      );
      const items = levelData.map(({ id, name }: any) => ({
        text: name ? `${name} (ID: ${id})` : `Level ${id}`,
        callback: async () => {
          // Fetch blocks and update preview
          const blocks = await contractUtils.getLevelBlocks(id);
          this.selectedLevelId = id;
          if (this.levelPreview) {
            this.levelPreview.updateBlocks(blocks);
          }
        }
      }));
      (this.scrollList as any).items = items;
      (this.scrollList as any).createItems();
    } catch (error) {
      console.error('Error loading all levels:', error);
    }
  }

  protected onUpdate(): void {}

  protected onDestroy(): void {
    if (this.bgImage) this.bgImage.destroy();
    if (this.scrollList) this.scrollList.displayObject.destroy();
    if (this.levelPreview) this.levelPreview.displayObject.destroy();
    if (this.createGameImage) this.createGameImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.chooseLevelText) this.chooseLevelText.destroy();
    if (this.levelPreviewText) this.levelPreviewText.destroy();
  }

  private showCreateGameTitle(): void {
    const yFinal = 0;
    this.createGameImage = this.scene.add.image(this.scene.scale.width / 2, -200, 'createGame');
    this.addGameObject(this.createGameImage);
    this.createGameImage.setOrigin(0.5, 0);

    const maxWidth = this.scene.scale.width * 0.20;
    let scale = 1;
    if (this.createGameImage.width > maxWidth) {
      scale = maxWidth / this.createGameImage.width;
      this.createGameImage.setScale(scale);
    }

    this.scene.tweens.add({
      targets: this.createGameImage,
      y: yFinal,
      ease: 'Bounce.easeOut',
      duration: 900,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.createGameImage,
          y: `+=20`,
          scale: scale * 1.08,
          duration: 1400,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      }
    });
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