import * as THREE from "three";
import type { LightPosition, EnvironmentConfig } from "../types";

/**
 * City Environment class for creating city infrastructure and lighting
 */
export class CityEnvironment {
  private scene: THREE.Scene;
  private config: EnvironmentConfig;

  constructor(scene: THREE.Scene, config?: EnvironmentConfig) {
    this.scene = scene;

    // Use default config if none provided
    this.config = config || {
      ground: {
        enabled: true,
        size: 200, // 200x200 meter ground plane (typical for a few city blocks)
        color: 0x222222,
        roughness: 0.8,
        includeRoads: true,
        roadColor: 0x333333,
      },
      streetLights: {
        enabled: true,
        intensity: 1,
        distance: 15, // 15 meter light radius (typical street light coverage)
        color: 0xffffcc,
        shadowResolution: 512,
        positions: [],
      },
      lighting: {
        ambient: {
          enabled: true,
          color: 0xffffff,
          intensity: 1,
        },
        directional: {
          enabled: true,
          color: 0xffffff,
          intensity: 0.8,
          position: [100, 80, 100], // Sun-like position (80m high)
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
          density: 0.003, // Adjusted for human scale (~300m visibility)
        },
      },
    };
  }

  /**
   * Set or update the environment configuration
   * @param config The environment configuration
   */
  setConfig(config: EnvironmentConfig): void {
    this.config = config;
  }

