import React, { useState } from 'react';
import { 
    Input, Select, Space, Button, Modal, Form, Drawer, Descriptions, 
    Spin, Timeline, Divider, Tag, Empty, Typography 
} from 'antd';
import { ReloadOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { useProcessStatus, useProcessStep } from './hooks';

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

// ==================== 工具函数 ====================

/**
 * 格式化处理状态
 */
export const formatStatus = (status) => {
    const statusMap = {
        detected: { text: '已检测', color: 'blue' },
        analyzing: { text: '分析中', color: 'processing' },
        correlated: { text: '关联分析', color: 'warning' },
        processing: { text: '处理中', color: 'orange' },
        validated: { text: '验证中', color: 'cyan' },
        completed: { text: '已完成', color: 'success' },
    };
    const statusInfo = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

/**
 * 格式化时长（秒转可读格式）
 */
export const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

    return parts.join('');
};

// ==================== 状态选项配置 ====================

const STATUS_OPTIONS = [
    { value: 'detected', label: '已检测', color: 'blue' },
    { value: 'analyzing', label: '分析中', color: 'processing' },
    { value: 'correlated', label: '关联分析', color: 'warning' },
    { value: 'processing', label: '处理中', color: 'orange' },
    { value: 'validated', label: '验证中', color: 'cyan' },
    { value: 'completed', label: '已完成', color: 'success' },
];

// ==================== 组件 ====================

/**
 * 搜索栏组件
 */
export const SearchBar = ({
    searchQuery,
    setSearchQuery,
    selectedFaultCenter,
    setSelectedFaultCenter,
    faultCenterList,
    onSearch,
    onReset,
    onRefresh,
}) => {
    return (
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
            <Input
                placeholder="输入告警事件ID搜索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={onSearch}
                style={{ width: 250 }}
                allowClear
            />
            <Select
                placeholder="选择故障中心"
                value={selectedFaultCenter}
                onChange={(value) => setSelectedFaultCenter(value)}
                style={{ width: 200 }}
                allowClear
            >
                {faultCenterList.map(center => (
                    <Option key={center.id} value={center.id}>
                        {center.name || center.id}
                    </Option>
                ))}
            </Select>
            <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={onSearch}
            >
                搜索
            </Button>
            <Button onClick={onReset}>
                重置
            </Button>
            <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
            >
                刷新
            </Button>
        </Space>
    );
};

/**
 * 状态更新模态框组件
 */
export const StatusUpdateModal = ({
    visible,
    onCancel,
    onSuccess,
    currentStatus,
    eventId,
    onUpdateStatus,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    /**
     * 处理确认更新
     */
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const { status } = values;

            if (status === currentStatus) {
                return;
            }

            setLoading(true);
            const success = await onUpdateStatus(eventId, status);
            
            if (success) {
                form.resetFields();
                onSuccess?.();
                onCancel();
            }
        } catch (error) {
            console.error('表单验证失败:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 处理取消
     */
    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title="更新处理状态"
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="确认更新"
            cancelText="取消"
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ status: currentStatus }}
            >
                <Form.Item
                    name="status"
                    label="选择新状态"
                    rules={[{ required: true, message: '请选择新状态' }]}
                >
                    <Select placeholder="请选择状态" style={{ width: '100%' }}>
                        {STATUS_OPTIONS.map(option => (
                            <Option key={option.value} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

/**
 * 添加步骤模态框组件
 */
export const AddStepModal = ({
    visible,
    onCancel,
    onSuccess,
    eventId,
    userList,
    onAddStep,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    /**
     * 处理确认添加
     */
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const { stepName, description, assignedUser } = values;

            setLoading(true);
            const success = await onAddStep(eventId, stepName, description, assignedUser || '');
            
            if (success) {
                form.resetFields();
                onSuccess?.();
                onCancel();
            }
        } catch (error) {
            console.error('表单验证失败:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 处理取消
     */
    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title="添加处理步骤"
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="确认添加"
            cancelText="取消"
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ assignedUser: '' }}
            >
                <Form.Item
                    name="stepName"
                    label="步骤名称"
                    rules={[{ required: true, message: '请输入步骤名称' }]}
                >
                    <Input placeholder="请输入步骤名称" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="步骤描述"
                    rules={[{ required: true, message: '请输入步骤描述' }]}
                >
                    <TextArea
                        placeholder="请输入步骤描述"
                        rows={4}
                        showCount
                        maxLength={500}
                    />
                </Form.Item>

                <Form.Item
                    name="assignedUser"
                    label="分配处理人"
                    tooltip="留空则默认为当前用户"
                >
                    <Select
                        placeholder="请选择处理人（可选）"
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {userList.map(user => (
                            <Option key={user.id || user.username} value={user.username || user.id}>
                                {user.realName || user.username || user.id}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

/**
 * 完成步骤模态框组件
 */
export const CompleteStepModal = ({
    visible,
    onCancel,
    onSuccess,
    stepName,
    eventId,
    onCompleteStep,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    /**
     * 处理确认完成
     */
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const { notes } = values;

            setLoading(true);
            const success = await onCompleteStep(eventId, stepName, notes || '');
            
            if (success) {
                form.resetFields();
                onSuccess?.();
                onCancel();
            }
        } catch (error) {
            console.error('表单验证失败:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 处理取消
     */
    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={`完成步骤: ${stepName}`}
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="确认完成"
            cancelText="取消"
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Form.Item
                    name="notes"
                    label="备注信息"
                    rules={[{ max: 500, message: '备注信息不能超过500个字符' }]}
                >
                    <TextArea
                        placeholder="请输入备注信息（可选）"
                        rows={4}
                        maxLength={500}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

/**
 * 处理流程详情抽屉组件
 */
export const ProcessDetailDrawer = ({
    visible,
    onClose,
    processDetail,
    operationLogs,
    loading,
    faultCenterList,
    userList,
    onRefresh,
}) => {
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [completeStepModalVisible, setCompleteStepModalVisible] = useState(false);
    const [addStepModalVisible, setAddStepModalVisible] = useState(false);
    const [selectedStep, setSelectedStep] = useState(null);
    const { handleUpdateStatus } = useProcessStatus();
    const { handleCompleteStep, handleAddStep } = useProcessStep();

    /**
     * 处理状态更新成功
     */
    const handleStatusUpdateSuccess = () => {
        if (processDetail?.eventId && onRefresh) {
            onRefresh(processDetail.eventId);
        }
    };

    /**
     * 处理完成步骤成功
     */
    const handleCompleteStepSuccess = () => {
        if (processDetail?.eventId && onRefresh) {
            onRefresh(processDetail.eventId);
        }
    };

    /**
     * 处理添加步骤成功
     */
    const handleAddStepSuccess = () => {
        if (processDetail?.eventId && onRefresh) {
            onRefresh(processDetail.eventId);
        }
    };

    /**
     * 打开完成步骤模态框
     */
    const handleOpenCompleteStepModal = (step) => {
        setSelectedStep(step);
        setCompleteStepModalVisible(true);
    };

    /**
     * 打开添加步骤模态框
     */
    const handleOpenAddStepModal = () => {
        setAddStepModalVisible(true);
    };

    /**
     * 根据用户名查找真实姓名
     */
    const getUserDisplayName = (username) => {
        if (!username) return '-';
        const user = userList.find(u => u.username === username || u.id === username);
        return user?.realName || user?.username || username;
    };

    /**
     * 获取操作人显示名称
     */
    const getOperatorDisplayName = (log) => {
        // 优先使用后端返回的 operatorName
        if (log.operatorName) {
            return log.operatorName;
        }
        // 如果后端没有返回，根据 operator（用户名）查找真实姓名
        if (log.operator) {
            return getUserDisplayName(log.operator);
        }
        return '-';
    };

    /**
     * 将操作描述中的用户名替换为真实姓名
     * 例如："添加处理步骤:测试,分配给:admin" -> "添加处理步骤:测试,分配给:超管"
     */
    const formatOperationDesc = (operationDesc) => {
        if (!operationDesc || !userList || userList.length === 0) {
            return operationDesc;
        }

        // 匹配操作描述中的用户名模式
        // 匹配 "分配给:username" 或 "分配给: username" 等格式
        let formattedDesc = operationDesc;

        // 遍历用户列表，替换所有可能的用户名
        userList.forEach(user => {
            const username = user.username || user.id;
            const realName = user.realName || user.username || user.id;
            
            if (username && realName && username !== realName) {
                // 替换 "分配给:username" 格式
                const pattern1 = new RegExp(`分配给:${username}`, 'g');
                formattedDesc = formattedDesc.replace(pattern1, `分配给:${realName}`);
                
                // 替换 "分配给: username" 格式（带空格）
                const pattern2 = new RegExp(`分配给: ${username}`, 'g');
                formattedDesc = formattedDesc.replace(pattern2, `分配给: ${realName}`);
                
                // 替换其他可能的用户名出现位置（如单独出现的用户名）
                // 只在特定上下文中替换，避免误替换
                const pattern3 = new RegExp(`(,|，)${username}(,|，|$)`, 'g');
                formattedDesc = formattedDesc.replace(pattern3, `$1${realName}$2`);
            }
        });

        return formattedDesc;
    };

    /**
     * 将操作类型转换为中文
     */
    const getOperationTypeText = (operationType) => {
        const typeMap = {
            'create_process': '创建处理流程',
            'update_status': '更新处理状态',
            'add_step': '添加处理步骤',
            'complete_step': '完成处理步骤',
            'update_ai_analysis': '更新AI分析',
            'claim': '认领告警',
            'assign': '分配处理人',
            'close': '关闭告警',
            'reopen': '重新打开',
            'add_note': '添加备注',
            'update_note': '更新备注',
            'delete_note': '删除备注',
        };
        return typeMap[operationType] || operationType || '未知操作';
    };

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <span>处理流程详情</span>
                        {processDetail && (
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => setStatusModalVisible(true)}
                                style={{ padding: 0 }}
                            >
                                更新状态
                            </Button>
                        )}
                    </Space>
                }
                placement="right"
                onClose={onClose}
                open={visible}
                width={800}
                styles={{
                    body: { padding: '16px' },
                }}
            >
                <Spin spinning={loading}>
                    {processDetail ? (
                        <>
                            {/* 基本信息 */}
                            <Descriptions
                                bordered
                                column={1}
                                style={{ marginBottom: '24px' }}
                                labelStyle={{ width: '120px' }}
                                items={[
                                    {
                                        key: 'id',
                                        label: '流程ID',
                                        children: <Text copyable={{ text: processDetail.id }}>{processDetail.id}</Text>,
                                    },
                                    {
                                        key: 'eventId',
                                        label: '告警事件ID',
                                        children: <Text copyable={{ text: processDetail.eventId }}>{processDetail.eventId}</Text>,
                                    },
                                    {
                                        key: 'faultCenterId',
                                        label: '故障中心',
                                        children: (() => {
                                            const center = faultCenterList.find(c => c.id === processDetail.faultCenterId);
                                            return center ? center.name : processDetail.faultCenterId || '-';
                                        })(),
                                    },
                                    {
                                        key: 'currentStatus',
                                        label: '当前状态',
                                        children: formatStatus(processDetail.currentStatus),
                                    },
                                    {
                                        key: 'assignedUser',
                                        label: '分配处理人',
                                        children: getUserDisplayName(processDetail.assignedUser),
                                    },
                                    {
                                        key: 'startTime',
                                        label: '开始时间',
                                        children: processDetail.startTime ? new Date(processDetail.startTime * 1000).toLocaleString('zh-CN') : '-',
                                    },
                                    {
                                        key: 'endTime',
                                        label: '结束时间',
                                        children: processDetail.endTime ? new Date(processDetail.endTime * 1000).toLocaleString('zh-CN') : '-',
                                    },
                                    {
                                        key: 'totalDuration',
                                        label: '处理时长',
                                        children: formatDuration(processDetail.totalDuration || (processDetail.startTime ? (processDetail.endTime || Math.floor(Date.now() / 1000)) - processDetail.startTime : 0)),
                                    },
                                ]}
                            />

                            {/* 处理步骤 */}
                            <div style={{ marginBottom: '24px', position: 'relative' }}>
                                <Divider orientation="left">
                                    <span>处理步骤</span>
                                </Divider>
                                {/* 添加步骤按钮 - 固定在右上角 */}
                                <div style={{ position: 'absolute', top: '0', right: '0' }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={handleOpenAddStepModal}
                                    >
                                        添加步骤
                                    </Button>
                                </div>
                                {processDetail.processSteps && Array.isArray(processDetail.processSteps) && processDetail.processSteps.length > 0 ? (
                                    <Timeline
                                        items={processDetail.processSteps.map((step) => ({
                                            color: step.isCompleted ? 'green' : 'blue',
                                            children: (
                                                <div style={{ position: 'relative', paddingRight: '100px' }}>
                                                    <div style={{ marginBottom: '8px' }}>
                                                        <Text strong>{step.stepName}</Text>
                                                        <Tag color={step.isCompleted ? 'success' : 'processing'} style={{ marginLeft: '8px' }}>
                                                            {step.isCompleted ? '已完成' : '进行中'}
                                                        </Tag>
                                                        {formatStatus(step.status)}
                                                    </div>
                                                    {step.description && (
                                                        <div style={{ color: '#666', marginBottom: '4px' }}>
                                                            {step.description}
                                                        </div>
                                                    )}
                                                    {step.assignedUser && (
                                                        <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
                                                            执行人: {getUserDisplayName(step.assignedUser)}
                                                        </div>
                                                    )}
                                                    {step.notes && (
                                                        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                                                            备注: {step.notes}
                                                        </div>
                                                    )}
                                                    <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                                                        {step.startTime && `开始: ${new Date(step.startTime * 1000).toLocaleString('zh-CN')}`}
                                                        {step.endTime && ` | 结束: ${new Date(step.endTime * 1000).toLocaleString('zh-CN')}`}
                                                        {step.duration && ` | 耗时: ${formatDuration(step.duration)}`}
                                                    </div>
                                                    {/* 完成步骤按钮 - 固定在右侧 */}
                                                    {!step.isCompleted && (
                                                        <div style={{ 
                                                            position: 'absolute', 
                                                            top: '0', 
                                                            right: '0',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            <Button
                                                                type="primary"
                                                                size="small"
                                                                onClick={() => handleOpenCompleteStepModal(step)}
                                                            >
                                                                完成步骤
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ),
                                        }))}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                        暂无处理步骤
                                    </div>
                                )}
                            </div>

                            {/* 操作日志 */}
                            {operationLogs.length > 0 && (
                                <>
                                    <Divider orientation="left">操作日志</Divider>
                                    <Timeline
                                        items={operationLogs.map((log) => ({
                                            color: 'gray',
                                            children: (
                                                <div>
                                                    <div style={{ marginBottom: '4px' }}>
                                                        <Text strong>{formatOperationDesc(log.operationDesc) || getOperationTypeText(log.operationType)}</Text>
                                                        {log.operationType && (
                                                            <Tag style={{ marginLeft: '8px' }}>{getOperationTypeText(log.operationType)}</Tag>
                                                        )}
                                                    </div>
                                                    {(log.operatorName || log.operator) && (
                                                        <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
                                                            操作人: {getOperatorDisplayName(log)}
                                                        </div>
                                                    )}
                                                    <div style={{ color: '#999', fontSize: '12px' }}>
                                                        {log.operationTime && new Date(log.operationTime * 1000).toLocaleString('zh-CN')}
                                                    </div>

                                                </div>
                                            ),
                                        }))}
                                    />
                                </>
                            )}
                        </>
                    ) : (
                        <Empty description="暂无详情数据" />
                    )}
                </Spin>
            </Drawer>

            {/* 状态更新模态框 */}
            {processDetail && (
                <StatusUpdateModal
                    visible={statusModalVisible}
                    onCancel={() => setStatusModalVisible(false)}
                    onSuccess={handleStatusUpdateSuccess}
                    currentStatus={processDetail.currentStatus}
                    eventId={processDetail.eventId}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}

            {/* 完成步骤模态框 */}
            {selectedStep && processDetail && (
                <CompleteStepModal
                    visible={completeStepModalVisible}
                    onCancel={() => {
                        setCompleteStepModalVisible(false);
                        setSelectedStep(null);
                    }}
                    onSuccess={handleCompleteStepSuccess}
                    stepName={selectedStep.stepName}
                    eventId={processDetail.eventId}
                    onCompleteStep={handleCompleteStep}
                />
            )}

            {/* 添加步骤模态框 */}
            {processDetail && (
                <AddStepModal
                    visible={addStepModalVisible}
                    onCancel={() => {
                        setAddStepModalVisible(false);
                    }}
                    onSuccess={handleAddStepSuccess}
                    eventId={processDetail.eventId}
                    userList={userList}
                    onAddStep={handleAddStep}
                />
            )}
        </>
    );
};

/**
 * 创建表格列定义
 */
export const createTableColumns = (faultCenterList, userList, handleViewDetail) => [
    {
        title: '规则名称',
        dataIndex: 'eventId',
        key: 'eventId',
        width: 250,
        ellipsis: true,
        render: (eventId, record) => {
            // 使用后端返回的 ruleName
            const ruleName = record.ruleName || null;
            if (ruleName) {
                return (
                    <div>
                        <div 
                            style={{ 
                                fontWeight: 500, 
                                marginBottom: '4px',
                                cursor: 'pointer',
                                color: '#1890ff',
                                transition: 'color 0.3s'
                            }}
                            onClick={() => handleViewDetail(record)}
                            onMouseEnter={(e) => e.target.style.color = '#40a9ff'}
                            onMouseLeave={(e) => e.target.style.color = '#1890ff'}
                        >
                            {ruleName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                            <Text copyable={{ text: eventId }} style={{ fontSize: '12px' }}>
                                {eventId}
                            </Text>
                        </div>
                    </div>
                );
            }
            // 如果没有规则名称，显示事件ID（可复制，可点击）
            return (
                <Text 
                    copyable={{ text: eventId }}
                    style={{ 
                        cursor: 'pointer',
                        color: '#1890ff'
                    }}
                    onClick={() => handleViewDetail(record)}
                >
                    {eventId || '-'}
                </Text>
            );
        },
    },
    {
        title: '故障中心',
        dataIndex: 'faultCenterId',
        key: 'faultCenterId',
        width: 150,
        render: (faultCenterId) => {
            const center = faultCenterList.find(c => c.id === faultCenterId);
            return center ? center.name : faultCenterId || '-';
        },
    },
    {
        title: '当前状态',
        dataIndex: 'currentStatus',
        key: 'currentStatus',
        width: 120,
        render: formatStatus,
    },
    {
        title: '分配处理人',
        dataIndex: 'assignedUser',
        key: 'assignedUser',
        width: 120,
        render: (username) => {
            if (!username) return '-';
            // 根据用户名查找用户的真实姓名
            const user = userList.find(u => u.username === username || u.id === username);
            return user?.realName || user?.username || username;
        },
    },
    {
        title: '处理步骤',
        dataIndex: 'processSteps',
        key: 'processSteps',
        width: 100,
        render: (steps) => {
            if (!Array.isArray(steps)) return '0';
            const completed = steps.filter(s => s.isCompleted).length;
            return `${completed}/${steps.length}`;
        },
    },
    {
        title: '开始时间',
        dataIndex: 'startTime',
        key: 'startTime',
        width: 180,
        render: (time) => {
            if (!time) return '-';
            const date = new Date(time * 1000);
            return date.toLocaleString('zh-CN');
        },
    },
    {
        title: '结束时间',
        dataIndex: 'endTime',
        key: 'endTime',
        width: 180,
        render: (time) => {
            if (!time) return '-';
            const date = new Date(time * 1000);
            return date.toLocaleString('zh-CN');
        },
    },
    {
        title: '处理时长',
        dataIndex: 'totalDuration',
        key: 'totalDuration',
        width: 120,
        render: (duration, record) => {
            // 如果没有totalDuration，计算一下
            if (!duration && record.startTime) {
                const endTime = record.endTime || Math.floor(Date.now() / 1000);
                duration = endTime - record.startTime;
            }
            return formatDuration(duration);
        },
    },
];


