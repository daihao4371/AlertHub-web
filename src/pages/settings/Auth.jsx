import React, { useState, useEffect } from 'react';
import { Form, Input, Segmented, Select, message, Typography } from 'antd';
import { getSystemSetting, saveSystemSetting } from "../../api/settings";
import { getRoleList } from "../../api/role";
import { MyFormItemGroup, MyFormItem, helpTextStyle } from "./utils";
import { FormActions } from "./FormActions";

// Cron表达式验证函数
const validateCronExpression = (_, value) => {
    if (!value) {
        return Promise.reject(new Error('请输入Cron表达式'));
    }

    const cronValue = value.trim();
    const cronParts = cronValue.split(/\s+/);
    
    if (cronParts.length !== 5) {
        return Promise.reject(new Error('Cron表达式必须包含5个字段：分钟 小时 日期 月份 星期'));
    }

    const [minute, hour, day, month, weekday] = cronParts;

    const validateField = (field, min, max, fieldName) => {
        if (field === '*') return true;
        if (/^\*\/\d+$/.test(field)) {
            const step = parseInt(field.split('/')[1]);
            return step > 0 && step <= max;
        }
        if (/^\d+-\d+$/.test(field)) {
            const [start, end] = field.split('-').map(Number);
            return start >= min && end <= max && start <= end;
        }
        if (field.includes(',')) {
            const values = field.split(',');
            return values.every(val => {
                const num = parseInt(val.trim());
                return !isNaN(num) && num >= min && num <= max;
            });
        }
        const num = parseInt(field);
        return !isNaN(num) && num >= min && num <= max;
    };

    if (!validateField(minute, 0, 59, '分钟')) {
        return Promise.reject(new Error('分钟字段格式错误，应为0-59范围内的值、*、*/n、n-m或逗号分隔的值'));
    }
    if (!validateField(hour, 0, 23, '小时')) {
        return Promise.reject(new Error('小时字段格式错误，应为0-23范围内的值、*、*/n、n-m或逗号分隔的值'));
    }
    if (!validateField(day, 1, 31, '日期')) {
        return Promise.reject(new Error('日期字段格式错误，应为1-31范围内的值、*、*/n、n-m或逗号分隔的值'));
    }
    if (!validateField(month, 1, 12, '月份')) {
        return Promise.reject(new Error('月份字段格式错误，应为1-12范围内的值、*、*/n、n-m或逗号分隔的值'));
    }
    if (!validateField(weekday, 0, 7, '星期')) {
        return Promise.reject(new Error('星期字段格式错误，应为0-7范围内的值、*、*/n、n-m或逗号分隔的值'));
    }

    return Promise.resolve();
};

