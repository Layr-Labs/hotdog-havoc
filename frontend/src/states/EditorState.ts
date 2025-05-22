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
  private cameraOffsetX: number = 0;
  private readonly LEVEL_WIDTH_BLOCKS = 200;
  private readonly BLOCK_SIZE = 16;

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
    this.scene.input.keyboard.on('keydown-LEFT', () => this.scrollCamera(-1), this);
    this.scene.input.keyboard.on('keydown-RIGHT', () => this.scrollCamera(1), this);
    // Mouse wheel scroll
    this.scene.game.canvas.addEventListener('wheel', this.handleWheelScroll, { passive: false });
  }

  protected onUpdate(): void {
    // No need to update here, handled by events
  }

  protected onDestroy(): void {
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.coordText) this.coordText.destroy();
    if (this.gridGraphics) this.gridGraphics.destroy();
    if (this.blockGraphics) this.blockGraphics.destroy();
    if (this.soilTileSprite) this.soilTileSprite.destroy();
    if (this.maskRenderTexture) this.maskRenderTexture.destroy();
    this.scene.input.off('pointermove', this.updateCoordDisplay, this);
    this.scene.input.off('pointerdown', this.handleBlockPointerDown, this);
    this.scene.input.off('pointermove', this.handleBlockPointerMove, this);
    this.scene.input.off('pointerup', this.handleBlockPointerUp, this);
    this.scene.scale.off('resize', this.handleResize, this);
    this.blocks.clear();
    // Remove mouse wheel scroll
    this.scene.game.canvas.removeEventListener('wheel', this.handleWheelScroll as EventListener);
  }

  private handleBlockPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.shouldIgnoreNextClick) {
      this.shouldIgnoreNextClick = false;
      return;
    }
    this.isDrawing = true;
    const deleteMode = pointer.event.shiftKey;
    this.addBlockAtPointer(pointer, deleteMode);
  }

  private handleBlockPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isDrawing) {
      const deleteMode = pointer.event.shiftKey;
      this.addBlockAtPointer(pointer, deleteMode);
    }
  }

  private handleBlockPointerUp(pointer: Phaser.Input.Pointer): void {
    this.isDrawing = false;
  }

  private addBlockAtPointer(pointer: Phaser.Input.Pointer, deleteMode = false): void {
    const blockX = Math.floor((pointer.x + this.cameraOffsetX) / this.BLOCK_SIZE);
    const blockY = Math.floor((this.scene.scale.height - pointer.y) / this.BLOCK_SIZE);
    const blockKey = `${blockX},${blockY}`;
    if (deleteMode) {
      if (this.blocks.has(blockKey)) {
        this.blocks.delete(blockKey);
        this.drawBlocks();
      }
    } else {
      if (!this.blocks.has(blockKey)) {
        this.blocks.add(blockKey);
        this.drawBlocks();
      }
    }
  }

  private drawBlocks(): void {
    if (!this.maskRenderTexture || !this.grassRenderTexture) return;
    this.maskRenderTexture.clear();
    this.grassRenderTexture.clear();
    for (const key of this.blocks) {
      const [blockX, blockY] = key.split(',').map(Number);
      // Convert world (block) coordinates to screen coordinates
      const screenX = blockX * this.BLOCK_SIZE - this.cameraOffsetX;
      const screenY = this.scene.scale.height - (blockY + 1) * this.BLOCK_SIZE;
      if (screenX + this.BLOCK_SIZE < 0 || screenX > this.scene.scale.width) continue; // Only draw visible blocks
      this.maskRenderTexture.fill(0xffffff, 1, screenX, screenY, this.BLOCK_SIZE, this.BLOCK_SIZE);
      const aboveKey = `${blockX},${blockY+1}`;
      if (!this.blocks.has(aboveKey)) {
        this.grassRenderTexture.fill(0xffffff, 1, screenX, screenY - this.BLOCK_SIZE, this.BLOCK_SIZE, this.BLOCK_SIZE);
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
    // Vertical lines (only for visible part)
    const startBlock = Math.floor(this.cameraOffsetX / this.BLOCK_SIZE);
    const endBlock = Math.ceil((this.cameraOffsetX + width) / this.BLOCK_SIZE);
    for (let x = startBlock; x <= endBlock; x++) {
      const screenX = x * this.BLOCK_SIZE - this.cameraOffsetX;
      grid.beginPath();
      grid.moveTo(screenX, 0);
      grid.lineTo(screenX, height);
      grid.strokePath();
    }
    // Horizontal lines
    const yOffset = height % this.BLOCK_SIZE;
    for (let y = yOffset; y <= height; y += this.BLOCK_SIZE) {
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
    this.updateTileSpriteOffsets();
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
    const blockX = Math.floor((pointer.x + this.cameraOffsetX) / this.BLOCK_SIZE);
    const blockY = Math.floor((this.scene.scale.height - pointer.y) / this.BLOCK_SIZE);
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

  private scrollCamera(direction: -1 | 1) {
    const maxOffset = this.LEVEL_WIDTH_BLOCKS * this.BLOCK_SIZE - this.scene.scale.width;
    const newOffset = Phaser.Math.Clamp(this.cameraOffsetX + direction * 64, 0, Math.max(0, maxOffset));
    this.scene.tweens.add({
      targets: this,
      cameraOffsetX: newOffset,
      duration: 300,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.updateTileSpriteOffsets();
        this.drawGrid();
        this.drawBlocks();
      }
    });
  }

  private handleWheelScroll = (event: WheelEvent) => {
    const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    if (delta !== 0) {
      event.preventDefault();
      const maxOffset = this.LEVEL_WIDTH_BLOCKS * this.BLOCK_SIZE - this.scene.scale.width;
      this.cameraOffsetX = Phaser.Math.Clamp(this.cameraOffsetX + delta, 0, Math.max(0, maxOffset));
      this.updateTileSpriteOffsets();
      this.drawGrid();
      this.drawBlocks();
    }
  }

  private updateTileSpriteOffsets(): void {
    if (this.soilTileSprite) {
      this.soilTileSprite.tilePositionX = this.cameraOffsetX;
      this.soilTileSprite.tilePositionY = -this.scene.scale.height % 256;
    }
    if (this.grassTileSprite) this.grassTileSprite.tilePositionX = this.cameraOffsetX;
  }
}