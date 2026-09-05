import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let newSocket;
    
    // Only connect if the user is logged in and we have a token
    const token = localStorage.getItem('resell_token');
    
    if (user && token) {
      newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
