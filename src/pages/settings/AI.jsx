import React, { useState, useEffect } from 'react';
import { Form, Input, Radio, Typography, Table, Button, Space, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import TextArea from "antd/es/input/TextArea";
import { getSystemSetting, saveSystemSetting } from "../../api/settings";
import { MyFormItemGroup, MyFormItem, radioOptions } from "./utils";
import { FormActions } from "./FormActions";
import { showToast } from "../../components/Toast";
import { ProviderConfigModal } from "./ProviderConfigModal";

export const AISettings = () => {
    const [form] = Form.useForm();
    const [enableAi, setEnableAi] = useState(false);
    const [loading, setLoading] = useState(false);
    const [providers, setProviders] = useState({});
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [editingProvider, setEditingProvider] = useState(null);

    useEffect(() => {
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 默认提示词
    const defaultPrompt = "请分析以下警报内容，下面的信息很可能包括（指标、日志、跟踪或 Kubernetes 事件）。\n" +
        "---\n" +
        "您的分析应包括：\n" +
        "1. 可能的原因分析：详细解释警报中出现问题的潜在原因，并提供相关示例。\n" +
        "2. 排查步骤：概述系统化的故障排除和问题解决方法，包括具体的步骤、命令或工具。\n" +
        "3. 最佳实践和策略：推荐防止此类问题再次发生的最佳实践，讨论如何实施监控、警报和操作程序以缓解类似问题。\n" +
        "---\n" +
        "现在我接收到的告警内容如下：\n" +
        "规则名称:\n" +
        "{{ RuleName }}\n" +
        "触发条件:\n" +
        "{{ SearchQL }}\n" +
        "告警内容:\n" +
        "{{ Content }}\n" +
        "---\n" +
        "请根据以下三个方面，结构化地回复我，要求简洁明了、通俗易懂：\n" +
        "1. 分析可能的原因\n" +
        "2. 具体的排查步骤\n" +
        "3. 如何规避\n" +
        "---\n" +
        "请清晰格式化您的回复，并使用适当的标题分隔每个部分。\n";

    // 加载AI配置
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();
            const aiConfig = res.data.aiConfig || {};

            // 数据迁移：如果是旧格式（没有 providers 字段），转换为新格式
            let providersData = aiConfig.providers || {};
            let needMigration = false;

            if (Object.keys(providersData).length === 0 && aiConfig.provider && aiConfig.url) {
                // 从旧字段迁移数据
                providersData = {
                    [aiConfig.provider]: {
                        url: aiConfig.url,
                        appKey: aiConfig.appKey,
                        // 迁移旧的 model 字段到新的 models 数组
                        models: aiConfig.model ? [aiConfig.model] : []
                    }
                };
                needMigration = true;
            }

            const enable = aiConfig.enable || false;
            const timeout = aiConfig.timeout || 30;
            const maxTokens = aiConfig.maxTokens || 1000;
            const prompt = aiConfig.prompt || defaultPrompt;

            setEnableAi(enable);
            setProviders(providersData);

            // 设置表单值
            form.setFieldsValue({
                aiConfig: {
                    enable,
                    timeout,
                    maxTokens,
                    prompt
                }
            });

            // 如果进行了数据迁移，自动保存到数据库以便下次直接使用新格式
            if (needMigration) {
                try {
                    const processedValues = {
                        ...res.data,
                        aiConfig: {
                            enable,
                            providers: providersData,
                            timeout,
                            maxTokens,
                            prompt
                        }
                    };
                    await saveSystemSetting(processedValues);
                } catch (migrateError) {
                    console.error('数据迁移保存失败，但不影响使用:', migrateError);
                }
            }
        } catch (error) {
            console.error("Failed to load AI settings:", error);
            showToast.error('加载AI配置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 保存AI配置
    const saveSettings = async (values) => {
        setLoading(true);
        try {
            await form.validateFields();

            // 获取完整的设置数据
            const res = await getSystemSetting();
            const processedValues = {
                ...res.data,
                aiConfig: {
                    enable: values.aiConfig.enable,
                    providers: providers,
                    timeout: values.aiConfig.timeout ? Number(values.aiConfig.timeout) : 30,
                    maxTokens: values.aiConfig.maxTokens ? Number(values.aiConfig.maxTokens) : 1000,
                    prompt: values.aiConfig.prompt
                }
            };

            await saveSystemSetting(processedValues);
            showToast.success('AI配置保存成功，且立即生效！', { autoClose: 3000 });
            loadSettings();
        } catch (error) {
            console.error("Failed to save AI settings:", error);
            showToast.error('保存AI配置失败，请检查输入并重试');
        } finally {
            setLoading(false);
        }
    };

    // 取消修改
    const handleCancel = () => {
        form.resetFields();
        loadSettings();
        showToast.info('已取消修改');
    };

    // AI启用状态处理
    const handleAiEnableChange = (e) => {
        const enabled = e.target.value;
        setEnableAi(enabled);
        form.setFieldValue(['aiConfig', 'enable'], enabled);
    };

    // 打开创建 Modal
    const handleOpenCreateModal = () => {
        setModalMode('create');
        setEditingProvider(null);
        setModalVisible(true);
    };

    // 打开编辑 Modal
    const handleOpenEditModal = (providerName) => {
        setModalMode('edit');
        setEditingProvider({
            name: providerName,
            ...providers[providerName]
        });
        setModalVisible(true);
    };

    // 辅助函数：保存 Providers 数据到数据库
    const saveProvidersToDatabase = async (newProviders) => {
        setLoading(true);
        try {
            // 获取完整的设置数据
            const res = await getSystemSetting();
            const formValues = form.getFieldsValue();

            const processedValues = {
                ...res.data,
                aiConfig: {
                    enable: formValues.aiConfig.enable,
                    providers: newProviders,
                    timeout: formValues.aiConfig.timeout ? Number(formValues.aiConfig.timeout) : 30,
                    maxTokens: formValues.aiConfig.maxTokens ? Number(formValues.aiConfig.maxTokens) : 1000,
                    prompt: formValues.aiConfig.prompt
                }
            };

            await saveSystemSetting(processedValues);

            // 更新前端 state
            setProviders(newProviders);

            // 重新加载配置以确保数据一致性
            await loadSettings();

            return true;
        } catch (error) {
            console.error('Failed to save providers:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // 保存 Provider 配置（立即保存到数据库）
    const handleSaveProvider = async (values) => {
        const newProviders = { ...providers };

        if (modalMode === 'create') {
            if (newProviders[values.name]) {
                showToast.error('该配置名称已存在');
                return;
            }

            newProviders[values.name] = {
                url: values.url,
                appKey: values.appKey,
                models: values.models || []
            };
        } else {
            // 编辑模式
            newProviders[values.name] = {
                url: values.url,
                appKey: values.appKey,
                models: values.models || []
            };
        }

        try {
            await saveProvidersToDatabase(newProviders);
            setModalVisible(false);

            // 提示保存成功
            if (modalMode === 'create') {
                showToast.success(`已添加 Provider: ${values.name}，并保存到数据库`);
            } else {
                showToast.success(`已更新 Provider: ${values.name}，并保存到数据库`);
            }
        } catch (error) {
            showToast.error('保存 Provider 配置失败：' + (error.message || '未知错误'));
        }
    };

    // 删除 Provider（立即保存到数据库）
    const handleDeleteProvider = async (providerName) => {
        const newProviders = { ...providers };
        delete newProviders[providerName];

        try {
            await saveProvidersToDatabase(newProviders);
            showToast.success(`已删除 Provider: ${providerName}，并保存到数据库`);
        } catch (error) {
            showToast.error('删除 Provider 配置失败：' + (error.message || '未知错误'));
        }
    };

    // Provider 列表的 Table 列配置
    const providerColumns = [
        {
            title: '配置名称',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (text) => (
                <Typography.Text strong>{text}</Typography.Text>
            )
        },
        {
            title: '接口地址',
            dataIndex: 'url',
            key: 'url',
            width: 300,
            ellipsis: {
                showTitle: false,
            },
            render: (url) => (
                <Tooltip title={url}>
                    <Typography.Text ellipsis>
                        {url}
                    </Typography.Text>
                </Tooltip>
            )
        },
        {
            title: '支持的模型',
            dataIndex: 'models',
            key: 'models',
            width: 250,
            render: (models) => {
                if (!models || models.length === 0) {
                    return <Typography.Text type="secondary">未配置模型</Typography.Text>;
                }

                // 显示前3个模型，如果超过3个则显示 "+N"
                const displayModels = models.slice(0, 3);
                const remainingCount = models.length - 3;

                return (
                    <Space size={4} wrap>
                        {displayModels.map((model, index) => (
                            <Typography.Text
                                key={index}
                                style={{
                                    padding: '2px 8px',
                                    background: '#f0f0f0',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}
                            >
                                {model}
                            </Typography.Text>
                        ))}
                        {remainingCount > 0 && (
                            <Tooltip title={models.slice(3).join(', ')}>
                                <Typography.Text
                                    type="secondary"
                                    style={{
                                        padding: '2px 8px',
                                        background: '#fafafa',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                    }}
                                >
                                    +{remainingCount}
                                </Typography.Text>
                            </Tooltip>
                        )}
                    </Space>
                );
            }
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenEditModal(record.name)}
                            style={{ color: "#1677ff" }}
                        />
                    </Tooltip>
                    <Tooltip title="删除">
                        <Popconfirm
                            title="确定要删除吗?"
                            description={`删除后该 Provider 配置将无法恢复`}
                            onConfirm={() => handleDeleteProvider(record.name)}
                            okText="确定"
                            cancelText="取消"
                            placement="left"
                        >
                            <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                style={{ color: "#ff4d4f" }}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        }
    ];

    // 转换 providers 对象为 Table 数据源
    const providerDataSource = Object.keys(providers).map(name => ({
        key: name,
        name,
        ...providers[name]
    }));

    return (
        <>
            <Typography.Title level={4}>AI 能力</Typography.Title>

            <Form form={form} name="aiForm" layout="vertical" onFinish={saveSettings}>
                <MyFormItemGroup prefix={['aiConfig']}>
                    <MyFormItem name="enable">
                        <Radio.Group
                            block
                            options={radioOptions}
                            value={enableAi}
                            onChange={handleAiEnableChange}
                        />
                    </MyFormItem>

                    {enableAi === true && (
                        <>
                            {/* Provider 配置管理 */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography.Title level={5} style={{ margin: 0 }}>
                                        Provider 配置
                                    </Typography.Title>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleOpenCreateModal}
                                    >
                                        添加 Provider
                                    </Button>
                                </div>

                                {providerDataSource.length > 0 ? (
                                    <Table
                                        columns={providerColumns}
                                        dataSource={providerDataSource}
                                        pagination={false}
                                        bordered
                                        size="middle"
                                        style={{
                                            backgroundColor: "#fff",
                                            borderRadius: "8px",
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        padding: '48px 24px',
                                        textAlign: 'center',
                                        background: '#fafafa',
                                        borderRadius: '8px',
                                        border: '1px dashed #d9d9d9'
                                    }}>
                                        <Typography.Text type="secondary">
                                            还没有配置任何 Provider，点击"添加 Provider"按钮开始配置
                                        </Typography.Text>
                                    </div>
                                )}
                            </div>

                            {/* 全局配置 */}
                            <Typography.Title level={5} style={{ marginTop: '32px', marginBottom: '16px' }}>
                                全局配置
                            </Typography.Title>

                            <MyFormItem
                                name="timeout"
                                label="超时时间（秒）"
                                rules={[
                                    { required: true, message: '请输入超时时间' },
                                    { pattern: /^\d+$/, message: '超时时间必须为正整数' }
                                ]}
                            >
                                <Input type="number" min={1} placeholder="请输入超时时间" style={{ width: 200 }} />
                            </MyFormItem>

                            <MyFormItem
                                name="maxTokens"
                                label="最大 Token 数"
                                rules={[
                                    { required: true, message: '请输入最大Token数' },
                                    { pattern: /^\d+$/, message: 'Token数必须为正整数' }
                                ]}
                            >
                                <Input type="number" min={1} placeholder="请输入最大Token数" style={{ width: 200 }} />
                            </MyFormItem>

                            <MyFormItem
                                name="prompt"
                                label="自定义提示词"
                                rules={[{ required: true, message: '请输入提示词' }]}
                            >
                                <TextArea rows={15} placeholder="请输入自定义提示词" />
                            </MyFormItem>
                        </>
                    )}
                </MyFormItemGroup>

                <FormActions
                    loading={loading}
                    onCancel={handleCancel}
                />
            </Form>

            {/* Provider 配置 Modal */}
            <ProviderConfigModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveProvider}
                initialValues={editingProvider}
                mode={modalMode}
            />
        </>
    );
};
