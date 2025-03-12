import { AssetLoadingProgress, assetManager } from '../managers/assetManager';

/**
 * Loading screen options
 */
export interface LoadingScreenOptions {
  /** Application title to display */
  title?: string;
  /** Subtitle or description to display */
  subtitle?: string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Accent color for progress bars */
  accentColor?: string;
  /** Show loading text for each asset */
  showAssetDetails?: boolean;
  /** Number of assets to show in the list */
  maxAssetsToShow?: number;
  /** Function to call when loading is complete */
  onLoadingComplete?: () => void;
  /** Custom CSS to add to the loading screen */
  customCSS?: string;
}

/**
 * Loading screen component
 */
export class LoadingScreen {
  private container: HTMLElement;
  private loadingElement: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;
  private assetList: HTMLElement | null = null;
  private options: LoadingScreenOptions;
  private recentAssets: string[] = [];
  private isVisible = false;
  
  /**
   * Creates a loading screen
   * @param container The container element
   * @param options Loading screen options
   */
  constructor(container: HTMLElement, options: LoadingScreenOptions = {}) {
    this.container = container;
    this.options = {
      title: options.title ?? 'Loading',
      subtitle: options.subtitle ?? 'Please wait...',
      backgroundColor: options.backgroundColor ?? '#111111',
      textColor: options.textColor ?? '#ffffff',
      accentColor: options.accentColor ?? '#4CAF50',
      showAssetDetails: options.showAssetDetails ?? true,
      maxAssetsToShow: options.maxAssetsToShow ?? 5,
      onLoadingComplete: options.onLoadingComplete,
      customCSS: options.customCSS,
    };
  }
  
  /**
   * Shows the loading screen
   */
  show(): void {
    if (this.isVisible) return;
    
    // Create the loading screen element
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'loading-screen';
    
    // Apply styles
    this.loadingElement.style.position = 'fixed';
    this.loadingElement.style.top = '0';
    this.loadingElement.style.left = '0';
    this.loadingElement.style.width = '100%';
    this.loadingElement.style.height = '100%';
    this.loadingElement.style.backgroundColor = this.options.backgroundColor!;
    this.loadingElement.style.color = this.options.textColor!;
    this.loadingElement.style.display = 'flex';
    this.loadingElement.style.flexDirection = 'column';
    this.loadingElement.style.alignItems = 'center';
    this.loadingElement.style.justifyContent = 'center';
    this.loadingElement.style.zIndex = '1000';
    this.loadingElement.style.fontFamily = 'Arial, sans-serif';
    this.loadingElement.style.transition = 'opacity 0.5s ease-in-out';
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = this.options.title!;
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '32px';
    title.style.textAlign = 'center';
    
    // Add subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = this.options.subtitle!;
    subtitle.style.margin = '0 0 30px 0';
    subtitle.style.fontSize = '16px';
    subtitle.style.opacity = '0.8';
    subtitle.style.textAlign = 'center';
    
    // Create loading container
    const loadingContainer = document.createElement('div');
    loadingContainer.style.width = '80%';
    loadingContainer.style.maxWidth = '600px';
    
    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '100%';
    progressContainer.style.height = '20px';
    progressContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    progressContainer.style.borderRadius = '10px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.marginBottom = '10px';
    
    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.width = '0%';
    this.progressBar.style.height = '100%';
    this.progressBar.style.backgroundColor = this.options.accentColor!;
    this.progressBar.style.transition = 'width 0.3s ease-out';
    
    // Create progress text
    this.progressText = document.createElement('div');
    this.progressText.textContent = 'Loading assets: 0%';
    this.progressText.style.marginTop = '5px';
    this.progressText.style.textAlign = 'center';
    this.progressText.style.fontSize = '14px';
    
    // Create asset list if enabled
    if (this.options.showAssetDetails) {
      this.assetList = document.createElement('div');
      this.assetList.style.marginTop = '20px';
      this.assetList.style.width = '100%';
      this.assetList.style.maxHeight = '150px';
      this.assetList.style.overflow = 'hidden';
      this.assetList.style.fontSize = '12px';
      this.assetList.style.opacity = '0.7';
    }
    
    // Assemble elements
    progressContainer.appendChild(this.progressBar);
    loadingContainer.appendChild(progressContainer);
    loadingContainer.appendChild(this.progressText);
    
    if (this.assetList) {
      loadingContainer.appendChild(this.assetList);
    }
    
    this.loadingElement.appendChild(title);
    this.loadingElement.appendChild(subtitle);
    this.loadingElement.appendChild(loadingContainer);
    
    // Add custom CSS if provided
    if (this.options.customCSS) {
      const style = document.createElement('style');
      style.textContent = this.options.customCSS;
      document.head.appendChild(style);
    }
    
    // Add to container
    this.container.appendChild(this.loadingElement);
    
    // Register for asset loading events
    assetManager.addLoadingListener(this.handleAssetProgress);
    
    this.isVisible = true;
  }
  
