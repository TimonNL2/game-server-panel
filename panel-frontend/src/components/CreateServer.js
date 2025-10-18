import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

function CreateServer() {
  const navigate = useNavigate();
  const [eggs, setEggs] = useState({});
  const [selectedEgg, setSelectedEgg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    memory: 1024,
    ports: [{ internal: 25565, external: 25565 }],
    environment: {}
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
    } catch (error) {
      console.error('Error fetching eggs:', error);
      toast.error('Fout bij ophalen eggs');
    } finally {
      setLoading(false);
    }
  };

  const handleEggSelect = (category, subcategory, eggName, eggData) => {
    setSelectedEgg({ 
      path: `${category}/${subcategory}/${eggName}`,
      data: eggData 
    });
    
    // Initialize environment variables with default values
    const envVars = {};
    if (eggData.variables) {
      eggData.variables.forEach(variable => {
        envVars[variable.env_variable] = variable.default_value || '';
      });
    }
    
    setFormData(prev => ({
      ...prev,
      environment: envVars
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const serverData = {
        name: formData.name,
        eggPath: selectedEgg.path,
        environment: formData.environment,
        ports: formData.ports,
        memory: formData.memory
      };

      await axios.post('/api/servers', serverData);
      toast.success('Server aangemaakt!');
      navigate('/servers');
    } catch (error) {
      console.error('Error creating server:', error);
      toast.error('Fout bij aanmaken server');
    } finally {
      setCreating(false);
    }
  };

  const addPort = () => {
    setFormData(prev => ({
      ...prev,
      ports: [...prev.ports, { internal: 25566, external: 25566 }]
    }));
  };

  const removePort = (index) => {
    setFormData(prev => ({
      ...prev,
      ports: prev.ports.filter((_, i) => i !== index)
    }));
  };

  const updatePort = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ports: prev.ports.map((port, i) => 
        i === index ? { ...port, [field]: parseInt(value) } : port
      )
    }));
  };

  const updateEnvironment = (variable, value) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [variable]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Nieuwe Server Maken</h1>
        <p className="text-gray-400 mt-2">Selecteer een egg en configureer je server</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Egg Selection */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">1. Selecteer Game Type</h2>
          {!selectedEgg ? (
            <EggSelector eggs={eggs} onSelect={handleEggSelect} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-white">{selectedEgg.data.name}</h3>
                  <p className="text-sm text-gray-400">{selectedEgg.data.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEgg(null)}
                  className="btn-secondary text-sm"
                >
                  Wijzigen
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedEgg && (
          <>
            {/* Basic Configuration */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">2. Basis Configuratie</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Server Naam
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field w-full"
                    placeholder="Mijn Minecraft Server"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Memory (MB)
                  </label>
                  <input
                    type="number"
                    value={formData.memory}
                    onChange={(e) => setFormData(prev => ({ ...prev, memory: parseInt(e.target.value) }))}
                    className="input-field w-full"
                    min="512"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Port Configuration */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">3. Poort Configuratie</h2>
              <div className="space-y-3">
                {formData.ports.map((port, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={port.internal}
                        onChange={(e) => updatePort(index, 'internal', e.target.value)}
                        className="input-field w-full"
                        placeholder="Interne poort"
                      />
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={port.external}
                        onChange={(e) => updatePort(index, 'external', e.target.value)}
                        className="input-field w-full"
                        placeholder="Externe poort"
                      />
                    </div>
                    {formData.ports.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePort(index)}
                        className="btn-danger text-sm"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPort}
                  className="btn-secondary text-sm"
                >
                  Poort Toevoegen
                </button>
              </div>
            </div>

            {/* Environment Variables */}
            {selectedEgg.data.variables && selectedEgg.data.variables.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-white mb-4">4. Server Instellingen</h2>
                <div className="space-y-4">
                  {selectedEgg.data.variables.map((variable) => (
                    <div key={variable.env_variable}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {variable.name}
                        {variable.description && (
                          <span className="block text-xs text-gray-400 font-normal">
                            {variable.description}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formData.environment[variable.env_variable] || ''}
                        onChange={(e) => updateEnvironment(variable.env_variable, e.target.value)}
                        className="input-field w-full"
                        placeholder={variable.default_value}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/servers')}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary"
              >
                {creating ? 'Aan het maken...' : 'Server Maken'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function EggSelector({ eggs, onSelect }) {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="space-y-3">
      {Object.entries(eggs).map(([category, subcategories]) => (
        <div key={category} className="border border-gray-600 rounded-lg">
          <button
            type="button"
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            <span className="font-medium text-white capitalize">
              {category.replace('_', ' ')}
            </span>
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transform transition-transform ${
                expandedCategories[category] ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {expandedCategories[category] && (
            <div className="p-4 bg-gray-800">
              {Object.entries(subcategories).map(([subcategory, eggList]) => (
                <div key={subcategory} className="mb-4">
                  <h4 className="font-medium text-gray-300 mb-2 capitalize">
                    {subcategory.replace('_', ' ')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(eggList).map(([eggName, eggData]) => (
                      <button
                        key={eggName}
                        type="button"
                        onClick={() => onSelect(category, subcategory, eggName, eggData)}
                        className="p-3 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 text-left"
                      >
                        <h5 className="font-medium text-white">{eggData.name}</h5>
                        <p className="text-xs text-gray-400 mt-1">
                          {eggData.description?.substring(0, 60)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default CreateServer;