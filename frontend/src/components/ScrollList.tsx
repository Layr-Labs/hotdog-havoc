import Phaser from 'phaser';

interface ScrollListProps {
  width: number;
  height: number;
  items: { text: string; callback: () => void }[];
  fontSize?: number;
  itemHeight?: number;
}

export class ScrollList {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private outline: Phaser.GameObjects.Graphics;
  private textItems: Phaser.GameObjects.Text[];
  private scrollUpButton: Phaser.GameObjects.Text;
  private scrollDownButton: Phaser.GameObjects.Text;
  private mask: Phaser.Display.Masks.GeometryMask;
  private scrollY: number = 0;
  private readonly itemHeight: number;
  private readonly fontSize: number;
  private readonly width: number;
  private readonly height: number;
  private readonly items: { text: string; callback: () => void }[];

  public get displayObject(): Phaser.GameObjects.Container {
    return this.container;
  }

  constructor(scene: Phaser.Scene, props: ScrollListProps) {
    this.scene = scene;
    this.width = props.width;
    this.height = props.height;
    this.items = props.items;
    this.fontSize = props.fontSize || 16;
    this.itemHeight = props.itemHeight || 24;
    this.textItems = [];

    // Create container at (0,0) (top-left)
    this.container = new Phaser.GameObjects.Container(scene, 0, 0);
    this.container.setScrollFactor(0);
    
    // Create outline (full rectangle)
    this.outline = new Phaser.GameObjects.Graphics(scene);
    this.outline.setScrollFactor(0);
    this.outline.lineStyle(1, 0xffffff, 1);
    this.outline.strokeRect(0, 0, this.width, this.height);
    this.container.add(this.outline);

    // Create mask for clipping (not added to container)
    const maskGraphics = new Phaser.GameObjects.Graphics(scene);
    maskGraphics.setScrollFactor(0);
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(0, 0, this.width, this.height);
    this.mask = new Phaser.Display.Masks.GeometryMask(scene, maskGraphics);

    // Create scroll buttons (right side, inside the box)
    this.scrollUpButton = new Phaser.GameObjects.Text(scene, this.width - 16, 16, 'v', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '28px',
      color: '#ffffff'
    });
    this.scrollUpButton.setOrigin(0.5, 0.5);
    this.scrollUpButton.setScrollFactor(0);
    this.scrollUpButton.setRotation(Math.PI); // Flip upside down
    this.scrollUpButton.setInteractive({ useHandCursor: true });
    this.scrollUpButton.on('pointerover', () => {
      this.scrollUpButton.setColor('#ffe066');
      this.scene.tweens.add({
        targets: this.scrollUpButton,
        scale: 1.2,
        duration: 120,
        ease: 'Sine.easeOut'
      });
    });
    this.scrollUpButton.on('pointerout', () => {
      this.scrollUpButton.setColor('#ffffff');
      this.scene.tweens.add({
        targets: this.scrollUpButton,
        scale: 1,
        duration: 120,
        ease: 'Sine.easeIn'
      });
    });
    this.scrollUpButton.on('pointerdown', () => {
      this.scroll(-this.itemHeight);
    });
    this.container.add(this.scrollUpButton);

    this.scrollDownButton = new Phaser.GameObjects.Text(scene, this.width - 16, this.height - 16, 'v', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '28px',
      color: '#ffffff'
    });
    this.scrollDownButton.setOrigin(0.5, 0.5);
    this.scrollDownButton.setScrollFactor(0);
    this.scrollDownButton.setInteractive({ useHandCursor: true });
    this.scrollDownButton.on('pointerover', () => {
      this.scrollDownButton.setColor('#ffe066');
      this.scene.tweens.add({
        targets: this.scrollDownButton,
        scale: 1.2,
        duration: 120,
        ease: 'Sine.easeOut'
      });
    });
    this.scrollDownButton.on('pointerout', () => {
      this.scrollDownButton.setColor('#ffffff');
      this.scene.tweens.add({
        targets: this.scrollDownButton,
        scale: 1,
        duration: 120,
        ease: 'Sine.easeIn'
      });
    });
    this.scrollDownButton.on('pointerdown', () => {
      this.scroll(this.itemHeight);
    });
    this.container.add(this.scrollDownButton);

    // Create items
    this.createItems();

    // Set mask on container (DISABLED FOR DEBUGGING)
    // this.container.setMask(this.mask);
  }

  private createItems(): void {
    // Clear existing items
    this.textItems.forEach(item => item.destroy());
    this.textItems = [];

    // Create new items
    this.items.forEach((item, index) => {
      const text = new Phaser.GameObjects.Text(this.scene, 8, (index * this.itemHeight) + this.scrollY + this.itemHeight/2, item.text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: `${this.fontSize}px`,
        color: '#ffffff'
      });
      text.setOrigin(0, 0.5);
      text.setScrollFactor(0);
      text.setInteractive({ useHandCursor: true });
      
      text.on('pointerover', () => {
        text.setColor('#ffe066');
      });
      
      text.on('pointerout', () => {
        text.setColor('#ffffff');
      });
      
      text.on('pointerdown', () => {
        item.callback();
      });

      this.container.add(text);
      this.textItems.push(text);
    });
  }

  private scroll(deltaY: number): void {
    const totalHeight = this.items.length * this.itemHeight;
    const maxScroll = Math.max(0, totalHeight - this.height);
    
    this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY, -maxScroll, 0);
    this.createItems();
  }

  show(props: { x: number; y: number }) {
    this.container.setPosition(0, 0);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy();
  }
} 