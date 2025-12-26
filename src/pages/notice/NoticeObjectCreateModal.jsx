import {Modal, Form, Input, Button, Select, Card, Drawer, Divider, App} from 'antd'
import React, { useState, useEffect } from 'react'
import { createNotice, updateNotice } from '../../api/notice'
import { getDutyManagerList } from '../../api/duty'
import FeiShuImg from "./img/feishu.svg";
import EmailImg from "./img/Email.svg";
import DingDingImg from "./img/dingding.svg";
import WeChatImg from "./img/qywechat.svg"
import SlackImg from "./img/slack.svg"
import CustomHook from "./img/customhook.svg"
import SmsImg from "./img/message.png"
import {MinusCircleOutlined, PlusOutlined} from "@ant-design/icons";
import {getNoticeTmplList} from "../../api/noticeTmpl";
import {getUserList} from "../../api/user";
import { noticeTest } from '../../api/notice';

const MyFormItemContext = React.createContext([])

function toArr(str) {
    return Array.isArray(str) ? str : [str]
}

const MyFormItemGroup = ({ prefix, children }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatPath = React.useMemo(() => [...prefixPath, ...toArr(prefix)], [prefixPath, prefix])
    return <MyFormItemContext.Provider value={concatPath}>{children}</MyFormItemContext.Provider>
}

const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined
    return <Form.Item name={concatName} {...props} />
}

