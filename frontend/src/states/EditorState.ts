import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';

interface Block {
  x: number;
  y: number;
}

export class EditorState extends BaseState {
  private backButton: Phaser.GameObjects.Text | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private coordText: Phaser.GameObjects.Text | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private blocks: Set<string> = new Set(); // Using string keys like "x,y" for easy lookup
  private shouldIgnoreNextClick: boolean = true;
  private isDrawing: boolean = false;
  private blockGraphics: Phaser.GameObjects.Graphics | null = null;
  private soilTileSprite: Phaser.GameObjects.TileSprite | null = null;
  private grassTileSprite: Phaser.GameObjects.TileSprite | null = null;
  private maskRenderTexture: Phaser.GameObjects.RenderTexture | null = null;
  private grassRenderTexture: Phaser.GameObjects.RenderTexture | null = null;

  protected onCreate(): void {
    this.shouldIgnoreNextClick = true;
    this.setupBackground();
    this.drawGrid();
    this.setupBackButton();
    this.setupCoordDisplay();
    this.setupSoilAndMask();
    this.scene.input.on('pointermove', this.updateCoordDisplay, this);
    this.scene.input.on('pointerdown', this.handleBlockPointerDown, this);
    this.scene.input.on('pointermove', this.handleBlockPointerMove, this);
    this.scene.input.on('pointerup', this.handleBlockPointerUp, this);
    this.scene.scale.on('resize', this.handleResize, this);
  }

  protected onUpdate(): void {
    // No need to update here, handled by events
  }

