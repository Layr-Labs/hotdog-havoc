import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { createSkyGradient } from '../utils/gradientUtils';
import { ScrollList } from '../components/ScrollList';
import { ethers } from 'ethers';
import * as contractUtils from '../utils/contractUtils';

export class CreateGameState extends BaseState {
  private bgImage: Phaser.GameObjects.Image | null = null;
  private scrollList: ScrollList | null = null;

  protected async onCreate(): Promise<void> {
    // Sky gradient background
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }

    // Create ScrollList (centered)
    this.scrollList = new ScrollList(this.scene, {
      width: 500,
      height: 336,
      items: [],
      fontSize: 16,
      itemHeight: 28
    });
    this.scrollList.displayObject.setPosition(
      this.scene.scale.width / 2 - 250,
      this.scene.scale.height / 2 - 168
    );
    this.scene.add.existing(this.scrollList.displayObject);
    this.addGameObject(this.scrollList.displayObject);

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
        callback: () => {}
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
  }
} 