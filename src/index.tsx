import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { authApi } from './AuthApi';
import "./index.css";
import Softphone from './softphone/Softphone';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user is already authenticated
        const existingUser = authApi.getCurrentUser();
        const existingToken = localStorage.getItem('token');
        
        if (existingUser && existingToken && authApi.isAuthenticated()) {
          setCurrentUser(existingUser);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Initialize Keycloak
        await authApi.initKeycloak((token: string | null) => {
          if (token) {
            const user = authApi.getCurrentUser();
            setCurrentUser(user);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        setIsLoading(false);
        setIsAuthenticated(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      // The login function will trigger a redirect, so we don't need to handle the response here
      await authApi.login();
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '20px'
      }}>
        <h1>Softphone Demo</h1>
        <p>Please login to continue</p>
        <button 
          onClick={handleLogin}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        {currentUser && (
          <span>Welcome, {currentUser.given_name || currentUser.username}</span>
        )}
        <button 
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
      <Softphone />
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);