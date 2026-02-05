import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

/**
 * Provider 配置 Modal
 * 用于创建和编辑 AI Provider 配置
 */
export const ProviderConfigModal = ({ visible, onClose, onSave, initialValues, mode }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            if (mode === 'edit' && initialValues) {
                form.setFieldsValue(initialValues);
            } else {
                form.resetFields();
            }
        }
    }, [visible, mode, initialValues, form]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();

            if (onSave) {
                await onSave(values);
            }

            form.resetFields();
            onClose();
        } catch (error) {
            console.error('Form validation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    // 预设的 Provider 类型
    const providerPresets = [
        {
            label: 'OpenAI 官方 API',
            value: 'openai',
            defaultUrl: 'https://api.openai.com/v1/chat/completions',
        },
        {
            label: 'OpenAI 兼容 API (OneAPI)',
            value: 'openai-compatible',
            defaultUrl: '',
        },
        {
            label: 'Dify',
            value: 'dify',
            defaultUrl: '',
        },
        {
            label: 'Claude',
            value: 'claude',
            defaultUrl: 'https://api.anthropic.com/v1/messages',
        },
        {
            label: 'DeepSeek',
            value: 'deepseek',
            defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
        },
        {
            label: '自定义',
            value: 'custom',
            defaultUrl: '',
        }
    ];

    // Provider 类型变化时，填充默认值
    const handleProviderTypeChange = (value) => {
        const preset = providerPresets.find(p => p.value === value);
        if (preset && preset.defaultUrl) {
            form.setFieldsValue({
                url: preset.defaultUrl
            });
        }
    };

    return (
        <Modal
            title={mode === 'edit' ? '编辑 Provider 配置' : '添加 Provider 配置'}
            open={visible}
            onCancel={handleCancel}
            width={600}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    取消
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    {mode === 'edit' ? '保存' : '创建'}
                </Button>
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    providerType: 'openai'
                }}
            >
                <Form.Item
                    name="name"
                    label="配置名称"
                    rules={[
                        { required: true, message: '请输入配置名称' },
                        { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线和连字符' }
                    ]}
                    tooltip="唯一标识符，用于区分不同的 Provider 配置"
                    extra={mode === 'create' ? '例如：openai-gpt4、dify-production、claude-3-5' : undefined}
                >
                    <Input
                        placeholder="例如：openai-gpt4"
                        disabled={mode === 'edit'}
                    />
                </Form.Item>

                <Form.Item
                    name="providerType"
                    label="Provider 类型"
                    tooltip="选择预设类型会自动填充默认配置"
                >
                    <Select
                        placeholder="选择 Provider 类型"
                        onChange={handleProviderTypeChange}
                        options={providerPresets.map(p => ({
                            label: p.label,
                            value: p.value
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="url"
                    label="接口地址"
                    rules={[
                        { required: true, message: '请输入接口地址' },
                        { type: 'url', message: '请输入有效的 URL 地址' }
                    ]}
                    tooltip="完整的 API 端点地址，包括协议和路径"
                >
                    <Input placeholder="https://api.openai.com/v1/chat/completions" />
                </Form.Item>

                <Form.Item
                    name="appKey"
                    label="API 密钥"
                    rules={[{ required: true, message: '请输入 API 密钥' }]}
                >
                    <Input.Password placeholder="请输入 API 密钥" />
                </Form.Item>

                <Form.Item
                    label="支持的模型"
                    required
                    tooltip="配置该 Provider 支持的模型列表"
                >
                    <Form.List
                        name="models"
                        rules={[
                            {
                                validator: async (_, models) => {
                                    if (!models || models.length < 1) {
                                        return Promise.reject(new Error('至少添加一个模型'));
                                    }
                                },
                            },
                        ]}
                    >
                        {(fields, { add, remove }, { errors }) => (
                            <>
                                {fields.map((field, index) => (
                                    <Form.Item
                                        required={false}
                                        key={field.key}
                                    >
                                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item
                                                {...field}
                                                validateTrigger={['onChange', 'onBlur']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        whitespace: true,
                                                        message: "请输入模型名称或删除此项",
                                                    },
                                                ]}
                                                noStyle
                                            >
                                                <Input
                                                    placeholder="例如：gpt-4, gpt-3.5-turbo"
                                                    style={{ width: 400 }}
                                                />
                                            </Form.Item>
                                            {fields.length > 1 ? (
                                                <MinusCircleOutlined
                                                    className="dynamic-delete-button"
                                                    onClick={() => remove(field.name)}
                                                />
                                            ) : null}
                                        </Space>
                                    </Form.Item>
                                ))}
                                <Form.Item>
                                    <Button
                                        type="dashed"
                                        onClick={() => add()}
                                        style={{ width: '100%' }}
                                        icon={<PlusOutlined />}
                                    >
                                        添加模型
                                    </Button>
                                    <Form.ErrorList errors={errors} />
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form.Item>
            </Form>
        </Modal>
    );
};
