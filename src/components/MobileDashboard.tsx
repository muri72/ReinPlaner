'use client';

import { useState } from 'react';

export default function MobileDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Aktive Nutzer', value: '1,234', change: '+12%', trend: 'up' },
    { label: 'Umsatz', value: '€45.6K', change: '+8%', trend: 'up' },
    { label: 'Conversion', value: '3.2%', change: '-2%', trend: 'down' },
    { label: 'Sessions', value: '8,901', change: '+15%', trend: 'up' },
  ];

  const quickActions = [
    { icon: '📊', label: 'Bericht erstellen', color: 'bg-blue-500' },
    { icon: '👥', label: 'Nutzer verwalten', color: 'bg-green-500' },
    { icon: '📈', label: 'Analytics', color: 'bg-purple-500' },
    { icon: '⚙️', label: 'Einstellungen', color: 'bg-gray-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Mobile Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {['overview', 'analytics', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors touch-manipulation ${
              activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 touch-manipulation active:scale-95 transition-transform"
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
            <div className="flex items-center space-x-1">
              <span className={`text-xs font-medium ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`text-xs ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.trend === 'up' ? '↗' : '↘'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Schnellaktionen</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className={`${action.color} text-white p-4 rounded-xl flex flex-col items-center space-y-2 touch-manipulation active:scale-95 transition-transform shadow-lg`}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Letzte Aktivität</h3>
        <div className="space-y-3">
          {[
            { user: 'Max Mustermann', action: 'Neuer Bericht erstellt', time: 'vor 2 Min' },
            { user: 'Anna Schmidt', action: 'Daten aktualisiert', time: 'vor 15 Min' },
            { user: 'Tom Weber', action: 'Einstellungen geändert', time: 'vor 1 Std' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                <p className="text-xs text-gray-500">{activity.action}</p>
              </div>
              <span className="text-xs text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}