import React, { useState, useEffect } from 'react';
import { Form, Input, message, Typography } from 'antd';
import { getSystemSetting, saveSystemSetting } from "../../api/settings";
import { MyFormItemGroup, MyFormItem, helpTextStyle } from "./utils";
import { FormActions } from "./FormActions";

export const EmailSettings = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    // 加载邮箱配置
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();
            const emailConfig = {
                serverAddress: res.data.emailConfig?.serverAddress || "",
                port: res.data.emailConfig?.port || "",
                email: res.data.emailConfig?.email || "",
                token: res.data.emailConfig?.token || "",
            };
            form.setFieldsValue({ emailConfig });
        } catch (error) {
            console.error("Failed to load email settings:", error);
            message.error('加载邮箱配置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 保存邮箱配置
    const saveSettings = async (values) => {
        setLoading(true);
        try {
            await form.validateFields();
            
            // 获取完整的设置数据
            const res = await getSystemSetting();
            const processedValues = {
                ...res.data,
                emailConfig: {
                    ...values.emailConfig,
                    port: values.emailConfig.port ? Number(values.emailConfig.port) : 0
                }
            };

            await saveSystemSetting(processedValues);
            message.success({
                content: '邮箱配置保存成功，且立即生效！',
                duration: 3,
            });
            loadSettings();
        } catch (error) {
            console.error("Failed to save email settings:", error);
            message.error('保存邮箱配置失败，请检查输入并重试');
        } finally {
            setLoading(false);
        }
    };

    // 取消修改
    const handleCancel = () => {
        form.resetFields();
        loadSettings();
        message.info('已取消修改');
    };

    return (
        <>
            <Typography.Title level={4}>邮箱配置</Typography.Title>
            <p style={helpTextStyle}>• 用于推送邮件告警消息；</p>
            
            <Form form={form} name="emailForm" layout="vertical" onFinish={saveSettings}>
                <MyFormItemGroup prefix={['emailConfig']}>
                    <MyFormItem
                        name="serverAddress"
                        label="邮箱服务器"
                        rules={[
                            { type: 'host', message: '请输入有效的服务器地址' }
                        ]}
                    >
                        <Input placeholder="请输入邮箱所属服务器地址，如：smtp.gmail.com"/>
                    </MyFormItem>
                    
                    <MyFormItem
                        name="port"
                        label="邮箱服务器端口"
                        rules={[
                            { pattern: /^\d+$/, message: '端口必须为数字' }
                        ]}
                    >
                        <Input
                            type="number"
                            min={1}
                            max={65535}
                            placeholder="请输入端口号，如：587 或 465"
                        />
                    </MyFormItem>
                    
                    <MyFormItem
                        name="email"
                        label="邮箱账号"
                        rules={[
                            { type: 'email', message: '请输入有效的邮箱地址' }
                        ]}
                    >
                        <Input placeholder="请输入邮箱地址，如：user@example.com"/>
                    </MyFormItem>
                    
                    <MyFormItem name="token" label="授权码">
                        <Input.Password placeholder="请输入邮箱授权码"/>
                    </MyFormItem>
                </MyFormItemGroup>

                <FormActions 
                    loading={loading} 
                    onCancel={handleCancel}
                />
            </Form>
        </>
    );
};

