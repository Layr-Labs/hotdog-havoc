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
  private readonly WORLD_WIDTH = 3200; // 200 blocks * 16px
  private readonly BLOCK_SIZE = 16;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private readonly TILEMAP_HEIGHT = 50; // Adjust as needed
  private soilTileIndex: number = 0;

  protected onCreate(): void {
    this.shouldIgnoreNextClick = true;
    this.setupBackground();
    this.drawGrid();
    this.setupBackButton();
    this.setupCoordDisplay();
    this.setupTilemap();
    this.scene.input.on('pointermove', this.updateCoordDisplay, this);
    this.scene.input.on('pointerdown', this.handleBlockPointerDown, this);
    this.scene.input.on('pointermove', this.handleBlockPointerMove, this);
    this.scene.input.on('pointerup', this.handleBlockPointerUp, this);
    this.scene.scale.on('resize', this.handleResize, this);
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.on('keydown-LEFT', () => this.scrollCamera(-1), this);
      this.scene.input.keyboard.on('keydown-RIGHT', () => this.scrollCamera(1), this);
    }
    // Mouse wheel scroll
    if (this.scene.game.canvas) {
      this.scene.game.canvas.addEventListener('wheel', this.handleWheelScroll, { passive: false });
    }

    // Set up camera bounds
    const height = this.scene.scale.height;
    this.scene.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, height);
    this.scene.cameras.main.scrollX = this.cameraOffsetX;
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

  private getSoilTileIndex(x: number, y: number): number {
    // 16x16 tiles in the 256x256 texture
    return this.soilTileIndex + (y % 16) * 16 + (x % 16);
  }

  private addBlockAtPointer(pointer: Phaser.Input.Pointer, deleteMode = false): void {
    if (!this.tilemap || !this.layer) return;
    const blockX = Math.floor((pointer.x + this.cameraOffsetX) / this.BLOCK_SIZE);
    const blockY = Math.floor((pointer.y - this.layer.y) / this.BLOCK_SIZE);
    if (deleteMode) {
      this.layer.removeTileAt(blockX, blockY);
    } else {
      this.layer.putTileAt(this.getSoilTileIndex(blockX, blockY), blockX, blockY);
    }
  }

  private setupBackground(): void {
    if (this.bgImage) this.bgImage.destroy();
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.bgImage.setScrollFactor(0);
      this.bgImage.setDepth(-100);
      this.addGameObject(this.bgImage);
    }
  }

  private drawGrid(): void {
    if (this.gridGraphics) this.gridGraphics.destroy();
    const width = this.WORLD_WIDTH;
    const height = this.scene.scale.height;
    const grid = this.scene.add.graphics();
    grid.setDepth(-50);
    grid.lineStyle(1, 0x9b59b6, 0.25);
    // Vertical lines for the whole world
    for (let x = 0; x <= width; x += this.BLOCK_SIZE) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
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
      this.bgImage.setScrollFactor(0);
      this.bgImage.setDepth(-100);
      this.addGameObject(this.bgImage);
    }

    // Re-setup tilemap
    this.setupTilemap();
    // If layer exists, anchor it to the bottom after resize
    if (this.layer) {
      this.layer.y = this.scene.scale.height - (this.TILEMAP_HEIGHT * this.BLOCK_SIZE);
    }

    // Redraw grid first
    this.drawGrid();

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
    this.backButton.setScrollFactor(0);
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
    this.coordText.setScrollFactor(0);
    this.addGameObject(this.coordText);
  }

  private updateCoordDisplay(pointer: Phaser.Input.Pointer): void {
    if (!this.coordText || !this.layer) return;
    const blockX = Math.floor((pointer.x + this.cameraOffsetX) / this.BLOCK_SIZE);
    const blockY = Math.floor((pointer.y - this.layer.y) / this.BLOCK_SIZE);
    this.coordText.setText(`(${blockX}, ${blockY})`);
  }

  private setupTilemap(): void {
    // Save current soil tile positions if layer exists
    let placedBlocks: {x: number, y: number}[] = [];
    if (this.layer) {
      for (let x = 0; x < this.WORLD_WIDTH / this.BLOCK_SIZE; x++) {
        for (let y = 0; y < this.TILEMAP_HEIGHT; y++) {
          const tile = this.layer.getTileAt(x, y);
          if (tile && tile.index >= this.soilTileIndex && tile.index < this.soilTileIndex + 256) {
            placedBlocks.push({x, y});
          }
        }
      }
    }
    // Remove old tilemap/layer if any
    if (this.layer) this.layer.destroy();
    if (this.tilemap) this.tilemap.destroy();
    // Create a blank tilemap
    this.tilemap = this.scene.make.tilemap({
      tileWidth: this.BLOCK_SIZE,
      tileHeight: this.BLOCK_SIZE,
      width: this.WORLD_WIDTH / this.BLOCK_SIZE,
      height: this.TILEMAP_HEIGHT,
    });
    // Add only the soil tileset
    const soilTileset = this.tilemap.addTilesetImage('soil1', undefined, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0);
    if (!soilTileset) return;
    // Create a blank layer with only soil
    this.layer = this.tilemap.createBlankLayer('layer1', [soilTileset], 0, 0);
    if (this.layer) {
      this.layer.setDepth(-20);
      // Anchor the tilemap to the bottom of the screen
      this.layer.y = this.scene.scale.height - (this.TILEMAP_HEIGHT * this.BLOCK_SIZE);
      // Restore placed blocks
      for (const {x, y} of placedBlocks) {
        this.layer.putTileAt(this.getSoilTileIndex(x, y), x, y);
      }
    }
    // Set tile index for soil
    this.soilTileIndex = soilTileset.firstgid;
  }

  private scrollCamera(direction: -1 | 1) {
    const maxOffset = this.WORLD_WIDTH - this.scene.scale.width;
    const newOffset = Phaser.Math.Clamp(this.cameraOffsetX + direction * 64, 0, Math.max(0, maxOffset));
    this.scene.tweens.add({
      targets: this,
      cameraOffsetX: newOffset,
      duration: 300,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.scene.cameras.main.scrollX = this.cameraOffsetX;
      }
    });
  }

  private handleWheelScroll = (event: WheelEvent) => {
    const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    if (delta !== 0) {
      event.preventDefault();
      const maxOffset = this.WORLD_WIDTH - this.scene.scale.width;
      this.cameraOffsetX = Phaser.Math.Clamp(this.cameraOffsetX + delta, 0, Math.max(0, maxOffset));
      this.scene.cameras.main.scrollX = this.cameraOffsetX;
    }
  }

  private updateTileSpriteOffsets(): void {
    if (this.soilTileSprite) {
      this.soilTileSprite.tilePositionY = -this.scene.scale.height % 256;
    }
  }
}