  /**
   * Hides the loading screen
   */
  hide(): void {
    if (!this.isVisible || !this.loadingElement) return;
    
    // Fade out
    this.loadingElement.style.opacity = '0';
    
    // Remove after animation
    setTimeout(() => {
      if (this.loadingElement && this.container.contains(this.loadingElement)) {
        this.container.removeChild(this.loadingElement);
      }
      this.loadingElement = null;
      this.progressBar = null;
      this.progressText = null;
      this.assetList = null;
    }, 500);
    
    // Remove listener
    assetManager.removeLoadingListener(this.handleAssetProgress);
    
    this.isVisible = false;
  }
  
  /**
   * Updates the asset list
   * @param assetPath The path of the asset being loaded
   */
  private updateAssetList(assetPath: string): void {
    if (!this.assetList) return;
    
    // Add to recent assets
    this.recentAssets.unshift(this.getAssetDisplayName(assetPath));
    
    // Limit to max number to show
    if (this.recentAssets.length > this.options.maxAssetsToShow!) {
      this.recentAssets = this.recentAssets.slice(0, this.options.maxAssetsToShow!);
    }
    
    // Update asset list
    this.assetList.innerHTML = '';
    
    // Add each asset to the list
    this.recentAssets.forEach(asset => {
      const assetElement = document.createElement('div');
      assetElement.textContent = asset;
      assetElement.style.margin = '2px 0';
      assetElement.style.whiteSpace = 'nowrap';
      assetElement.style.overflow = 'hidden';
      assetElement.style.textOverflow = 'ellipsis';
      
      this.assetList!.appendChild(assetElement);
    });
  }
  
  /**
   * Gets a display name for an asset path
   * @param assetPath The full asset path
   * @returns A shortened display name
   */
  private getAssetDisplayName(assetPath: string): string {
    // Get the filename from the path
    const parts = assetPath.split('/');
    const filename = parts[parts.length - 1];
    
    // If the filename is too long, truncate it
    if (filename.length > 30) {
      return `...${filename.substring(filename.length - 27)}`;
    }
    
    return filename;
  }
  
  /**
   * Handles asset loading progress events
   */
  private handleAssetProgress = (progress: AssetLoadingProgress): void => {
    if (!this.isVisible || !this.progressBar || !this.progressText) return;
    
    // Update progress bar
    const overallProgress = assetManager.getOverallProgress() * 100;
    this.progressBar.style.width = `${overallProgress}%`;
    
    // Update progress text
    this.progressText.textContent = `Loading assets: ${Math.round(overallProgress)}%`;
    
    // Update asset list
    if (this.options.showAssetDetails && this.assetList) {
      this.updateAssetList(progress.asset);
    }
    
    // Check if loading is complete
    if (progress.isComplete && progress.asset === 'all') {
      // Hide loading screen after a short delay
      setTimeout(() => {
        this.hide();
        if (this.options.onLoadingComplete) {
          this.options.onLoadingComplete();
        }
      }, 500);
    }
  };
}

/**
 * Creates a loading screen
 * @param container The container element
 * @param options Loading screen options
 * @returns The loading screen instance
 */
export const createLoadingScreen = (
  container: HTMLElement,
  options?: LoadingScreenOptions
): LoadingScreen => {
  return new LoadingScreen(container, options);
};