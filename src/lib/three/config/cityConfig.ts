import type { CityConfig } from "../types";

/**
 * Default city configuration with building placements and environment settings
 */
export const cityConfig: CityConfig = {
  // Building configurations
  buildings: [
    {
      modelPath: "./src/assets/cyberpunk-apartment-building.glb",
      position: [14, 15, 12],
      scale: [30, 30, 30],
      rotation: [0, 0, 0],
    },
    // Uncomment these to add more buildings
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [12, 0, 0],
    //   scale: [0.8, 1.2, 0.8],
    //   rotation: [0, Math.PI/4, 0]
    // },
  ],
  
  // Environment configurations
  environment: {
    // Ground configuration
    ground: {
      enabled: true,
      size: 100,
      color: 0x222222,
      roughness: 0.8,
      includeRoads: true,
      roadColor: 0x333333
    },
    
    // Street lights configuration
    streetLights: {
      enabled: true,
      intensity: 1,
      distance: 15,
      color: 0xffffcc,
      shadowResolution: 512,
      positions: [
        { x: -12, z: -6, rotation: 0 },
        { x: 0, z: -6, rotation: 0 },
        { x: 12, z: -6, rotation: 0 },
        { x: -12, z: 6, rotation: 0 },
        { x: 0, z: 6, rotation: 0 },
        { x: 12, z: 6, rotation: 0 },
        { x: -6, z: -12, rotation: Math.PI/2 },
        { x: -6, z: 0, rotation: Math.PI/2 },
        { x: -6, z: 12, rotation: Math.PI/2 },
        { x: 6, z: -12, rotation: Math.PI/2 },
        { x: 6, z: 0, rotation: Math.PI/2 },
        { x: 6, z: 12, rotation: Math.PI/2 }
      ]
    },
    
    // Lighting configuration
    lighting: {
      ambient: {
        enabled: true,
        color: 0x444444,
        intensity: 0.5
      },
      directional: {
        enabled: true,
        color: 0xffffff,
        intensity: 0.8,
        position: [20, 30, 20],
        shadowEnabled: true,
        shadowResolution: 2048
      },
      fill: {
        enabled: true,
        color: 0x8888ff,
        intensity: 0.3,
        position: [-20, 20, -20]
      },
      fog: {
        enabled: true,
        color: 0x090909,
        density: 0.01
      }
    }
  }
};

/**
 * Performance config with reduced quality for better performance
 */
export const performanceConfig: CityConfig = {
  ...cityConfig,
  environment: {
    ...cityConfig.environment,
    streetLights: {
      ...cityConfig.environment.streetLights,
      enabled: false // Disable street lights for performance
    },
    lighting: {
      ...cityConfig.environment.lighting,
      directional: {
        ...cityConfig.environment.lighting.directional,
        shadowResolution: 1024 // Lower shadow resolution
      },
      fog: {
        ...cityConfig.environment.lighting.fog,
        enabled: false // Disable fog for performance
      }
    }
  }
};

/**
 * High quality config for screenshots or powerful machines
 */
export const highQualityConfig: CityConfig = {
  ...cityConfig,
  environment: {
    ...cityConfig.environment,
    lighting: {
      ...cityConfig.environment.lighting,
      directional: {
        ...cityConfig.environment.lighting.directional,
        shadowResolution: 4096 // Higher shadow resolution
      },
      ambient: {
        ...cityConfig.environment.lighting.ambient,
        intensity: 0.3 // Lower ambient for more contrast
      }
    },
    streetLights: {
      ...cityConfig.environment.streetLights,
      shadowResolution: 1024, // Higher resolution shadows
      intensity: 1.5 // Brighter lights
    }
  }
};
