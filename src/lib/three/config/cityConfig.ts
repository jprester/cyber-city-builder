import type { CityConfig } from "../types";

/**
 * Human scale reference (in meters):
 * - Average human height: ~1.75 meters
 * - Average door height: ~2.1 meters
 * - Average floor height: ~3 meters
 * - Average residential building: ~30 meters (10 floors)
 * - Average street width: ~10 meters
 * - Typical street light height: ~5 meters
 * - Distance between street lights: ~20-30 meters
 */

/**
 * Default city configuration with building placements and environment settings
 */
export const cityConfig: CityConfig = {
  // Building configurations
  buildings: [
    {
      modelPath:
        "./src/assets/models/buildings/cyberpunk-apartment-building/cyberpunk-apartment-building.glb",
      position: [20, 22, 14], // Center of the scene
      scale: [45, 45, 45], // Using the model's original scale (assuming it's already in meters)
      rotation: [0, 0, 0],
    },
    {
      modelPath:
        "./src/assets/models/buildings/cyberpunk-building3/cyberpunk-building3.glb",
      position: [-20, 0, 0], // 30 meters to the right (typical city block spacing)
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
      textures: [
        // {
        //   texturePath:
        //     "./src/assets/models/buildings/cyberpunk-building3/textures/cyberpunk-building3-texture.png",
        //   type: "map",
        // },
        // {
        //   texturePath:
        //     "./src/assets/models/buildings/cyberpunk-building3/textures/cyberpunk-building3-texture+emission.png",
        //   type: "emissiveMap",
        // },
      ],
    },
    {
      modelPath: "./src/assets/models/buildings/s01_01/s_01_01.obj",
      position: [-50, 0, 50], // 30 meters to the right (typical city block spacing)
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
      textures: [
        {
          texturePath:
            "./src/assets/models/buildings/s01_01/textures/building_01.jpg",
          type: "map",
        },
      ],
    },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building.glb",
    //   position: [0, 0, 30], // 30 meters forward
    //   scale: [1.1, 0.9, 1.1],
    //   rotation: [0, Math.PI/6, 0]
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [30, 0, 30], // Diagonal from center
    //   scale: [0.9, 1.2, 0.9],
    //   rotation: [0, -Math.PI/4, 0]
    // },
  ],

  // Environment configurations
  environment: {
    // Ground configuration
    ground: {
      enabled: true,
      size: 400, // 200x200 meter ground plane (typical for a few city blocks)
      color: 0x222222,
      roughness: 1,
      includeRoads: true,
      roadColor: 0x333333,
    },

    // Street lights configuration - positioned along streets at human scale
    streetLights: {
      enabled: true,
      intensity: 1,
      distance: 15, // 15 meter light radius (typical street light coverage)
      color: 0xffffcc,
      shadowResolution: 512,
      positions: [
        // Street lights spaced roughly 20 meters apart along roads
        { x: -15, z: -5, rotation: 0 },
        { x: 5, z: -5, rotation: 0 },
        { x: 25, z: -5, rotation: 0 },
        { x: -15, z: 5, rotation: 0 },
        { x: 5, z: 5, rotation: 0 },
        { x: 25, z: 5, rotation: 0 },
        { x: -5, z: -15, rotation: Math.PI / 2 },
        { x: -5, z: 5, rotation: Math.PI / 2 },
        { x: -5, z: 25, rotation: Math.PI / 2 },
        { x: 5, z: -15, rotation: Math.PI / 2 },
        { x: 5, z: 5, rotation: Math.PI / 2 },
        { x: 5, z: 25, rotation: Math.PI / 2 },
      ],
    },

    // Lighting configuration
    lighting: {
      ambient: {
        enabled: true,
        color: 0x444444,
        intensity: 0.5,
      },
      directional: {
        enabled: true,
        color: 0xffffff,
        intensity: 0.8,
        position: [100, 80, 100], // Sun-like positioning, 80 meters high (taller than buildings)
        shadowEnabled: true,
        shadowResolution: 2048,
      },
      fill: {
        enabled: true,
        color: 0x8888ff,
        intensity: 0.3,
        position: [-70, 60, -70], // Fill light from opposite direction
      },
      fog: {
        enabled: true,
        color: 0x090909,
        density: 0.003, // Adjusted for human scale distances (visible up to ~300m)
      },
    },
  },
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
      enabled: false, // Disable street lights for performance
    },
    lighting: {
      ...cityConfig.environment.lighting,
      directional: {
        ...cityConfig.environment.lighting.directional,
        shadowResolution: 1024, // Lower shadow resolution
      },
      fog: {
        ...cityConfig.environment.lighting.fog,
        enabled: false, // Disable fog for performance
      },
    },
  },
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
        shadowResolution: 4096, // Higher shadow resolution
      },
      ambient: {
        ...cityConfig.environment.lighting.ambient,
        intensity: 0.3, // Lower ambient for more contrast
      },
    },
    streetLights: {
      ...cityConfig.environment.streetLights,
      shadowResolution: 1024, // Higher resolution shadows
      intensity: 1.5, // Brighter lights
    },
  },
};
