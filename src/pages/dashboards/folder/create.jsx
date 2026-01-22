import {Modal, Form, Input, Button, Segmented, Drawer, Radio, message} from 'antd'
import React, {useEffect, useState} from 'react'
import {createDashboardFolder, updateDashboardFolder} from '../../../api/dashboard';
import {DownOutlined, RightOutlined, CopyOutlined} from "@ant-design/icons";

const MyFormItemContext = React.createContext([])

function toArr(str) {
    return Array.isArray(str) ? str : [str]
}

const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined
    return <Form.Item name={concatName} {...props} />
}

// Grafana 配置文本常量（用于复制和显示）
const GRAFANA_CONFIG_TEXT = `[security]
allow_embedding = true
cookie_samesite = none
cookie_secure = false

[auth.proxy]
enabled = true
enable_login_token = true
header_name = X-WEBAUTH-USER
header_property = username
auto_sign_up = true

[auth.anonymous]
enabled = true
org_name = Main Org.
org_role = Viewer

[auth.basic]
enabled = true

[auth]
disable_login_form = false

[users]
viewers_can_edit = false
default_theme = dark`;

// Token 获取命令文本常量（用于复制和显示）
const TOKEN_COMMAND_TEXT = `curl -s -u <username>:<password> -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"name":"token-'$(date +%s)'"}' \\
  "http://<grafana-host>:<port>/api/serviceaccounts/2/tokens"`;

