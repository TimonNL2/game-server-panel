import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function ServerSettings() {
  const { id } = useParams();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    startupCommand: '',
    environment: {},
    memory: 1024,
    cpu: 100,
    disk: 5000
  });

  useEffect(() => {
    loadSettings();
  }, [id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/servers/${id}/settings`);
      setSettings(response.data);
      setFormData({
        startupCommand: response.data.startupCommand || '',
        environment: response.data.environment || {},
        memory: response.data.memory || 1024,
        cpu: response.data.cpu || 100,
        disk: response.data.disk || 5000
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load server settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnvironmentChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [key]: value
      }
    }));
  };

  const addEnvironmentVariable = () => {
    const key = prompt('Enter variable name:');
    if (key && key.trim()) {
      handleEnvironmentChange(key.trim(), '');
    }
  };

  const removeEnvironmentVariable = (key) => {
    setFormData(prev => {
      const newEnv = { ...prev.environment };
      delete newEnv[key];
      return {
        ...prev,
        environment: newEnv
      };
    });
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put(`/api/servers/${id}/settings`, formData);
      toast.success('Settings saved successfully');
      loadSettings(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="text-center">Loading server settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-white">
        <div className="text-center text-red-400">Failed to load server settings</div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Server Settings</h2>
        <p className="text-gray-400">Configure your server's startup and environment settings</p>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Server Name</label>
              <input
                type="text"
                value={settings.name}
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Server ID</label>
              <input
                type="text"
                value={settings.id}
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Game Type</label>
              <input
                type="text"
                value={settings.egg?.name || 'Unknown'}
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Created</label>
              <input
                type="text"
                value={new Date(settings.created).toLocaleString()}
                disabled
                className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Resource Allocation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Resource Allocation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Memory (MB)</label>
              <input
                type="number"
                value={formData.memory}
                onChange={(e) => setFormData(prev => ({ ...prev, memory: parseInt(e.target.value) }))}
                min="128"
                max="32768"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CPU (%)</label>
              <input
                type="number"
                value={formData.cpu}
                onChange={(e) => setFormData(prev => ({ ...prev, cpu: parseInt(e.target.value) }))}
                min="10"
                max="1000"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Disk Space (MB)</label>
              <input
                type="number"
                value={formData.disk}
                onChange={(e) => setFormData(prev => ({ ...prev, disk: parseInt(e.target.value) }))}
                min="512"
                max="102400"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Startup Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Startup Settings</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Startup Command</label>
            <div className="mb-2">
              <p className="text-xs text-gray-400">
                Available variables: {`{SERVER_MEMORY}`} {`{SERVER_JARFILE}`} {`{MC_VERSION}`} and more
              </p>
            </div>
            <textarea
              value={formData.startupCommand}
              onChange={(e) => setFormData(prev => ({ ...prev, startupCommand: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md font-mono text-sm"
              placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}"
            />
          </div>
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Environment Variables</h3>
            <button
              onClick={addEnvironmentVariable}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Add Variable
            </button>
          </div>
          
          <div className="space-y-3">
            {Object.entries(formData.environment).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={key}
                    disabled
                    className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md font-mono text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleEnvironmentChange(key, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                    placeholder="Variable value"
                  />
                </div>
                <button
                  onClick={() => removeEnvironmentVariable(key)}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            
            {Object.keys(formData.environment).length === 0 && (
              <div className="text-gray-400 text-center py-4">
                No environment variables configured
              </div>
            )}
          </div>
        </div>

        {/* Port Configuration */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Port Configuration</h3>
          <div className="space-y-3">
            {settings.ports?.map((port, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Internal Port</label>
                  <input
                    type="number"
                    value={port.internal}
                    disabled
                    className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">External Port</label>
                  <input
                    type="number"
                    value={port.external}
                    disabled
                    className="w-full px-3 py-2 bg-gray-700 text-gray-400 rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Port configuration is set during server creation and cannot be changed
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServerSettings;