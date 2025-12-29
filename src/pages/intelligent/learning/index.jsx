import React from 'react';
import { Empty, Typography } from 'antd';
import { BulbOutlined } from '@ant-design/icons';

const { Title } = Typography;

/**
 * 持续学习页面
 */
export const IntelligentLearning = () => {
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            minHeight: '400px'
        }}>
            <Empty
                image={<BulbOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
                description={
                    <Title level={4} type="secondary">
                        功能正常开发中
                    </Title>
                }
            />
        </div>
    );
};

