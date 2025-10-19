const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const docker = new Docker();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Paths
const EGGS_PATH = process.env.NODE_ENV === 'production' ? '/app/eggs' : path.join(__dirname, '..', 'eggs');
const SERVER_DATA_PATH = process.env.NODE_ENV === 'production' ? '/app/server-data' : path.join(__dirname, '..', 'server-data');
const DOCKER_CONFIGS_PATH = path.join(__dirname, '..', 'docker-configs');

// Ensure directories exist
fs.ensureDirSync(SERVER_DATA_PATH);
fs.ensureDirSync(DOCKER_CONFIGS_PATH);

// Store for running servers
const runningServers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('join_server', (serverId) => {
    console.log(`Client ${socket.id} joined server_${serverId}`);
    socket.join(`server_${serverId}`);
    
    // Send a test message to confirm connection
    socket.emit('server_log', {
      serverId,
      log: `Console connected to server ${serverId}`,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('leave_server', (serverId) => {
    console.log(`Client ${socket.id} left server_${serverId}`);
    socket.leave(`server_${serverId}`);
  });
});

// Helper function to scan eggs
async function scanEggs() {
  const eggs = {};
  
  if (!fs.existsSync(EGGS_PATH)) {
    console.log('Eggs directory not found:', EGGS_PATH);
    return eggs;
  }
  
  console.log('Scanning eggs directory:', EGGS_PATH);
  
  // Function to clean egg names (remove dots, underscores, etc.)
  function cleanName(name) {
    return name
      .replace(/[_-]/g, ' ')
      .replace(/\./g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }
  
  // Function to categorize games logically
  function categorizeGame(path, eggName, eggData) {
    const pathLower = path.join('/').toLowerCase();
    const nameLower = eggName.toLowerCase();
    const fullName = (eggData.name || eggName).toLowerCase();
    
    // Minecraft games
    if (pathLower.includes('minecraft') || nameLower.includes('minecraft') || fullName.includes('minecraft')) {
      return 'Minecraft';
    }
    
    // GTA games
    if (nameLower.includes('gta') || nameLower.includes('fivem') || nameLower.includes('altv') || fullName.includes('gta')) {
      return 'GTA / Racing';
    }
    
    // Survival games
    if (nameLower.includes('ark') || nameLower.includes('rust') || nameLower.includes('7days') || 
        nameLower.includes('dayz') || nameLower.includes('valheim') || nameLower.includes('subnautica')) {
      return 'Survival Games';
    }
    
    // FPS / Shooter games
    if (nameLower.includes('counter') || nameLower.includes('cs2') || nameLower.includes('csgo') || 
        nameLower.includes('call of duty') || nameLower.includes('battlefield')) {
      return 'FPS / Shooter';
    }
    
    // MMO / RPG games
    if (nameLower.includes('wow') || nameLower.includes('ffxiv') || nameLower.includes('elderscrolls') ||
        nameLower.includes('tera') || pathLower.includes('mmorpg')) {
      return 'MMO / RPG';
    }
    
    // Bots & Tools
    if (pathLower.includes('bots') || pathLower.includes('bot') || nameLower.includes('bot')) {
      return 'Bots & Tools';
    }
    
    // Databases
    if (pathLower.includes('database') || nameLower.includes('mysql') || nameLower.includes('postgres') ||
        nameLower.includes('redis') || nameLower.includes('mongodb')) {
      return 'Databases';
    }
    
    // Voice servers
    if (pathLower.includes('voice') || nameLower.includes('teamspeak') || nameLower.includes('mumble') ||
        nameLower.includes('discord')) {
      return 'Voice Servers';
    }
    
    // Generic/Other category as fallback
    return 'Other Games';
  }
  
  // Function to recursively scan for egg files
  function scanDirectory(dirPath, currentPath = []) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Skip hidden directories and non-game directories
        if (!item.name.startsWith('.') && !item.name.includes('example')) {
          scanDirectory(fullPath, [...currentPath, item.name]);
        }
      } else if (item.name.startsWith('egg-') && item.name.endsWith('.json')) {
        // Found an egg file
        try {
          const eggData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          
          // Skip if no proper name or description
          if (!eggData.name || eggData.name.trim() === '') {
            console.log(`Skipping egg without name: ${fullPath}`);
            continue;
          }
          
          const originalEggName = item.name.replace('egg-', '').replace('.json', '');
          const cleanEggName = cleanName(originalEggName);
          const displayName = cleanName(eggData.name || originalEggName);
          
          // Categorize the game
          const category = categorizeGame(currentPath, originalEggName, eggData);
          
          // Initialize category if not exists
          if (!eggs[category]) {
            eggs[category] = {};
          }
          
          // Create unique identifier
          const uniqueId = `${currentPath.join('_')}_${originalEggName}`;
          
          eggs[category][uniqueId] = {
            id: uniqueId,
            name: displayName,
            originalName: eggData.name,
            description: eggData.description || 'No description available',
            author: eggData.author || 'Unknown',
            image: eggData.docker_image || 'node:18-alpine',
            category: category,
            subcategory: currentPath[currentPath.length - 1] || 'general',
            originalPath: currentPath.join('/'),
            eggFile: originalEggName,
            variables: eggData.variables || [],
            startup: eggData.startup || '',
            config: {
              files: eggData.config?.files || {},
              startup: eggData.config?.startup || {},
              logs: eggData.config?.logs || {},
              stop: eggData.config?.stop || 'stop'
            }
          };
          
          console.log(`Found egg: ${category} -> ${displayName}`);
        } catch (error) {
          console.error(`Error parsing egg ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  // Start scanning from the eggs directory
  scanDirectory(EGGS_PATH);
  
  // Sort categories and eggs within categories
  const sortedEggs = {};
  const categoryOrder = [
    'Minecraft',
    'GTA / Racing', 
    'Survival Games',
    'FPS / Shooter',
    'MMO / RPG',
    'Other Games',
    'Bots & Tools',
    'Databases',
    'Voice Servers'
  ];
  
  // Add categories in order
  for (const category of categoryOrder) {
    if (eggs[category] && Object.keys(eggs[category]).length > 0) {
      sortedEggs[category] = {};
      
      // Sort eggs within category by name
      const sortedKeys = Object.keys(eggs[category]).sort((a, b) => 
        eggs[category][a].name.localeCompare(eggs[category][b].name)
      );
      
      for (const key of sortedKeys) {
        sortedEggs[category][key] = eggs[category][key];
      }
    }
  }
  
  console.log('Total egg categories found:', Object.keys(sortedEggs).length);
  console.log('Categories:', Object.keys(sortedEggs));
  
  // Count total eggs
  const totalEggs = Object.values(sortedEggs).reduce((sum, category) => 
    sum + Object.keys(category).length, 0
  );
  console.log('Total eggs found:', totalEggs);
  
  return sortedEggs;
}

// Preload commonly used Docker images
async function preloadBaseImages() {
  const baseImages = [
    'node:18-alpine',
    'eclipse-temurin:17-jre',
    'eclipse-temurin:11-jre',
    'eclipse-temurin:8-jre',
    'python:3.11-slim',
    'ubuntu:20.04',
    'debian:bullseye-slim'
  ];
  
  console.log('Preloading base Docker images...');
  
  for (const image of baseImages) {
    try {
      // Check if image exists locally first
      await docker.getImage(image).inspect();
      console.log(`✓ Image ${image} already available`);
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Pulling base image: ${image}...`);
        try {
          const stream = await docker.pull(image);
          await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => {
              if (err) {
                reject(err);
              } else {
                console.log(`✓ Successfully pulled ${image}`);
                resolve(res);
              }
            });
          });
        } catch (pullError) {
          console.log(`⚠ Failed to pull ${image}: ${pullError.message}`);
        }
      }
    }
  }
  
  console.log('Base image preloading completed');
}

