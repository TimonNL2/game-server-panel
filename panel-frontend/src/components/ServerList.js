import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

function ServerList() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await axios.get('/api/servers');
      setServers(response.data);
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast.error('Fout bij ophalen servers');
    } finally {
      setLoading(false);
    }
  };

  const handleServerAction = async (serverId, action) => {
    try {
      await axios.post(`/api/servers/${serverId}/${action}`);
      toast.success(`Server ${action === 'start' ? 'gestart' : action === 'stop' ? 'gestopt' : 'herstart'}`);
      
      // Refresh server list after action
      setTimeout(fetchServers, 1000);
    } catch (error) {
      console.error(`Error ${action} server:`, error);
      toast.error(`Fout bij ${action} server`);
    }
  };

  const handleDeleteServer = async (serverId, serverName) => {
    if (!window.confirm(`Weet je zeker dat je server "${serverName}" wilt verwijderen?`)) {
      return;
    }

    try {
      await axios.delete(`/api/servers/${serverId}`);
      toast.success('Server verwijderd');
      fetchServers();
    } catch (error) {
      console.error('Error deleting server:', error);
      toast.error('Fout bij verwijderen server');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Servers</h1>
          <p className="text-gray-400 mt-2">Beheer je game servers</p>
        </div>
        <Link to="/servers/new" className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nieuwe Server
        </Link>
      </div>

      {servers.length === 0 ? (
        <div className="card p-8 text-center">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Geen servers gevonden</h3>
          <p className="text-gray-400 mb-4">Begin met het maken van je eerste game server.</p>
          <Link to="/servers/new" className="btn-primary">
            Maak je eerste server
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onAction={handleServerAction}
              onDelete={handleDeleteServer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServerCard({ server, onAction, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-green-400';
      case 'stopped':
        return 'text-red-400';
      case 'offline':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-400';
      case 'stopped':
        return 'bg-red-400';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 rounded-full ${getStatusDot(server.status)}`}></div>
          <div>
            <h3 className="text-xl font-semibold text-white">{server.name}</h3>
            <p className="text-gray-400">{server.egg?.name || 'Unknown Game'}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(server.status)}`}>
            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Memory</p>
          <p className="text-white font-medium">{server.memory || 1024} MB</p>
        </div>
        <div>
          <p className="text-gray-400">Poorten</p>
          <p className="text-white font-medium">
            {server.ports?.map(p => p.external).join(', ') || 'Geen'}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Aangemaakt</p>
          <p className="text-white font-medium">
            {new Date(server.created).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-gray-400">ID</p>
          <p className="text-white font-medium text-xs">{server.id.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {server.status === 'stopped' || server.status === 'offline' ? (
            <button
              onClick={() => onAction(server.id, 'start')}
              className="btn-success flex items-center text-sm"
            >
              <PlayIcon className="h-4 w-4 mr-1" />
              Start
            </button>
          ) : (
            <button
              onClick={() => onAction(server.id, 'stop')}
              className="btn-danger flex items-center text-sm"
            >
              <StopIcon className="h-4 w-4 mr-1" />
              Stop
            </button>
          )}
          
          <button
            onClick={() => onAction(server.id, 'restart')}
            className="btn-secondary flex items-center text-sm"
            disabled={server.status === 'offline'}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Restart
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/servers/${server.id}`}
            className="btn-primary flex items-center text-sm"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            Bekijk
          </Link>
          
          <button
            onClick={() => onDelete(server.id, server.name)}
            className="btn-danger flex items-center text-sm"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Verwijder
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServerList;