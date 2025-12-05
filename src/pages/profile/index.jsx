import { Button, Card, Space, Typography, Descriptions, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import { getUserInfo } from '../../api/user';
import { EditOutlined, KeyOutlined } from '@ant-design/icons';
import { ProfileEditModal } from './ProfileEditModal';

const { Title } = Typography;

export default function Profile() {
    const [userInfo, setUserInfo] = useState(null);
    const [basicModalVisible, setBasicModalVisible] = useState(false);
    const [securityModalVisible, setSecurityModalVisible] = useState(false);

    useEffect(() => {
        handleFetchUserInfo();
    }, []);

    const handleFetchUserInfo = async () => {
        try {
            const res = await getUserInfo();
            setUserInfo(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleBasicModalClose = () => {
        setBasicModalVisible(false);
    };

    const handleSecurityModalClose = () => {
        setSecurityModalVisible(false);
    };

    const renderSectionHeader = (title, onEdit, icon = <EditOutlined />) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>{title}</Title>
            <Tooltip title={title === '基本信息' ? '编辑' : '修改密码'}>
                <Button
                    type="text"
                    icon={icon}
                    onClick={onEdit}
                    style={{ color: '#1677ff' }}
                />
            </Tooltip>
        </div>
    );

    return (
        <>
            <div style={{ padding: '24px' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* 基本信息 */}
                    <Card
                        style={{
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                            borderRadius: '8px'
                        }}
                    >
                        {renderSectionHeader('基本信息', () => setBasicModalVisible(true))}
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="用户名" labelStyle={{ width: 120, fontWeight: 500 }}>
                                {userInfo?.username || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="邮箱" labelStyle={{ width: 120, fontWeight: 500 }}>
                                {userInfo?.email || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="角色" labelStyle={{ width: 120, fontWeight: 500 }}>
                                {userInfo?.role || '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {/* 安全 */}
                    <Card
                        style={{
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                            borderRadius: '8px'
                        }}
                    >
                        {renderSectionHeader('安全', () => setSecurityModalVisible(true), <KeyOutlined />)}
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="密码" labelStyle={{ width: 120, fontWeight: 500 }}>
                                •••••••••
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Space>
            </div>

            {/* 编辑基本信息模态框 */}
            <ProfileEditModal
                visible={basicModalVisible}
                onClose={handleBasicModalClose}
                userInfo={userInfo}
                type="basic"
                onSuccess={handleFetchUserInfo}
            />

            {/* 修改密码模态框 */}
            <ProfileEditModal
                visible={securityModalVisible}
                onClose={handleSecurityModalClose}
                userInfo={userInfo}
                type="security"
                onSuccess={handleFetchUserInfo}
            />
        </>
    );
}