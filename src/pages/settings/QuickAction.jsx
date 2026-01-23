import React, { useState, useEffect } from 'react';
import { Form, Input, Radio, Typography, Collapse, Card, Descriptions } from 'antd';
import { getSystemSetting, saveSystemSetting } from "../../api/settings";
import { MyFormItemGroup, MyFormItem, radioOptions, helpTextStyle } from "./utils";
import { FormActions } from "./FormActions";
import { showToast } from "../../components/Toast";

export const QuickActionSettings = () => {
    const [form] = Form.useForm();
    const [enableQuickAction, setEnableQuickAction] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    // 加载快捷操作配置
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();
            const quickActionConfig = {
                enabled: res.data.quickActionConfig?.enabled || false,
                baseUrl: res.data.quickActionConfig?.baseUrl || "",
                apiUrl: res.data.quickActionConfig?.apiUrl || "",
                secretKey: res.data.quickActionConfig?.secretKey || "",
            };
            form.setFieldsValue({ quickActionConfig });
            setEnableQuickAction(quickActionConfig.enabled);
        } catch (error) {
            console.error("Failed to load quick action settings:", error);
            showToast.error('加载快捷操作配置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 保存快捷操作配置
    const saveSettings = async (values) => {
        setLoading(true);
        try {
            await form.validateFields();
            
            // 获取完整的设置数据
            const res = await getSystemSetting();
            const processedValues = {
                ...res.data,
                quickActionConfig: {
                    ...values.quickActionConfig,
                    enabled: enableQuickAction,
                }
            };

            await saveSystemSetting(processedValues);
            showToast.success('快捷操作配置保存成功，且立即生效！', { autoClose: 3000 });
            loadSettings();
        } catch (error) {
            console.error("Failed to save quick action settings:", error);
            showToast.error('保存快捷操作配置失败，请检查输入并重试');
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

    // 快捷操作启用状态处理
    const handleQuickActionEnableChange = (e) => {
        const enabled = e.target.value;
        setEnableQuickAction(enabled);
        form.setFieldValue(['quickActionConfig', 'enabled'], enabled);
    };

    return (
        <>
            <Typography.Title level={4}>快捷操作配置</Typography.Title>
            <p style={helpTextStyle}>• 用于在飞书/钉钉通知消息中显示快捷操作按钮（认领、静默、查看详情等）；</p>
            
            {/* 当前配置值显示 */}
            <Collapse
                ghost
                items={[{
                    key: '1',
                    label: '📋 查看当前配置值',
                    children: (
                        <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#fafafa' }}>
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="配置来源">
                                    系统设置 → 快捷操作配置
                                </Descriptions.Item>
                                <Descriptions.Item label="启用状态">
                                    {enableQuickAction ? '✅ 已启用' : '❌ 已禁用'}
                                </Descriptions.Item>
                                <Descriptions.Item label="前端页面地址 (baseUrl)">
                                    {form.getFieldValue(['quickActionConfig', 'baseUrl']) || '未配置'}
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                        获取方式: settings.quickActionConfig.baseUrl
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="后端API地址 (apiUrl)">
                                    {form.getFieldValue(['quickActionConfig', 'apiUrl']) || '未配置（将使用前端地址）'}
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                        获取方式: settings.quickActionConfig.apiUrl || settings.quickActionConfig.baseUrl
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="Token签名密钥 (secretKey)">
                                    {form.getFieldValue(['quickActionConfig', 'secretKey']) ? 
                                        '••••••••' + (form.getFieldValue(['quickActionConfig', 'secretKey']) || '').slice(-4) : 
                                        '未配置'}
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                        获取方式: settings.quickActionConfig.secretKey
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="配置存储位置">
                                    <div>
                                        <strong>MySQL数据库 → settings表 → quick_action_config字段（JSON格式）</strong>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                            💡 配置通过系统设置页面可视化配置，修改后立即生效，无需重启服务
                                        </div>
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="配置流程">
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        <div>1️⃣ 在系统设置页面填写配置并保存</div>
                                        <div>2️⃣ 配置保存到 MySQL settings 表的 quick_action_config 字段</div>
                                        <div>3️⃣ 系统启动时自动加载配置到内存缓存</div>
                                        <div>4️⃣ 模板渲染时从内存缓存获取配置（高性能）</div>
                                        <div style={{ color: '#52c41a', marginTop: '4px' }}>
                                            ✅ 支持实时修改，修改后立即生效
                                        </div>
                                    </div>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    )
                }]}
            />
            
            <Form form={form} name="quickActionForm" layout="vertical" onFinish={saveSettings}>
                <MyFormItemGroup prefix={['quickActionConfig']}>
                    <MyFormItem name="enabled">
                        <Radio.Group
                            block
                            options={radioOptions}
                            value={enableQuickAction}
                            onChange={handleQuickActionEnableChange}
                        />
                    </MyFormItem>

                    {enableQuickAction === true && (
                        <>
                            <MyFormItem
                                name="baseUrl"
                                label="前端页面地址"
                                rules={[
                                    { required: true, message: '请输入前端页面地址' },
                                    { type: 'url', message: '请输入有效的URL地址' }
                                ]}
                            >
                                <Input placeholder="例如: https://your-frontend-domain.com"/>
                            </MyFormItem>
                            <div style={helpTextStyle}>
                                用于"查看详情"按钮跳转的前端页面地址，必须包含 http(s)://
                            </div>
                            
                            <MyFormItem
                                name="apiUrl"
                                label="后端API地址（可选）"
                                rules={[
                                    { type: 'url', message: '请输入有效的URL地址' }
                                ]}
                            >
                                <Input placeholder="例如: https://your-api-domain.com（不填则使用前端地址）"/>
                            </MyFormItem>
                            <div style={helpTextStyle}>
                                用于快捷操作API调用的后端地址，如果不填写则使用前端地址
                            </div>
                            
                            <MyFormItem
                                name="secretKey"
                                label="Token签名密钥"
                                rules={[
                                    { required: true, message: '请输入Token签名密钥' }
                                ]}
                            >
                                <Input.Password placeholder="用于生成和验证快捷操作Token的密钥"/>
                            </MyFormItem>
                            <div style={helpTextStyle}>
                                用于生成和验证快捷操作链接中Token的密钥，建议使用随机字符串
                            </div>
                        </>
                    )}
                </MyFormItemGroup>

                <FormActions 
                    loading={loading} 
                    onCancel={handleCancel}
                />
            </Form>
        </>
    );
};

