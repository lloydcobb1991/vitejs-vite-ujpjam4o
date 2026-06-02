import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

export default function Dashboard({ onSelectTool }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Load Lottie animation
    fetch('/fire-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load animation:', err));
  }, []);
  const tools = [
    {
      id: 'crucible',
      name: 'The Crucible',
      description: 'Create projects to be approved',
      color: '#da291c',
    },
    {
      id: 'forge',
      name: 'The Forge',
      description: 'Review and approve projects',
      color: '#ff6b35',
    },
    {
      id: 'refinery',
      name: 'The Refinery',
      description: 'Transform Cereus reports to client-ready format',
      color: '#f7931e',
    },
    {
      id: 'beacon',
      name: 'The Beacon',
      description: 'Hunt for prospects and opportunities',
      color: '#fdb913',
    },
    {
      id: 'emberwatch',
      name: 'Emberwatch',
      description: 'Track and count menu impressions',
      color: '#c1272d',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF'
        padding: '60px 2%',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        position: 'relative',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Feedback Button - Top Right */}
      <a
        href="mailto:lloyd@ignitecs.co?subject=Tools Portal Feedback"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(218, 41, 28, 0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          zIndex: 1000,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#da291c';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(218, 41, 28, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(218, 41, 28, 0.9)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
      >
        Issues or Ideas? Contact Lloyd
      </a>

      <div>
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '80px',
            animation: 'fadeInUp 0.6s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {animationData ? (
                <Lottie
                  animationData={animationData}
                  loop
                  autoplay
                  style={{ width: '64px', height: '64px' }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: '#da291c',
                    borderRadius: '50%',
                  }}
                />
              )}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: '56px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #da291c 0%, #ff6b35 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-2px',
                lineHeight: '1.2',
                padding: '10px 0',
              }}
            >
              Ignite Creative Services
            </h1>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontWeight: '600',
            }}
          >
            Internal Tools Portal
          </p>
          <div
            style={{
              width: '100px',
              height: '3px',
              background:
                'linear-gradient(90deg, transparent, #da291c, transparent)',
              margin: '30px auto 0',
            }}
          />
        </div>

        {/* Tool Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '30px',
            maxWidth: '1600px',
            margin: '0 auto',
          }}
        >
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => onSelectTool(tool.id)}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '100px',
            color: '#666',
            fontSize: '14px',
            animation: 'fadeInUp 0.6s ease-out 0.4s both',
          }}
        >
          <p style={{ margin: 0 }}>Build (Beta)V0.1</p>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, onClick, delay }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)'
          : 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)',
        borderRadius: '20px',
        padding: '40px 30px',
        cursor: 'pointer',
        border: isHovered ? `2px solid ${tool.color}` : '2px solid #333',
        transition: 'all 0.3s ease',
        transform: isHovered
          ? 'translateY(-8px) scale(1.02)'
          : 'translateY(0) scale(1)',
        boxShadow: isHovered
          ? `0 20px 40px rgba(218, 41, 28, 0.3), 0 0 0 1px ${tool.color}40`
          : '0 8px 20px rgba(0, 0, 0, 0.3)',
        animation: `fadeInUp 0.6s ease-out ${delay}s both`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow effect on hover */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, ${tool.color}20 0%, transparent 70%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease',
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}

      {/* Animated Icon - Smooth cross-fade between PNG and GIF */}
      <div
        style={{
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 25px auto',
          transition: 'all 0.4s ease',
          transform: isHovered ? 'scale(1.7)' : 'scale(1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Static PNG - fades out on hover */}
        <img
          src={`/${tool.id}.png`}
          alt={tool.name}
          style={{
            width: '60px',
            height: '60px',
            objectFit: 'contain',
            position: 'absolute',
            opacity: isHovered ? 0 : 1,
            transition: 'opacity 0.4s ease',
            filter: 'none',
          }}
        />
        {/* Animated GIF - fades in on hover */}
        <img
          src={`/${tool.id}.gif`}
          alt={tool.name}
          style={{
            width: '60px',
            height: '60px',
            objectFit: 'contain',
            position: 'absolute',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.4s ease',
            filter: isHovered
              ? 'drop-shadow(0 0 20px rgba(255,255,255,0.6))'
              : 'none',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: isHovered ? tool.color : 'white',
            transition: 'color 0.3s ease',
            letterSpacing: '-0.5px',
          }}
        >
          {tool.name}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            color: '#999',
            lineHeight: '1.6',
          }}
        >
          {tool.description}
        </p>
      </div>

      {/* Launch arrow on hover */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            color: tool.color,
            fontSize: '24px',
            fontWeight: '700',
            animation: 'float 1s ease-in-out infinite',
            zIndex: 1,
          }}
        >
          →
        </div>
      )}
    </div>
  );
}
