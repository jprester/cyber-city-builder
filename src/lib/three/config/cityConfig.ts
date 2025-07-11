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
    // {
    //   modelPath:
    //     "./src/assets/models/buildings/cyberpunk-apartment-building/cyberpunk-apartment-building.glb",
    //   position: [20, 22, 14], // Center of the scene
    //   scale: [45, 45, 45], // Using the model's original scale (assuming it's already in meters)
    //   rotation: [0, 0, 0],
    // },
    {
      modelPath:
        "./src/assets/models/buildings/high-rise-building/high-rise-building.glb",
      position: [10, 1, 15], // Center of the scene
      scale: [1, 1, 1], // Using the model's original scale (assuming it's already in meters)
      rotation: [0, 0, 0],
    },
    {
      modelPath:
        "./src/assets/models/buildings/blue-skyscraper-building/blue-skyscrapper-building.glb",
      position: [30, 0, 14], // Center of the scene
      scale: [1, 1, 1], // Using the model's original scale (assuming it's already in meters)
      rotation: [0, 0, 0],
    },
    // {
    //   modelPath:
    //     "./src/assets/models/buildings/brutalist-building2/brutalist_building_2.gltf",
    //   position: [30, 0, 40], // Center of the scene
    //   scale: [0.5, 0.5, 0.5], // Using the model's original scale (assuming it's already in meters)
    //   rotation: [0, 0, 0],
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
  // Texture optimization settings for default mode
  textureOptimization: {
    enabled: true,
    maxTextureUnits: 16,
    priorityTextures: ["map", "normalMap", "emissiveMap"],
    optionalTextures: ["roughnessMap", "metalnessMap", "aoMap"],
    disableTexturesWhenOverLimit: true,
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
  // Texture optimization settings for performance mode
  textureOptimization: {
    enabled: true,
    maxTextureUnits: 12, // Lower limit for performance
    priorityTextures: ["map"], // Only keep essential diffuse texture
    optionalTextures: [
      "normalMap",
      "emissiveMap",
      "roughnessMap",
      "metalnessMap",
      "aoMap",
    ],
    disableTexturesWhenOverLimit: true,
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
  // Texture optimization settings for high quality mode
  textureOptimization: {
    enabled: true,
    maxTextureUnits: 16,
    priorityTextures: ["map", "normalMap", "emissiveMap"], // Keep these textures
    optionalTextures: ["roughnessMap", "metalnessMap", "aoMap"], // These can be removed if needed
    disableTexturesWhenOverLimit: true,
  },
};
