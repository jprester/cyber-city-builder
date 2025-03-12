import * as THREE from "three";
import { assetManager } from "../managers/assetManager";
import type { CityConfig } from "../types";

/**
 * City Builder class for creating and placing buildings
 */
export class CityBuilder {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Places a 3D model in the scene with specified position, scale, and rotation
   * @param model The 3D model to place
   * @param position Position [x, y, z]
   * @param scale Scale [x, y, z]
   * @param rotation Rotation in radians [x, y, z]
   * @returns The placed model object
   */
  placeModel(
    model: THREE.Object3D,
    position: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0]
  ): THREE.Object3D {
    // Clone the model to avoid modifying the original
    const placedModel = model.clone();

    // Apply transformations
    placedModel.position.set(position[0], position[1], position[2]);
    placedModel.scale.set(scale[0], scale[1], scale[2]);
    placedModel.rotation.set(rotation[0], rotation[1], rotation[2]);

    // Add to scene
    this.scene.add(placedModel);

    return placedModel;
  }

  /**
   * Loads and places a 3D model in the scene with specified properties
   * @param modelPath Path to the model file
   * @param position Position [x, y, z]
   * @param scale Scale [x, y, z]
   * @param rotation Rotation in radians [x, y, z]
   * @returns Promise resolving to the placed model or null if loading failed
   */
  async loadAndPlaceModel(
    modelPath: string,
    position: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0]
  ): Promise<THREE.Object3D | null> {
    try {
      const model = await assetManager.loadModel(modelPath);

      if (!model) {
        console.error(`Failed to place model ${modelPath} - loading failed`);
        return null;
      }

      return this.placeModel(model, position, scale, rotation);
    } catch (error) {
      console.error(`Error placing model ${modelPath}:`, error);
      return null;
    }
  }

  /**
   * Gets all model paths used in the city configuration
   * @param cityConfig The city configuration
   * @returns Array of unique model paths
   */
  getModelPaths(cityConfig: CityConfig): string[] {
    // Get unique model paths
    const modelPaths = new Set<string>();

    cityConfig.buildings.forEach((building) => {
      modelPaths.add(building.modelPath);
    });

    return Array.from(modelPaths);
  }

  /**
   * Preloads all models needed for the city
   * @param cityConfig The city configuration
   * @returns Promise resolving when all models are preloaded
   */
  async preloadModels(cityConfig: CityConfig): Promise<void> {
    const modelPaths = this.getModelPaths(cityConfig);
    console.log(`Preloading ${modelPaths.length} unique models...`);

    await assetManager.preloadAssets(modelPaths);
  }

  /**
   * Builds a city by placing multiple building models
   * @param cityConfig The city configuration
   * @param preloadModels Whether to preload models before building (default: false)
   * @returns Promise resolving when all buildings are placed
   */
  async buildCity(
    cityConfig: CityConfig,
    preloadModels = false
  ): Promise<void> {
    // Preload models if requested
    if (preloadModels) {
      await this.preloadModels(cityConfig);
    }

    // Place all buildings
    const buildingPromises = cityConfig.buildings.map((building) =>
      this.loadAndPlaceModel(
        building.modelPath,
        building.position,
        building.scale,
        building.rotation
      )
    );

    await Promise.all(buildingPromises);
    console.log(`Placed ${cityConfig.buildings.length} buildings in the scene`);
  }
}

/**
 * Create a city builder factory function
 * @param scene The Three.js scene
 * @returns A CityBuilder instance
 */
export const createCityBuilder = (scene: THREE.Scene): CityBuilder => {
  return new CityBuilder(scene);
};
