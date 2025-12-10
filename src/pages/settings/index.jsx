import React, { useState, useEffect, useContext, useMemo } from 'react';
import {Anchor, Button, Form, Input, Popconfirm, Typography, Radio, Segmented, Tabs, Switch, Select, message, Descriptions, Card, Collapse} from 'antd';
import "./index.css";
import { getSystemSetting, saveSystemSetting } from "../../api/settings";
import TextArea from "antd/es/input/TextArea";
import {getRoleList} from "../../api/role";

// 表单上下文
const MyFormItemContext = React.createContext([]);
const toArr = (str) => (Array.isArray(str) ? str : [str]);

const MyFormItemGroup = ({ prefix, children }) => {
    const prefixPath = useContext(MyFormItemContext);
    const concatPath = useMemo(() => [...prefixPath, ...toArr(prefix)], [prefixPath, prefix]);
    return <MyFormItemContext.Provider value={concatPath}>{children}</MyFormItemContext.Provider>;
};

const MyFormItem = ({ name, ...props }) => {
    const prefixPath = useContext(MyFormItemContext);
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined;
    return <Form.Item name={concatName} {...props} />;
};

//  优化的Cron表达式验证函数 - 更灵活和准确的验证逻辑
const validateCronExpression = (_, value) => {
    if (!value) {
        return Promise.reject(new Error('请输入Cron表达式'));
    }

    const cronValue = value.trim();

    // 基本格式检查：5个字段，用空格分隔
    const cronParts = cronValue.split(/\s+/);
    console.log("-->",cronParts)
    if (cronParts.length !== 5) {
        return Promise.reject(new Error('Cron表达式必须包含5个字段：分钟 小时 日期 月份 星期'));
    }

    // 验证每个字段的格式 - 使用更灵活的验证逻辑
    const [minute, hour, day, month, weekday] = cronParts;

    // 通用字段验证函数
    const validateField = (field, min, max, fieldName) => {
        // 允许 * 通配符
        if (field === '*') return true;

        // 允许 */n 步长格式
        if (/^\*\/\d+$/.test(field)) {
            const step = parseInt(field.split('/')[1]);
            return step > 0 && step <= max;
        }

        // 允许范围格式 n-m
        if (/^\d+-\d+$/.test(field)) {
            const [start, end] = field.split('-').map(Number);
            return start >= min && end <= max && start <= end;
        }

        // 允许逗号分隔的值列表
        if (field.includes(',')) {
            const values = field.split(',');
            return values.every(val => {
                const num = parseInt(val.trim());
                return !isNaN(num) && num >= min && num <= max;
            });
        }

        // 单个数值
        const num = parseInt(field);
        return !isNaN(num) && num >= min && num <= max;
    };

    // 验证各个字段
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

export const SystemSettings = () => {
    const [form] = Form.useForm();
    const [version, setVersion] = useState('');
    const [enableAi, setEnableAi] = useState(false);
    const [enableQuickAction, setEnableQuickAction] = useState(false);
    const [alignValue, setAlignValue] = useState('系统认证');
    const [roleList, setRoleList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
        handleRoleList();
    }, []);

    //  优化的设置加载函数 - 改进错误处理和默认值设置
    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await getSystemSetting();

            //  改进的默认提示词设置
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

            //  改进的配置初始化逻辑
            const aiConfig = {
                enable: res.data.aiConfig?.enable || false,
                url: res.data.aiConfig?.url || "",
                appKey: res.data.aiConfig?.appKey || "",
                model: res.data.aiConfig?.model || "",
                timeout: res.data.aiConfig?.timeout || 30,
                maxTokens: res.data.aiConfig?.maxTokens || 1000,
                prompt: res.data.aiConfig?.prompt || defaultPrompt
            };

            const ldapConfig = {
                address: res.data.ldapConfig?.address || "",
                baseDN: res.data.ldapConfig?.baseDN || "",
                adminUser: res.data.ldapConfig?.adminUser || "",
                adminPass: res.data.ldapConfig?.adminPass || "",
                userDN: res.data.ldapConfig?.userDN || "",
                userPrefix: res.data.ldapConfig?.userPrefix || "",
                defaultUserRole: res.data.ldapConfig?.defaultUserRole || undefined,
                cronjob: res.data.ldapConfig?.cronjob || "*/30 * * * *", //  更合理的默认值
            };

            const emailConfig = {
                serverAddress: res.data.emailConfig?.serverAddress || "",
                port: res.data.emailConfig?.port || "",
                email: res.data.emailConfig?.email || "",
                token: res.data.emailConfig?.token || "",
            };

            const oidcConfig = {
                clientID: res.data.oidcConfig?.clientID || "",
                upperURI: res.data.oidcConfig?.upperURI || "",
                redirectURI: res.data.oidcConfig?.redirectURI || "",
                domain: res.data.oidcConfig?.domain || "",
            }

            const quickActionConfig = {
                enabled: res.data.quickActionConfig?.enabled || false,
                baseUrl: res.data.quickActionConfig?.baseUrl || "",
                apiUrl: res.data.quickActionConfig?.apiUrl || "",
                secretKey: res.data.quickActionConfig?.secretKey || "",
            }

            //  确保表单字段正确初始化
            form.setFieldsValue({
                emailConfig,
                aiConfig,
                ldapConfig,
                oidcConfig,
                quickActionConfig
            });

            // 修复 authType 映射逻辑
            const authTypeMapping = {
                0: "系统认证",
                1: "LDAP 认证",
                2: "OIDC 认证"
            };
            setAlignValue(authTypeMapping[res.data.authType] || "系统认证");

            setEnableAi(aiConfig.enable);
            setEnableQuickAction(quickActionConfig.enabled);
            setVersion(res.data.appVersion || 'Unknown');
        } catch (error) {
            console.error("Failed to load settings:", error);
            message.error('加载设置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    //  优化的保存函数 - 改进数据验证和错误处理
    const saveSettings = async (values) => {
        setLoading(true);
        try {
            await form.validateFields();

            //  改进的数据类型转换
            const processedValues = {
                ...values,
                emailConfig: {
                    ...values.emailConfig,
                    port: values.emailConfig.port ? Number(values.emailConfig.port) : 0
                },
                aiConfig: {
                    ...values.aiConfig,
                    timeout: values.aiConfig.timeout ? Number(values.aiConfig.timeout) : 30,
                    maxTokens: values.aiConfig.maxTokens ? Number(values.aiConfig.maxTokens) : 1000
                },
                authType: alignValue === "系统认证" ? 0 : alignValue === "LDAP 认证" ? 1 : 2, // 支持 OIDC认证
                oidcConfig: {
                    ...values.oidcConfig,
                },
                quickActionConfig: {
                    ...values.quickActionConfig,
                    enabled: enableQuickAction,
                }
            };

            console.log("[v0] Saving cronjob:", processedValues.ldapConfig?.cronjob); //  调试日志

            await saveSystemSetting(processedValues);
            loadSettings();
        } catch (error) {
            console.error("Failed to save settings:", error);
            message.error('保存设置失败，请检查输入并重试');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (values) => saveSettings(values);

    //  改进的取消确认逻辑
    const handleCancel = () => {
        form.resetFields();
        loadSettings();
        message.info('已取消修改');
    };

    const formItemStyle = { width: '100%' };
    const helpTextStyle = { fontSize: '12px', color: '#7f838a'};

    const radioOptions = [
        { label: '启用', value: true },
        { label: '禁用', value: false },
    ];

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

    //  改进的AI启用状态处理
    const handleAiEnableChange = (e) => {
        const enabled = e.target.value;
        setEnableAi(enabled);
        // 同步更新表单字段
        form.setFieldValue(['aiConfig', 'enable'], enabled);
    };

    // 快捷操作启用状态处理
    const handleQuickActionEnableChange = (e) => {
        const enabled = e.target.value;
        setEnableQuickAction(enabled);
        // 同步更新表单字段
        form.setFieldValue(['quickActionConfig', 'enabled'], enabled);
    };

    const segmentedOptions = ['系统认证', 'LDAP 认证', 'OIDC 认证'];

    return (
        <div style={{ display: 'flex', width: '100%' }}>
            <div style={{ width: '90%', alignItems: 'flex-start', textAlign: 'start', marginTop: '-20px', height: '90%', overflowY: 'auto' }}>
                <Form form={form} name="form_item_path" layout="vertical" onFinish={handleSave}>
                    <section id="email">
                        <Typography.Title level={5}>邮箱配置</Typography.Title>
                        <p style={helpTextStyle}>• 用于推送邮件告警消息；</p>
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
                                    style={formItemStyle}
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
                    </section>

                    <section id="ai">
                        <Typography.Title level={5}>AI 能力</Typography.Title>
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
                                        <Input
                                            style={{width: '100%'}}
                                            placeholder="请输入AI模型名称，如：gpt-3.5-turbo"
                                        />
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
                    </section>

                    <section id="auth">
                        <Typography.Title level={5}>认证</Typography.Title>
                        <Segmented
                            value={alignValue}
                            style={{ marginBottom: 8 }}
                            onChange={setAlignValue}
                            options={segmentedOptions}
                        />

                        {alignValue === 'LDAP 认证' && (
                            <div
                                style={{
                                    padding: "24px",
                                    background: "#fff",
                                    borderRadius: "12px",
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)",
                                    border: "1px solid #f0f0f0",
                                    minHeight: "300px"
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
                                        rules={[{required: true, message: '请输入Cron表达式'}]}
                                    >
                                        <Input placeholder="例如: */30 * * * * (每30分钟执行一次)"/>
                                    </MyFormItem>
                                    <div style={helpTextStyle}>
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
                                    background: "#fff",
                                    borderRadius: "12px",
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)",
                                    border: "1px solid #f0f0f0",
                                    minHeight: "300px"
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
                                        <Input placeholder="例如: https://upper.watchalert.tech:5005"/>
                                    </MyFormItem>

                                    <MyFormItem
                                        name="redirectURI"
                                        label="回调地址"
                                        rules={[{required: true, message: '请输入CallBack地址'}]}
                                    >
                                        <Input placeholder="例如: http://w8t.watchalert.tech:3000/api/oidc/callback"/>
                                    </MyFormItem>
                                    
                                    <MyFormItem
                                        name="domain"
                                        label="域名"
                                        rules={[{required: true, message: '请输入统一域名'}]}
                                    >
                                        <Input placeholder="例如: watchalert.tech"/>
                                    </MyFormItem>
                                </MyFormItemGroup>
                            </div>
                        )}
                    </section>

                    <section id="quickAction">
                        <Typography.Title level={5}>快捷操作配置</Typography.Title>
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
                    </section>

                    <section id="version">
                        <Typography.Title level={5}>系统版本</Typography.Title>
                        <div style={{
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                        }}>
                            {version || 'Unknown'}
                        </div>
                    </section>

                    <section id="option"
                             style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px'}}>
                        <Popconfirm
                            title="确认取消？"
                            description="取消后修改的配置将不会保存！"
                            onConfirm={handleCancel}
                            okText="确认"
                            cancelText="继续编辑"
                        >
                            <Button type="dashed" disabled={loading}>取消</Button>
                        </Popconfirm>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            style={{ backgroundColor: '#000000' }}
                        >
                            {loading ? '保存中...' : '保存'}
                        </Button>
                    </section>
                </Form>
            </div>

            <div className="systemSettingsAnchorContainer">
                <Anchor
                    affix
                    items={[
                        {key: '1', href: '#email', title: '邮箱配置'},
                        {key: '2', href: '#ai', title: 'AI 能力'},
                        {key: '3', href: '#auth', title: '认证'},
                        {key: '4', href: '#quickAction', title: '快捷操作配置'},
                        {key: '999', href: '#version', title: '系统版本'},
                        {key: '9999', href: '#option', title: '保存取消'},
                    ]}
                />
            </div>
        </div>
    );
};
