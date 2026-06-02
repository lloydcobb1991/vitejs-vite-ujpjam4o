import React, { useState } from 'react';

export default function Dashboard({ onSelectTool }) {
  const tools = [
    {
      id: 'crucible',
      name: 'The Crucible',
      description: 'Create projects to be approved',
    },
    {
      id: 'forge',
      name: 'The Forge',
      description: 'Review and approve projects',
    },
    {
      id: 'refinery',
      name: 'The Refinery',
      description: 'Transform Cereus reports to client-ready format',
    },
    {
      id: 'beacon',
      name: 'The Beacon',
      description: 'Hunt for prospects and opportunities',
    },
    {
      id: 'emberwatch',
      name: 'Emberwatch',
      description: 'Track and count menu impressions',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: '80px 4% 60px',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        position: 'relative',
        color: '#1a1a1a',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Feedback button — kept top-right, refined for the lighter theme */}
      <a
        href="mailto:lloyd@ignitecs.co?subject=Tools Portal Feedback"
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#2d2d2d',
          color: 'white',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          textDecoration: 'none',
          letterSpacing: '0.3px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          transition: 'background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
          zIndex: 1000,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#da291c';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(218, 41, 28, 0.25)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#2d2d2d';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
        }}
      >
        Issues or Ideas? Contact Lloyd
      </a>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '64px',
            animation: 'fadeInUp 0.5s ease-out',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '52px',
              fontWeight: '700',
              color: '#1a1a1a',
              letterSpacing: '-1.5px',
              lineHeight: '1.1',
            }}
          >
            Ignite Creative Services
          </h1>
          <p
            style={{
              margin: '14px 0 0 0',
              fontSize: '13px',
              color: '#8a8a8a',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontWeight: '600',
            }}
          >
            Internal Tools Portal
          </p>
          <div
            style={{
              width: '48px',
              height: '2px',
              background: '#da291c',
              margin: '28px auto 0',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Tool Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => onSelectTool(tool.id)}
              delay={index * 0.06}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '80px',
            color: '#b0b0b0',
            fontSize: '12px',
            letterSpacing: '1px',
            animation: 'fadeInUp 0.5s ease-out 0.3s both',
          }}
        >
          <p style={{ margin: 0 }}>Build (Beta) V0.1</p>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, onClick, delay }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? '#2d2d2d' : '#da291c',
        borderRadius: '12px',
        padding: '36px 28px 32px',
        cursor: 'pointer',
        border: 'none',
        borderLeft: '3px solid #2d2d2d',
        transition:
          'background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 32px rgba(0, 0, 0, 0.18)'
          : '0 2px 8px rgba(218, 41, 28, 0.18)',
        animation: `fadeInUp 0.5s ease-out ${delay}s both`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Icon — PNG/GIF crossfade preserved */}
      <div
        style={{
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          position: 'relative',
          transition: 'transform 0.3s ease',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <img
          src={`/${tool.id}.png`}
          alt={tool.name}
          style={{
            width: '52px',
            height: '52px',
            objectFit: 'contain',
            position: 'absolute',
            opacity: isHovered ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
        <img
          src={`/${tool.id}.gif`}
          alt={tool.name}
          style={{
            width: '52px',
            height: '52px',
            objectFit: 'contain',
            position: 'absolute',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-0.3px',
          }}
        >
          {tool.name}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: '1.5',
          }}
        >
          {tool.description}
        </p>
      </div>

      {/* Launch arrow on hover */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '18px',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '700',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        &rarr;
      </div>
    </div>
  );
}