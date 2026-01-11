import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message, Alert } from 'antd';
import { createWebhook, updateWebhook, getWebhook } from '../../api/thirdPartyWebhook';
import { getUserInfo } from '../../api/user';
import { getNoticeList } from '../../api/notice';

const { Option } = Select;
const { TextArea } = Input;

export const WebhookModal = ({ visible, onClose, selectedRow, type, handleList }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [noticeList, setNoticeList] = useState([]); // 通知对象列表

    // 加载通知对象列表
    useEffect(() => {
        if (visible) {
            loadNoticeList();
            if (type === 'update' && selectedRow) {
                // 编辑模式，加载数据
                loadWebhookData(selectedRow.id);
            } else {
                // 创建模式，重置表单
                form.resetFields();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, type, selectedRow]);

    const loadNoticeList = async () => {
        try {
            const res = await getNoticeList({});
            console.log('获取通知对象列表响应:', res);
            if (res && res.data) {
                // res.data 直接就是数组
                const list = Array.isArray(res.data) ? res.data : [];
                console.log('通知对象列表:', list);
                setNoticeList(list);
            }
        } catch (error) {
            console.error('加载通知对象列表失败:', error);
            message.error('加载通知对象列表失败，请检查网络连接');
        }
    };

    const loadWebhookData = async (id) => {
        try {
            const res = await getWebhook({ id: id });
            if (res && res.data) {
                form.setFieldsValue({
                    name: res.data.name,
                    description: res.data.description,
                    source: res.data.source,
                    enableLog: res.data.enableLog !== undefined ? res.data.enableLog : true,
                    status: res.data.status || 'active',
                    noticeIds: res.data.noticeIds || [], // 设置通知对象ID列表
                });
            }
        } catch (error) {
            console.error('加载Webhook数据失败:', error);
            message.error('加载Webhook数据失败');
        }
    };

    const handleSubmit = async () => {
        try {
            await form.validateFields();
            setLoading(true);

            const values = form.getFieldsValue();
            let userId = '';
            try {
                const userInfo = await getUserInfo();
                userId = userInfo?.data?.userid || userInfo?.data?.userId || '';
            } catch (error) {
                console.error('获取用户信息失败:', error);
            }

            if (type === 'create') {
                await createWebhook({
                    name: values.name,
                    description: values.description || '',
                    source: values.source,
                    dataMapping: '{}',  // 后端会自动智能提取字段
                    transform: '',      // 暂不支持转换脚本
                    enableLog: values.enableLog !== undefined ? values.enableLog : true,
                    noticeIds: values.noticeIds || [], // 关联的通知对象ID列表
                    createBy: userId,
                });
            } else {
                await updateWebhook({
                    id: selectedRow.id,
                    name: values.name,
                    description: values.description || '',
                    source: values.source,
                    dataMapping: '{}',
                    transform: '',
                    status: values.status || 'active',
                    enableLog: values.enableLog !== undefined ? values.enableLog : true,
                    noticeIds: values.noticeIds || [], // 更新关联的通知对象ID列表
                    updateBy: userId,
                });
            }

            message.success(type === 'create' ? 'Webhook创建成功' : 'Webhook更新成功');
            handleList();
            onClose();
        } catch (error) {
            console.error('提交失败:', error);
            if (error.errorFields) {
                // 表单验证错误
                return;
            }
            // API错误已经在HandleApiError中处理了
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={type === 'create' ? '创建Webhook配置' : '编辑Webhook配置'}
            open={visible}
            onCancel={onClose}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={700}
            destroyOnClose
        >
            <Alert
                message="智能字段提取"
                description="AlertHub会自动从第三方告警数据中智能提取常用字段（如：title、severity、host、service等），无需手动配置映射规则。支持多种字段命名风格。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    enableLog: true,
                    status: 'active',
                }}
            >
                <Form.Item
                    name="name"
                    label="Webhook名称"
                    rules={[{ required: true, message: '请输入Webhook名称' }]}
                >
                    <Input placeholder="例如：Zabbix生产环境告警" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="描述说明"
                    rules={[{ required: true, message: '请输入描述说明' }]}
                >
                    <TextArea
                        rows={2}
                        placeholder="例如：接收Zabbix生产环境的所有告警通知"
                    />
                </Form.Item>

                <Form.Item
                    name="source"
                    label="来源系统"
                    rules={[{ required: true, message: '请输入来源系统' }]}
                    tooltip="填写告警的来源监控系统名称，用于标识和分类（如：Zabbix、Prometheus、Grafana等）"
                >
                    <Input placeholder="例如：Zabbix、Prometheus、Grafana、Nagios等" />
                </Form.Item>

                <Form.Item
                    name="noticeIds"
                    label="通知对象"
                    tooltip="选择接收告警通知的IM群或邮箱，支持多选。当Webhook接收到告警时会自动推送到选中的通知对象"
                >
                    <Select
                        mode="multiple"
                        placeholder="请选择通知对象（可多选）"
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            option.children.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {noticeList.map((notice) => (
                            <Option key={notice.uuid} value={notice.uuid}>
                                {notice.name} ({notice.noticeType})
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {type === 'update' && (
                    <Form.Item
                        name="status"
                        label="状态"
                        rules={[{ required: true, message: '请选择状态' }]}
                    >
                        <Select placeholder="请选择状态">
                            <Option value="active">启用</Option>
                            <Option value="disabled">禁用</Option>
                        </Select>
                    </Form.Item>
                )}

                <Form.Item
                    name="enableLog"
                    label="记录详细日志"
                    valuePropName="checked"
                    tooltip="启用后会记录所有告警的原始数据和请求头，便于调试和排查问题"
                >
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
};
