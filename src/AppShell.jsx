import React, { useState } from 'react';
import Emberwatch from './Emberwatch';
import IntegrationTracker from './IntegrationTracker';
import LeadershipDashboard from './LeadershipDashboard';
import ReportTransformer from './ReportTransformer';
import TheBeacon from './TheBeacon';

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------
// Each tool entry: id, name, description, docsUrl (optional), and the
// component to render. If `component` is null, the tool is marked Coming Soon
// in the sidebar and a placeholder is shown when selected.

const TOOLS = [
  {
    id: 'crucible',
    name: 'The Crucible',
    description: 'Create projects to be approved.',
    docsUrl: null,
    component: IntegrationTracker,
  },
  {
    id: 'forge',
    name: 'The Forge',
    description: 'Review and approve projects.',
    docsUrl: null,
    component: LeadershipDashboard,
  },
  {
    id: 'refinery',
    name: 'The Refinery',
    description: 'Transform reports to client-ready format.',
    docsUrl: null,
    component: ReportTransformer,
  },
  {
    id: 'beacon',
    name: 'The Beacon',
    description: 'Hunt for prospects and opportunities.',
    docsUrl: null,
    component: TheBeacon,
  },
  {
    id: 'emberwatch',
    name: 'Emberwatch',
    description: 'Track and count menu brand impressions.',
    docsUrl: null,
    component: Emberwatch,
  },
];

// Shared color tokens so we never drift between values.
const COLOR = {
  red: '#da291c',
  redHover: '#b8221a',
  charcoal: '#1a1a1a',
  charcoalLight: '#262626',
  white: '#ffffff',
  contentBg: '#ffffff',
  footerBg: '#f5f5f5',
  textMuted: '#8a8a8a',
  textDim: '#6f6f6f',
};

// ===========================================================================
// AppShell
// ===========================================================================

export default function AppShell() {
  const [activeId, setActiveId] = useState(null);

  const activeTool = TOOLS.find((t) => t.id === activeId) || null;
  const ActiveComponent = activeTool?.component || null;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        color: COLOR.charcoal,
        background: COLOR.contentBg,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://use.typekit.net/gfb2mjm.css');
        @keyframes shellFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Main area: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          activeId={activeId}
          activeTool={activeTool}
          onSelect={(id) => {
            // Clicking the already-active tool does nothing
            if (id === activeId) return;
            setActiveId(id);
          }}
        />

        <main
          style={{
            flex: 1,
            background: COLOR.contentBg,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Persistent brand mark — top right corner of the content area */}
          <img
            src="/ignitecs-mark.png"
            alt="Ignite CS"
            style={{
                position: 'absolute',
            top: '24px',           
             right: '24px',
              width: '84px',
             height: '84px',
    objectFit: 'contain',
    zIndex: 2,
    opacity: 1,
    pointerEvents: 'none',
            }}
          />

          <div
            key={activeId || 'welcome'}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              animation: 'shellFadeIn 0.25s ease-out',
            }}
          >
            {activeTool ? (
              <>
                <ToolHeader tool={activeTool} />
                <div style={{ flex: 1 }}>
                  {ActiveComponent ? (
                    <ActiveComponent />
                  ) : (
                    <ComingSoonPanel tool={activeTool} />
                  )}
                </div>
              </>
            ) : (
              <WelcomePanel />
            )}
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  );
}

// ===========================================================================
// Sidebar
// ===========================================================================

