import {Modal, Form, Input, Button, Card, Tooltip, Checkbox, Drawer, Alert, Switch, Descriptions, Collapse} from 'antd'
import VSCodeEditor from "../../../utils/VSCodeEditor";
import React, { useEffect, useState } from 'react'
import { createNoticeTmpl, updateNoticeTmpl } from '../../../api/noticeTmpl'
import { getSystemSetting } from '../../../api/settings'
import FeiShuImg from "../img/feishu.svg";
import EmailImg from "../img/Email.svg";
import DingDingImg from "../img/dingding.svg";
import WeChatImg from "../img/qywechat.svg"
import SlackImg from "../img/slack.svg"
import {QuestionCircleOutlined, InfoCircleOutlined} from "@ant-design/icons";

const MyFormItemContext = React.createContext([])

function toArr(str) {
    return Array.isArray(str) ? str : [str]
}

// 表单
const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined
    return <Form.Item name={concatName} {...props} />
}

// 函数组件
const NoticeTemplateCreateModal = ({ visible, onClose, selectedRow, type, handleList }) => {
    const [form] = Form.useForm()
    const [selectedNotifyCard, setSelectedNotifyCard] = useState(null);
    const [notifyType,setNotifyType] = useState('')
    const [isChecked, setIsChecked] = useState(false)
    const [enableQuickAction, setEnableQuickAction] = useState(false)
    const [quickActionConfig, setQuickActionConfig] = useState(null)

    // 禁止输入空格
    const [spaceValue, setSpaceValue] = useState('')

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

    // 加载系统快捷操作配置
    useEffect(() => {
        const loadQuickActionConfig = async () => {
            try {
                const res = await getSystemSetting()
                if (res && res.data && res.data.quickActionConfig) {
                    setQuickActionConfig(res.data.quickActionConfig)
                }
            } catch (error) {
                console.error('加载快捷操作配置失败:', error)
            }
        }
        if (visible) {
            loadQuickActionConfig()
        }
    }, [visible])

    // 当模态框打开时，根据类型初始化表单
    useEffect(() => {
        if (visible) {
            if (type === 'create') {
                // 创建模式：清空所有表单字段和状态
                form.resetFields()
                setSpaceValue('')
                setSelectedNotifyCard(0)
                setNotifyType('FeiShu')
                setIsChecked(false)
                setEnableQuickAction(false)
            } else if (selectedRow) {
                // 更新模式：填充表单数据
                form.setFieldsValue({
                    id: selectedRow.id,
                    name: selectedRow.name,
                    description: selectedRow.description,
                    noticeType: selectedRow.noticeType,
                    template: selectedRow.template,
                    templateFiring: selectedRow.templateFiring,
                    templateRecover: selectedRow.templateRecover,
                    enableFeiShuJsonCard: selectedRow.enableFeiShuJsonCard,
                })

                let t = 0;
                if (selectedRow.noticeType === "FeiShu"){
                    t = 0
                } else if (selectedRow.noticeType === "Email"){
                    t = 1
                } else if (selectedRow.noticeType === "DingDing"){
                    t = 2
                } else if (selectedRow.noticeType === "WeChat"){
                    t = 3
                } else if (selectedRow.noticeType === "Slack"){
                    t = 4
                }

                setIsChecked(selectedRow.enableFeiShuJsonCard || false)
                setEnableQuickAction(selectedRow.enableQuickAction || false)
                setNotifyType(selectedRow.noticeType)
                setSelectedNotifyCard(t)
                setSpaceValue(selectedRow.name || '')
            }
        } else {
            // 模态框关闭时，清空表单
            form.resetFields()
            setSpaceValue('')
        }
    }, [visible, selectedRow, type, form])

    const handleCreate = async (values) => {
        try {
            const params = {
                ...values,
                noticeType: notifyType,
                enableFeiShuJsonCard: isChecked,
                enableQuickAction: enableQuickAction,
            }
            await createNoticeTmpl(params)
            handleList()
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdate = async (values) => {
        try {
            const newValue = {
                ...values,
                id: selectedRow.id,
                noticeType: notifyType,
                enableFeiShuJsonCard: isChecked,
                enableQuickAction: enableQuickAction,
            }
            await updateNoticeTmpl(newValue)
            handleList()
        } catch (error) {
            console.error(error)
        }
    }

    // 提交
    const handleFormSubmit = (values) => {
        if (type === 'create') {
            handleCreate(values)

        }
        if (type === 'update') {
            handleUpdate(values)
        }

        // 关闭弹窗
        onClose()
    }

    const cards = [
        {
            imgSrc: FeiShuImg,
            text: '飞书',
        },
        {
            imgSrc: EmailImg,
            text: '邮件',
        },
        {
            imgSrc: DingDingImg,
            text: '钉钉',
        },
        {
            imgSrc: WeChatImg,
            text: '企业微信'
        },
        {
            imgSrc: SlackImg,
            text: 'Slack'
        }
    ];


    const handleCardClick = (index) => {
        let t = "FeiShu";
       if (index === 1){
            t = "Email"
        } else if (index === 2){
            t = "DingDing"
        } else if (index === 3){
           t = "WeChat"
        } else if (index === 4){
           t = "Slack"
        }

        setNotifyType(t)
        setSelectedNotifyCard(index);
    };

    const handleSubmit = async () => {
        const values = form.getFieldsValue();
        await form.validateFields()
        await handleFormSubmit(values)
    }

    return (
        <Drawer
            title={type === 'create' ? '创建通知模版' : '编辑通知模版'}
            open={visible}
            onClose={onClose}
            size='large'
            footer={
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <Button
                    type="primary"
                    htmlType="submit"
                    onClick={handleSubmit}
                    style={{
                        backgroundColor: '#000',
                    }}
                >
                    提交
                </Button>
            </div>}
        >
            <Form form={form} name="form_item_path" layout="vertical">
                <div style={{display: 'flex'}}>
                    <MyFormItem name="name" label="名称"
                                style={{
                                    marginRight: '10px',
                                    width: '500px',
                                }}
                                rules={[
                                    {
                                        required: true,
                                    },
                                ]}>
                        <Input
                            value={spaceValue}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            disabled={type === 'update'}/>
                    </MyFormItem>

                    <MyFormItem name="description" label="描述"
                                style={{
                                    marginRight: '10px',
                                    width: '500px',
                                }}>
                        <Input/>
                    </MyFormItem>
                </div>

                <div style={{display: 'flex'}}>
                    <MyFormItem name="" label="模版类型">
                        <div style={{display: 'flex', gap: '10px'}}>
                            {cards.map((card, index) => (
                                <Card
                                    key={index}
                                    style={{
                                        height: 100,
                                        width: 120,
                                        position: 'relative',
                                        cursor: type === 'update' ? 'not-allowed' : 'pointer',
                                        border: selectedNotifyCard === index ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                        pointerEvents: type === 'update' ? 'none' : 'auto',
                                    }}
                                    onClick={() => handleCardClick(index)}
                                >
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        marginTop: '-10px'
                                    }}>
                                        <img src={card.imgSrc}
                                             style={{height: '50px', width: '100px', objectFit: 'contain'}}
                                             alt={card.text}/>
                                        <p style={{
                                            fontSize: '12px',
                                            textAlign: 'center',
                                            marginTop: '5px'
                                        }}>{card.text}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </MyFormItem>
                </div>

                {selectedNotifyCard === 0 && (
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <MyFormItem style={{marginBottom: '0', marginRight: '10px'}}>
                            <span>应用飞书高级消息卡片</span>
                            <Tooltip title="需要则输入 飞书消息卡片搭建工具的Json Code">
                                <QuestionCircleOutlined style={{color: '#1890ff', marginLeft: '4px'}}/>
                            </Tooltip>
                        </MyFormItem>
                        <Checkbox
                            style={{marginTop: '0', marginRight: '10px'}}
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                        />
                    </div>
                )}

                {/* 快捷操作配置 - 仅飞书和钉钉支持 */}
                {(selectedNotifyCard === 0 || selectedNotifyCard === 2) && (
                    <div style={{marginTop: '16px', marginBottom: '16px'}}>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                            <MyFormItem style={{marginBottom: '0', marginRight: '10px'}}>
                                <span>启用快捷操作按钮</span>
                                <Tooltip title="在通知消息中显示快捷操作按钮（认领、静默、查看详情等）">
                                    <QuestionCircleOutlined style={{color: '#1890ff', marginLeft: '4px'}}/>
                                </Tooltip>
                            </MyFormItem>
                            <Switch
                                checked={enableQuickAction}
                                onChange={setEnableQuickAction}
                                disabled={!quickActionConfig || !quickActionConfig.enabled || !quickActionConfig.baseUrl || !quickActionConfig.secretKey}
                            />
                        </div>
                        
                        {/* 系统配置状态提示 */}
                        {quickActionConfig ? (
                            quickActionConfig.enabled && quickActionConfig.baseUrl && quickActionConfig.secretKey ? (
                                <>
                                    <Alert
                                        message="快捷操作已配置"
                                        description={`前端地址: ${quickActionConfig.baseUrl || '未配置'} | API地址: ${quickActionConfig.apiUrl || '使用前端地址'}`}
                                        type="success"
                                        icon={<InfoCircleOutlined />}
                                        showIcon
                                        style={{marginTop: '8px'}}
                                    />
                                    <Collapse
                                        ghost
                                        size="small"
                                        items={[{
                                            key: '1',
                                            label: '📋 查看配置值获取方式',
                                            children: (
                                                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '4px' }}>
                                                    <Descriptions column={1} bordered size="small">
                                                        <Descriptions.Item label="前端页面地址">
                                                            {quickActionConfig.baseUrl || '未配置'}
                                                            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                                                获取方式: getSystemSetting() → data.quickActionConfig.baseUrl
                                                            </div>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="后端API地址">
                                                            {quickActionConfig.apiUrl || '未配置（将使用前端地址）'}
                                                            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                                                获取方式: getSystemSetting() → data.quickActionConfig.apiUrl || baseUrl
                                                            </div>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Token签名密钥">
                                                            {quickActionConfig.secretKey ? '••••••••' + quickActionConfig.secretKey.slice(-4) : '未配置'}
                                                            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                                                获取方式: getSystemSetting() → data.quickActionConfig.secretKey
                                                            </div>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="配置来源">
                                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                                <div>1. 前端: 通过 API /api/w8t/setting/getSystemSetting 获取</div>
                                                                <div>2. 后端: 从 MySQL settings 表读取 quick_action_config 字段</div>
                                                                <div>3. 后端: 系统启动时加载到内存缓存 templates.quickActionConfig</div>
                                                            </div>
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                </div>
                                            )
                                        }]}
                                        style={{ marginTop: '8px' }}
                                    />
                                </>
                            ) : (
                                <Alert
                                    message="快捷操作未完全配置"
                                    description="请在系统设置中配置快捷操作参数（启用状态、前端地址、签名密钥）后才能使用快捷操作功能"
                                    type="warning"
                                    icon={<InfoCircleOutlined />}
                                    showIcon
                                    style={{marginTop: '8px'}}
                                />
                            )
                        ) : (
                            <Alert
                                message="快捷操作配置加载中..."
                                type="info"
                                icon={<InfoCircleOutlined />}
                                showIcon
                                style={{marginTop: '8px'}}
                            />
                        )}
                    </div>
                )}

                {(!isChecked || notifyType !== "FeiShu") && (
                    <div>
                        <MyFormItem
                            name="template"
                            label="告警模版"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}>
                            <VSCodeEditor height={"500px"}/>
                        </MyFormItem>
                    </div>
                ) || (
                    <div>
                        <MyFormItem
                            name="templateFiring"
                            label="告警模版"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}>
                            <VSCodeEditor height={"350px"}/>
                        </MyFormItem>
                        <MyFormItem
                            name="templateRecover"
                            label="恢复模版"
                            rules={[
                                {
                                    required: true,
                                },
                            ]}>
                            <VSCodeEditor height={"350px"}/>
                        </MyFormItem>
                    </div>
                )}
            </Form>
        </Drawer>
    )
}

export default NoticeTemplateCreateModal