import React from 'react';
import { Outlet } from 'react-router-dom';

export const SystemSettings = () => {
    return (
        <div style={{ 
            width: '100%', 
            height: '100%',
            padding: '24px',
            overflowY: 'auto',
            background: '#fff',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            <Outlet />
        </div>
    );
};
