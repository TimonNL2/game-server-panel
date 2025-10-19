import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

function CreateServer() {
  const navigate = useNavigate();
  const [eggs, setEggs] = useState({});
  const [selectedEgg, setSelectedEgg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    memory: 1024,
    cpu: 100,
    disk: 5000,
    ports: [{ internal: 25565, external: 25565 }],
    environment: {},
    startupCommand: ''
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEggs();
  }, []);

  const fetchEggs = async () => {
    try {
      const response = await axios.get('/api/eggs');
      setEggs(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching eggs:', error);
      toast.error('Fout bij ophalen eggs');
      setLoading(false);
    }
  };

  const handleEggSelect = (category, subcategory, eggName, eggData) => {
    setSelectedEgg({
      category,
      subcategory,
      eggName,
      data: eggData
    });

    // Initialize environment variables from egg
    const envVars = {};
    if (eggData.variables && eggData.variables.length > 0) {
      eggData.variables.forEach(variable => {
        envVars[variable.env_variable] = variable.default_value || '';
      });
    }

    // Set startup command from egg
    const startupCmd = eggData.startup || '';

    setFormData(prev => ({
      ...prev,
      environment: envVars,
      startupCommand: startupCmd
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEgg) {
      toast.error('Selecteer eerst een game egg');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Voer een server naam in');
      return;
    }

    setCreating(true);

    try {
      const serverConfig = {
        name: formData.name.trim(),
        egg: selectedEgg,
        memory: parseInt(formData.memory),
        cpu: parseInt(formData.cpu),
        disk: parseInt(formData.disk),
        ports: formData.ports,
        environment: formData.environment
      };

      console.log('Creating server with config:', serverConfig);
      
      const response = await axios.post('/api/servers', serverConfig);
      console.log('Server created:', response.data);
      
      toast.success('Server succesvol aangemaakt!');
      navigate('/servers');
    } catch (error) {
      console.error('Error creating server:', error);
      toast.error(error.response?.data?.error || 'Fout bij aanmaken server');
    } finally {
      setCreating(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchTerm.trim()) {
      const allExpanded = {};
      Object.keys(filteredEggs).forEach(category => {
        allExpanded[category] = true;
      });
      setExpandedCategories(allExpanded);
    }
  }, [searchTerm, filteredEggs]);

  const addPort = () => {
    setFormData(prev => ({
      ...prev,
      ports: [...prev.ports, { internal: 25566, external: 25566 }]
    }));
  };

  const removePort = (index) => {
    if (formData.ports.length > 1) {
      setFormData(prev => ({
        ...prev,
        ports: prev.ports.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePort = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ports: prev.ports.map((port, i) => 
        i === index ? { ...port, [field]: parseInt(value) } : port
      )
    }));
  };

  const updateEnvironment = (key, value) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="text-white">Loading eggs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gray-800 rounded-lg shadow-xl">
        <div className="px-6 py-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">Create New Server</h1>
          <p className="text-gray-400 mt-1">Configureer je nieuwe game server</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Egg Selection */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Selecteer Game</h2>
              
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Zoek naar games... (minecraft, rust, cs2)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Results count */}
              {searchTerm.trim() && (
                <div className="text-sm text-gray-400 mb-4">
                  Gevonden: {Object.values(filteredEggs).reduce((total, category) => total + Object.keys(category).length, 0)} games
                  {Object.keys(filteredEggs).length > 0 && ` in ${Object.keys(filteredEggs).length} categorieën`}
                </div>
              )}

              {/* Egg Categories */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(filteredEggs).map(([category, eggList]) => (
                  <div key={category} className="border border-gray-600 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-white">{category}</span>
                        <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                          {Object.keys(eggList).length}
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`h-5 w-5 text-gray-400 transform transition-transform ${
                          expandedCategories[category] ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    
                    {expandedCategories[category] && (
                      <div className="p-4 bg-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(eggList).map(([eggId, eggData]) => (
                            <button
                              key={eggId}
                              type="button"
                              onClick={() => handleEggSelect(category, eggData.subcategory, eggData.eggFile, eggData)}
                              className={`group p-4 rounded-lg border text-left transition-all ${
                                selectedEgg?.data.id === eggData.id
                                  ? 'bg-blue-600 border-blue-500 hover:bg-blue-500'
                                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-blue-500'
                              }`}
                            >
                              <h5 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                                {eggData.name}
                              </h5>
                              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                {eggData.description}
                              </p>
                              {eggData.author && (
                                <span className="inline-block mt-2 text-xs text-gray-500 bg-gray-600 px-2 py-1 rounded">
                                  {eggData.author}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {Object.keys(filteredEggs).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      {searchTerm ? `Geen games gevonden voor "${searchTerm}"` : 'Geen games beschikbaar'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Server Configuration */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Server Configuratie</h2>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Server Naam *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mijn Geweldige Server"
                    required
                  />
                </div>

                {/* Selected Egg Display */}
                {selectedEgg && (
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <h3 className="text-white font-medium mb-2">Geselecteerde Game</h3>
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
                <div>
                  <h3 className="text-white font-medium mb-3">Resource Allocatie</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Memory (MB)</label>
                      <input
                        type="number"
                        value={formData.memory}
                        onChange={(e) => setFormData({...formData, memory: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="512"
                        step="256"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">CPU (%)</label>
                      <input
                        type="number"
                        value={formData.cpu}
                        onChange={(e) => setFormData({...formData, cpu: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="10"
                        max="1000"
                        step="10"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Disk (MB)</label>
                      <input
                        type="number"
                        value={formData.disk}
                        onChange={(e) => setFormData({...formData, disk: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1000"
                        step="1000"
                      />
                    </div>
                  </div>
                </div>

                {/* Ports Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Poorten</h3>
                    <button
                      type="button"
                      onClick={addPort}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500"
                    >
                      + Poort
                    </button>
                  </div>
                  
                  {formData.ports.map((port, index) => (
                    <div key={index} className="flex items-center space-x-3 mb-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={port.internal}
                          onChange={(e) => updatePort(index, 'internal', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Internal"
                          min="1024"
                          max="65535"
                        />
                      </div>
                      <span className="text-gray-400">:</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          value={port.external}
                          onChange={(e) => updatePort(index, 'external', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="External"
                          min="1024"
                          max="65535"
                        />
                      </div>
                      {formData.ports.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePort(index)}
                          className="px-2 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Environment Variables */}
                {selectedEgg && selectedEgg.data.variables && selectedEgg.data.variables.length > 0 && (
                  <div>
                    <h3 className="text-white font-medium mb-3">Game Instellingen</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedEgg.data.variables.map((variable) => (
                        <div key={variable.env_variable}>
                          <label className="block text-sm text-gray-300 mb-1">
                            {variable.name}
                            {variable.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {variable.user_viewable && (
                            <>
                              {variable.rules && variable.rules.includes('in:') ? (
                                <select
                                  value={formData.environment[variable.env_variable] || ''}
                                  onChange={(e) => updateEnvironment(variable.env_variable, e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required={variable.required}
                                >
                                  {variable.rules.split('in:')[1].split(',').map(option => (
                                    <option key={option.trim()} value={option.trim()}>
                                      {option.trim()}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={formData.environment[variable.env_variable] || ''}
                                  onChange={(e) => updateEnvironment(variable.env_variable, e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={variable.default_value}
                                  required={variable.required}
                                />
                              )}
                              <p className="text-xs text-gray-400 mt-1">{variable.description}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Startup Command */}
                {selectedEgg && (
                  <div>
                    <h3 className="text-white font-medium mb-3">Startup Command</h3>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Startup Command
                        <span className="text-gray-500 text-xs ml-2">(Geavanceerd - pas alleen aan als je weet wat je doet)</span>
                      </label>
                      <textarea
                        value={formData.startupCommand}
                        onChange={(e) => setFormData({...formData, startupCommand: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        rows="3"
                        placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Gebruik variables zoals {'{{SERVER_MEMORY}}'} die automatisch worden vervangen
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/servers')}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              disabled={creating}
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!selectedEgg || !formData.name.trim() || creating}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Aanmaken...' : 'Server Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateServer;