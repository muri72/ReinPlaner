import MobileNavigation from '@/components/MobileNavigation';
import MobileDashboard from '@/components/MobileDashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">ARIS Dashboard</h1>
          <MobileNavigation />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück!</h2>
            <p className="text-gray-600">Hier ist Ihr mobile-optimiertes Dashboard</p>
          </div>
          
          <MobileDashboard />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
          {[
            { icon: '🏠', label: 'Home', active: true },
            { icon: '📊', label: 'Analytics', active: false },
            { icon: '📋', label: 'Reports', active: false },
            { icon: '👤', label: 'Profil', active: false },
          ].map((item, index) => (
            <button
              key={index}
              className={`flex flex-col items-center py-2 px-3 touch-manipulation transition-colors ${
                item.active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}