export const CreateNoticeObjectModal = ({ visible, onClose, selectedRow, type, handleList }) => {
    const { message } = App.useApp(); // 使用 Antd v5 的 useApp hook 获取 message API
    const { Option } = Select
    const [form] = Form.useForm()
    const [dutyList, setDutyList] = useState([])
    const [selectedDutyItem, setSelectedDutyItem] = useState([])
    const [submitLoading,setSubmitLoading] = useState(false)
    const [testLoading, setTestLoading] = useState(false)
    const [subjectValue,setSubjectValue] = useState('')
    const [selectedNoticeCard, setSelectedNoticeCard] = useState(null)
    const [noticeType,setNoticeType] = useState('')
    const [noticeTmplItems,setNoticeTmplItems] = useState([])
    const [selectNoticeTmpl,setSelectNoticeTmpl] = useState('')
    const [selectedToItems, setSelectedToItems] = useState([])
    const [selectedCcItems, setSelectedCcItems] = useState([])
    const [filteredOptions, setFilteredOptions] = useState([])
    const [spaceValue, setSpaceValue] = useState('')
    // 短信配置状态
    const [smsConfig, setSmsConfig] = useState({
        provider: 'tencent',
        accessKeyId: '',
        accessKeySecret: '',
        sdkAppId: '',
        templateId: '',
        templateCode: '',
        signName: ''
    })
    const [phoneNumbers, setPhoneNumbers] = useState([])

    const PRIORITY_OPTIONS = [
        { label: 'P0 紧急', value: 'P0' },
        { label: 'P1 重要', value: 'P1' },
        { label: 'P2 一般', value: 'P2' }
    ]

    const PRIORITY_COLORS = {
        P0: '#ff4d4f',
        P1: '#faad14',
        P2: '#b0e1fb'
    }

    const cards = [
        { imgSrc: FeiShuImg, text: '飞书', value: 'FeiShu' },
        { imgSrc: EmailImg, text: '邮件', value: 'Email' },
        { imgSrc: DingDingImg, text: '钉钉', value: 'DingDing' },
        { imgSrc: WeChatImg, text: '企业微信', value: 'WeChat' },
        { imgSrc: SlackImg, text: 'Slack', value: 'Slack' },
        { imgSrc: CustomHook, text: '自定义Hook', value: 'CustomHook' },
        { imgSrc: SmsImg, text: '短信', value: 'SMS' },
    ]

    const handleInputEmailChange = (name, value) => {
        switch (name) {
            case 'subject':
                setSubjectValue(value)
                break
            default:
                break
        }
    }

    const handleInputChange = (e) => {
        const newValue = e.target.value.replace(/\s/g, '')
        setSpaceValue(newValue)
    }

    const handleKeyPress = (e) => {
        if (e.key === ' ') {
            e.preventDefault()
        }
    }

    useEffect(() => {
        handleSearchUser()
        handleDutyManageList()
        handleGetNoticeTmpl()

        if (selectedRow) {
            form.setFieldsValue({
                uuid: selectedRow.uuid,
                name: selectedRow.name,
                dutyId: selectedRow.dutyId,
                env: selectedRow.env,
                noticeType: selectedRow.noticeType,
                hook: selectedRow.hook,
                noticeTmplId: selectedRow.noticeTmplId,
                sign: selectedRow.sign,
                email: {
                    subject: selectedRow.email.subject,
                    to: selectedRow.email.to,
                    cc: selectedRow.email.cc,
                },
                routes: selectedRow.routes || []
            })

            const cardIndex = cards.findIndex(card => card.value === selectedRow.noticeType)
            setSubjectValue(selectedRow.email.subject)
            setSelectedToItems(selectedRow.email.to)
            setSelectedCcItems(selectedRow.email.cc)
            setSelectedNoticeCard(cardIndex)
            setNoticeType(selectedRow.noticeType)
            setSelectNoticeTmpl(selectedRow.noticeTmplId)
            
            // 如果是短信类型，解析hook字段中的配置
            if (selectedRow.noticeType === 'SMS') {
                try {
                    const hookConfig = selectedRow.hook ? JSON.parse(selectedRow.hook) : {}
                    setSmsConfig({
                        provider: hookConfig.provider || 'tencent',
                        accessKeyId: hookConfig.accessKeyId || '',
                        accessKeySecret: hookConfig.accessKeySecret || '',
                        sdkAppId: hookConfig.sdkAppId || '',
                        templateId: hookConfig.templateId || '',
                        templateCode: hookConfig.templateCode || '',
                        signName: hookConfig.signName || ''
                    })
                } catch (e) {
                    console.error('解析短信配置失败:', e)
                }
                // 设置手机号
                if (selectedRow.phoneNumber && Array.isArray(selectedRow.phoneNumber)) {
                    setPhoneNumbers(selectedRow.phoneNumber)
                }
            }
        }
    }, [selectedRow, form])

    const handleDutyManageList = async () => {
        try {
            const res = await getDutyManagerList()
            const newData = res.data.map((item) => ({
                label: item.name,
                value: item.id
            }))
            setDutyList(newData)
        } catch (error) {
            console.error(error)
        }
    }

    const handleCreate = async (data) => {
        try {
            let hookValue = data.hook
            // 如果是短信类型，将配置序列化为JSON存储到hook字段
            if (noticeType === 'SMS') {
                hookValue = JSON.stringify(smsConfig)
            }
            
            const params = {
                ...data,
                noticeType: noticeType,
                hook: hookValue,
                email: {
                    subject: subjectValue,
                    to: selectedToItems,
                    cc: selectedCcItems,
                },
                phoneNumber: noticeType === 'SMS' ? phoneNumbers : undefined
            }
            await createNotice(params)
            handleList()
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdate = async (data) => {
        try {
            let hookValue = data.hook
            // 如果是短信类型，将配置序列化为JSON存储到hook字段
            if (noticeType === 'SMS') {
                hookValue = JSON.stringify(smsConfig)
            }
            
            const params = {
                ...data,
                noticeType: noticeType,
                tenantId: selectedRow.tenantId,
                uuid: selectedRow.uuid,
                hook: hookValue,
                email: {
                    subject: subjectValue,
                    to: selectedToItems,
                    cc: selectedCcItems,
                },
                phoneNumber: noticeType === 'SMS' ? phoneNumbers : undefined
            }
            await updateNotice(params)
            handleList()
        } catch (error) {
            console.error(error)
        }
    }

    const handleFormSubmit = async (values) => {
        if (type === 'create') {
            await handleCreate(values)
        } else if (type === 'update') {
            await handleUpdate(values)
        }
        onClose()
    }

    useEffect(() => {
        if (selectedNoticeCard === null) {
            setSelectedNoticeCard(0)
            setNoticeType("FeiShu")
        }
    }, [])

    const handleCardClick = (index) => {
        setNoticeType(cards[index].value)
        setSelectedNoticeCard(index)
    }

    const handleGetNoticeTmpl = async () => {
        try {
            const params = { noticeType: noticeType }
            const res = await getNoticeTmplList(params)
            
            // 修复：检查权限错误
            if (res.code === 403) {
                message.warning('无权限访问通知模版列表')
                setNoticeTmplItems([])
                return
            }
            
            // 修复：添加空值检查，防止访问 undefined 的 map 方法
            if (!res || !res.data || !Array.isArray(res.data)) {
                console.warn('获取通知模版列表失败或数据格式不正确:', res)
                setNoticeTmplItems([])
                return
            }
            
            const newData = res.data.map((item) => ({
                label: item.name,
                value: item.id
            }))
            setNoticeTmplItems(newData)
        } catch (error) {
            console.error('获取通知模版列表失败:', error)
            message.error('获取通知模版列表失败')
            setNoticeTmplItems([])
        }
    }

    const handleSelectChangeTo = (value) => {
        setSelectedToItems(value)
    }

    const handleSelectChangeCc = (value) => {
        setSelectedCcItems(value)
    }

    const handleSearchUser = async () => {
        try {
            const params = {
                joinDuty: "true",
            }
            const res = await getUserList(params)
            const options = res.data.map((item) => ({
                userName: item.username,
                userEmail: item.email,
                userPhone: item.phone || ''
            }))
            setFilteredOptions(options)
        } catch (error) {
            console.error(error)
        }
    }

    const handleSubmit = async () => {
        setSubmitLoading(true)
        const values = form.getFieldsValue()
        try {
            await form.validateFields()
            await handleFormSubmit(values)
        } catch (error) {
            console.log(error)
        }
        setSubmitLoading(false)
    }

    const handleTestNotice = async () => {
        setTestLoading(true)
        const formValues = form.getFieldsValue()
        let hookValue = formValues.hook
        // 如果是短信类型，将配置序列化为JSON存储到hook字段
        if (noticeType === 'SMS') {
            hookValue = JSON.stringify(smsConfig)
        }
        
        const params = {
            ...formValues,
            noticeType: noticeType,
            hook: hookValue,
            phoneNumber: noticeType === 'SMS' ? phoneNumbers : undefined
        }
        try {
            // 调用API测试通知
            const result = await noticeTest(params);
            
            if (result.success) {
                // 测试成功，显示成功提示
                message.success('通知测试发送成功！')
            } else {
                // 测试失败，显示错误提示
                message.error(result.error || '通知测试发送失败，请检查配置')
            }
        } catch (error) {
            // 处理表单验证错误或其他意外错误
            if (error.errorFields && error.errorFields.length > 0) {
                message.error('表单验证失败，请检查必填项')
            } else {
                message.error('通知测试出现意外错误，请重试')
            }
            console.error('通知测试过程中出错:', error)
        } finally {
            setTestLoading(false)
        }
    };

    const getAvailablePriorityOptions = (fields) => {
        const usedPriorities = fields.map(field =>
            form.getFieldValue(['routes', field.name, 'severity'])
        )
        return PRIORITY_OPTIONS.filter(
            option => !usedPriorities.includes(option.value)
        )
    }

    return (
        <Drawer
            title="创建通知对象"
            open={visible}
            onClose={onClose}
            width={1200}
            footer={
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Button
                        type="default"
                        onClick={handleTestNotice}
                        loading={testLoading}
                    >
                        通知测试
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitLoading}
                        onClick={handleSubmit}
                    >
                        提交
                    </Button>
                </div>
            }
        >
            <Form form={form} name="form_item_path" layout="vertical">
                <div style={{display: 'flex'}}>
                    <MyFormItem
                        name="name"
                        label="名称"
                        style={{ marginRight: '10px', width: '500px' }}
                        rules={[{ required: true }]}
                    >
                        <Input
                            value={spaceValue}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            disabled={type === 'update'}
                        />
                    </MyFormItem>

                    <MyFormItem
                        name="dutyId"
                        label="值班表"
                        style={{ width: '500px' }}
                    >
                        <Select
                            showSearch
                            allowClear
                            placeholder="请选择值班表"
                            options={dutyList}
                            value={selectedDutyItem}
                            tokenSeparators={[',']}
                            onChange={setSelectedDutyItem}
                        />
                    </MyFormItem>
                </div>

                <div style={{display: 'flex'}}>
                    <MyFormItem name="" label="通知类型">
                        <div style={{display: 'flex', gap: '10px'}}>
                            {cards.map((card, index) => (
                                <Card
                                    key={index}
                                    style={{
                                        height: 100,
                                        width: 120,
                                        position: 'relative',
                                        cursor: type === 'update' ? 'not-allowed' : 'pointer',
                                        border: selectedNoticeCard === index ? '2px solid #1890ff' : '1px solid #d9d9d9',
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
                                        <img
                                            src={card.imgSrc}
                                            style={{height: '50px', width: '100px', objectFit: 'contain'}}
                                            alt={card.text}
                                        />
                                        <p style={{
                                            fontSize: '12px',
                                            textAlign: 'center',
                                            marginTop: '5px'
                                        }}>
                                            {card.text}
                                        </p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </MyFormItem>
                </div>

                <div>
                    {noticeType === "Email" ? (
                        <MyFormItemGroup prefix={['email']}>
                            <MyFormItem name="subject" label="邮件主题" rules={[{required: true}]}>
                                <Input
                                    onChange={(e) => handleInputEmailChange('subject', e.target.value)}
                                    placeholder="AlertHub监控报警平台"
                                    style={{width: '100%'}}
                                />
                            </MyFormItem>

                            <MyFormItem name="to" label="收件人" rules={[{ required: true }]}>
                                <Select
                                    mode="multiple"
                                    placeholder="请选择需要通知的人员"
                                    onChange={handleSelectChangeTo}
                                    style={{ width: '100%' }}
                                >
                                    {filteredOptions.map((item) => (
                                        <Option
                                            key={item.userName}
                                            value={item.userEmail}
                                            userName={item.userName}
                                            userEmail={item.userEmail}
                                        >
                                            {item.userName} ({item.userEmail})
                                        </Option>
                                    ))}
                                </Select>
                            </MyFormItem>

                            <MyFormItem name="cc" label="抄送人">
                                <Select
                                    mode="multiple"
                                    placeholder="请选择需要抄送的人员"
                                    onChange={handleSelectChangeCc}
                                    style={{ width: '100%' }}
                                >
                                    {filteredOptions.map((item) => (
                                        <Option
                                            key={item.userName}
                                            value={item.userEmail}
                                            userName={item.userName}
                                            userEmail={item.userEmail}
                                            disabled={(selectedToItems.some(toItem => toItem === item.userEmail) || item.userEmail === "")}
                                        >
                                            {item.userName} ({item.userEmail})
                                        </Option>
                                    ))}
                                </Select>
                            </MyFormItem>
                        </MyFormItemGroup>
                    ) : noticeType === "SMS" ? (
                        <>
                            <MyFormItem
                                label="服务商"
                                rules={[{ required: true, message: '请选择短信服务商' }]}
                            >
                                <Select
                                    value={smsConfig.provider}
                                    onChange={(value) => setSmsConfig({...smsConfig, provider: value})}
                                    style={{ width: '100%' }}
                                >
                                    <Option value="tencent">腾讯云</Option>
                                    <Option value="aliyun">阿里云</Option>
                                </Select>
                            </MyFormItem>

                            <MyFormItem
                                label="AccessKeyId"
                                rules={[{ required: true, message: '请输入AccessKeyId' }]}
                            >
                                <Input
                                    value={smsConfig.accessKeyId}
                                    onChange={(e) => setSmsConfig({...smsConfig, accessKeyId: e.target.value})}
                                    placeholder="请输入访问密钥ID"
                                />
                            </MyFormItem>

                            <MyFormItem
                                label="AccessKeySecret"
                                rules={[{ required: true, message: '请输入AccessKeySecret' }]}
                            >
                                <Input.Password
                                    value={smsConfig.accessKeySecret}
                                    onChange={(e) => setSmsConfig({...smsConfig, accessKeySecret: e.target.value})}
                                    placeholder="请输入访问密钥Secret"
                                />
                            </MyFormItem>

                            <MyFormItem
                                label="短信签名"
                                rules={[{ required: true, message: '请输入短信签名' }]}
                            >
                                <Input
                                    value={smsConfig.signName}
                                    onChange={(e) => setSmsConfig({...smsConfig, signName: e.target.value})}
                                    placeholder="请输入短信签名"
                                />
                            </MyFormItem>

                            {smsConfig.provider === 'tencent' ? (
                                <>
                                    <MyFormItem
                                        label="SdkAppId"
                                        rules={[{ required: true, message: '请输入SdkAppId' }]}
                                    >
                                        <Input
                                            value={smsConfig.sdkAppId}
                                            onChange={(e) => setSmsConfig({...smsConfig, sdkAppId: e.target.value})}
                                            placeholder="请输入腾讯云应用ID"
                                        />
                                    </MyFormItem>
                                    <MyFormItem
                                        label="TemplateId"
                                        rules={[{ required: true, message: '请输入TemplateId' }]}
                                    >
                                        <Input
                                            value={smsConfig.templateId}
                                            onChange={(e) => setSmsConfig({...smsConfig, templateId: e.target.value})}
                                            placeholder="请输入腾讯云模板ID"
                                        />
                                    </MyFormItem>
                                </>
                            ) : (
                                <MyFormItem
                                    label="TemplateCode"
                                    rules={[{ required: true, message: '请输入TemplateCode' }]}
                                >
                                    <Input
                                        value={smsConfig.templateCode}
                                        onChange={(e) => setSmsConfig({...smsConfig, templateCode: e.target.value})}
                                        placeholder="请输入阿里云模板代码"
                                    />
                                </MyFormItem>
                            )}

                            <MyFormItem
                                label="手机号"
                                rules={[{ required: true, message: '请至少选择一个用户' }]}
                            >
                                <Select
                                    mode="multiple"
                                    value={phoneNumbers}
                                    onChange={setPhoneNumbers}
                                    placeholder="请选择需要通知的用户"
                                    style={{ width: '100%' }}
                                    filterOption={(input, option) => {
                                        const label = option?.label || ''
                                        return label.toLowerCase().includes(input.toLowerCase())
                                    }}
                                >
                                    {filteredOptions
                                        .filter(item => item.userPhone && item.userPhone.trim() !== '')
                                        .map((item) => (
                                            <Option
                                                key={item.userName}
                                                value={item.userPhone}
                                                label={`${item.userName} (${item.userPhone})`}
                                            >
                                                {item.userName} ({item.userPhone})
                                            </Option>
                                        ))}
                                </Select>
                            </MyFormItem>
                        </>
                    ) : (
                        <MyFormItem
                            name="hook"
                            label="默认Hook"
                            tooltip="客户端机器人的 Hook 地址"
                            style={{ marginRight: '10px', width: '100%' }}
                            rules={[
                                { required: true },
                                { pattern: /^(http|https):\/\//, message: '输入正确的URL格式' },
                            ]}
                        >
                            <Input/>
                        </MyFormItem>
                    )}
                </div>

                {selectedNoticeCard === 0 && (
                    <MyFormItem
                        name="sign"
                        label="默认签名"
                        tooltip="飞书客户端机器人的签名校验"
                        style={{ marginRight: '10px', width: '100%' }}
                    >
                        <Input.Password />
                    </MyFormItem>
                )}

                {selectedNoticeCard !== 5 && selectedNoticeCard !== 6 && (
                    <MyFormItem
                        name="noticeTmplId"
                        label="通知模版"
                        rules={[{ required: true }]}
                    >
                        <Select
                            showSearch
                            allowClear
                            placeholder="请选择通知模版"
                            options={noticeTmplItems}
                            value={selectNoticeTmpl}
                            tokenSeparators={[',']}
                            onChange={setSelectNoticeTmpl}
                            onClick={handleGetNoticeTmpl}
                        />
                    </MyFormItem>
                )}

                <MyFormItem
                    name="routes"
                    label="路由策略"
                    tooltip="如果不匹配如下任何策略, 则会走默认Hook"
                    style={{marginRight: '10px', width: '100%'}}
                >

                    <div style={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                    }}>
                        <span style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: PRIORITY_COLORS["P0"] || PRIORITY_COLORS.P0,
                            marginRight: 1
                        }}/> P0

                        <span style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: PRIORITY_COLORS["P1"] || PRIORITY_COLORS.P0,
                            marginRight: 1
                        }}/> P1

                        <span style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: PRIORITY_COLORS["P2"] || PRIORITY_COLORS.P0,
                            marginRight: 1
                        }}/> P2
                    </div>

                    <Form.List name="routes">
                        {(fields, {add, remove}) => (
                            <>
                                {fields.map(({key, name, ...restField}) => {
                                    const currentSeverity = form.getFieldValue(['routes', name, 'severity'])
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                marginBottom: 16,
                                                padding: 12,
                                                borderLeft: `4px solid ${PRIORITY_COLORS[currentSeverity] || PRIORITY_COLORS.P0}`,
                                                background: '#f4f4f4',
                                                borderRadius: 4
                                            }}
                                        >
                                            <div style={{display: 'flex', gap: 8}}>
                                                <div style={{width: '100%'}}>
                                                    {selectedNoticeCard === 6 ? (
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, "hook"]}
                                                            label="短信配置(JSON)"
                                                            rules={[{required: true}]}
                                                            tooltip="请输入短信配置的JSON字符串，格式与默认配置相同"
                                                        >
                                                            <Input.TextArea 
                                                                rows={4}
                                                                placeholder='{"provider":"tencent","accessKeyId":"...","accessKeySecret":"...","sdkAppId":"...","templateId":"...","signName":"..."}'
                                                            />
                                                        </Form.Item>
                                                    ) : selectedNoticeCard !== 1 ? (
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, "hook"]}
                                                            label="Hook"
                                                            rules={[{required: true, pattern: /^(http|https):\/\//}]}
                                                        >
                                                            <Input placeholder="http(s)://xxx.xxx"/>
                                                        </Form.Item>
                                                    ) : (
                                                        <>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, "to"]}
                                                                label="收件人"
                                                                rules={[{required: true}]}
                                                            >
                                                                <Select
                                                                    mode="multiple"
                                                                    placeholder="请选择需要通知的人员"
                                                                    onChange={handleSelectChangeTo}
                                                                    style={{ width: '100%' }}
                                                                >
                                                                    {filteredOptions.map((item) => (
                                                                        <Option
                                                                            key={item.userName}
                                                                            value={item.userEmail}
                                                                            userName={item.userName}
                                                                            userEmail={item.userEmail}
                                                                        >
                                                                            {item.userName} ({item.userEmail})
                                                                        </Option>
                                                                    ))}
                                                                </Select>
                                                            </Form.Item>

                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, "cc"]}
                                                                label="抄送人"
                                                                rules={[{required: true}]}
                                                            >
                                                                <Select
                                                                    mode="multiple"
                                                                    placeholder="请选择需要抄送的人员"
                                                                    onChange={handleSelectChangeCc}
                                                                    style={{ width: '100%' }}
                                                                >
                                                                    {filteredOptions.map((item) => (
                                                                        <Option
                                                                            key={item.userName}
                                                                            value={item.userEmail}
                                                                            userName={item.userName}
                                                                            userEmail={item.userEmail}
                                                                            disabled={(selectedToItems.some(toItem => toItem === item.userEmail) || item.userEmail === "")}
                                                                        >
                                                                            {item.userName} ({item.userEmail})
                                                                        </Option>
                                                                    ))}
                                                                </Select>
                                                            </Form.Item>
                                                        </>
                                                    )}

                                                    {/*非飞书Robot不需要Sign*/}
                                                    {selectedNoticeCard === 0 && (
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, "sign"]}
                                                            label="签名"
                                                        >
                                                            <Input placeholder="选填签名信息"/>
                                                        </Form.Item>
                                                    )}
                                                </div>
                                                <MinusCircleOutlined
                                                    onClick={() => remove(name)}
                                                    style={{color: PRIORITY_COLORS.P0}}
                                                />
                                            </div>

                                        </div>
                                    )
                                })}

                                <Form.Item>
                                    <Button
                                        type="dashed"
                                        onClick={() => {
                                            const availableOptions = getAvailablePriorityOptions(fields)
                                            if (availableOptions.length > 0) {
                                                add({severity: availableOptions[0].value})
                                            }
                                        }}
                                        block
                                        icon={<PlusOutlined/>}
                                        disabled={fields.length >= PRIORITY_OPTIONS.length}
                                    >
                                        添加策略
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                {selectedNoticeCard === 5 && (
                    <pre>
                        <span>请求体</span>
                        <div style={{
                            padding: 12,
                            backgroundColor: '#f8f9fa',
                            borderRadius: 4
                        }}>{`
{
  "alarm": {
    "tenantId": "租户ID，通常为默认值 'default'",
    "datasource_id": "数据源的唯一标识符",
    "datasource_type": "数据源的类型，如 Prometheus",
    "fingerprint": "告警指纹/唯一标识符，用于标识特定的告警实例",
    "rule_id": "触发此告警的规则的唯一标识符",
    "rule_name": "告警规则的名称",
    "severity": "告警的严重等级，P0表示最高级别",
    "eval_interval": "规则的评估间隔时间（秒）",
    "annotations": "告警的附加信息或描述",
    "first_trigger_time": "告警首次触发的时间戳（Unix时间，秒）",
    "last_eval_time": "规则最后一次评估的时间戳（Unix时间，秒）",
    "last_send_time": "最后一次发送通知的时间戳（Unix时间，秒）",
    "recover_time": "告警恢复（解除）的时间戳（Unix时间，秒）",
    "faultCenterId": "故障中心的唯一标识符",
    "alarmDuration": "告警持续时间（秒）",
    "labels": {
      "__name__": "Prometheus指标名称",
      ...
    },
    "confirmState": {
      "isConfirm": "是否已被确认（True/False）",
      "confirmOkTime": "确认操作完成的时间戳（Unix时间，秒）",
      "confirmSendTime": "确认通知发送的时间戳（Unix时间，秒）",
      "confirmUser": "执行确认操作的人员",
    }
  },
  dutyUsers: [
    {
      "username": "用户名称",
      "email": "用户邮箱",
      "phone": "用户手机号",
      "dutyUserId": "用户标识"
    }
  ]
}
                        `}</div>
                    </pre>
                )}
                </MyFormItem>
            </Form>
        </Drawer>
    )
}