function Sidebar({ activeId, activeTool, onSelect }) {
  return (
    <aside
      style={{
        width: '260px',
        flexShrink: 0,
        background: COLOR.charcoal,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <LogoBlock activeTool={activeTool} />

      <nav
        style={{
          flex: 1,
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {TOOLS.map((tool) => (
          <SidebarItem
            key={tool.id}
            tool={tool}
            isActive={tool.id === activeId}
            onSelect={() => onSelect(tool.id)}
          />
        ))}
      </nav>

      <SidebarFooter />
    </aside>
  );
}

// The top-of-sidebar logo block. Red background. Shows the active tool's
// PNG/GIF when a tool is selected; shows a small Ignite mark otherwise.
function LogoBlock({ activeTool }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: COLOR.red,
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        // Soft outer shadow + thin dark hairline. Reads as a framed badge
        // without bleeding into the white tool header next to it.
        boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)',
      }}
    >
      {activeTool ? (
        <ActiveToolLogo tool={activeTool} isHovered={isHovered} />
      ) : (
        <div
          style={{
            color: COLOR.white,
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.2,
            padding: '0 16px',
          }}
        >
          Ignite
          <div style={{ fontSize: '11px', fontWeight: '600', opacity: 0.75, letterSpacing: '3px', marginTop: '4px' }}>
            Creative Services
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveToolLogo({ tool, isHovered }) {
  // Plays the GIF once on tool selection (3s), then fades to the static PNG.
  // Hovering the logo block replays the GIF from frame 1.
  // We trigger replay by bumping a counter that becomes part of the <img> key,
  // forcing React to unmount/remount the GIF (re-requesting the file).
  const [animationDone, setAnimationDone] = useState(false);
  const [hoverCount, setHoverCount] = useState(0);

  // Initial play on tool selection
  React.useEffect(() => {
    setAnimationDone(false);
    const t = setTimeout(() => setAnimationDone(true), 3000);
    return () => clearTimeout(t);
  }, [tool.id]);

  // Hover replay
  React.useEffect(() => {
    if (isHovered) {
      setHoverCount((c) => c + 1);
      setAnimationDone(false);
      const t = setTimeout(() => setAnimationDone(true), 3000);
      return () => clearTimeout(t);
    }
  }, [isHovered]);

  return (
    <div
      style={{
        width: '96px',
        height: '96px',
        position: 'relative',
      }}
    >
      <img
        key={`${tool.id}-png-${hoverCount}`}
        src={`/${tool.id}.png`}
        alt={tool.name}
        style={{
          width: '96px',
          height: '96px',
          objectFit: 'contain',
          position: 'absolute',
          inset: 0,
          opacity: animationDone ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
      <img
        key={`${tool.id}-gif-${hoverCount}`}
        src={`/${tool.id}.gif`}
        alt={tool.name}
        style={{
          width: '96px',
          height: '96px',
          objectFit: 'contain',
          position: 'absolute',
          inset: 0,
          opacity: animationDone ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}

function SidebarItem({ tool, isActive, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const isAvailable = tool.component !== null;

  // Activity indicator: The Forge shows a red dot when there are pending
  // projects awaiting review (shared via localStorage with The Crucible).
  const pendingCount = usePendingProjectCount(tool.id);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: isActive
          ? COLOR.charcoalLight
          : isHovered
            ? 'rgba(255,255,255,0.04)'
            : 'transparent',
        color: isActive
          ? COLOR.white
          : isAvailable
            ? 'rgba(255,255,255,0.85)'
            : 'rgba(255,255,255,0.4)',
        border: 'none',
        textAlign: 'left',
        padding: '14px 24px 14px 28px',
        fontSize: '15px',
        fontWeight: isActive ? '800' : '600',
        cursor: isActive ? 'default' : 'pointer',
        letterSpacing: '0.2px',
        transition: 'background 0.15s ease, color 0.15s ease',
        fontFamily: 'inherit',
        // Red left bar on the active item
        borderLeft: isActive
          ? `3px solid ${COLOR.red}`
          : '3px solid transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ flex: 1 }}>{tool.name}</span>
      {pendingCount > 0 && (
        <span
          title={`${pendingCount} pending`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            borderRadius: '10px',
            background: COLOR.red,
            color: 'white',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: 0,
          }}
        >
          {pendingCount}
        </span>
      )}
      {!isAvailable && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          Soon
        </span>
      )}
    </button>
  );
}

// Reads pending-project count from localStorage on every render of the
// sidebar. The Forge and Crucible both write to 'ignite-integration-projects';
// this lets the sidebar surface "there's work waiting for you."
function usePendingProjectCount(toolId) {
  // Only The Forge has an activity indicator for pending projects.
  // Easy to extend to other tools later if they get their own pending state.
  if (toolId !== 'forge') return 0;
  try {
    const stored = localStorage.getItem('ignite-integration-projects');
    if (!stored) return 0;
    const projects = JSON.parse(stored);
    return projects.filter((p) => p.status === 'pending').length;
  } catch {
    return 0;
  }
}

function SidebarFooter() {
  return (
    <div
      style={{
        padding: '20px 28px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <a
        href="mailto:lloyd@ignitecs.co?subject=Tools Portal Help"
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '13px',
          fontWeight: '600',
          textDecoration: 'none',
          display: 'block',
          marginBottom: '10px',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = COLOR.white)}
        onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
      >
        Need help?
      </a>
      <div
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '11px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          fontWeight: '600',
        }}
      >
        Build (Beta) v0.2
      </div>
    </div>
  );
}

// ===========================================================================
// Tool header — sits above the tool's content, shows name + description + docs
// ===========================================================================

function ToolHeader({ tool }) {
  return (
    <div
      style={{
        height: '160px',
        padding: '0 48px',
        borderBottom: '1px solid #ececec',
        background: COLOR.contentBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: '36px',
            fontWeight: '800',
            color: COLOR.charcoal,
            letterSpacing: '-0.8px',
            lineHeight: 1.1,
          }}
        >
          {tool.name}
        </h1>
        <p
          style={{
            margin: '10px 0 0 0',
            fontSize: '15px',
            color: COLOR.textDim,
            fontWeight: '500',
          }}
        >
          {tool.description}
        </p>
      </div>
      {tool.docsUrl && (
        <a
          href={tool.docsUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: '13px',
            fontWeight: '700',
            color: COLOR.red,
            textDecoration: 'none',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = COLOR.redHover)}
          onMouseOut={(e) => (e.currentTarget.style.color = COLOR.red)}
        >
          Documentation &rarr;
        </a>
      )}
    </div>
  );
}

// ===========================================================================
// Welcome / empty-state panel
// ===========================================================================

function WelcomePanel() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
      }}
    >
      <div style={{ maxWidth: '520px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: '800',
            color: COLOR.red,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}
        >
          Welcome, Ignite Team
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: '40px',
            fontWeight: '800',
            color: COLOR.charcoal,
            letterSpacing: '-1px',
            lineHeight: 1.1,
          }}
        >
          Ignite Creative Services
        </h1>
        <div
          style={{
            width: '40px',
            height: '2px',
            background: COLOR.red,
            margin: '24px auto 24px',
            borderRadius: '2px',
          }}
        />
        <p
          style={{
            fontSize: '16px',
            color: COLOR.textDim,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Pick a tool from the sidebar to get started. Each tool is built to
          accelerate a specific part of your workflow.
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// Coming Soon panel — shown for tools whose component isn't built yet
// ===========================================================================

function ComingSoonPanel({ tool }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
      }}
    >
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '800',
            color: COLOR.red,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}
        >
          Coming Soon
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '800',
            color: COLOR.charcoal,
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}
        >
          {tool.name}
        </h2>
        <p
          style={{
            marginTop: '12px',
            fontSize: '15px',
            color: COLOR.textDim,
            lineHeight: 1.6,
          }}
        >
          {tool.description}
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// Bottom bar — runs full-width below content area
// ===========================================================================

function BottomBar() {
  const linkStyle = {
    color: COLOR.textDim,
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    padding: '0 14px',
    transition: 'color 0.15s ease',
  };

  return (
    <footer
      style={{
        background: COLOR.footerBg,
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        borderTop: '1px solid #ececec',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <FooterLink href="https://docs.ignitecs.co" style={linkStyle}>
          Documentation
        </FooterLink>
        <span style={{ color: '#d0d0d0' }}>|</span>
        <FooterLink href="https://ignitecs.co" style={linkStyle}>
          Ignite Home
        </FooterLink>
        <span style={{ color: '#d0d0d0' }}>|</span>
        <FooterLink href="https://connect.ignitecs.co" style={linkStyle}>
          Ignite Connect
        </FooterLink>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img
          src="/ignitecs-lockup.png"
          alt="IgniteCS"
          style={{
            height: '24px',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    </footer>
  );
}

function FooterLink({ href, style, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={style}
      onMouseOver={(e) => (e.currentTarget.style.color = COLOR.charcoal)}
      onMouseOut={(e) => (e.currentTarget.style.color = COLOR.textDim)}
    >
      {children}
    </a>
  );
}