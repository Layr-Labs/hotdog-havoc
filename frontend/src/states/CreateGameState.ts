import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { createSkyGradient } from '../utils/gradientUtils';
import { ScrollList } from '../components/ScrollList';
import { LevelPreview } from '../components/LevelPreview';
import { ethers } from 'ethers';
import * as contractUtils from '../utils/contractUtils';

export class CreateGameState extends BaseState {
  private bgImage: Phaser.GameObjects.Image | null = null;
  private scrollList: ScrollList | null = null;
  private levelPreview: LevelPreview | null = null;
  private selectedLevelId: number | null = null;

  protected async onCreate(): Promise<void> {
    // Sky gradient background
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }

    // Layout constants
    const scrollListWidth = 500;
    const scrollListHeight = 336;
    const previewWidth = 400;
    const previewHeight = 220;
    const gap = 40;
    const totalWidth = scrollListWidth + gap + previewWidth;
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

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
      centerY - previewHeight / 2
    );
    this.scene.add.existing(this.levelPreview.displayObject);
    this.addGameObject(this.levelPreview.displayObject);

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
  }
} 