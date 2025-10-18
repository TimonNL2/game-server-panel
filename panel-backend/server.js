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
const EGGS_PATH = path.join(__dirname, '..', 'eggs');
const SERVER_DATA_PATH = path.join(__dirname, '..', 'server-data');
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
    socket.join(`server_${serverId}`);
  });
  
  socket.on('leave_server', (serverId) => {
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
  
  // Function to recursively scan for egg files
  function scanDirectory(dirPath, currentPath = []) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath, [...currentPath, item.name]);
      } else if (item.name.startsWith('egg-') && item.name.endsWith('.json')) {
        // Found an egg file
        try {
          const eggData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const eggName = item.name.replace('egg-', '').replace('.json', '');
          
          // Create nested structure based on directory path
          let current = eggs;
          for (let i = 0; i < currentPath.length; i++) {
            const pathSegment = currentPath[i];
            if (!current[pathSegment]) {
              current[pathSegment] = {};
            }
            if (i === currentPath.length - 1) {
              // Last level - add the egg
              current[pathSegment][eggName] = {
                name: eggData.name || eggName,
                description: eggData.description || '',
                author: eggData.author || '',
                image: eggData.docker_image || 'node:18-alpine',
                category: currentPath.join('/'),
                fullData: eggData
              };
            } else {
              current = current[pathSegment];
            }
          }
          
          console.log(`Found egg: ${currentPath.join('/')}/${eggName}`);
        } catch (error) {
          console.error(`Error parsing egg ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  // Start scanning from the eggs directory
  scanDirectory(EGGS_PATH);
  
  console.log('Total egg categories found:', Object.keys(eggs).length);
  console.log('Categories:', Object.keys(eggs));
  
  return eggs;
}

// Helper function to create Docker container
async function createGameServer(serverConfig) {
  const { id, name, egg, environment, ports, memory } = serverConfig;
  
  const serverDir = path.join(SERVER_DATA_PATH, id);
  fs.ensureDirSync(serverDir);
  
  // Get Docker image from egg
  const dockerImages = Object.values(egg.docker_images);
  const dockerImage = dockerImages[0]; // Use first available image
  
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
  
  const containerConfig = {
    name: `game_server_${id}`,
    Image: dockerImage,
    Env: envVars,
    HostConfig: {
      PortBindings: portBindings,
      Memory: memory * 1024 * 1024, // Convert MB to bytes
      Binds: [`${serverDir}:/home/container`],
      RestartPolicy: { Name: 'unless-stopped' }
    },
    ExposedPorts: exposedPorts,
    WorkingDir: '/home/container',
    User: '1000:1000'
  };
  
  try {
    const container = await docker.createContainer(containerConfig);
    return container;
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
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
    const { name, eggPath, environment, ports, memory = 1024 } = req.body;
    const serverId = uuidv4();
    
    // Load egg configuration
    const [category, subcategory, eggName] = eggPath.split('/');
    const eggFilePath = path.join(EGGS_PATH, category, subcategory, `egg-${eggName}.json`);
    const egg = JSON.parse(fs.readFileSync(eggFilePath, 'utf8'));
    
    const serverConfig = {
      id: serverId,
      name,
      egg,
      environment,
      ports,
      memory,
      status: 'stopped',
      created: new Date().toISOString()
    };
    
    // Save server configuration
    const configPath = path.join(SERVER_DATA_PATH, serverId, 'config.json');
    fs.ensureDirSync(path.dirname(configPath));
    fs.writeFileSync(configPath, JSON.stringify(serverConfig, null, 2));
    
    // Create Docker container
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
    const container = docker.getContainer(`game_server_${id}`);
    
    await container.start();
    
    // Setup log streaming
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: true
    });
    
    logStream.on('data', (chunk) => {
      const log = chunk.toString();
      io.to(`server_${id}`).emit('server_log', { serverId: id, log });
    });
    
    res.json({ message: 'Server started' });
  } catch (error) {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`Game Panel Backend running on port ${PORT}`);
  console.log(`Eggs path: ${EGGS_PATH}`);
  console.log(`Server data path: ${SERVER_DATA_PATH}`);
});