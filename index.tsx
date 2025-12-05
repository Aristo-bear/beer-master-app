import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserAccount } from './src/types';
import { BreweryApp } from './src/components/BreweryApp';
import { AuthPage } from './src/pages/AuthPage';

const Root = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [breweryName, setBreweryName] = useState('');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const handleLogin = (brewery: string, user: UserAccount) => {
    setBreweryName(brewery);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setBreweryName('');
    setCurrentUser(null);
  };

  if (isAuthenticated && currentUser) {
    return (
      <BreweryApp breweryName={breweryName} currentUser={currentUser} onLogout={handleLogout} />
    );
  }

  return <AuthPage onLogin={handleLogin} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(<Root />);
