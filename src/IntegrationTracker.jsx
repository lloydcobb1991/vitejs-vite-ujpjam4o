import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, MessageSquare, Edit2, Save, X, Zap, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function IntegrationTracker() {
  const [projects, setProjects] = useState([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [filter, setFilter] = useState('active');
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const addProject = (projectData) => {
    const newProject = {
      id: Date.now(),
      ...projectData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      comments: [],
      tasks: projectData.tasks.map((task, idx) => ({
        id: `task-${Date.now()}-${idx}`,
        text: task,
        completed: false
      }))
    };
    saveProjects([...projects, newProject]);
    setIsAddingProject(false);
  };

  const toggleTask = (projectId, taskId) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        const updatedTasks = p.tasks.map(t => 
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        return { ...p, tasks: updatedTasks };
      }
      return p;
    });
    saveProjects(updated);
  };

  const deleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      saveProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    }
  };

  const editProject = (projectId, updates) => {
    const updated = projects.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    );
    saveProjects(updated);
    if (selectedProject?.id === projectId) {
      setSelectedProject({ ...selectedProject, ...updates });
    }
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
        background: '#f5f5f5',
        color: '#1a1a1a'
      }}>
        Loading projects...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '40px 20px',
      fontFamily: '"Brandon Grotesque", "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1800px',
        minWidth: '320px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '30px 40px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          borderTop: '4px solid #da291c'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px', 
                fontWeight: '700',
                color: '#1a1a1a',
                letterSpacing: '-0.5px'
              }}>
                My Projects
              </h1>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '15px' }}>
                Track your integration initiatives
              </p>
            </div>
            <button
              onClick={() => setIsAddingProject(true)}
              style={{
                padding: '14px 28px',
                borderRadius: '4px',
                border: 'none',
                background: '#da291c',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} />
              New Project
            </button>
          </div>

          {/* Filter Toggle */}
          <div style={{
            display: 'flex',
            gap: '5px',
            background: '#f0f0f0',
            borderRadius: '30px',
            padding: '5px',
            width: 'fit-content'
          }}>
            <button
              onClick={() => setFilter('active')}
              style={{
                padding: '10px 30px',
                borderRadius: '25px',
                border: 'none',
                background: filter === 'active' ? '#da291c' : 'transparent',
                color: filter === 'active' ? 'white' : '#666',
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
                background: filter === 'pending' ? '#da291c' : 'transparent',
                color: filter === 'pending' ? 'white' : '#666',
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

        {/* Project Grid */}
        {filteredProjects.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '60px 40px',
            textAlign: 'center',
            color: '#999',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <p style={{ fontSize: '16px', margin: 0 }}>
              No {filter} projects yet.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProject(project)}
                calculateProgress={calculateProgress}
              />
            ))}
          </div>
        )}

        {/* New Project Form Modal */}
        {isAddingProject && (
          <ProjectFormModal 
            onSubmit={addProject} 
            onCancel={() => setIsAddingProject(false)} 
          />
        )}

        {/* Selected Project Detail Modal */}
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onToggleTask={toggleTask}
            onDelete={deleteProject}
            onEdit={editProject}
            calculateProgress={calculateProgress}
          />
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick, calculateProgress }) {
  const progress = calculateProgress(project.tasks);
  
  const statusConfig = {
    pending: { bg: '#fff8e6', border: '#ffa500', text: '#ffa500', label: 'Pending' },
    approved: { bg: '#f0f9f4', border: '#28a745', text: '#28a745', label: 'Approved' },
    denied: { bg: '#fff5f5', border: '#da291c', text: '#da291c', label: 'Declined' }
  };

  const status = statusConfig[project.status] || statusConfig.pending;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        border: '2px solid #e8e8e8',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = '#da291c';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e8e8e8';
      }}
    >
      {/* Thumbnail */}
      {project.thumbnail ? (
        <div style={{
          width: '100%',
          height: '120px',
          background: `url(${project.thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '8px',
          marginBottom: '8px'
        }} />
      ) : (
        <div style={{
          width: '100%',
          height: '120px',
          background: '#f0f0f0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          marginBottom: '8px'
        }}>
          📁
        </div>
      )}

      {/* Project Name */}
      <h3 style={{
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        color: '#1a1a1a',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {project.name || `Project #${project.id}`}
      </h3>

      {/* Progress */}
      <div>
        <div style={{
          background: '#e8e8e8',
          height: '6px',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '6px'
        }}>
          <div style={{
            background: '#da291c',
            height: '100%',
            width: `${progress}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
          {progress}% Complete
        </div>
      </div>

      {/* Status Badge */}
      <div style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        background: status.bg,
        color: status.text,
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        alignSelf: 'flex-start'
      }}>
        {status.label}
      </div>
    </div>
  );
}

function ProjectFormModal({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [issue, setIssue] = useState('');
  const [solution, setSolution] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);

  const handleThumbnailUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnail(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && issue && solution && tasks.length > 0) {
      onSubmit({ name, issue, solution, tasks, thumbnail });
    }
  };

  const addTask = () => {
    if (taskInput.trim()) {
      setTasks([...tasks, taskInput.trim()]);
      setTaskInput('');
    }
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
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
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'scaleIn 0.3s ease-out',
        position: 'relative'
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          <X size={24} />
        </button>

        <h2 style={{ margin: '0 0 25px 0', fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
          New Integration Project
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Automate Monthly Reports"
            style={{
              width: '100%',
              padding: '12px 15px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '15px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            What's the issue?
          </label>
          <textarea
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="Describe the problem or inefficiency..."
            style={{
              width: '100%',
              padding: '12px 15px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '15px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Solution / Automation
          </label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Explain the solution and expected outcomes..."
            style={{
              width: '100%',
              padding: '12px 15px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '15px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Project Thumbnail (Optional)
          </label>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {thumbnail && (
              <div style={{
                width: '80px',
                height: '80px',
                background: `url(${thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                border: '2px solid #e8e8e8'
              }} />
            )}
            <label style={{
              padding: '10px 20px',
              borderRadius: '4px',
              border: '2px dashed #da291c',
              background: 'white',
              color: '#da291c',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Plus size={16} />
              {thumbnail ? 'Change' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Implementation Steps
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
              placeholder="Add a step..."
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            <button
              type="button"
              onClick={addTask}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                background: '#da291c',
                color: 'white',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: '#f9f9f9',
                borderRadius: '4px',
                border: '1px solid #e8e8e8'
              }}>
                <span style={{ flex: 1, fontSize: '14px', color: '#1a1a1a' }}>
                  {idx + 1}. {task}
                </span>
                <button
                  type="button"
                  onClick={() => removeTask(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#da291c',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          {tasks.length === 0 && (
            <p style={{ color: '#999', fontSize: '13px', margin: '10px 0 0 0' }}>
              Add at least one step to continue
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '25px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              background: 'white',
              color: '#666',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name || !issue || !solution || tasks.length === 0}
            style={{
              padding: '12px 32px',
              borderRadius: '4px',
              border: 'none',
              background: name && issue && solution && tasks.length > 0 ? '#da291c' : '#e8e8e8',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: name && issue && solution && tasks.length > 0 ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectDetailModal({ project, onClose, onToggleTask, onDelete, onEdit, calculateProgress }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name || '');
  const [editedIssue, setEditedIssue] = useState(project.issue);
  const [editedSolution, setEditedSolution] = useState(project.solution);

  const progress = calculateProgress(project.tasks);
  
  const statusConfig = {
    pending: { bg: '#fff8e6', text: '#ffa500', label: 'Pending Review' },
    approved: { bg: '#f0f9f4', text: '#28a745', label: 'Approved' },
    denied: { bg: '#fff5f5', text: '#da291c', label: 'Declined' }
  };

  const status = statusConfig[project.status] || statusConfig.pending;

  const handleSave = () => {
    onEdit(project.id, { name: editedName, issue: editedIssue, solution: editedSolution });
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(project.id);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '40px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'scaleIn 0.3s ease-out',
        position: 'relative'
      }}>
        <div style={{ padding: '40px' }}>
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

          {/* Header with Status */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '20px',
              background: status.bg,
              color: status.text,
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px'
            }}>
              {status.label}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '28px',
                  fontWeight: '700',
                  border: '2px solid #e8e8e8',
                  borderRadius: '6px',
                  padding: '10px 15px',
                  fontFamily: 'inherit',
                  marginBottom: '10px'
                }}
              />
            ) : (
              <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>
                {project.name || `Project #${project.id}`}
              </h2>
            )}
            
            <div style={{ fontSize: '14px', color: '#666' }}>
              Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '2px solid #da291c',
                    background: 'white',
                    color: '#da291c',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '2px solid #999',
                    background: 'white',
                    color: '#999',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#da291c',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  <Save size={14} />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedName(project.name || '');
                    setEditedIssue(project.issue);
                    setEditedSolution(project.solution);
                    setIsEditing(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '2px solid #ddd',
                    background: 'white',
                    color: '#666',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Cancel
                </button>
              </>
            )}
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
              {isEditing ? (
                <textarea
                  value={editedIssue}
                  onChange={(e) => setEditedIssue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '2px solid #e8e8e8',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '100px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a' }}>
                  {project.issue}
                </p>
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Solution
              </h3>
              {isEditing ? (
                <textarea
                  value={editedSolution}
                  onChange={(e) => setEditedSolution(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '2px solid #e8e8e8',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '100px',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a' }}>
                  {project.solution}
                </p>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Implementation Steps
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.tasks.map((task, idx) => (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(project.id, task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 15px',
                    background: task.completed ? '#f9f9f9' : 'white',
                    border: `1px solid ${task.completed ? '#da291c' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
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
            <div style={{ paddingTop: '30px', borderTop: '2px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', color: '#da291c', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Feedback from Leadership
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
        </div>
      </div>
    </div>
  );
}