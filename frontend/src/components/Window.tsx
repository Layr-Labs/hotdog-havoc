import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface WindowProps {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollFactor?: number;
}

export class Window {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private closeButton: Phaser.GameObjects.Text | null = null;
  private visible: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private windowWidth: number = 0;
  private windowHeight: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
  }

  show(props: WindowProps) {
    const { x, y, width, height, scrollFactor = 0 } = props;
    
    // Calculate the top-left corner based on center position
    this.startX = x - (width / 2);
    this.startY = y - (height / 2);
    this.windowWidth = width;
    this.windowHeight = height;

    this.graphics.clear();
    
    // Draw semi-transparent black background
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(this.startX, this.startY, width, height);
    
    // Draw white border
    this.graphics.lineStyle(1, 0xffffff, 1);
    this.graphics.strokeRect(this.startX, this.startY, width, height);
    
    this.graphics.setScrollFactor(scrollFactor);
    this.visible = true;

    // Create close button
    if (this.closeButton) {
      this.closeButton.destroy();
    }
    const padding = 16; // Equal padding for top and right
    this.closeButton = this.scene.add.text(this.startX + width - padding, this.startY + padding, 'X', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    });
    this.closeButton.setOrigin(0.5, 0.5);
    this.closeButton.setScrollFactor(scrollFactor);
    this.closeButton.setInteractive({ useHandCursor: true });

    // Add hover effects
    this.closeButton.on('pointerover', () => {
      if (this.closeButton) {
        this.closeButton.setColor('#ffe066');
        this.scene.tweens.add({
          targets: this.closeButton,
          scale: 1.2,
          duration: 120,
          ease: 'Sine.easeOut'
        });
      }
    });

    this.closeButton.on('pointerout', () => {
      if (this.closeButton) {
        this.closeButton.setColor('#ffffff');
        this.scene.tweens.add({
          targets: this.closeButton,
          scale: 1,
          duration: 120,
          ease: 'Sine.easeIn'
        });
      }
    });

    this.closeButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.closeButton) {
        this.scene.tweens.add({
          targets: this.closeButton,
          scale: 0.9,
          duration: 80,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      }
      // Prevent the click from being processed by other handlers
      pointer.event.preventDefault();
      pointer.event.stopImmediatePropagation();
      this.hide();
    });
  }

  hide() {
    this.graphics.clear();
    if (this.closeButton) {
      this.closeButton.destroy();
      this.closeButton = null;
    }
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  isClickOnCloseButton(x: number, y: number): boolean {
    if (!this.closeButton || !this.visible) return false;
    return this.closeButton.getBounds().contains(x, y);
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.startX,
      this.startY,
      this.windowWidth,
      this.windowHeight
    );
  }

  destroy() {
    this.graphics.destroy();
    if (this.closeButton) {
      this.closeButton.destroy();
    }
  }
} 