// Helper function to pull Docker image if needed
async function pullDockerImage(imageName) {
  try {
    console.log(`Checking if image ${imageName} exists locally...`);
    
    // Check if image exists locally
    try {
      await docker.getImage(imageName).inspect();
      console.log(`Image ${imageName} already exists locally`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Image ${imageName} not found locally, pulling from registry...`);
        
        // Pull the image
        const stream = await docker.pull(imageName);
        
        // Wait for pull to complete
        await new Promise((resolve, reject) => {
          docker.modem.followProgress(stream, (err, res) => {
            if (err) {
              reject(err);
            } else {
              console.log(`Successfully pulled image ${imageName}`);
              resolve(res);
            }
          });
        });
        
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Failed to pull image ${imageName}:`, error.message);
    return false;
  }
}

// Helper function to run server installation
async function runServerInstallation(serverConfig, eggData) {
  try {
    console.log(`Running installation for server ${serverConfig.name}...`);
    
    // Check if the egg has an installation script
    if (!eggData.scripts || !eggData.scripts.installation) {
      console.log('No installation script found, skipping installation phase');
      return true;
    }
    
    const installScript = eggData.scripts.installation;
    const serverDir = path.join(SERVER_DATA_PATH, serverConfig.id);
    fs.ensureDirSync(serverDir);
    
    // Get installation container image
    let installImage = installScript.container || 'openjdk:11-jdk-slim';
    
    // Map Pterodactyl installation images to available ones
    const installImageMap = {
      'openjdk:11-jdk-slim': 'eclipse-temurin:11-jdk',
      'openjdk:17-jdk-slim': 'eclipse-temurin:17-jdk',
      'openjdk:8-jdk-slim': 'eclipse-temurin:8-jdk',
      'openjdk:18-jdk-slim': 'eclipse-temurin:18-jdk',
      'openjdk:21-jdk-slim': 'eclipse-temurin:21-jdk'
    };
    
    if (installImageMap[installImage]) {
      installImage = installImageMap[installImage];
    }
    
    console.log(`Using installation image: ${installImage}`);
    
    // Pull installation image if needed
    try {
      await docker.getImage(installImage).inspect();
      console.log(`Installation image ${installImage} already exists locally`);
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Pulling installation image: ${installImage}...`);
        await pullDockerImage(installImage);
      }
    }
    
    // Prepare environment variables for installation
    const installEnv = [];
    if (serverConfig.environment) {
      Object.entries(serverConfig.environment).forEach(([key, value]) => {
        installEnv.push(`${key}=${value}`);
      });
    }
    
    // Add server memory as environment variable
    installEnv.push(`SERVER_MEMORY=${serverConfig.memory || 1024}`);
    
    // Clean the installation script - remove Windows line endings and fix apt commands
    let cleanScript = installScript.script
      .replace(/\r\n/g, '\n')  // Remove Windows line endings
      .replace(/\r/g, '\n')     // Remove any remaining \r
      .replace(/apt update/g, 'apt-get update')  // Fix apt commands
      .replace(/apt install/g, 'apt-get install');
    
    // Create installation container
    const installContainerConfig = {
      name: `install_${serverConfig.id}`,
      Image: installImage,
      Cmd: [installScript.entrypoint || 'bash', '-c', cleanScript],
      Env: installEnv,
      HostConfig: {
        Binds: [`${serverDir}:/mnt/server`],
        Memory: 2 * 1024 * 1024 * 1024 // 2GB for installation
      },
      WorkingDir: '/mnt/server'
    };
    
    console.log(`Creating installation container for server ${serverConfig.name}...`);
    const installContainer = await docker.createContainer(installContainerConfig);
    
    console.log(`Starting installation process for server ${serverConfig.name}...`);
    
    // Get logs before starting to track installation progress
    const logStream = await installContainer.logs({
      follow: true,
      stdout: true,
      stderr: true
    });
    
    // Start the container
    await installContainer.start();
    
    // Wait for installation to complete
    const installResult = await installContainer.wait();
    
    // Get final logs
    const finalLogs = await installContainer.logs({
      stdout: true,
      stderr: true
    });
    
    console.log(`Installation logs for ${serverConfig.name}:`, finalLogs.toString());
    
    // Clean up container
    try {
      await installContainer.remove();
    } catch (removeError) {
      console.log('Container already removed or cleanup failed:', removeError.message);
    }
    
    if (installResult.StatusCode === 0) {
      console.log(`✓ Installation completed successfully for server ${serverConfig.name}`);
      
      // Create basic server files if they don't exist
      const eula = path.join(serverDir, 'eula.txt');
      if (!fs.existsSync(eula)) {
        fs.writeFileSync(eula, 'eula=true\n');
      }
      
      return true;
    } else {
      console.error(`✗ Installation failed for server ${serverConfig.name} with exit code: ${installResult.StatusCode}`);
      return false;
    }
    
  } catch (error) {
    console.error('Error during server installation:', error);
    return false;
  }
}

// Helper function to create Docker container
async function createGameServer(serverConfig) {
  const { id, name, egg, environment, ports, memory, startupCommand } = serverConfig;
  
  const serverDir = path.join(SERVER_DATA_PATH, id);
  fs.ensureDirSync(serverDir);
  
  // Get Docker image from egg with fallbacks
  let dockerImage = 'node:18-alpine'; // Default fallback
  let originalImage = null;
  
  if (egg.docker_images) {
    const dockerImages = Object.values(egg.docker_images);
    if (dockerImages.length > 0) {
      // Try to use Java 17 for Minecraft, otherwise use the first available
      const preferredImage = dockerImages.find(img => img.includes('java_17')) || dockerImages[0];
      originalImage = preferredImage;
      
      // Define comprehensive image mappings for Pterodactyl yolks
      const imageMap = {
        'ghcr.io/pterodactyl/yolks:java_8': 'eclipse-temurin:8-jre',
        'ghcr.io/pterodactyl/yolks:java_11': 'eclipse-temurin:11-jre',
        'ghcr.io/pterodactyl/yolks:java_16': 'eclipse-temurin:16-jre',
        'ghcr.io/pterodactyl/yolks:java_17': 'eclipse-temurin:17-jre',
        'ghcr.io/pterodactyl/yolks:java_18': 'eclipse-temurin:18-jre',
        'ghcr.io/pterodactyl/yolks:java_19': 'eclipse-temurin:19-jre',
        'ghcr.io/pterodactyl/yolks:java_21': 'eclipse-temurin:21-jre',
        'ghcr.io/pterodactyl/yolks:nodejs_16': 'node:16-alpine',
        'ghcr.io/pterodactyl/yolks:nodejs_17': 'node:17-alpine',
        'ghcr.io/pterodactyl/yolks:nodejs_18': 'node:18-alpine',
        'ghcr.io/pterodactyl/yolks:nodejs_19': 'node:19-alpine',
        'ghcr.io/pterodactyl/yolks:nodejs_20': 'node:20-alpine',
        'ghcr.io/pterodactyl/yolks:python_3.8': 'python:3.8-slim',
        'ghcr.io/pterodactyl/yolks:python_3.9': 'python:3.9-slim',
        'ghcr.io/pterodactyl/yolks:python_3.10': 'python:3.10-slim',
        'ghcr.io/pterodactyl/yolks:python_3.11': 'python:3.11-slim',
        'ghcr.io/pterodactyl/yolks:python_3.12': 'python:3.12-slim',
        'ghcr.io/parkervcp/steamcmd:proton': 'steamcmd/steamcmd:latest',
        'ghcr.io/parkervcp/steamcmd:debian': 'steamcmd/steamcmd:latest',
        'ghcr.io/parkervcp/steamcmd:ubuntu': 'steamcmd/steamcmd:latest',
        'ghcr.io/pterodactyl/yolks:steamcmd': 'steamcmd/steamcmd:latest'
      };
      
      // Check if we have a mapping for this image
      if (imageMap[preferredImage]) {
        dockerImage = imageMap[preferredImage];
      } else {
        dockerImage = preferredImage;
      }
    }
  }
  
  console.log(`Selected Docker image: ${dockerImage} for server ${name}`);
  if (originalImage && originalImage !== dockerImage) {
    console.log(`Mapped from original image: ${originalImage}`);
  }
  
  // Try to pull the image first
  const imagePulled = await pullDockerImage(dockerImage);
  if (!imagePulled) {
    console.log(`Failed to pull ${dockerImage}, trying fallback strategies...`);
    
    // Try alternative Java images if it was a Java image
    if (originalImage && originalImage.includes('java')) {
      const javaFallbacks = [
        'eclipse-temurin:17-jre',
        'eclipse-temurin:11-jre', 
        'eclipse-temurin:8-jre',
        'openjdk:17-jre',
        'openjdk:11-jre',
        'openjdk:8-jre'
      ];
      
      for (const fallback of javaFallbacks) {
        console.log(`Trying Java fallback: ${fallback}`);
        if (await pullDockerImage(fallback)) {
          dockerImage = fallback;
          console.log(`Successfully using Java fallback: ${fallback}`);
          break;
        }
      }
    }
    
    // Final fallback only if no Java alternative worked
    if (!imagePulled && dockerImage.includes('node')) {
      dockerImage = 'node:18-alpine';
      await pullDockerImage(dockerImage);
    }
  }
  
  // Create port bindings
  const portBindings = {};
  const exposedPorts = {};
  
  ports.forEach(port => {
    portBindings[`${port.internal}/tcp`] = [{ HostPort: port.external.toString() }];
    exposedPorts[`${port.internal}/tcp`] = {};
  });
  
  // Prepare environment variables
  const envVars = [];
  for (const [key, value] of Object.entries(environment)) {
    envVars.push(`${key}=${value}`);
  }
  
  // Add server memory
  envVars.push(`SERVER_MEMORY=${memory}`);
  
  // Process startup command - replace variables
  let processedStartupCommand = startupCommand || '';
  if (processedStartupCommand) {
    // Replace common variables
    processedStartupCommand = processedStartupCommand.replace(/\{\{SERVER_MEMORY\}\}/g, memory.toString());
    processedStartupCommand = processedStartupCommand.replace(/\{\{SERVER_PORT\}\}/g, ports[0]?.internal || '25565');
    
    // Replace environment variables
    for (const [key, value] of Object.entries(environment)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedStartupCommand = processedStartupCommand.replace(regex, value.toString());
    }
  }
  
  console.log(`Using startup command: ${processedStartupCommand}`);
  
  // Configure container with startup command
  const containerConfig = {
    name: `game_server_${id}`,
    Image: dockerImage,
    Env: envVars,
    Cmd: processedStartupCommand ? ['/bin/sh', '-c', processedStartupCommand] : undefined,
    HostConfig: {
      PortBindings: portBindings,
      Memory: memory * 1024 * 1024, // Convert MB to bytes
      Binds: [`${serverDir}:/home/container`],
      RestartPolicy: { Name: 'unless-stopped' }
    },
    ExposedPorts: exposedPorts,
    WorkingDir: '/home/container',
    User: '1000:1000',
    Tty: true,
    OpenStdin: true
  };
  
  try {
    console.log(`Creating container with config:`, { name: containerConfig.name, image: containerConfig.Image });
    
    const container = await docker.createContainer(containerConfig);
    console.log(`Successfully created container ${containerConfig.name}`);
    return container;
  } catch (error) {
    console.error('Error creating container:', error);
    
    // If the image still doesn't exist after pulling, try with generic fallback
    if (error.statusCode === 404 && error.json && error.json.message.includes('No such image')) {
      console.log('Image still not found after pulling, trying with final fallback...');
      
      // Ensure the fallback image is available
      await pullDockerImage('node:18-alpine');
      
      const fallbackConfig = {
        ...containerConfig,
        Image: 'node:18-alpine'
      };
      
      try {
        const container = await docker.createContainer(fallbackConfig);
        console.log('Successfully created container with fallback image');
        return container;
      } catch (fallbackError) {
        console.error('Final fallback also failed:', fallbackError);
        throw new Error(`Failed to create container with any available image: ${fallbackError.message}`);
      }
    }
    
    throw new Error(`Container creation failed: ${error.message}`);
  }
}

// Routes

// Get all available eggs
app.get('/api/eggs', async (req, res) => {
  try {
    const eggs = await scanEggs();
    res.json(eggs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific egg details
app.get('/api/eggs/:category/:subcategory/:egg', async (req, res) => {
  try {
    const { category, subcategory, egg } = req.params;
    const eggPath = path.join(EGGS_PATH, category, subcategory, `egg-${egg}.json`);
    
    if (!fs.existsSync(eggPath)) {
      return res.status(404).json({ error: 'Egg not found' });
    }
    
    const eggData = JSON.parse(fs.readFileSync(eggPath, 'utf8'));
    res.json(eggData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new server
app.post('/api/servers', async (req, res) => {
  try {
    console.log('Creating server with request body:', req.body);
    
    const { name, egg, environment, ports, memory = 1024, cpu = 100, disk = 5000, startupCommand } = req.body;
    
    if (!name || !egg) {
      return res.status(400).json({ error: 'Name and egg are required' });
    }
    
    if (!egg.data || !egg.data.originalPath || !egg.data.eggFile) {
      console.error('Invalid egg structure:', egg);
      return res.status(400).json({ error: 'Invalid egg structure provided' });
    }
    
    const serverId = uuidv4();
    
    // Extract egg path from the selected egg data
    const eggOriginalPath = egg.data.originalPath;
    const eggFileName = egg.data.eggFile;
    
    console.log('Egg details:', { eggOriginalPath, eggFileName });
    
    // Construct egg file path using original path structure
    const eggFilePath = path.join(EGGS_PATH, eggOriginalPath, `egg-${eggFileName}.json`);
    
    console.log('Looking for egg file at:', eggFilePath);
    
    // Try different path variations if the file doesn't exist
    let eggConfig = null;
    const possiblePaths = [
      eggFilePath,
      path.join(EGGS_PATH, eggOriginalPath.replace(/_/g, '/'), `egg-${eggFileName}.json`),
      path.join(EGGS_PATH, egg.category.toLowerCase().replace(/[^a-z0-9]/g, '_'), 
                egg.subcategory, `egg-${eggFileName}.json`),
      path.join(EGGS_PATH, egg.category.toLowerCase(), egg.subcategory, `egg-${eggFileName}.json`)
    ];
    
    for (const possiblePath of possiblePaths) {
      console.log('Trying path:', possiblePath);
      if (fs.existsSync(possiblePath)) {
        console.log('Found egg at:', possiblePath);
        eggConfig = JSON.parse(fs.readFileSync(possiblePath, 'utf8'));
        break;
      }
    }
    
    if (!eggConfig) {
      console.error('Egg file not found in any of these paths:', possiblePaths);
      return res.status(404).json({ error: 'Egg configuration not found' });
    }
    
    const serverConfig = {
      id: serverId,
      name,
      egg: eggConfig,
      eggData: egg.data,
      environment: environment || {},
      ports: ports || [{ internal: 25565, external: 25565 }],
      memory: parseInt(memory),
      cpu: parseInt(cpu),
      disk: parseInt(disk),
      startupCommand: startupCommand || eggConfig.startup || '',
      status: 'stopped',
      created: new Date().toISOString()
    };
    
    console.log('Server config created:', serverConfig);
    
    // Save server configuration
    const configPath = path.join(SERVER_DATA_PATH, serverId, 'config.json');
    fs.ensureDirSync(path.dirname(configPath));
    fs.writeFileSync(configPath, JSON.stringify(serverConfig, null, 2));
    
    console.log('Server config saved to:', configPath);
    
    // Run server installation first
    console.log('Starting server installation process...');
    const installationSuccess = await runServerInstallation(serverConfig, eggConfig);
    
    if (!installationSuccess) {
      return res.status(500).json({ error: 'Server installation failed' });
    }
    
    // Create Docker container only after successful installation
    const container = await createGameServer(serverConfig);
    
    runningServers.set(serverId, {
      ...serverConfig,
      containerId: container.id
    });
    
    res.json({ id: serverId, ...serverConfig });
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all servers
app.get('/api/servers', async (req, res) => {
  try {
    const servers = [];
    const serverDirs = fs.readdirSync(SERVER_DATA_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const serverId of serverDirs) {
      const configPath = path.join(SERVER_DATA_PATH, serverId, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Check container status
        try {
          const container = docker.getContainer(`game_server_${serverId}`);
          const containerInfo = await container.inspect();
          config.status = containerInfo.State.Running ? 'running' : 'stopped';
        } catch (error) {
          config.status = 'offline';
        }
        
        servers.push(config);
      }
    }
    
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific server
app.get('/api/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const configPath = path.join(SERVER_DATA_PATH, id, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Check container status
    try {
      const container = docker.getContainer(`game_server_${id}`);
      const containerInfo = await container.inspect();
      config.status = containerInfo.State.Running ? 'running' : 'stopped';
    } catch (error) {
      config.status = 'offline';
    }
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.post('/api/servers/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Starting server ${id}...`);
    
    const container = docker.getContainer(`game_server_${id}`);
    
    // Check if container exists
    try {
      await container.inspect();
      console.log(`Container game_server_${id} exists`);
    } catch (error) {
      console.error(`Container game_server_${id} does not exist:`, error.message);
      return res.status(404).json({ error: 'Container not found' });
    }
    
    await container.start();
    console.log(`Container game_server_${id} started successfully`);
    
    // Setup log streaming with better error handling
    try {
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: true
      });
      
      console.log(`Log streaming setup for server ${id}`);
      
      logStream.on('data', (chunk) => {
        const log = chunk.toString().trim();
        if (log) {
          console.log(`[Server ${id}] Log:`, log);
          io.to(`server_${id}`).emit('server_log', { 
            serverId: id, 
            log: log,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      logStream.on('error', (error) => {
        console.error(`Log stream error for server ${id}:`, error);
      });
      
      // Also get existing logs
      const existingLogs = await container.logs({
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: 100
      });
      
      const existingLogData = existingLogs.toString().trim();
      if (existingLogData) {
        console.log(`[Server ${id}] Existing logs:`, existingLogData);
        io.to(`server_${id}`).emit('server_log', { 
          serverId: id, 
          log: existingLogData,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (logError) {
      console.error(`Failed to setup log streaming for server ${id}:`, logError);
    }
    
    res.json({ message: 'Server started' });
  } catch (error) {
    console.error(`Error starting server ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Stop server
app.post('/api/servers/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(`game_server_${id}`);
    
    await container.stop();
    res.json({ message: 'Server stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
app.post('/api/servers/:id/restart', async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(`game_server_${id}`);
    
    await container.restart();
    res.json({ message: 'Server restarted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send command to server
app.post('/api/servers/:id/command', async (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    
    const container = docker.getContainer(`game_server_${id}`);
    
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true
    });
    
    const stream = await exec.start();
    
    let output = '';
    stream.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    stream.on('end', () => {
      io.to(`server_${id}`).emit('command_result', { serverId: id, command, output });
    });
    
    res.json({ message: 'Command sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete server
app.delete('/api/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Stop and remove container
    try {
      const container = docker.getContainer(`game_server_${id}`);
      await container.stop();
      await container.remove();
    } catch (error) {
      console.log('Container not found or already removed');
    }
    
    // Remove server data
    const serverDir = path.join(SERVER_DATA_PATH, id);
    if (fs.existsSync(serverDir)) {
      fs.removeSync(serverDir);
    }
    
    runningServers.delete(id);
    
    res.json({ message: 'Server deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get server files
app.get('/api/servers/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: relativePath = '' } = req.query;
    
    const serverDir = path.join(SERVER_DATA_PATH, id);
    const targetPath = path.join(serverDir, relativePath);
    
    // Security check
    if (!targetPath.startsWith(serverDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }
    
    const stats = fs.statSync(targetPath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(targetPath).map(name => {
        const filePath = path.join(targetPath, name);
        const fileStats = fs.statSync(filePath);
        
        return {
          name,
          type: fileStats.isDirectory() ? 'directory' : 'file',
          size: fileStats.size,
          modified: fileStats.mtime
        };
      });
      
      res.json({ type: 'directory', files });
    } else {
      const content = fs.readFileSync(targetPath, 'utf8');
      res.json({ type: 'file', content });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint - send test log to server console
app.post('/api/servers/:id/test-log', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    const testMessage = message || `Test log message at ${new Date().toISOString()}`;
    
    console.log(`Sending test log to server ${id}:`, testMessage);
    
    io.to(`server_${id}`).emit('server_log', {
      serverId: id,
      log: testMessage,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      message: 'Test log sent',
      sentTo: `server_${id}`,
      log: testMessage
    });
    
  } catch (error) {
    console.error(`Error sending test log:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - get container details
app.get('/api/servers/:id/debug', async (req, res) => {
  try {
    const { id } = req.params;
    const containerName = `game_server_${id}`;
    
    console.log(`Debug request for server ${id}, container: ${containerName}`);
    
    // Check if container exists
    try {
      const container = docker.getContainer(containerName);
      const containerInfo = await container.inspect();
      
      // Get recent logs
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: 50
      });
      
      const debugInfo = {
        containerId: containerInfo.Id,
        containerName: containerInfo.Name,
        state: containerInfo.State,
        config: {
          image: containerInfo.Config.Image,
          cmd: containerInfo.Config.Cmd,
          env: containerInfo.Config.Env,
          workingDir: containerInfo.Config.WorkingDir
        },
        hostConfig: {
          portBindings: containerInfo.HostConfig.PortBindings,
          binds: containerInfo.HostConfig.Binds,
          memory: containerInfo.HostConfig.Memory
        },
        logs: logs.toString()
      };
      
      console.log(`Debug info for ${id}:`, JSON.stringify(debugInfo, null, 2));
      res.json(debugInfo);
      
    } catch (containerError) {
      console.error(`Container ${containerName} not found:`, containerError.message);
      res.status(404).json({ 
        error: 'Container not found',
        containerName,
        details: containerError.message
      });
    }
    
  } catch (error) {
    console.error(`Debug error for server ${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// File management endpoints

// Get server files/directories
app.get('/api/servers/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: relativePath = '.' } = req.query;
    
    const serverDir = path.join(SERVER_DATA_PATH, id);
    const fullPath = path.join(serverDir, relativePath);
    
    // Security check - ensure path is within server directory
    if (!fullPath.startsWith(serverDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }
    
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      const items = fs.readdirSync(fullPath, { withFileTypes: true })
        .map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : null,
          modified: fs.statSync(path.join(fullPath, item.name)).mtime.toISOString()
        }))
        .sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      
      res.json({
        type: 'directory',
        path: relativePath,
        items
      });
    } else {
      // Return file info
      res.json({
        type: 'file',
        path: relativePath,
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
    }
  } catch (error) {
    console.error('Error getting server files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read file content
app.get('/api/servers/:id/files/content', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: relativePath } = req.query;
    
    if (!relativePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const serverDir = path.join(SERVER_DATA_PATH, id);
    const fullPath = path.join(serverDir, relativePath);
    
    // Security check
    if (!fullPath.startsWith(serverDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }
    
    // Check file size (limit to 10MB for editing)
    if (stats.size > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large for editing' });
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({
      path: relativePath,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write file content
app.put('/api/servers/:id/files/content', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: relativePath, content } = req.body;
    
    if (!relativePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }
    
    const serverDir = path.join(SERVER_DATA_PATH, id);
    const fullPath = path.join(serverDir, relativePath);
    
    // Security check
    if (!fullPath.startsWith(serverDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Ensure directory exists
    fs.ensureDirSync(path.dirname(fullPath));
    
    // Write file
    fs.writeFileSync(fullPath, content, 'utf8');
    
    const stats = fs.statSync(fullPath);
    res.json({
      path: relativePath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create directory
app.post('/api/servers/:id/files/directory', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: relativePath, name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Directory name is required' });
    }
    
    const serverDir = path.join(SERVER_DATA_PATH, id);
    const basePath = path.join(serverDir, relativePath || '.');
    const fullPath = path.join(basePath, name);
    
    // Security check
    if (!fullPath.startsWith(serverDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (fs.existsSync(fullPath)) {
      return res.status(409).json({ error: 'Directory already exists' });
    }
    
    fs.ensureDirSync(fullPath);
    
    res.json({
      path: path.join(relativePath || '.', name),
      success: true
    });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file or directory
app.delete('/api/servers/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: relativePath } = req.query;
    
    if (!relativePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const serverDir = path.join(SERVER_DATA_PATH, id);
    const fullPath = path.join(serverDir, relativePath);
    
    // Security check
    if (!fullPath.startsWith(serverDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File or directory not found' });
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server settings endpoints

// Get server settings
app.get('/api/servers/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const configPath = path.join(SERVER_DATA_PATH, id, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.json(config);
  } catch (error) {
    console.error('Error getting server settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update server settings
app.put('/api/servers/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { startupCommand, environment, memory, cpu, disk } = req.body;
    
    const configPath = path.join(SERVER_DATA_PATH, id, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Update settings
    if (startupCommand !== undefined) config.startupCommand = startupCommand;
    if (environment !== undefined) config.environment = environment;
    if (memory !== undefined) config.memory = parseInt(memory);
    if (cpu !== undefined) config.cpu = parseInt(cpu);
    if (disk !== undefined) config.disk = parseInt(disk);
    
    // Save updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Update running server info
    if (runningServers.has(id)) {
      const serverInfo = runningServers.get(id);
      runningServers.set(id, { ...serverInfo, ...config });
    }
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating server settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, async () => {
  console.log(`Game Panel Backend running on port ${PORT}`);
  console.log(`Eggs path: ${EGGS_PATH}`);
  console.log(`Server data path: ${SERVER_DATA_PATH}`);
  
  // Preload base Docker images in background
  preloadBaseImages().catch(err => {
    console.log('Warning: Failed to preload some Docker images:', err.message);
  });
});