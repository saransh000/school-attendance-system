import React from 'react';
import { Nav } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const getMenuItems = () => {
    const commonItems = [
      { path: '/dashboard', label: '📊 Dashboard', icon: '📊' },
      { path: '/profile', label: '👤 Profile', icon: '👤' }
    ];

    if (user?.role === 'admin') {
      return [
        ...commonItems,
        { path: '/users', label: '👥 Users', icon: '👥' },
        { path: '/classes', label: '🏫 Classes', icon: '🏫' },
        { path: '/attendance', label: '📋 Attendance', icon: '📋' },
        { path: '/reports', label: '📈 Reports', icon: '📈' }
      ];
    }

    if (user?.role === 'teacher') {
      return [
        ...commonItems,
        { path: '/classes', label: '🏫 My Classes', icon: '🏫' },
        { path: '/attendance', label: '📋 Take Attendance', icon: '📋' },
        { path: '/reports', label: '📈 Reports', icon: '📈' }
      ];
    }

    if (user?.role === 'student') {
      return [
        ...commonItems,
        { path: '/classes', label: '🏫 My Class', icon: '🏫' },
        { path: '/attendance', label: '📋 My Attendance', icon: '📋' }
      ];
    }

    return commonItems;
  };

  return (
    <Nav className="flex-column p-3">
      {getMenuItems().map((item) => (
        <Nav.Link
          key={item.path}
          href={item.path}
          className={`text-light mb-2 ${isActive(item.path) ? 'active bg-secondary' : ''}`}
        >
          <span style={{ marginRight: '8px' }}>{item.icon}</span>
          {item.label.replace(/^.+ /, '')}
        </Nav.Link>
      ))}
    </Nav>
  );
};

export default Sidebar;