const CreateFolderModal = ({ visible, onClose, selectedRow, type, handleList }) => {
    const [form] = Form.useForm()
    const [theme,setTheme] = useState('light')
    const [folderHelpExpanded, setFolderHelpExpanded] = useState(false);
    const [configHelpExpanded, setConfigHelpExpanded] = useState(false);
    const [grafanaVersion, setGrafanaVersion] = useState('v10')
    // 禁止输入空格
    const [spaceValue, setSpaceValue] = useState('')
    // 追踪哪个复制按钮被点击了（'config' 或 'command'）
    const [copiedButton, setCopiedButton] = useState(null);

    const handleInputChange = (e) => {
        // 移除输入值中的空格
        const newValue = e.target.value.replace(/\s/g, '')
        setSpaceValue(newValue)
    }

    const handleKeyPress = (e) => {
        // 阻止空格键的默认行为
        if (e.key === ' ') {
            e.preventDefault()
        }
    }

    useEffect(() => {
        if (selectedRow) {
            form.setFieldsValue({
                id: selectedRow.id,
                name: selectedRow.name,
                grafanaVersion: selectedRow.grafanaVersion,
                grafanaHost: selectedRow.grafanaHost,
                grafanaFolderId: selectedRow.grafanaFolderId,
                grafanaToken: selectedRow.grafanaToken,
                theme: selectedRow.theme,
            })

            setGrafanaVersion(selectedRow.grafanaVersion)
        }
    }, [selectedRow, form])

    const handleCreate = async (data) => {
        const params = {
            ...data,
            grafanaVersion: grafanaVersion,
            grafanaFolderId: data.grafanaFolderId,
        }
        try {
            await createDashboardFolder(params)
            handleList()
            form.resetFields();
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdate = async (data) => {
        try {
            const params = {
                ...data,
                id: selectedRow.id,
                grafanaVersion: grafanaVersion,
                grafanaFolderId: data.grafanaFolderId,
            }
            await updateDashboardFolder(params)
            handleList()
            form.resetFields();
        } catch (error) {
            console.error(error)
        }
    }

    const handleFormSubmit = async (values) => {
        values.theme = theme
        if (type === 'create') {
            await handleCreate(values)
        }

        if (type === 'update') {
            await handleUpdate(values)
        }

        // 关闭弹窗
        onClose()
    }

    const toggleFolderHelp = () => {
        setFolderHelpExpanded(!folderHelpExpanded);
    };

    const toggleConfigHelp = () => {
        setConfigHelpExpanded(!configHelpExpanded);
    };

    // 复制 Grafana 配置
    const handleCopyConfig = async () => {
        // 使用与第三方告警接入相同的复制逻辑
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(GRAFANA_CONFIG_TEXT);
            } else {
                // 降级方案：使用传统的 textarea + execCommand 方式
                const textArea = document.createElement('textarea');
                textArea.value = GRAFANA_CONFIG_TEXT;
                textArea.style.position = 'fixed';
                textArea.style.top = '0';
                textArea.style.left = '0';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            // 设置已复制状态
            setCopiedButton('config');
            setTimeout(() => setCopiedButton(null), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    // 复制 Token 获取命令
    const handleCopyCommand = async () => {
        // 使用与第三方告警接入相同的复制逻辑
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(TOKEN_COMMAND_TEXT);
            } else {
                // 降级方案：使用传统的 textarea + execCommand 方式
                const textArea = document.createElement('textarea');
                textArea.value = TOKEN_COMMAND_TEXT;
                textArea.style.position = 'fixed';
                textArea.style.top = '0';
                textArea.style.left = '0';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            // 设置已复制状态
            setCopiedButton('command');
            setTimeout(() => setCopiedButton(null), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    const radioOptions = [
        {
            label: 'v11及以上',
            value: 'v11',
        },
        {
            label: 'v10及以下',
            value: 'v10',
        },
    ];

    return (
        <Drawer title={"创建 Grafana 仪表盘链接"} open={visible} onClose={onClose} footer={null} size={"large"}>
            <Form form={form} name="form_item_path" layout="vertical" onFinish={handleFormSubmit}>
                <MyFormItem name="name" label="名称" rules={[{required: true}]}>
                    <Input
                        placeholder="文件夹名称"
                        value={spaceValue}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress} />
                </MyFormItem>

                <MyFormItem name="grafanaVersion" label="Grafana 版本">
                    <Radio.Group
                        block
                        options={radioOptions}
                        defaultValue={grafanaVersion}
                        onChange={(e)=>{setGrafanaVersion(e?.target?.value)}}
                    />
                </MyFormItem>

                <MyFormItem name="grafanaHost" label="Grafana Host" rules={[
                    {
                        required: true
                    },
                    {
                        pattern: /^(http|https):\/\/.*[^\/]$/,
                        message: '请输入正确的URL格式，且结尾不应包含"/"',
                    },
                ]}>
                    <Input placeholder="Grafana链接日志, 例如: https://xx.xx.xx"/>
                </MyFormItem>

                <MyFormItem name="grafanaFolderId" label="Grafana FolderId"  rules={[{required: true}]}>
                    <Input style={{width:'100%'}} placeholder="Grafana目录Id" min={1}/>
                </MyFormItem>

                {grafanaVersion === 'v11' && (
                    <MyFormItem
                        name="grafanaToken"
                        label="Service Account Token"
                        rules={[{required: true, message: 'Grafana 11版本需要提供 Service Account Token'}]}
                    >
                        <Input.Password
                            style={{width:'100%'}}
                            placeholder="请输入 Grafana Service Account Token"
                        />
                    </MyFormItem>
                )}

                <MyFormItem name="theme" label="背景颜色">
                    <Segmented
                        options={['light', 'dark']}
                        defaultValue={'light'}
                        onChange={(value) => {
                            setTheme(value)
                        }}
                    />
                </MyFormItem>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                    >
                        提交
                    </Button>
                </div>
                {grafanaVersion === 'v11' && (
                    <div style={{marginTop: 24}}>
                        <div
                            onClick={toggleConfigHelp}
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 0',
                                userSelect: 'none'
                            }}
                        >
                            {configHelpExpanded ? <DownOutlined/> : <RightOutlined/>}
                            <h4 style={{margin: 0}}>Grafana 嵌入配置说明</h4>
                        </div>

                        {configHelpExpanded && (
                            <div style={{
                                marginLeft: 12,
                                padding: 12,
                                backgroundColor: '#fff8e1',
                                borderRadius: 4,
                                border: '1px solid #ffd54f'
                            }}>
                                <div style={{marginBottom: 12}}>
                                    <strong>⚠️ 重要提示:</strong> 为使 Grafana 仪表盘正常嵌入到 AlertHub,
                                    需要在 Grafana 服务器的配置文件 <code>grafana.ini</code> 中添加以下配置:
                                </div>
                                <div style={{position: 'relative'}}>
                                    <pre style={{
                                        backgroundColor: '#f5f5f5',
                                        padding: 12,
                                        borderRadius: 4,
                                        overflow: 'auto',
                                        fontSize: 12,
                                        margin: '8px 0',
                                        paddingRight: 40
                                    }}>
{GRAFANA_CONFIG_TEXT}
                                    </pre>
                                    <Button
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={handleCopyConfig}
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            color: copiedButton === 'config' ? '#52c41a' : '#666',
                                            backgroundColor: copiedButton === 'config' ? '#f6ffed' : '#fff',
                                            borderColor: copiedButton === 'config' ? '#52c41a' : '#d9d9d9',
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        {copiedButton === 'config' ? '✓ 已复制' : '复制'}
                                    </Button>
                                </div>
                                <div style={{fontSize: 12, color: '#666', marginTop: 8}}>
                                    <strong>⚠️ 重要配置说明:</strong>
                                    <ul style={{margin: '4px 0', paddingLeft: 20}}>
                                        <li><code>org_name = Main Org.</code> 必须与 Grafana 中实际的组织名称完全一致(包括大小写和标点)</li>
                                        <li><code>[auth.basic] enabled = true</code> 必须保持启用,否则管理员无法登录</li>
                                        <li><code>disable_login_form = false</code> 不要设为 true,否则会影响管理员登录</li>
                                        <li>配置完成后重启 Grafana: <code>systemctl restart grafana-server</code></li>
                                    </ul>
                                </div>

                                <div style={{marginTop: 16, marginBottom: 12}}>
                                    <strong>获取 Service Account Token:</strong>
                                </div>
                                <div style={{marginBottom: 8, fontSize: 13}}>
                                    使用以下 curl 命令创建 Token (将参数替换为实际值):
                                </div>
                                <div style={{position: 'relative'}}>
                                    <pre style={{
                                        backgroundColor: '#f5f5f5',
                                        padding: 12,
                                        borderRadius: 4,
                                        overflow: 'auto',
                                        fontSize: 12,
                                        margin: '8px 0',
                                        paddingRight: 40
                                    }}>
{TOKEN_COMMAND_TEXT}
                                    </pre>
                                    <Button
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={handleCopyCommand}
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            color: copiedButton === 'command' ? '#52c41a' : '#666',
                                            backgroundColor: copiedButton === 'command' ? '#f6ffed' : '#fff',
                                            borderColor: copiedButton === 'command' ? '#52c41a' : '#d9d9d9',
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        {copiedButton === 'command' ? '✓ 已复制' : '复制'}
                                    </Button>
                                </div>
                                <div style={{fontSize: 12, color: '#666', marginTop: 8}}>
                                    <strong>参数说明:</strong>
                                    <ul style={{margin: '4px 0', paddingLeft: 20}}>
                                        <li><code>&lt;username&gt;:&lt;password&gt;</code> - Grafana 管理员账号和密码</li>
                                        <li><code>&lt;grafana-host&gt;:&lt;port&gt;</code> - Grafana 服务器地址和端口</li>
                                        <li><code>&lt;service-account-id&gt;</code> - Service Account 的 ID (在 Grafana 的 Service Accounts 页面查看)</li>
                                        <li><code>$(date +%s)</code> - 使用时间戳确保 token 名称唯一，避免命名冲突</li>
                                    </ul>
                                </div>

                                <div style={{marginTop: 12}}>
                                    <strong>关于 iframe 嵌入和登录问题:</strong>
                                    <ul style={{margin: '8px 0', paddingLeft: 20}}>
                                        <li>
                                            <strong>重要:</strong> Service Account Token 仅用于 API 调用获取仪表盘列表,
                                            不能用于 iframe 嵌入的身份验证
                                        </li>
                                        <li>
                                            <strong>iframe 嵌入必须启用匿名访问:</strong> 设置 <code>[auth.anonymous] enabled = true</code>
                                            才能在 iframe 中无需登录直接访问仪表盘(只读权限)
                                        </li>
                                        <li>
                                            <strong>管理员登录方式:</strong> 启用匿名访问后,管理员仍可正常登录!
                                            直接访问 Grafana 登录页面 (如 <code>http://your-grafana:3000/login</code>),
                                            使用管理员账号密码登录即可
                                        </li>
                                        <li>
                                            <strong>安全建议:</strong> 使用 <code>org_role = Viewer</code> 确保匿名用户只有查看权限,
                                            管理员账号不受影响
                                        </li>
                                    </ul>
                                </div>
                                <div style={{
                                    marginTop: 12,
                                    padding: 8,
                                    backgroundColor: '#fff3cd',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    border: '1px solid #ffc107'
                                }}>
                                    <strong>⚠️ 如果无法登录 Grafana 管理后台:</strong>
                                    <ol style={{margin: '8px 0', paddingLeft: 20}}>
                                        <li>编辑 <code>grafana.ini</code> 文件,临时设置 <code>[auth.anonymous] enabled = false</code></li>
                                        <li>重启 Grafana 服务</li>
                                        <li>使用管理员账号登录</li>
                                        <li>登录成功后,再改回 <code>enabled = true</code> 并重启</li>
                                    </ol>
                                </div>
                                <div style={{
                                    marginTop: 12,
                                    padding: 8,
                                    backgroundColor: '#e3f2fd',
                                    borderRadius: 4,
                                    fontSize: 12
                                }}>
                                    <strong>💡 提示:</strong> 修改配置后需要重启 Grafana 服务才能生效。
                                    建议在测试环境先验证配置是否正确。
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div style={{marginTop: 24}}>
                    <div
                        onClick={toggleFolderHelp}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 0',
                            userSelect: 'none'
                        }}
                    >
                        {folderHelpExpanded ? <DownOutlined/> : <RightOutlined/>}
                        <h4 style={{margin: 0}}>获取 FolderId 的方法</h4>
                    </div>

                    {folderHelpExpanded && (
                        <div style={{
                            marginLeft: 12,
                            padding: 12,
                            backgroundColor: '#f8f9fa',
                            borderRadius: 4
                        }}>
                            <ul style={{margin: 0, paddingLeft: 16}}>
                                <li>打开 Grafana 平台 / 仪表盘(Dashboards)，再打开 F12；</li>
                                <li>点击 网络(Network)，再点击下 Grafana 文件夹，会出现一个 Search 接口的请求；</li>
                                <li>
                                    点开请求，点击 Payload 查看请求参数，其中有 <code>folderIds</code> 或 <code>folderUids</code> ，
                                    这个 ID 即可应用到 WatchAlert。
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </Form>
        </Drawer>
    )
}

export default CreateFolderModal