export const AuthSettings = () => {
    const [form] = Form.useForm();
    const [alignValue, setAlignValue] = useState('系统认证');
    const [roleList, setRoleList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
        handleRoleList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 加载认证配置
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();

            const ldapConfig = {
                address: res.data.ldapConfig?.address || "",
                baseDN: res.data.ldapConfig?.baseDN || "",
                adminUser: res.data.ldapConfig?.adminUser || "",
                adminPass: res.data.ldapConfig?.adminPass || "",
                userDN: res.data.ldapConfig?.userDN || "",
                userPrefix: res.data.ldapConfig?.userPrefix || "",
                defaultUserRole: res.data.ldapConfig?.defaultUserRole || undefined,
                cronjob: res.data.ldapConfig?.cronjob || "*/30 * * * *",
            };

            const oidcConfig = {
                clientID: res.data.oidcConfig?.clientID || "",
                upperURI: res.data.oidcConfig?.upperURI || "",
                redirectURI: res.data.oidcConfig?.redirectURI || "",
                domain: res.data.oidcConfig?.domain || "",
            };

            form.setFieldsValue({
                ldapConfig,
                oidcConfig
            });

            const authTypeMapping = {
                0: "系统认证",
                1: "LDAP 认证",
                2: "OIDC 认证"
            };
            setAlignValue(authTypeMapping[res.data.authType] || "系统认证");
        } catch (error) {
            console.error("Failed to load auth settings:", error);
            message.error('加载认证配置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 保存认证配置
    const saveSettings = async (values) => {
        setLoading(true);
        try {
            await form.validateFields();
            
            // 获取完整的设置数据
            const res = await getSystemSetting();
            const processedValues = {
                ...res.data,
                authType: alignValue === "系统认证" ? 0 : alignValue === "LDAP 认证" ? 1 : 2,
                ldapConfig: values.ldapConfig,
                oidcConfig: values.oidcConfig,
            };

            await saveSystemSetting(processedValues);
            message.success({
                content: '认证配置保存成功，且立即生效！',
                duration: 3,
            });
            loadSettings();
        } catch (error) {
            console.error("Failed to save auth settings:", error);
            message.error('保存认证配置失败，请检查输入并重试');
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

    const handleRoleList = async () => {
        try {
            const res = await getRoleList();
            const newData = res.data?.map((item) => ({
                label: item.name,
                value: item.id,
            })) || [];
            setRoleList(newData);
        } catch (error) {
            console.error("Failed to load role list:", error);
            message.error('加载角色列表失败');
        }
    };

    const segmentedOptions = ['系统认证', 'LDAP 认证', 'OIDC 认证'];

    return (
        <>
            <Typography.Title level={4}>认证</Typography.Title>
            
            <Form form={form} name="authForm" layout="vertical" onFinish={saveSettings}>
                <Segmented
                    value={alignValue}
                    style={{ marginBottom: 16 }}
                    onChange={setAlignValue}
                    options={segmentedOptions}
                />

                {alignValue === 'LDAP 认证' && (
                    <div
                        style={{
                            padding: "24px",
                            background: "#fafafa",
                            borderRadius: "12px",
                            border: "1px solid #f0f0f0",
                            marginTop: '16px'
                        }}
                    >
                        <MyFormItemGroup prefix={['ldapConfig']}>
                            <MyFormItem
                                name="address"
                                label="LDAP服务地址"
                                rules={[{required: true, message: '请输入LDAP服务地址'}]}
                            >
                                <Input placeholder="例如: 192.168.1.100:389 或 ldap.example.com:636"/>
                            </MyFormItem>

                            <MyFormItem
                                name="baseDN"
                                label="基础DN"
                                rules={[{required: true, message: '请输入基础DN'}]}
                            >
                                <Input placeholder="例如: dc=example,dc=com"/>
                            </MyFormItem>

                            <MyFormItem
                                name="adminUser"
                                label="管理员DN"
                                rules={[{required: true, message: '请输入管理员DN'}]}
                            >
                                <Input placeholder="例如: cn=admin,dc=example,dc=com"/>
                            </MyFormItem>

                            <MyFormItem
                                name="adminPass"
                                label="管理员密码"
                                rules={[{required: true, message: '请输入管理员密码'}]}
                            >
                                <Input.Password placeholder="请输入管理员密码"/>
                            </MyFormItem>

                            <MyFormItem
                                name="userDN"
                                label="用户DN"
                                rules={[{required: true, message: '请输入用户DN'}]}
                            >
                                <Input placeholder="例如: ou=users,dc=example,dc=com"/>
                            </MyFormItem>

                            <MyFormItem
                                name="userPrefix"
                                label="用户DN前缀"
                                rules={[{required: true, message: '请输入用户DN前缀'}]}
                            >
                                <Input placeholder="例如: uid 或 cn"/>
                            </MyFormItem>

                            <MyFormItem
                                name="defaultUserRole"
                                label="默认用户角色"
                                rules={[{required: true, message: '请选择默认用户角色'}]}
                            >
                                <Select
                                    style={{width: '100%'}}
                                    placeholder="请选择默认用户角色"
                                    options={roleList}
                                    loading={roleList.length === 0}
                                />
                            </MyFormItem>

                            <MyFormItem
                                name="cronjob"
                                label="定时任务"
                                rules={[{required: true, validator: validateCronExpression}]}
                            >
                                <Input placeholder="例如: */30 * * * * (每30分钟执行一次)"/>
                            </MyFormItem>
                            <div style={{ ...helpTextStyle, marginTop: '8px', marginBottom: 0 }}>
                                <strong>格式:</strong> 分钟 小时 日期 月份 星期<br/>
                                <strong>常用示例:</strong><br/>
                                • */30 * * * * - 每30分钟执行一次<br/>
                                • 0 */2 * * * - 每2小时执行一次<br/>
                                • 0 9 * * 1-5 - 工作日上午9点执行<br/>
                                • 0 0 1 * * - 每月1号午夜执行
                            </div>
                        </MyFormItemGroup>
                    </div>
                )}

                {alignValue === 'OIDC 认证' && (
                    <div 
                        style={{
                            padding: "24px",
                            background: "#fafafa",
                            borderRadius: "12px",
                            border: "1px solid #f0f0f0",
                            marginTop: '16px'
                        }}
                    >
                        <MyFormItemGroup prefix={['oidcConfig']}>
                            <MyFormItem
                                name="clientID"
                                label="客户端ID"
                                rules={[{required: true, message: '请输入客户端ID'}]}
                            >
                                <Input placeholder="例如: oidc"/>
                            </MyFormItem>

                            <MyFormItem
                                name="upperURI"
                                label="认证地址"
                                rules={[{required: true, message: '请输入跳转认证平台地址'}]}
                            >
                                <Input placeholder="例如: https://upper.alerthub.tech:5005"/>
                            </MyFormItem>

                            <MyFormItem
                                name="redirectURI"
                                label="回调地址"
                                rules={[{required: true, message: '请输入CallBack地址'}]}
                            >
                                <Input placeholder="例如: http://w8t.alerthub.tech:3000/api/oidc/callback"/>
                            </MyFormItem>
                            
                            <MyFormItem
                                name="domain"
                                label="域名"
                                rules={[{required: true, message: '请输入统一域名'}]}
                            >
                                <Input placeholder="例如: alerthub.tech"/>
                            </MyFormItem>
                        </MyFormItemGroup>
                    </div>
                )}

                <FormActions 
                    loading={loading} 
                    onCancel={handleCancel}
                />
            </Form>
        </>
    );
};

