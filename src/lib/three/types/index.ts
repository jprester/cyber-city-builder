// Building placement configuration
export interface BuildingPlacement {
  modelPath: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}

// City configuration
export interface CityConfig {
  buildings: BuildingPlacement[];
}

// Light position configuration
export interface LightPosition {
  x: number;
  z: number;
  rotation: number;
}