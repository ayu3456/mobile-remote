import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import nipplejs, { JoystickManager } from 'nipplejs';
import './App.css';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [robotIp, setRobotIp] = useState('192.168.43.243');
  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);
  const [speedJoystick, setSpeedJoystick] = useState<JoystickManager | null>(null);
  const [directionJoystick, setDirectionJoystick] = useState<JoystickManager | null>(null);

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

    // Create forward/backward joystick with mobile-optimized settings
    const speed = nipplejs.create({
      zone: leftJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#007bff',
      lockY: true,
      size: 150,
      dynamicPage: true,
      restJoystick: true,
      restOpacity: 0.7,
    });

    // Create directional joystick with mobile-optimized settings
    const direction = nipplejs.create({
      zone: rightJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#007bff',
      size: 150,
      dynamicPage: true,
      restJoystick: true,
      restOpacity: 0.7,
    });

    setSpeedJoystick(speed);
    setDirectionJoystick(direction);

    speed.on('move', (evt, data) => {
      if (socket && data.direction) {
        const speed = Math.min(Math.abs(data.distance) / 2, 100);
        const command = data.direction.y === 'up' ? 'forward' : 'backward';
        socket.emit('robot-command', { command, speed });
      }
    });

    direction.on('move', (evt, data) => {
      if (socket && data.direction) {
        const angle = data.angle.degree;
        let command = 'stop';
        
        // Convert angle to direction with smoother transitions
        if (angle > 45 && angle <= 135) command = 'forward';
        else if (angle > 135 && angle <= 225) command = 'left';
        else if (angle > 225 && angle <= 315) command = 'backward';
        else command = 'right';

        const intensity = Math.min(data.distance / 50, 1);
        socket.emit('robot-command', { command, angle, intensity });
      }
    });

    // Stop on joystick release with smooth deceleration
    speed.on('end', () => {
      if (socket) {
        socket.emit('robot-command', { command: 'stop', speed: 0, decelerate: true });
      }
    });

    direction.on('end', () => {
      if (socket) {
        socket.emit('robot-command', { command: 'stop', angle: 0, decelerate: true });
      }
    });

    // Handle visibility change (when user switches tabs/apps)
    const handleVisibilityChange = () => {
      if (document.hidden && socket) {
        socket.emit('robot-command', { command: 'stop', speed: 0, angle: 0 });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      speed.destroy();
      direction.destroy();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket]);

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reconnect socket when IP changes
    if (socket) {
      socket.disconnect();
    }
  };

  return (
    <div className="app">
      <div className="control-panel">
        <div className="connection-status" style={{ color: connected ? 'green' : 'red' }}>
          {connected ? 'Connected to Robot' : 'Disconnected'}
        </div>
        <form onSubmit={handleIpSubmit}>
          <div className="ip-input">
            <input 
              type="text" 
              value={robotIp} 
              onChange={(e) => setRobotIp(e.target.value)}
              placeholder="Robot IP Address"
              pattern="\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
              title="Please enter a valid IP address"
            />
          </div>
        </form>
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