const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Virtual robot state for simulation
const virtualRobot = {
  x: 0,
  y: 0,
  direction: 0, // angle in degrees (0 = facing right)
  speed: 0,
  status: 'stopped',
  lastCommand: null,
  
  // Update robot position based on commands
  update() {
    if (this.status === 'moving') {
      // Update position based on direction and speed
      const radians = (this.direction * Math.PI) / 180;
      this.x += Math.cos(radians) * (this.speed / 100);
      this.y += Math.sin(radians) * (this.speed / 100);
    }
  }
};

// Simulation update interval (100ms)
setInterval(() => {
  virtualRobot.update();
}, 100);

// Handle socket connections
io.on('connection', (socket) => {
  console.log('🟢 Client connected');
  
  // Send initial robot state
  socket.emit('robot-state', getVirtualRobotState());

  socket.on('robot-command', (data) => {
    console.log('\n📡 Received command:', data);
    
    // Update virtual robot state based on command
    updateVirtualRobot(data);
    
    // Format command (as if sending to real robot)
    let command = formatCommand(data);
    console.log('🤖 Formatted robot command:', command);
    
    // Echo command back to client with virtual robot state
    socket.emit('command-received', {
      status: 'success',
      command: data,
      robotState: getVirtualRobotState()
    });

    // Broadcast updated robot state to all clients
    io.emit('robot-state', getVirtualRobotState());
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected');
    // Stop virtual robot
    updateVirtualRobot({ command: 'stop' });
    io.emit('robot-state', getVirtualRobotState());
  });
});

// Format commands for robot (kept for future real robot implementation)
function formatCommand(data) {
  const { command, speed = 100, angle = 0, intensity = 1.0 } = data;
  const scaledSpeed = Math.floor(speed * intensity);
  
  switch (command) {
    case 'forward':
      return `MOVE F ${scaledSpeed}`;
    case 'backward':
      return `MOVE B ${scaledSpeed}`;
    case 'left':
      return `TURN L ${scaledSpeed}`;
    case 'right':
      return `TURN R ${scaledSpeed}`;
    case 'stop':
      return 'STOP';
    default:
      return 'STOP';
  }
}

// Update virtual robot state based on commands
function updateVirtualRobot(data) {
  const { command, speed = 100, angle = 0, intensity = 1.0 } = data;
  virtualRobot.lastCommand = command;
  
  switch (command) {
    case 'forward':
      virtualRobot.speed = speed * intensity;
      virtualRobot.status = 'moving';
      break;
    case 'backward':
      virtualRobot.speed = -speed * intensity;
      virtualRobot.status = 'moving';
      break;
    case 'left':
      virtualRobot.direction = (virtualRobot.direction - 5) % 360;
      virtualRobot.status = 'turning';
      break;
    case 'right':
      virtualRobot.direction = (virtualRobot.direction + 5) % 360;
      virtualRobot.status = 'turning';
      break;
    case 'stop':
      virtualRobot.speed = 0;
      virtualRobot.status = 'stopped';
      break;
  }
}

// Get current state of virtual robot
function getVirtualRobotState() {
  return {
    position: { x: Math.round(virtualRobot.x * 100) / 100, y: Math.round(virtualRobot.y * 100) / 100 },
    direction: virtualRobot.direction,
    speed: virtualRobot.speed,
    status: virtualRobot.status,
    lastCommand: virtualRobot.lastCommand
  };
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
🤖 Virtual robot simulation active
📱 Ready to accept WebSocket connections
  `);
}); 