  protected onDestroy(): void {
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.coordText) this.coordText.destroy();
    if (this.gridGraphics) this.gridGraphics.destroy();
    if (this.soilTileSprite) this.soilTileSprite.destroy();
    if (this.maskRenderTexture) this.maskRenderTexture.destroy();
    this.scene.input.off('pointermove', this.updateCoordDisplay, this);
    this.scene.input.off('pointerdown', this.handleBlockPointerDown, this);
    this.scene.input.off('pointermove', this.handleBlockPointerMove, this);
    this.scene.input.off('pointerup', this.handleBlockPointerUp, this);
    this.scene.scale.off('resize', this.handleResize, this);
    this.blocks.clear();
  }

  private handleBlockPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.shouldIgnoreNextClick) {
      this.shouldIgnoreNextClick = false;
      return;
    }
    this.isDrawing = true;
    this.addBlockAtPointer(pointer);
  }

  private handleBlockPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isDrawing) {
      this.addBlockAtPointer(pointer);
    }
  }

  private handleBlockPointerUp(pointer: Phaser.Input.Pointer): void {
    this.isDrawing = false;
  }

  private addBlockAtPointer(pointer: Phaser.Input.Pointer): void {
    const blockX = Math.floor(pointer.x / 16);
    const blockY = Math.floor((this.scene.scale.height - pointer.y) / 16);
    const blockKey = `${blockX},${blockY}`;
    if (!this.blocks.has(blockKey)) {
      this.blocks.add(blockKey);
      this.drawBlocks();
    }
  }

  private drawBlocks(): void {
    if (!this.maskRenderTexture || !this.grassRenderTexture) return;
    this.maskRenderTexture.clear();
    this.grassRenderTexture.clear();
    // Draw white rectangles for each block (revealing soil)
    for (const key of this.blocks) {
      const [blockX, blockY] = key.split(',').map(Number);
      // Convert world (block) coordinates to screen coordinates
      const screenX = blockX * 16;
      const screenY = this.scene.scale.height - (blockY + 1) * 16;
      this.maskRenderTexture.fill(0xffffff, 1, screenX, screenY, 16, 16);

      // check to see if the block above this one is empty, and if it is, add
      // grass by calling fill on grassRenderTexture  
      const aboveKey = `${blockX},${blockY+1}`;
      if (!this.blocks.has(aboveKey)) {
        this.grassRenderTexture.fill(0xffffff, 1, screenX, screenY - 16, 16, 16);
      }
    }
  }

  private setupBackground(): void {
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.addGameObject(this.bgImage);
    }
  }

  private drawGrid(): void {
    if (this.gridGraphics) this.gridGraphics.destroy();
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const grid = this.scene.add.graphics();
    grid.setDepth(-50);
    grid.lineStyle(1, 0x9b59b6, 0.25);
    for (let x = 0; x <= width; x += 16) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
      grid.strokePath();
    }
    // Anchor horizontal lines to world (0,0) at the bottom
    const yOffset = height % 16;
    for (let y = yOffset; y <= height; y += 16) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(width, y);
      grid.strokePath();
    }
    this.gridGraphics = grid;
    this.addGameObject(grid);
  }

  private handleResize(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Recreate background gradient
    if (this.bgImage) {
      this.bgImage.destroy();
    }
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.bgImage.setSize(width, height);
      this.addGameObject(this.bgImage);
    }

    // Destroy and null out soil, grass, and render textures
    if (this.soilTileSprite) {
      this.soilTileSprite.destroy();
      this.soilTileSprite = null;
    }
    if (this.grassTileSprite) {
      this.grassTileSprite.destroy();
      this.grassTileSprite = null;
    }
    if (this.maskRenderTexture) {
      this.maskRenderTexture.destroy();
      this.maskRenderTexture = null;
    }
    if (this.grassRenderTexture) {
      this.grassRenderTexture.destroy();
      this.grassRenderTexture = null;
    }

    // Re-setup soil, grass, and masks
    this.setupSoilAndMask();

    // Redraw grid first
    this.drawGrid();

    // Redraw blocks and masks after all resizing/clearing
    this.drawBlocks();

    // Update back button position
    if (this.backButton) {
      this.backButton.setX(width - 32);
    }
  }

  private setupBackButton(): void {
    this.backButton = this.scene.add.text(this.scene.scale.width - 32, 24, 'Back', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#fff',
      align: 'right',
    });
    this.addGameObject(this.backButton);
    this.backButton.setOrigin(1, 0);
    this.backButton.setInteractive({ useHandCursor: true });
    this.backButton.on('pointerover', () => {
      if (this.backButton) {
        this.backButton.setColor('#ffe066');
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 1.12, 
          duration: 120, 
          ease: 'Sine.easeOut' 
        });
      }
    });
    this.backButton.on('pointerout', () => {
      if (this.backButton) {
        this.backButton.setColor('#fff');
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 1, 
          duration: 120, 
          ease: 'Sine.easeIn' 
        });
      }
    });
    this.backButton.on('pointerdown', () => {
      this.scene.tweens.add({ 
        targets: this.backButton, 
        scale: 0.95, 
        duration: 80, 
        yoyo: true, 
        ease: 'Sine.easeInOut' 
      });
      GameEventEmitter.emit({
        type: GameEventType.STATE_CHANGE,
        data: { state: GameStateType.MENU }
      });
    });
  }

  private setupCoordDisplay(): void {
    this.coordText = this.scene.add.text(16, 16, '(0, 0)', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#fff',
      align: 'left',
      backgroundColor: 'rgba(0,0,0,0.3)'
    });
    this.coordText.setOrigin(0, 0);
    this.coordText.setDepth(20);
    this.addGameObject(this.coordText);
  }

  private updateCoordDisplay(pointer: Phaser.Input.Pointer): void {
    if (!this.coordText) return;
    const blockX = Math.floor(pointer.x / 16);
    const blockY = Math.floor((this.scene.scale.height - pointer.y) / 16);
    this.coordText.setText(`(${blockX}, ${blockY})`);
  }

  private setupSoilAndMask(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Create the soil TileSprite and the grass TileSprite
    this.soilTileSprite = this.scene.add.tileSprite(0, 0, width, height, 'soil1')
      .setOrigin(0)
      .setDepth(-40);
    this.grassTileSprite  = this.scene.add.tileSprite(0, this.scene.scale.height % 16, width, height, 'grass')
      .setOrigin(0)
      .setDepth(-39);

    // Create the mask RenderTexture
    this.maskRenderTexture = this.scene.make.renderTexture({ width, height }, false).setOrigin(0);
    this.grassRenderTexture = this.scene.make.renderTexture({ width, height }, false).setOrigin(0);

    // Create and apply the mask
    const mask = this.maskRenderTexture.createBitmapMask();
    this.soilTileSprite.setMask(mask);
    const mask2 = this.grassRenderTexture.createBitmapMask();
    this.grassTileSprite.setMask(mask2);

    this.addGameObject(this.soilTileSprite);
    this.addGameObject(this.grassTileSprite);
  }
}