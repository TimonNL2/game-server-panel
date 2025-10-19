import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  TrashIcon,
  CommandLineIcon,
  DocumentTextIcon,
  CogIcon
} from '@heroicons/react/24/outline';

function ServerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, joinServer, leaveServer } = useSocket();
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('console');
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchServer();
    if (socket) {
      joinServer(id);
      
      socket.on('server_log', handleServerLog);
      socket.on('command_result', handleCommandResult);
      
      return () => {
        socket.off('server_log', handleServerLog);
        socket.off('command_result', handleCommandResult);
        leaveServer(id);
      };
    }
  }, [id, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const fetchServer = async () => {
    try {
      const response = await axios.get(`/api/servers/${id}`);
      setServer(response.data);
    } catch (error) {
      console.error('Error fetching server:', error);
      toast.error('Server niet gevonden');
      navigate('/servers');
    } finally {
      setLoading(false);
    }
  };

  const handleServerLog = (data) => {
    console.log('Received server log:', data); // Debug logging
    if (data.serverId === id) {
      setLogs(prev => [...prev, {
        timestamp: new Date(data.timestamp || new Date()),
        message: data.log.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
      }]);
    }
  };

  const handleCommandResult = (data) => {
    if (data.serverId === id) {
      setLogs(prev => [...prev, {
        timestamp: new Date(),
        message: `Command: ${data.command}\nOutput: ${data.output}`
      }]);
    }
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleServerAction = async (action) => {
    try {
      await axios.post(`/api/servers/${id}/${action}`);
      toast.success(`Server ${action === 'start' ? 'gestart' : action === 'stop' ? 'gestopt' : 'herstart'}`);
      setTimeout(fetchServer, 1000);
    } catch (error) {
      console.error(`Error ${action} server:`, error);
      toast.error(`Fout bij ${action} server`);
    }
  };

  const sendCommand = async () => {
    if (!command.trim()) return;
    
    try {
      await axios.post(`/api/servers/${id}/command`, { command: command.trim() });
      setCommand('');
    } catch (error) {
      console.error('Error sending command:', error);
      toast.error('Fout bij versturen commando');
    }
  };

  const handleDeleteServer = async () => {
    if (!window.confirm(`Weet je zeker dat je server "${server.name}" wilt verwijderen?`)) {
      return;
    }

    try {
      await axios.delete(`/api/servers/${id}`);
      toast.success('Server verwijderd');
      navigate('/servers');
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

  if (!server) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">Server niet gevonden</h2>
      </div>
    );
  }

  const tabs = [
    { id: 'console', name: 'Console', icon: CommandLineIcon },
    { id: 'files', name: 'Bestanden', icon: DocumentTextIcon },
    { id: 'settings', name: 'Instellingen', icon: CogIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Server Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${
              server.status === 'running' ? 'bg-green-400' :
              server.status === 'stopped' ? 'bg-red-400' : 'bg-gray-400'
            }`}></div>
            <div>
              <h1 className="text-2xl font-bold text-white">{server.name}</h1>
              <p className="text-gray-400">{server.egg?.name || 'Unknown Game'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {server.status === 'stopped' || server.status === 'offline' ? (
              <button
                onClick={() => handleServerAction('start')}
                className="btn-success flex items-center"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Start
              </button>
            ) : (
              <button
                onClick={() => handleServerAction('stop')}
                className="btn-danger flex items-center"
              >
                <StopIcon className="h-5 w-5 mr-2" />
                Stop
              </button>
            )}
            
            <button
              onClick={() => handleServerAction('restart')}
              className="btn-secondary flex items-center"
              disabled={server.status === 'offline'}
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Restart
            </button>
            
            <button
              onClick={handleDeleteServer}
              className="btn-danger flex items-center"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Verwijder
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Status</p>
            <p className={`font-medium ${
              server.status === 'running' ? 'text-green-400' :
              server.status === 'stopped' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Memory</p>
            <p className="text-white font-medium">{server.memory} MB</p>
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
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {activeTab === 'console' && (
          <ConsoleTab 
            logs={logs} 
            command={command} 
            setCommand={setCommand} 
            onSendCommand={sendCommand}
            serverStatus={server.status}
            logsEndRef={logsEndRef}
          />
        )}
        {activeTab === 'files' && <FilesTab serverId={id} />}
        {activeTab === 'settings' && <SettingsTab server={server} onUpdate={fetchServer} />}
      </div>
    </div>
  );
}

function ConsoleTab({ logs, command, setCommand, onSendCommand, serverStatus, logsEndRef }) {
  return (
    <div className="space-y-4">
      <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-gray-400">Geen logs beschikbaar. Start de server om logs te zien.</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">
                [{log.timestamp.toLocaleTimeString()}]
              </span>
              <span className="text-gray-100 ml-2">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
      
      <div className="flex space-x-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSendCommand()}
          placeholder="Voer een commando in..."
          className="input-field flex-1"
          disabled={serverStatus !== 'running'}
        />
        <button
          onClick={onSendCommand}
          disabled={!command.trim() || serverStatus !== 'running'}
          className="btn-primary"
        >
          Verstuur
        </button>
      </div>
    </div>
  );
}

function FilesTab({ serverId }) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`/api/servers/${serverId}/files`, {
        params: { path: currentPath }
      });
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Fout bij ophalen bestanden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-400">Pad:</span>
        <span className="text-white">/{currentPath}</span>
      </div>
      
      <div className="space-y-2">
        {currentPath && (
          <button
            onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/'))}
            className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded"
          >
            <span className="text-blue-400">.. (Terug)</span>
          </button>
        )}
        
        {files.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600"
          >
            <div className="flex items-center space-x-3">
              <span className={file.type === 'directory' ? 'text-blue-400' : 'text-gray-300'}>
                {file.type === 'directory' ? '📁' : '📄'}
              </span>
              <span className="text-white">{file.name}</span>
            </div>
            <div className="text-sm text-gray-400">
              {file.type === 'file' && `${(file.size / 1024).toFixed(1)} KB`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ server, onUpdate }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Server Instellingen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Server Naam
            </label>
            <input
              type="text"
              value={server.name}
              className="input-field w-full"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Memory (MB)
            </label>
            <input
              type="number"
              value={server.memory}
              className="input-field w-full"
              readOnly
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-white mb-4">Poort Configuratie</h4>
        <div className="space-y-2">
          {server.ports?.map((port, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 bg-gray-700 rounded">
              <span className="text-gray-300">Poort {index + 1}:</span>
              <span className="text-white">{port.internal} → {port.external}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-white mb-4">Environment Variables</h4>
        <div className="space-y-2">
          {Object.entries(server.environment || {}).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-4 p-3 bg-gray-700 rounded">
              <span className="text-gray-300 font-mono text-sm">{key}:</span>
              <span className="text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ServerDetail;