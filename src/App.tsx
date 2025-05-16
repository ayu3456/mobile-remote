import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import nipplejs from 'nipplejs';
import './App.css';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [robotIp, setRobotIp] = useState('192.168.43.243');
  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(`http://${robotIp}:3000`);

    newSocket.on('connect', () => {
      console.log('Connected to robot!');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from robot');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [robotIp]);

  useEffect(() => {
    if (!leftJoystickRef.current || !rightJoystickRef.current) return;

    // Create forward/backward joystick
    const speedJoystick = nipplejs.create({
      zone: leftJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'blue',
      lockY: true // Only allow vertical movement
    });

    // Create directional joystick
    const directionJoystick = nipplejs.create({
      zone: rightJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'blue'
    });

    speedJoystick.on('move', (evt, data) => {
      if (socket && data.direction) {
        const speed = Math.min(Math.abs(data.distance) / 2, 100);
        const command = data.direction.y === 'up' ? 'forward' : 'backward';
        socket.emit('robot-command', { command, speed });
      }
    });

    directionJoystick.on('move', (evt, data) => {
      if (socket && data.direction) {
        const angle = data.angle.degree;
        let command = 'stop';
        
        // Convert angle to direction
        if (angle > 45 && angle <= 135) command = 'forward';
        else if (angle > 135 && angle <= 225) command = 'left';
        else if (angle > 225 && angle <= 315) command = 'backward';
        else command = 'right';

        socket.emit('robot-command', { command, angle });
      }
    });

    // Stop on joystick release
    speedJoystick.on('end', () => {
      if (socket) socket.emit('robot-command', { command: 'stop', speed: 0 });
    });

    directionJoystick.on('end', () => {
      if (socket) socket.emit('robot-command', { command: 'stop', angle: 0 });
    });

    return () => {
      speedJoystick.destroy();
      directionJoystick.destroy();
    };
  }, [socket]);

  return (
    <div className="app">
      <div className="control-panel">
        <div className="connection-status" style={{ color: connected ? 'green' : 'red' }}>
          {connected ? 'Connected to Robot' : 'Disconnected'}
        </div>
        <div className="ip-input">
          <input 
            type="text" 
            value={robotIp} 
            onChange={(e) => setRobotIp(e.target.value)}
            placeholder="Robot IP Address"
          />
        </div>
        <div className="joysticks-container">
          <div className="joystick" ref={leftJoystickRef}>
            <div className="joystick-label">Speed Control</div>
          </div>
          <div className="joystick" ref={rightJoystickRef}>
            <div className="joystick-label">Direction Control</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 