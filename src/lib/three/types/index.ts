// Building texture configuration
export interface BuildingTexture {
  texturePath: string;
  type: 'map' | 'normalMap' | 'roughnessMap' | 'metalnessMap' | 'emissiveMap' | 'aoMap';
  repeat?: [number, number];
  offset?: [number, number];
  rotation?: number;
  intensity?: number; // For emissive maps
}

// Building placement configuration
export interface BuildingPlacement {
  modelPath: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  textures?: BuildingTexture[];
}

// Light position configuration
export interface LightPosition {
  x: number;
  z: number;
  rotation: number;
}

// Ground configuration
export interface GroundConfig {
  enabled: boolean;
  size: number;
  color: number;
  roughness: number;
  includeRoads: boolean;
  roadColor: number;
}

// Street light configuration
export interface StreetLightConfig {
  enabled: boolean;
  positions?: LightPosition[];
  intensity: number;
  distance: number;
  color: number;
  shadowResolution: number;
}

// Lighting configuration
export interface LightingConfig {
  ambient: {
    enabled: boolean;
    color: number;
    intensity: number;
  };
  directional: {
    enabled: boolean;
    color: number;
    intensity: number;
    position: [number, number, number];
    shadowEnabled: boolean;
    shadowResolution: number;
  };
  fill: {
    enabled: boolean;
    color: number;
    intensity: number;
    position: [number, number, number];
  };
  fog: {
    enabled: boolean;
    color: number;
    density: number;
  };
}

// Environment configuration
export interface EnvironmentConfig {
  ground: GroundConfig;
  streetLights: StreetLightConfig;
  lighting: LightingConfig;
}

// City configuration
export interface CityConfig {
  buildings: BuildingPlacement[];
  environment: EnvironmentConfig;
}