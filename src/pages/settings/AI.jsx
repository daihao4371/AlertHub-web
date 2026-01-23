import React, { useState, useEffect } from 'react';
import { Form, Input, Radio, Typography } from 'antd';
import TextArea from "antd/es/input/TextArea";
import { getSystemSetting, saveSystemSetting } from "../../api/settings";
import { MyFormItemGroup, MyFormItem, radioOptions } from "./utils";
import { FormActions } from "./FormActions";
import { showToast } from "../../components/Toast";

export const AISettings = () => {
    const [form] = Form.useForm();
    const [enableAi, setEnableAi] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 加载AI配置
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();

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

            const aiConfig = {
                enable: res.data.aiConfig?.enable || false,
                url: res.data.aiConfig?.url || "",
                appKey: res.data.aiConfig?.appKey || "",
                model: res.data.aiConfig?.model || "",
                timeout: res.data.aiConfig?.timeout || 30,
                maxTokens: res.data.aiConfig?.maxTokens || 1000,
                prompt: res.data.aiConfig?.prompt || defaultPrompt
            };

            form.setFieldsValue({ aiConfig });
            setEnableAi(aiConfig.enable);
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
                    ...values.aiConfig,
                    timeout: values.aiConfig.timeout ? Number(values.aiConfig.timeout) : 30,
                    maxTokens: values.aiConfig.maxTokens ? Number(values.aiConfig.maxTokens) : 1000
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
                            <MyFormItem
                                name="url"
                                label="接口地址"
                                rules={[
                                    { required: true, message: '请输入AI接口地址' },
                                    { type: 'url', message: '请输入有效的URL地址' }
                                ]}
                            >
                                <Input placeholder="AI 接口地址，必须包含 http(s)://"/>
                            </MyFormItem>
                            
                            <MyFormItem
                                name="appKey"
                                label="密钥"
                                rules={[{ required: true, message: '请输入API密钥' }]}
                            >
                                <Input.Password placeholder="请输入API密钥"/>
                            </MyFormItem>
                            
                            <MyFormItem
                                name="model"
                                label="模型"
                                rules={[{ required: true, message: '请输入AI模型名称' }]}
                            >
                                <Input placeholder="请输入AI模型名称，如：gpt-3.5-turbo"/>
                            </MyFormItem>
                            
                            <MyFormItem
                                name="timeout"
                                label="超时时间（秒）"
                                rules={[
                                    { required: true, message: '请输入超时时间' },
                                    { pattern: /^\d+$/, message: '超时时间必须为正整数' }
                                ]}
                            >
                                <Input type="number" min={1} placeholder="请输入超时时间"/>
                            </MyFormItem>
                            
                            <MyFormItem
                                name="maxTokens"
                                label="最大 Token 数"
                                rules={[
                                    { required: true, message: '请输入最大Token数' },
                                    { pattern: /^\d+$/, message: 'Token数必须为正整数' }
                                ]}
                            >
                                <Input type="number" min={1} placeholder="请输入最大Token数"/>
                            </MyFormItem>
                            
                            <MyFormItem
                                name="prompt"
                                label="自定义提示词"
                                rules={[{ required: true, message: '请输入提示词' }]}
                            >
                                <TextArea rows={15} placeholder="请输入自定义提示词"/>
                            </MyFormItem>
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

