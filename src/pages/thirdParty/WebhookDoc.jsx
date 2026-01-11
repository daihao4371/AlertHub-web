import React, { useState } from 'react';
import { Modal, Typography, Divider, Alert, Space, Tag, Button } from 'antd';
import { CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

// 可复制的代码块组件
const CopyableCodeBlock = ({ code, language = 'json' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = code;
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

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    return (
        <div style={{ position: 'relative', marginBottom: 16 }}>
            <Button
                size="small"
                icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                onClick={handleCopy}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    backgroundColor: copied ? '#f6ffed' : '#fff',
                    borderColor: copied ? '#52c41a' : '#d9d9d9',
                    color: copied ? '#52c41a' : '#666'
                }}
            >
                {copied ? '已复制' : '复制'}
            </Button>
            <pre style={{
                background: '#f5f5f5',
                padding: '12px',
                paddingTop: '40px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: language === 'bash' ? '12px' : '13px',
                margin: 0
            }}>
                {code}
            </pre>
        </div>
    );
};

export const WebhookDocModal = ({ visible, onClose, webhookUrl }) => {
    const exampleUrl = webhookUrl || 'http://your-domain.com/api/webhook/wh_xxxxx';

    return (
        <Modal
            title="Webhook 接入文档"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            style={{ top: 20 }}
        >
            <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 8px' }}>
                {/* 快速开始 */}
                <Title level={4}>📝 快速开始</Title>
                <Paragraph>
                    将告警数据以 <Text code>POST</Text> 请求发送到您的 Webhook URL 即可。AlertHub 会自动提取常用字段并创建告警记录。
                </Paragraph>

                <Alert
                    message="您的 Webhook URL"
                    description={
                        <code style={{ fontSize: '13px', wordBreak: 'break-all' }}>
                            {exampleUrl}
                        </code>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Divider />

                {/* 请求格式 */}
                <Title level={4}>📤 请求格式</Title>
                <Paragraph>
                    <Text strong>请求方法：</Text> <Tag>POST</Tag><br />
                    <Text strong>Content-Type：</Text> <Tag>application/json</Tag><br />
                    <Text strong>认证：</Text> <Tag color="green">无需认证</Tag>（公开接口）
                </Paragraph>

                <Paragraph>
                    <Text strong>请求体示例：</Text>
                </Paragraph>

                <CopyableCodeBlock code={`{
  "id": "alert-001",
  "title": "CPU使用率过高告警",
  "message": "服务器 web-01 的CPU使用率已达到 95%",
  "severity": "critical",
  "status": "firing",
  "host": "web-server-01",
  "service": "system-monitor",
  "timestamp": 1736611200
}`} />

                <Divider />

                {/* 支持的字段 */}
                <Title level={4}>🔖 支持的字段（自动智能提取）</Title>

                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />告警ID：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>id</Tag> <Tag>alert_id</Tag> <Tag>alertId</Tag> <Tag>eventId</Tag> <Tag>event_id</Tag>
                        </Paragraph>
                    </div>

                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />告警标题：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>title</Tag> <Tag>subject</Tag> <Tag>summary</Tag> <Tag>name</Tag> <Tag>alert_name</Tag> <Tag>alertName</Tag>
                        </Paragraph>
                    </div>

                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />告警内容：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>content</Tag> <Tag>message</Tag> <Tag>description</Tag> <Tag>text</Tag> <Tag>body</Tag>
                        </Paragraph>
                    </div>

                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />严重级别：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>severity</Tag> <Tag>level</Tag> <Tag>priority</Tag> <Tag>criticality</Tag><br />
                            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
                                映射规则：critical/disaster/emergency → P0 | high/severe/error → P1 | warning/info/low → P2
                            </Text>
                        </Paragraph>
                    </div>

                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />告警状态：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>status</Tag> <Tag>state</Tag><br />
                            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
                                映射规则：ok/resolved/recovery/normal/cleared → resolved | 其他 → firing
                            </Text>
                        </Paragraph>
                    </div>

                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />主机信息：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>host</Tag> <Tag>hostname</Tag> <Tag>server</Tag> <Tag>instance</Tag>
                        </Paragraph>
                    </div>

                    <div>
                        <Text strong><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />服务信息：</Text>
                        <Paragraph style={{ marginLeft: 24, marginBottom: 4 }}>
                            支持字段名：<Tag>service</Tag> <Tag>service_name</Tag> <Tag>serviceName</Tag> <Tag>app</Tag> <Tag>application</Tag>
                        </Paragraph>
                    </div>
                </Space>

                <Divider />

                {/* 配置示例 */}
                <Title level={4}>🔧 监控系统配置示例</Title>

                <Title level={5}>Zabbix</Title>
                <Paragraph>
                    <Text strong>Webhook 配置：</Text>
                </Paragraph>
                <CopyableCodeBlock language="text" code={`URL: ${exampleUrl}
Headers: Content-Type: application/json
Script:
{
  "id": "{EVENT.ID}",
  "title": "{EVENT.NAME}",
  "severity": "{EVENT.SEVERITY}",
  "status": "{EVENT.VALUE}",
  "host": "{HOST.NAME}",
  "message": "{EVENT.DESCRIPTION}",
  "timestamp": "{EVENT.TIME}"
}`} />

                <Title level={5} style={{ marginTop: 16 }}>Prometheus Alertmanager</Title>
                <Paragraph>
                    <Text strong>alertmanager.yml 配置：</Text>
                </Paragraph>
                <CopyableCodeBlock language="yaml" code={`receivers:
  - name: 'alerthub-webhook'
    webhook_configs:
      - url: '${exampleUrl}'
        send_resolved: true`} />

                <Title level={5} style={{ marginTop: 16 }}>Grafana</Title>
                <Paragraph>
                    <Text strong>Contact Point 配置：</Text>
                </Paragraph>
                <CopyableCodeBlock language="text" code={`Type: webhook
URL: ${exampleUrl}
HTTP Method: POST`} />

                <Divider />

                {/* 测试命令 */}
                <Title level={4}>🧪 测试命令</Title>
                <Paragraph>
                    使用 curl 命令测试您的 Webhook：
                </Paragraph>
                <CopyableCodeBlock language="bash" code={`curl -X POST '${exampleUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "测试告警",
    "severity": "warning",
    "status": "firing",
    "host": "test-server",
    "message": "这是一条测试告警"
  }'`} />

                <Alert
                    message="提示"
                    description="发送成功后，您可以在「第三方告警」标签页查看接收到的告警记录。"
                    type="success"
                    showIcon
                    style={{ marginTop: 16 }}
                />
            </div>
        </Modal>
    );
};
