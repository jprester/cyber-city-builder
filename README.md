# Cyber City Builder

A 3D cyberpunk city visualization and building tool created with React, TypeScript, and Three.js.

## Features

- Interactive 3D cyberpunk-style city scene
- Modular and reusable Three.js components
- Support for loading and placing 3D models (.glb format)
- Configurable city environment with roads, ground planes, and lighting
- Performance monitoring and benchmarking tools
- Responsive design that adapts to different screen sizes
- Multiple quality settings (low, default, high)

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cyber-city-builder.git
cd cyber-city-builder

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage

The application creates a 3D cyberpunk city scene that you can navigate with your mouse:

- **Left-click + drag**: Rotate camera
- **Right-click + drag**: Pan camera
- **Scroll wheel**: Zoom in/out

### Performance Options

You can adjust the quality settings in `src/App.tsx`:

```typescript
// Initialize with different quality settings: "high", "low", or omit for default
const cleanup = initThreeScene(canvasRef.current, "low", true);
```

The third parameter toggles performance monitoring tools (when set to `true`).

### Keyboard Shortcuts

- **P**: Print current performance metrics to the console

## Project Structure

- `/src/assets`: 3D models in GLB format
- `/src/lib/three`: Core Three.js functionality
  - `/builders`: City building components
  - `/components`: UI components (loading screen, performance tests)
  - `/config`: Configuration for different quality presets
  - `/environment`: City environment setup (ground, lights, etc.)
  - `/managers`: Asset and performance management
  - `/types`: TypeScript interfaces
  - `/utils`: Utility functions

## Performance Considerations

The application includes built-in performance monitoring and optimization tools:

- Multiple quality presets for different hardware capabilities
- Performance benchmarking to compare different settings
- Automatic asset preloading and caching
- Statistics for FPS, draw calls, triangle count, etc.

## Development

```bash
# Run development server with HMR
npm run dev

# Type check and build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Tech Stack

- React
- TypeScript
- Three.js
- Vite
