import * as THREE from "three";
import { LightPosition } from "../types";

/**
 * City Environment class for creating city infrastructure and lighting
 */
export class CityEnvironment {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Creates ground plane and roads for the city
   * @returns Object containing references to the created elements
   */
  createGround() {
    // Main ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create road material
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
    });

    // Add roads between buildings (horizontal)
    const mainRoadGeometry = new THREE.PlaneGeometry(90, 6);
    const mainRoad = new THREE.Mesh(mainRoadGeometry, roadMaterial);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.y = 0.01; // Slightly above ground to prevent z-fighting
    this.scene.add(mainRoad);

    // Add roads between buildings (vertical)
    const crossRoadGeometry = new THREE.PlaneGeometry(6, 90);
    const crossRoad = new THREE.Mesh(crossRoadGeometry, roadMaterial);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.01;
    this.scene.add(crossRoad);

    // Add intersection in the middle
    const intersectionGeometry = new THREE.PlaneGeometry(6, 6);
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
    // Create pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, 2.5, z);
    pole.castShadow = true;

    // Light bulb
    const lampGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 1,
    });
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.set(x, 5, z);

    // Light source
    const light = new THREE.PointLight(0xffffcc, 1, 15);
    light.position.set(x, 5, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 20;

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
   * @param positions Array of light positions
   * @returns The group containing all street lights
   */
  createStreetLights(positions: LightPosition[] = []): THREE.Group {
    const streetLights = new THREE.Group();

    // Use default positions if none provided
    const lightPositions =
      positions.length > 0
        ? positions
        : [
            { x: -12, z: -6, rotation: 0 },
            { x: 0, z: -6, rotation: 0 },
            { x: 12, z: -6, rotation: 0 },
            { x: -12, z: 6, rotation: 0 },
            { x: 0, z: 6, rotation: 0 },
            { x: 12, z: 6, rotation: 0 },
            { x: -6, z: -12, rotation: Math.PI / 2 },
            { x: -6, z: 0, rotation: Math.PI / 2 },
            { x: -6, z: 12, rotation: Math.PI / 2 },
            { x: 6, z: -12, rotation: Math.PI / 2 },
            { x: 6, z: 0, rotation: Math.PI / 2 },
            { x: 6, z: 12, rotation: Math.PI / 2 },
          ];

    lightPositions.forEach((pos) => {
      const light = this.createStreetLight(pos.x, pos.z, pos.rotation);
      streetLights.add(light);
    });

    this.scene.add(streetLights);
    return streetLights;
  }

  /**
   * Sets up the lighting for the scene
   * @returns Object containing references to created lights
   */
  setupLighting() {
    // Add ambient and directional lights for overall scene lighting
    const ambientLight = new THREE.AmbientLight(0x444444, 0.5);
    this.scene.add(ambientLight);

    // Main directional light with shadows (like sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;

    // Configure shadow properties for large scene
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.bias = -0.001;

    this.scene.add(directionalLight);

    // Add a softer fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-20, 20, -20);
    this.scene.add(fillLight);

    // Add fog to create atmosphere
    this.scene.fog = new THREE.FogExp2(0x090909, 0.01);

    return { ambientLight, directionalLight, fillLight };
  }

  /**
   * Initialize the entire city environment
   * @returns All created environment objects
   */
  initialize() {
    const ground = this.createGround();
    // const streetLights = this.createStreetLights();
    const lighting = this.setupLighting();

    return {
      ground,
      // streetLights,
      lighting,
    };
  }
}

/**
 * Create a city environment factory function
 * @param scene The Three.js scene
 * @returns A CityEnvironment instance
 */
export const createCityEnvironment = (scene: THREE.Scene): CityEnvironment => {
  return new CityEnvironment(scene);
};
