import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function CreateServer() {
  const navigate = useNavigate();
  const [eggs, setEggs] = useState({});
  const [selectedEgg, setSelectedEgg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    memory: 1024,
    cpu: 100,
    disk: 5000,
    ports: [25565]
  });

  useEffect(() => {
    fetchEggs();
  }, []);

  const fetchEggs = async () => {
    try {
      const response = await axios.get('/api/eggs');
      setEggs(response.data);
    } catch (error) {
      console.error('Error fetching eggs:', error);
      toast.error('Failed to load game eggs');
    }
  };

  const handleEggSelect = (category, subcategory, eggName, eggData) => {
    setSelectedEgg({
      category,
      subcategory,
      eggName,
      data: eggData
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEgg) {
      toast.error('Please select a game egg');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a server name');
      return;
    }

    try {
      const serverConfig = {
        name: formData.name,
        egg: selectedEgg,
        resources: {
          memory: formData.memory,
          cpu: formData.cpu,
          disk: formData.disk
        },
        ports: formData.ports
      };

      await axios.post('/api/servers', serverConfig);
      toast.success('Server created successfully!');
      navigate('/servers');
    } catch (error) {
      console.error('Error creating server:', error);
      toast.error('Failed to create server');
    }
  };

  // Filter eggs based on search term
  const filteredEggs = useMemo(() => {
    if (!searchTerm.trim()) return eggs;
    
    const filtered = {};
    Object.entries(eggs).forEach(([category, eggList]) => {
      const filteredList = {};
      Object.entries(eggList).forEach(([eggId, eggData]) => {
        if (
          eggData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eggData.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          filteredList[eggId] = eggData;
        }
      });
      
      if (Object.keys(filteredList).length > 0) {
        filtered[category] = filteredList;
      }
    });
    
    return filtered;
  }, [eggs, searchTerm]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gray-800 rounded-lg shadow-xl">
        <div className="px-6 py-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">Create New Server</h1>
          <p className="text-gray-400 mt-1">Configure your new game server</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Egg Selection */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Select Game</h2>
              
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search for an egg..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Egg List */}
              <div className="bg-gray-700 rounded border border-gray-600 max-h-96 overflow-y-auto">
                {Object.entries(filteredEggs).map(([category, eggList]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-4 py-2 bg-gray-600 text-sm font-medium text-gray-200 border-b border-gray-500">
                      {category}
                    </div>
                    
                    {/* Eggs */}
                    {Object.entries(eggList).map(([eggId, eggData]) => (
                      <div
                        key={eggId}
                        onClick={() => handleEggSelect(category, eggData.subcategory, eggData.eggFile, eggData)}
                        className={`px-4 py-3 cursor-pointer border-b border-gray-600 last:border-b-0 hover:bg-gray-600 transition-colors ${
                          selectedEgg?.data.id === eggData.id ? 'bg-blue-600 hover:bg-blue-500' : ''
                        }`}
                      >
                        <h4 className="text-white font-medium">{eggData.name}</h4>
                        <p className="text-sm text-gray-300 mt-1">
                          {eggData.description.length > 60 
                            ? `${eggData.description.substring(0, 60)}...` 
                            : eggData.description
                          }
                        </p>
                        {eggData.author && (
                          <span className="inline-block mt-1 text-xs text-gray-400">
                            by {eggData.author}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                
                {Object.keys(filteredEggs).length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400">
                    {searchTerm ? `No eggs found for "${searchTerm}"` : 'No eggs available'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Server Configuration */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Server Configuration</h2>
              
              <div className="space-y-4">
                {/* Server Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Awesome Server"
                    required
                  />
                </div>

                {/* Selected Egg Display */}
                {selectedEgg && (
                  <div className="bg-gray-700 rounded p-4 border border-gray-600">
                    <h3 className="text-white font-medium mb-2">Selected Game</h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {selectedEgg.data.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{selectedEgg.data.name}</p>
                        <p className="text-sm text-gray-400">{selectedEgg.category}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resource Allocation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Memory (MB)
                    </label>
                    <input
                      type="number"
                      value={formData.memory}
                      onChange={(e) => setFormData({...formData, memory: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="512"
                      step="256"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      CPU (%)
                    </label>
                    <input
                      type="number"
                      value={formData.cpu}
                      onChange={(e) => setFormData({...formData, cpu: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="10"
                      max="1000"
                      step="10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Disk (MB)
                    </label>
                    <input
                      type="number"
                      value={formData.disk}
                      onChange={(e) => setFormData({...formData, disk: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1000"
                      step="1000"
                    />
                  </div>
                </div>

                {/* Primary Port */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Primary Port
                  </label>
                  <input
                    type="number"
                    value={formData.ports[0]}
                    onChange={(e) => setFormData({
                      ...formData, 
                      ports: [parseInt(e.target.value), ...formData.ports.slice(1)]
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1024"
                    max="65535"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Port your server will listen on
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/servers')}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedEgg || !formData.name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Create Server
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateServer;