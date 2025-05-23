import Phaser from 'phaser';

interface ButtonProps {
  x: number;
  y: number;
  fontSize: number;
  text: string;
  color: number; // hex
  padding?: number;
}

type ButtonCallback = () => void;

export class ButtonComponent {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private callback: ButtonCallback;
  private width: number;
  private height: number;
  private padding: number;
  private fontSize: number;
  private color: number;
  private text: string;
  private emboss: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, text: string, fontSize: number, color: number, callback: ButtonCallback, padding = 16) {
    this.scene = scene;
    this.text = text;
    this.fontSize = fontSize;
    this.color = color;
    this.callback = callback;
    this.padding = padding;

    // Create label first to measure size
    this.label = new Phaser.GameObjects.Text(scene, 0, 0, text, {
      fontFamily: 'Arial, "Press Start 2P", monospace',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#222',
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000',
        blur: 4,
        fill: true
      }
    });
    this.label.setOrigin(0.5, 0.5);
    this.width = this.label.width + this.padding * 2;
    this.height = this.label.height + this.padding * 1.5;

    // Shadow for 3D effect (soft, blurred)
    this.shadow = new Phaser.GameObjects.Rectangle(scene, 0, 6, this.width, this.height, 0x000000, 0.18);
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setStrokeStyle();

    // Button background with dynamic gradient based on color
    const bgGfx = scene.add.graphics();
    // Calculate lighter color for the top of the gradient
    const baseColor = Phaser.Display.Color.IntegerToColor(color);
    const lighterColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      baseColor,
      new Phaser.Display.Color(255, 255, 255),
      100,
      40 // percent lighter
    );
    const lighterHex = Phaser.Display.Color.GetColor(lighterColor.r, lighterColor.g, lighterColor.b);
    // Draw vertical gradient by filling horizontal lines
    for (let i = 0; i < this.height; i++) {
      const t = i / (this.height - 1);
      const r = Phaser.Math.Interpolation.Linear([lighterColor.r, baseColor.red], t);
      const g = Phaser.Math.Interpolation.Linear([lighterColor.g, baseColor.green], t);
      const b = Phaser.Math.Interpolation.Linear([lighterColor.b, baseColor.blue], t);
      const lineColor = Phaser.Display.Color.GetColor(r, g, b);
      bgGfx.fillStyle(lineColor, 1);
      bgGfx.fillRoundedRect(0, i, this.width, 1, 10);
    }
    // Draw border
    bgGfx.lineStyle(2, 0x3a7bd5, 0.7);
    bgGfx.strokeRoundedRect(0, 0, this.width, this.height, 10);
    // Generate texture and use as background
    const texKey = `button-gradient-${color}-${this.width}x${this.height}`;
    bgGfx.generateTexture(texKey, this.width, this.height);
    bgGfx.destroy();
    this.bg = new Phaser.GameObjects.Image(scene, 0, 0, texKey);
    this.bg.setDisplaySize(this.width, this.height);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setAlpha(1);

    // Embossed effect: subtle highlight at the top
    this.emboss = new Phaser.GameObjects.Graphics(scene);
    this.emboss.lineStyle(2, 0xffffff, 0.18);
    this.emboss.beginPath();
    this.emboss.moveTo(-this.width/2 + 8, -this.height/2 + 8);
    this.emboss.lineTo(this.width/2 - 8, -this.height/2 + 8);
    this.emboss.strokePath();

    // Container (do not add to scene directly)
    this.container = new Phaser.GameObjects.Container(scene, 0, 0, [this.shadow, this.bg, this.emboss, this.label]);
    this.container.setSize(this.width, this.height);
    this.container.setInteractive(new Phaser.Geom.Rectangle(-this.width/2, -this.height/2, this.width, this.height), Phaser.Geom.Rectangle.Contains);
    this.container.setScrollFactor(0);
    this.container.setAlpha(1);
    this.container.setVisible(false);

    // Hover effect
    this.container.on('pointerover', () => {
      this.bg.setAlpha(0.96);
      this.label.setColor('#ffe066');
      this.scene.tweens.add({ targets: this.container, scale: 1.04, duration: 100, ease: 'Sine.easeOut' });
    });
    this.container.on('pointerout', () => {
      this.bg.setAlpha(1);
      this.label.setColor('#ffffff');
      this.scene.tweens.add({ targets: this.container, scale: 1, duration: 100, ease: 'Sine.easeIn' });
    });
    // Pressed effect
    this.container.on('pointerdown', () => {
      this.scene.tweens.add({ targets: this.container, y: "+=3", scale: 0.97, duration: 60, ease: 'Sine.easeInOut' });
      this.shadow.setY(2); // shrink shadow
      this.bg.setAlpha(0.92);
    });
    this.container.on('pointerup', () => {
      this.scene.tweens.add({ targets: this.container, y: "-=3", scale: 1, duration: 80, ease: 'Sine.easeInOut' });
      this.shadow.setY(6); // restore shadow
      this.bg.setAlpha(1);
      if (this.callback) this.callback();
    });
  }

  show(props: { x: number; y: number }) {
    // Position is relative to the parent container (the window), not the scene
    this.container.setPosition(props.x, props.y);
    this.container.setVisible(true);
    this.container.setAlpha(1);
    this.container.setScrollFactor(0); // Make button fixed to screen like other UI elements
  }
  hide() {
    this.container.setVisible(false);
  }
  destroy() {
    this.container.destroy();
  }
  get displayObject() {
    return this.container;
  }
} 