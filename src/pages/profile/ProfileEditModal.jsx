import { Form, Input, Modal, message } from 'antd';
import React, { useEffect } from 'react';
import { updateUser } from '../../api/user';

export const ProfileEditModal = ({ visible, onClose, userInfo, type, onSuccess }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible && userInfo) {
            if (type === 'basic') {
                form.setFieldsValue({
                    username: userInfo.username,
                    email: userInfo.email,
                });
            } else if (type === 'security') {
                form.resetFields();
            }
        }
    }, [visible, userInfo, type, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            let params = {
                userid: userInfo.userid,
                username: userInfo.username,
                email: userInfo.email,
                phone: userInfo.phone || '',
                role: userInfo.role,
                create_by: userInfo.create_by || '',
                create_at: userInfo.create_at || 0,
                joinDuty: userInfo.joinDuty || '',
                dutyUserId: userInfo.dutyUserId || '',
                tenants: userInfo.tenants || [],
            };

            if (type === 'basic') {
                params.email = values.email;
                params.password = ''; // 不更新密码
            } else if (type === 'security') {
                params.password = values.password;
            }

            await updateUser(params);
            message.success(type === 'basic' ? '基本信息更新成功' : '密码更新成功');
            form.resetFields();
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            message.error('更新失败');
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title={type === 'basic' ? '编辑基本信息' : '修改密码'}
            open={visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            okText="保存"
            cancelText="取消"
            width={500}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                preserve={false}
            >
                {type === 'basic' ? (
                    <>
                        <Form.Item
                            label="用户名"
                            name="username"
                        >
                            <Input disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                        </Form.Item>
                        <Form.Item
                            label="邮箱"
                            name="email"
                            rules={[
                                { type: 'email', message: '请输入有效的邮箱地址' },
                                { required: true, message: '请输入邮箱' },
                            ]}
                        >
                            <Input placeholder="请输入邮箱地址" />
                        </Form.Item>
                    </>
                ) : (
                    <>
                        <Form.Item
                            label="新密码"
                            name="password"
                            rules={[
                                { required: true, message: '请输入新密码' },
                                { min: 6, message: '密码至少6个字符' },
                            ]}
                        >
                            <Input.Password placeholder="请输入新密码" />
                        </Form.Item>
                        <Form.Item
                            label="确认密码"
                            name="confirmPassword"
                            dependencies={['password']}
                            rules={[
                                { required: true, message: '请确认新密码' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('两次输入的密码不一致'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder="请再次输入新密码" />
                        </Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    );
};