import Phaser from 'phaser';

interface LevelPreviewProps {
  blocks: { x: number; y: number }[];
  width?: number;
  height?: number;
}

export class LevelPreview {
  public displayObject: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private width: number;
  private height: number;
  private blocks: { x: number; y: number }[];

  constructor(scene: Phaser.Scene, props: LevelPreviewProps) {
    this.scene = scene;
    this.width = props.width || 200;
    this.height = props.height || 100;
    this.blocks = props.blocks;
    this.displayObject = scene.add.container(0, 0);
    this.graphics = scene.add.graphics();
    this.displayObject.add(this.graphics);
    this.displayObject.setScrollFactor(0);
    this.renderPreview();
  }

  private renderPreview() {
    this.graphics.clear();
    // Find bounds of blocks
    if (this.blocks.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const block of this.blocks) {
      if (block.x < minX) minX = block.x;
      if (block.y < minY) minY = block.y;
      if (block.x > maxX) maxX = block.x;
      if (block.y > maxY) maxY = block.y;
    }
    const blockW = 2, blockH = 2;
    const mapW = (maxX - minX + 1) * blockW;
    const mapH = (maxY - minY + 1) * blockH;
    // Scale to fit preview area
    const scale = Math.min(this.width / mapW, this.height / mapH, 1);
    // Center the map
    const offsetX = (this.width - mapW * scale) / 2;
    const offsetY = (this.height - mapH * scale) / 2;
    // Draw each block
    this.graphics.fillStyle(0x27ae60, 1);
    for (const block of this.blocks) {
      const x = offsetX + (block.x - minX) * blockW * scale;
      const y = offsetY + (block.y - minY) * blockH * scale;
      this.graphics.fillRect(x, y, blockW * scale, blockH * scale);
    }
    // Draw border
    this.graphics.lineStyle(1, 0xffffff, 0.5);
    this.graphics.strokeRect(0, 0, this.width, this.height);
  }

  updateBlocks(blocks: { x: number; y: number }[]) {
    this.blocks = blocks;
    this.renderPreview();
  }

  show(props: { x: number; y: number }) {
    this.displayObject.setPosition(props.x, props.y);
    this.displayObject.setVisible(true);
  }

  hide() {
    this.displayObject.setVisible(false);
  }

  destroy() {
    this.displayObject.destroy();
  }
} 