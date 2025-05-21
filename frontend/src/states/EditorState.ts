import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';

interface Floor {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class EditorState extends BaseState {
  private backButton: Phaser.GameObjects.Text | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private coordText: Phaser.GameObjects.Text | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private floorPoints: { x: number; y: number }[] = [];
  private floors: Floor[] = [];
  private endpointCircles: Phaser.GameObjects.Arc[] = [];
  private floorPolygons: Phaser.GameObjects.GameObject[] = [];
  private shouldIgnoreNextPointerDown: boolean = false;

  protected onCreate(): void {
    this.setupBackground();
    this.drawGrid();
    this.setupBackButton();
    this.setupCoordDisplay();
    this.scene.input.on('pointermove', this.updateCoordDisplay, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.scale.on('resize', this.handleResize, this);
    this.shouldIgnoreNextPointerDown = true;
    // Load soil texture if not already loaded
    if (!this.scene.textures.exists('soil1')) {
      this.scene.load.image('soil1', 'src/images/soil1.png');
      this.scene.load.once('complete', () => {
        this.redrawFloors();
      });
      this.scene.load.start();
    }
  }

  protected onUpdate(): void {
    // No need to update here, handled by pointermove event
  }

  protected onDestroy(): void {
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.coordText) this.coordText.destroy();
    if (this.gridGraphics) this.gridGraphics.destroy();
    this.endpointCircles.forEach(c => c.destroy());
    this.floorPolygons.forEach(p => p.destroy());
    this.scene.input.off('pointermove', this.updateCoordDisplay, this);
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.scale.off('resize', this.handleResize, this);
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
    for (let x = 0; x <= width; x += 50) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
      grid.strokePath();
    }
    for (let y = 0; y <= height; y += 50) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(width, y);
      grid.strokePath();
    }
    this.gridGraphics = grid;
    this.addGameObject(grid);
  }

  private handleResize(): void {
    this.drawGrid();
    this.redrawFloors();
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
    const x = Math.round(pointer.x);
    const y = Math.round(this.scene.scale.height - pointer.y);
    this.coordText.setText(`(${x}, ${y})`);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.shouldIgnoreNextPointerDown) {
      this.shouldIgnoreNextPointerDown = false;
      return;
    }
    const x = Math.round(pointer.x);
    const y = Math.round(this.scene.scale.height - pointer.y);
    if (this.floorPoints.length === 0) {
      this.floorPoints.push({ x, y });
      this.drawEndpointCircle(x, y);
    } else if (this.floorPoints.length === 1) {
      this.floorPoints.push({ x, y });
      this.drawEndpointCircle(x, y);
      // Store the floor
      const [p1, p2] = this.floorPoints;
      this.floors.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      this.floorPoints = [];
      this.redrawFloors();
      // Remove endpoint circles after floor is created
      this.endpointCircles.forEach(c => c.destroy());
      this.endpointCircles = [];
    }
  }

  private drawEndpointCircle(x: number, y: number): void {
    const circle = this.scene.add.circle(x, this.scene.scale.height - y, 7, 0xff3333, 1);
    circle.setDepth(10);
    this.endpointCircles.push(circle);
    this.addGameObject(circle);
  }

  private redrawFloors(): void {
    // Remove old polygons
    this.floorPolygons.forEach(p => p.destroy());
    this.floorPolygons = [];
    // Draw all floors
    for (const floor of this.floors) {
      this.drawFloorPolygon(floor);
    }
  }

  private drawFloorPolygon(floor: Floor): void {
    const { x1, y1, x2, y2 } = floor;
    const h = this.scene.scale.height;
    // Convert to Phaser's y-down coordinates
    const p1 = { x: x1, y: h - y1 };
    const p2 = { x: x2, y: h - y2 };
    const p3 = { x: x2, y: h - 0 };
    const p4 = { x: x1, y: h - 0 };
    const points = [p1, p2, p3, p4];

    // Calculate bounding box
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const width = maxX - minX;
    const height = maxY - minY;

    // Create a mask shape in local coordinates, positioned at (0, 0)
    const maskGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.beginPath();
    maskGraphics.moveTo(points[0].x - minX, points[0].y - minY);
    for (let i = 1; i < points.length; i++) {
      maskGraphics.lineTo(points[i].x - minX, points[i].y - minY);
    }
    maskGraphics.closePath();
    maskGraphics.fillPath();

    // Create a RenderTexture to draw the soil texture
    const rt = this.scene.make.renderTexture({ x: minX, y: minY, width: width, height: height });

    // Draw a fallback color with alpha for debugging
    const fallback = this.scene.add.graphics();
    fallback.fillStyle(0x8d6748, 0.5);
    fallback.fillRect(0, 0, width, height);
    rt.draw(fallback, 0, 0);
    fallback.destroy();

    // Draw the soil texture tiled
    if (this.scene.textures.exists('soil1')) {
      const soilFrame = this.scene.textures.get('soil1').getSourceImage() as HTMLImageElement;
      const tileW = soilFrame.width;
      const tileH = soilFrame.height;
      for (let tx = 0; tx < width; tx += tileW) {
        for (let ty = 0; ty < height; ty += tileH) {
          rt.draw('soil1', tx, ty);
        }
      }
    }

    // Apply the mask (mask graphics at 0,0, render texture at minX,minY)
    rt.setMask(maskGraphics.createGeometryMask());
    rt.setDepth(5);
    this.scene.add.existing(rt);
    this.floorPolygons.push(rt);
    this.addGameObject(rt);
    maskGraphics.destroy();

    // Optionally, draw an outline for the polygon
    const outline = this.scene.add.graphics();
    outline.lineStyle(2, 0x000000, 0.5);
    outline.beginPath();
    outline.moveTo(p1.x, p1.y);
    outline.lineTo(p2.x, p2.y);
    outline.lineTo(p3.x, p3.y);
    outline.lineTo(p4.x, p4.y);
    outline.closePath();
    outline.strokePath();
    outline.setDepth(6);
    this.floorPolygons.push(outline);
    this.addGameObject(outline);
  }
} 