  /**
   * Creates ground plane and roads for the city
   * @returns Object containing references to the created elements or null if disabled
   */
  createGround() {
    const config = this.config.ground;

    // Skip if ground is disabled
    if (!config.enabled) {
      console.log("Ground creation disabled in config");
      return null;
    }

    // Main ground plane
    const groundGeometry = new THREE.PlaneGeometry(config.size, config.size);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Early return if roads are disabled
    if (!config.includeRoads) {
      return { ground };
    }

    // Create road material
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: config.roadColor,
      roughness: 0.6,
    });

    // Add roads between buildings (horizontal)
    // Standard two-lane road is 10 meters wide (using human scale)
    const roadWidth = 10;
    const mainRoadGeometry = new THREE.PlaneGeometry(
      config.size * 0.9,
      roadWidth
    );
    const mainRoad = new THREE.Mesh(mainRoadGeometry, roadMaterial);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.y = 0.01; // Slightly above ground to prevent z-fighting
    this.scene.add(mainRoad);

    // Add roads between buildings (vertical)
    const crossRoadGeometry = new THREE.PlaneGeometry(
      roadWidth,
      config.size * 0.9
    );
    const crossRoad = new THREE.Mesh(crossRoadGeometry, roadMaterial);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.01;
    this.scene.add(crossRoad);

    // Add intersection in the middle
    const intersectionGeometry = new THREE.PlaneGeometry(roadWidth, roadWidth);
    const intersection = new THREE.Mesh(intersectionGeometry, roadMaterial);
    intersection.rotation.x = -Math.PI / 2;
    intersection.position.y = 0.02; // Slightly above roads
    this.scene.add(intersection);

    return { ground, mainRoad, crossRoad, intersection };
  }

  /**
   * Creates a single street light with pole and lamp
   * @param x X position
   * @param z Z position
   * @param rotationY Y rotation in radians
   * @returns The created street light group
   */
  createStreetLight(x: number, z: number, rotationY = 0): THREE.Group {
    const config = this.config.streetLights;

    // Create pole - typical street light pole is 5-7 meters high and ~0.2m in diameter
    const poleHeight = 6;
    const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, poleHeight, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, poleHeight / 2, z); // Position bottom at ground level
    pole.castShadow = true;

    // Light bulb - larger for better visibility
    const lampGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 1,
    });
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.set(x, poleHeight, z); // Position at top of pole

    // Light source
    const light = new THREE.PointLight(
      config.color,
      config.intensity,
      config.distance
    );
    light.position.set(x, poleHeight, z); // Position at top of pole
    light.castShadow = true;
    light.shadow.mapSize.width = config.shadowResolution;
    light.shadow.mapSize.height = config.shadowResolution;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = config.distance + 5;

    // Group elements
    const streetLight = new THREE.Group();
    streetLight.add(pole);
    streetLight.add(lamp);
    streetLight.add(light);
    streetLight.rotation.y = rotationY;

    return streetLight;
  }

  /**
   * Creates street lights for the city based on provided positions
   * @returns The group containing all street lights or null if disabled
   */
  createStreetLights(): THREE.Group | null {
    const config = this.config.streetLights;

    // Skip if street lights are disabled
    if (!config.enabled) {
      console.log("Street lights disabled in config");
      return null;
    }

    const streetLights = new THREE.Group();

    // Use configuration positions or fallback to defaults
    const positions =
      config.positions && config.positions.length > 0
        ? config.positions
        : this.getDefaultLightPositions();

    positions.forEach((pos) => {
      const light = this.createStreetLight(pos.x, pos.z, pos.rotation);
      streetLights.add(light);
    });

    this.scene.add(streetLights);
    return streetLights;
  }

  /**
   * Returns default positions for street lights
   */
  private getDefaultLightPositions(): LightPosition[] {
    // Street lights positioned along roads at human scale
    // spacing (~25 meters between poles)
    return [
      // Horizontal roads
      { x: -25, z: -5, rotation: 0 }, // Left edge
      { x: -10, z: -5, rotation: 0 }, // Left of center
      { x: 10, z: -5, rotation: 0 }, // Right of center
      { x: 25, z: -5, rotation: 0 }, // Right edge

      { x: -25, z: 5, rotation: 0 }, // Left edge (upper road)
      { x: -10, z: 5, rotation: 0 }, // Left of center (upper road)
      { x: 10, z: 5, rotation: 0 }, // Right of center (upper road)
      { x: 25, z: 5, rotation: 0 }, // Right edge (upper road)

      // Vertical roads
      { x: -5, z: -25, rotation: Math.PI / 2 }, // Bottom edge
      { x: -5, z: -10, rotation: Math.PI / 2 }, // Below center
      { x: -5, z: 10, rotation: Math.PI / 2 }, // Above center
      { x: -5, z: 25, rotation: Math.PI / 2 }, // Top edge

      { x: 5, z: -25, rotation: Math.PI / 2 }, // Bottom edge (right road)
      { x: 5, z: -10, rotation: Math.PI / 2 }, // Below center (right road)
      { x: 5, z: 10, rotation: Math.PI / 2 }, // Above center (right road)
      { x: 5, z: 25, rotation: Math.PI / 2 }, // Top edge (right road)
    ];
  }

  /**
   * Sets up the lighting for the scene
   * @returns Object containing references to created lights
   */
  setupLighting() {
    const config = this.config.lighting;
    const result: Record<string, THREE.Light> = {};

    // Ambient light
    if (config.ambient.enabled) {
      const ambientLight = new THREE.AmbientLight(
        config.ambient.color,
        config.ambient.intensity
      );

      this.scene.add(ambientLight);
      result.ambientLight = ambientLight;
    }

    // Main directional light
    if (config.directional.enabled) {
      const directionalLight = new THREE.DirectionalLight(
        config.directional.color,
        config.directional.intensity
      );
      directionalLight.position.set(
        config.directional.position[0],
        config.directional.position[1],
        config.directional.position[2]
      );

      // Configure shadows
      if (config.directional.shadowEnabled) {
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width =
          config.directional.shadowResolution;
        directionalLight.shadow.mapSize.height =
          config.directional.shadowResolution;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.bias = -0.001;
      }

      this.scene.add(directionalLight);
      result.directionalLight = directionalLight;
    }

    // Fill light
    if (config.fill.enabled) {
      const fillLight = new THREE.DirectionalLight(
        config.fill.color,
        config.fill.intensity
      );
      fillLight.position.set(
        config.fill.position[0],
        config.fill.position[1],
        config.fill.position[2]
      );
      this.scene.add(fillLight);
      result.fillLight = fillLight;
    }

    // Fog
    if (config.fog.enabled) {
      this.scene.fog = new THREE.FogExp2(config.fog.color, config.fog.density);
    }

    return result;
  }

  /**
   * Initialize the entire city environment
   * @returns All created environment objects
   */
  initialize() {
    const ground = this.createGround();
    const streetLights = this.createStreetLights();
    const lighting = this.setupLighting();

    return {
      ground,
      streetLights,
      lighting,
    };
  }
}

/**
 * Create a city environment factory function
 * @param scene The Three.js scene
 * @param config Optional environment configuration
 * @returns A CityEnvironment instance
 */
export const createCityEnvironment = (
  scene: THREE.Scene,
  config?: EnvironmentConfig
): CityEnvironment => {
  return new CityEnvironment(scene, config);
};
