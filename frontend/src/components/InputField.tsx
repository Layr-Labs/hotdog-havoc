import Phaser from 'phaser';

interface InputFieldProps {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  scrollFactor?: number;
}

export class InputField {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private text!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Rectangle;
  private cursorBlinkTimer: Phaser.Time.TimerEvent | null = null;
  private value: string = '';
  private isFocused: boolean = false;
  private padding: number = 8;
  private height: number;
  private parent: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.height = 0; // Will be set in show()
  }

  show(props: InputFieldProps) {
    const { x, y, width, fontSize, scrollFactor = 0 } = props;
    this.height = fontSize + (this.padding * 2);

    // Create container for all elements
    this.parent = this.scene.add.container(x, y);
    this.parent.setScrollFactor(scrollFactor);

    // Draw background
    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRoundedRect(-width/2, -this.height/2, width, this.height, 4);
    this.parent.add(this.graphics);

    // Create text object
    this.text = this.scene.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${fontSize}px`,
      color: '#000000',
      align: 'left'
    });
    this.text.setOrigin(0, 0.5);
    this.text.setX(-width/2 + this.padding);
    this.parent.add(this.text);

    // Create cursor
    this.cursor = this.scene.add.rectangle(0, 0, 2, fontSize, 0x000000);
    this.cursor.setOrigin(0, 0.5);
    this.cursor.setX(-width/2 + this.padding);
    this.cursor.setVisible(false);
    this.parent.add(this.cursor);

    // Make the input field interactive
    this.parent.setInteractive(new Phaser.Geom.Rectangle(-width/2, -this.height/2, width, this.height), Phaser.Geom.Rectangle.Contains);
    
    // Handle focus
    this.parent.on('pointerdown', () => {
      this.setFocused(true);
    });

    // Handle keyboard input
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.on('keydown', this.handleKeyDown, this);
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.isFocused) return;

    if (event.key === 'Backspace') {
      this.value = this.value.slice(0, -1);
    } else if (event.key === 'Enter') {
      this.setFocused(false);
    } else if (event.key.length === 1) {
      this.value += event.key;
    }

    this.updateText();
  }

  private updateText() {
    this.text.setText(this.value);
    this.cursor.setX(this.text.x + this.text.width);
  }

  private setFocused(focused: boolean) {
    this.isFocused = focused;
    this.cursor.setVisible(focused);

    if (focused) {
      // Start cursor blink
      this.cursorBlinkTimer = this.scene.time.addEvent({
        delay: 500,
        callback: () => {
          this.cursor.setVisible(!this.cursor.visible);
        },
        loop: true
      });
    } else {
      // Stop cursor blink
      if (this.cursorBlinkTimer) {
        this.cursorBlinkTimer.destroy();
        this.cursorBlinkTimer = null;
      }
      this.cursor.setVisible(false);
    }
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string) {
    this.value = value;
    this.updateText();
  }

  hide() {
    if (this.parent) {
      this.parent.destroy();
      this.parent = null;
    }
    this.setFocused(false);
  }

  destroy() {
    this.hide();
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this);
    }
  }
} 