import React from 'react';
import { Button, Popconfirm } from 'antd';

// 表单操作按钮组件 - 统一的保存/取消按钮布局
export const FormActions = ({ loading, onCancel, saveText = '保存', cancelText = '取消' }) => {
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '10px', 
            marginTop: '24px' 
        }}>
            <Popconfirm
                title="确认取消？"
                description="取消后修改的配置将不会保存！"
                onConfirm={onCancel}
                okText="确认"
                cancelText="继续编辑"
            >
                <Button type="dashed" disabled={loading}>{cancelText}</Button>
            </Popconfirm>
            <Button
                type="primary"
                htmlType="submit"
                loading={loading}
            >
                {loading ? '保存中...' : saveText}
            </Button>
        </div>
    );
};

