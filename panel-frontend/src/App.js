import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  HomeIcon,
  ServerIcon,
  CogIcon,
  PlusIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  TrashIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import Dashboard from './components/Dashboard';
import ServerList from './components/ServerList';
import ServerDetail from './components/ServerDetail';
import CreateServer from './components/CreateServer';
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-gray-900">
          <Toaster position="top-right" />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 ml-64">
              <Header />
              <div className="p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/servers" element={<ServerList />} />
                  <Route path="/servers/new" element={<CreateServer />} />
                  <Route path="/servers/:id" element={<ServerDetail />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </Router>
    </SocketProvider>
  );
}

function Sidebar() {
  const location = useLocation();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Servers', href: '/servers', icon: ServerIcon },
    { name: 'Create Server', href: '/servers/new', icon: PlusIcon },
  ];

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700">
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Game Panel</h1>
      </div>
      <nav className="mt-5 px-2">
        {navigation.map((item) => {
          const current = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1
                ${current
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <item.icon className="mr-3 h-6 w-6" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Game Server Management
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default App;