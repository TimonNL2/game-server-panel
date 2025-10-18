import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ServerIcon, UsersIcon, CpuChipIcon, ClockIcon } from '@heroicons/react/24/outline';

function Dashboard() {
  const [stats, setStats] = useState({
    totalServers: 0,
    runningServers: 0,
    stoppedServers: 0,
    offlineServers: 0
  });
  const [recentServers, setRecentServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/servers');
      const servers = response.data;

      const stats = {
        totalServers: servers.length,
        runningServers: servers.filter(s => s.status === 'running').length,
        stoppedServers: servers.filter(s => s.status === 'stopped').length,
        offlineServers: servers.filter(s => s.status === 'offline').length
      };

      setStats(stats);
      setRecentServers(servers.slice(0, 5));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-2">Overview van je game servers</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Totaal Servers"
          value={stats.totalServers}
          icon={ServerIcon}
          color="blue"
        />
        <StatCard
          title="Actieve Servers"
          value={stats.runningServers}
          icon={CpuChipIcon}
          color="green"
        />
        <StatCard
          title="Gestopte Servers"
          value={stats.stoppedServers}
          icon={ClockIcon}
          color="yellow"
        />
        <StatCard
          title="Offline Servers"
          value={stats.offlineServers}
          icon={UsersIcon}
          color="red"
        />
      </div>

      {/* Recent Servers */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recente Servers</h2>
        {recentServers.length === 0 ? (
          <p className="text-gray-400">Geen servers gevonden. Maak je eerste server aan!</p>
        ) : (
          <div className="space-y-3">
            {recentServers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    server.status === 'running' ? 'bg-green-400' :
                    server.status === 'stopped' ? 'bg-red-400' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <h3 className="font-medium text-white">{server.name}</h3>
                    <p className="text-sm text-gray-400">{server.egg?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    server.status === 'running' ? 'text-green-400' :
                    server.status === 'stopped' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {server.memory || 1024} MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-100',
    green: 'bg-green-500 text-green-100',
    yellow: 'bg-yellow-500 text-yellow-100',
    red: 'bg-red-500 text-red-100'
  };

  return (
    <div className="card p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          <p className="text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;