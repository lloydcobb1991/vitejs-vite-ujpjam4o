import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, MessageSquare, ThumbsUp, ThumbsDown, Clock, Calendar, User, AlertCircle, CheckCircle, X, ChevronRight } from 'lucide-react';

export default function LeadershipDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active or pending
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const stored = localStorage.getItem('ignite-integration-projects');
      if (stored) {
        setProjects(JSON.parse(stored));
      }
    } catch (error) {
      console.log('No existing projects found');
    } finally {
      setLoading(false);
    }
  };

  const saveProjects = async (updatedProjects) => {
    try {
      localStorage.setItem('ignite-integration-projects', JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  };

  const updateProjectStatus = (projectId, status, comment = '') => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        const newComments = comment ? [...p.comments, { 
          text: comment, 
          date: new Date().toISOString(),
          type: status,
          author: 'Leadership'
        }] : p.comments;
        return { ...p, status, comments: newComments, reviewedAt: new Date().toISOString() };
      }
      return p;
    });
    saveProjects(updated);
  };

  const addComment = (projectId, comment) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          comments: [...p.comments, { 
            text: comment, 
            date: new Date().toISOString(),
            type: 'comment',
            author: 'Leadership'
          }]
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const updateProjectThumbnail = (projectId, imageDataUrl) => {
    const updated = projects.map(p => 
      p.id === projectId ? { ...p, thumbnail: imageDataUrl } : p
    );
    saveProjects(updated);
  };

  const calculateProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const filteredProjects = projects.filter(p => {
    if (filter === 'active') {
      return p.status === 'approved' || p.status === 'denied';
    } else {
      return p.status === 'pending';
    }
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
        background: '#da291c',
        color: 'white'
      }}>
        Loading The Forge...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#da291c',
      fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif',
      display: 'flex'
    }}>
      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '40px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          {/* Title */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '48px',
              fontWeight: '900',
              color: 'white',
              letterSpacing: '-1px'
            }}>
              The Forge
            </h1>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: '600'
            }}>
              Ignite CS
            </p>
          </div>

          {/* Logo (if available) */}
          {false && (
            <img 
              src="/forge-logo.png" 
              alt="The Forge" 
              style={{ 
                width: '150px', 
                height: '150px', 
                objectFit: 'contain',
                marginBottom: '20px'
              }} 
            />
          )}

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              flex: 1,
              background: 'white',
              borderRadius: '30px',
              padding: '12px 25px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px' }}>🔍</span>
              <input 
                type="text"
                placeholder="Search Projects"
                style={{
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  fontStyle: 'italic'
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '5px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '30px',
              padding: '5px'
            }}>
              <button
                onClick={() => setFilter('active')}
                style={{
                  padding: '10px 30px',
                  borderRadius: '25px',
                  border: 'none',
                  background: filter === 'active' ? 'white' : 'transparent',
                  color: filter === 'active' ? '#da291c' : 'white',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('pending')}
                style={{
                  padding: '10px 30px',
                  borderRadius: '25px',
                  border: 'none',
                  background: filter === 'pending' ? 'white' : 'transparent',
                  color: filter === 'pending' ? '#da291c' : 'white',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Project Grid */}
        <div style={{
          flex: 1,
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          overflowY: 'auto'
        }}>
          {filteredProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
              <p style={{ fontSize: '18px', margin: 0 }}>No {filter} projects</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={selectedProject?.id === project.id}
                  onClick={() => {
                    if (project.status === 'pending') {
                      setExpandedProject(project);
                    } else {
                      setSelectedProject(project);
                    }
                  }}
                  calculateProgress={calculateProgress}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - At a Glance */}
      {selectedProject && (
        <div style={{
          width: '400px',
          background: '#2a2a2a',
          color: 'white',
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'slideIn 0.3s ease-out',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.3)'
        }}>
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>
          <button
            onClick={() => setSelectedProject(null)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '5px'
            }}
          >
            <X size={24} />
          </button>

          <h3 style={{
            margin: '0 0 10px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#999',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            At a Glance
          </h3>

          <h2 style={{
            margin: '0 0 30px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: 'white'
          }}>
            Project #{selectedProject.id}
          </h2>

          {/* Thumbnail Display (no upload) */}
          {selectedProject.thumbnail && (
            <div style={{
              width: '100%',
              height: '200px',
              background: `url(${selectedProject.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '10px',
              marginBottom: '30px'
            }} />
          )}

          {/* Quick Stats */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Start Date</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {new Date(selectedProject.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Completion</div>
              <div style={{
                background: '#1a1a1a',
                height: '30px',
                borderRadius: '15px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #da291c, #ff4444)',
                  height: '100%',
                  width: `${calculateProgress(selectedProject.tasks)}%`,
                  transition: 'width 0.3s ease'
                }} />
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'white'
                }}>
                  {calculateProgress(selectedProject.tasks)}%
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</div>
              <div style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                background: selectedProject.status === 'approved' ? '#28a745' : 
                            selectedProject.status === 'denied' ? '#da291c' : '#ffa500',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {selectedProject.status}
              </div>
            </div>
          </div>

          <button
            onClick={() => setExpandedProject(selectedProject)}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: '10px',
              border: 'none',
              background: '#da291c',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: 'auto'
            }}
          >
            More
          </button>
        </div>
      )}

      {/* Expanded Project Modal */}
      {expandedProject && (
        <ExpandedProjectModal
          project={expandedProject}
          onClose={() => setExpandedProject(null)}
          onApprove={(comment) => {
            updateProjectStatus(expandedProject.id, 'approved', comment);
            setExpandedProject(null);
          }}
          onDeny={(comment) => {
            updateProjectStatus(expandedProject.id, 'denied', comment);
            setExpandedProject(null);
          }}
          onComment={(comment) => addComment(expandedProject.id, comment)}
          calculateProgress={calculateProgress}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, isSelected, onClick, calculateProgress }) {
  const progress = calculateProgress(project.tasks);
  
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? '#f0f0f0' : '#fafafa',
        borderRadius: '15px',
        padding: '15px',
        cursor: 'pointer',
        border: isSelected ? '3px solid #da291c' : '3px solid transparent',
        transition: 'all 0.2s ease',
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.transform = 'translateY(-5px)';
        if (!isSelected) e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.transform = 'translateY(0)';
        if (!isSelected) e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div style={{
        flex: 1,
        background: project.thumbnail ? `url(${project.thumbnail})` : '#ddd',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '10px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '48px'
      }}>
        {!project.thumbnail && '📁'}
      </div>

      {/* Project Info */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Project #{project.id}
      </div>
      <div style={{ fontSize: '11px', color: '#666' }}>
        {progress}% Complete
      </div>

      {/* Status Badge */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: project.status === 'approved' ? '#28a745' : 
                    project.status === 'denied' ? '#da291c' : '#ffa500'
      }} />
    </div>
  );
}

function ExpandedProjectModal({ project, onClose, onApprove, onDeny, onComment, calculateProgress }) {
  const [commentText, setCommentText] = useState('');
  const progress = calculateProgress(project.tasks);

  const handleApprove = () => {
    onApprove(commentText);
    setCommentText('');
  };

  const handleDeny = () => {
    if (commentText.trim()) {
      onDeny(commentText);
      setCommentText('');
    } else {
      alert('Please provide a reason for declining');
    }
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(commentText);
      setCommentText('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '40px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            transform: scale(0.95);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        animation: 'scaleIn 0.3s ease-out'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          <X size={28} />
        </button>

        <div style={{ padding: '40px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}>
            Project #{project.id}
          </h2>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
            Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          {/* Progress */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#666', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Progress: {progress}%
            </div>
            <div style={{ background: '#e8e8e8', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg, #da291c, #ff4444)',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Issue & Solution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Issue
              </h3>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a' }}>
                {project.issue}
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Solution
              </h3>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a' }}>
                {project.solution}
              </p>
            </div>
          </div>

          {/* Tasks */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Implementation Steps
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.tasks.map((task, idx) => (
                <div key={task.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 15px',
                  background: task.completed ? '#f9f9f9' : 'white',
                  border: `1px solid ${task.completed ? '#da291c' : '#e8e8e8'}`,
                  borderRadius: '8px'
                }}>
                  {task.completed ? <CheckCircle2 size={18} color="#da291c" /> : <Circle size={18} color="#ccc" />}
                  <span style={{ flex: 1, fontSize: '14px', color: task.completed ? '#999' : '#1a1a1a', textDecoration: task.completed ? 'line-through' : 'none' }}>
                    {idx + 1}. {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          {project.comments.length > 0 && (
            <div style={{ marginBottom: '30px', paddingTop: '30px', borderTop: '2px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Review History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {project.comments.map((comment, idx) => (
                  <div key={idx} style={{
                    padding: '15px',
                    background: '#f9f9f9',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${comment.type === 'approved' ? '#28a745' : comment.type === 'denied' ? '#da291c' : '#666'}`
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                      {comment.author} • {new Date(comment.date).toLocaleString()}
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#1a1a1a' }}>{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ paddingTop: '30px', borderTop: '2px solid #f0f0f0' }}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add feedback or instructions..."
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '8px',
                border: '2px solid #e8e8e8',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '100px',
                marginBottom: '15px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleComment} disabled={!commentText.trim()} style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '2px solid #1a1a1a',
                background: 'white',
                color: '#1a1a1a',
                fontSize: '13px',
                fontWeight: '700',
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                opacity: commentText.trim() ? 1 : 0.5,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Comment
              </button>
              <button onClick={handleApprove} style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#28a745',
                color: 'white',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Approve
              </button>
              <button onClick={handleDeny} style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#da291c',
                color: 'white',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}