import { useState } from 'react'
import Dashboard from './Dashboard'
import IntegrationTracker from './IntegrationTracker'
import LeadershipDashboard from './LeadershipDashboard'
import ReportTransformer from './ReportTransformer'
import TheBeacon from './TheBeacon'
import Emberwatch from './Emberwatch'
import { ArrowLeft } from 'lucide-react'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')

  const renderView = () => {
    switch(currentView) {
      case 'dashboard':
        return <Dashboard onSelectTool={setCurrentView} />
      case 'crucible':
        return <IntegrationTracker />
      case 'forge':
        return <LeadershipDashboard />
      case 'refinery':
        return <ReportTransformer />
      case 'beacon':
        return <TheBeacon />
      case 'emberwatch':
        return <Emberwatch />
      default:
        return <Dashboard onSelectTool={setCurrentView} />
    }
  }

  return (
    <div style={{ fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif' }}>
      {/* Back to Dashboard button (only show when not on dashboard) */}
      {currentView !== 'dashboard' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '2%',
          zIndex: 1000
        }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'white',
              color: '#da291c',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            }}
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>
        </div>
      )}

      {renderView()}
    </div>
  )
}

export default App