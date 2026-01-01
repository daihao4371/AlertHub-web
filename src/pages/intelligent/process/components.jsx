import React, { useState } from 'react';
import { 
    Input, Select, Space, Button, Modal, Form, Drawer, 
    Spin, Timeline, Divider, Tag, Empty, Typography, Card, Row, Col, Statistic
} from 'antd';
import { 
    ReloadOutlined, SearchOutlined, EditOutlined,
    CheckCircleOutlined, ClockCircleOutlined, SyncOutlined,
    WarningOutlined, PlayCircleOutlined, CheckOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useProcessStatus } from './hooks';
import './index.css';

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

// ==================== 工具函数 ====================

/**
 * 格式化处理状态 - 参考exporterMonitor的样式
 */
export const formatStatus = (status) => {
    const statusMap = {
        detected: { 
            text: '已检测', 
            icon: <CheckCircleOutlined />,
            className: 'process-status-tag process-status-tag-detected'
        },
        analyzing: { 
            text: '分析中', 
            icon: <SyncOutlined spin />,
            className: 'process-status-tag process-status-tag-analyzing'
        },
        correlated: { 
            text: '关联分析', 
            icon: <WarningOutlined />,
            className: 'process-status-tag process-status-tag-correlated'
        },
        processing: { 
            text: '处理中', 
            icon: <PlayCircleOutlined />,
            className: 'process-status-tag process-status-tag-processing'
        },
        validated: { 
            text: '验证中', 
            icon: <ClockCircleOutlined />,
            className: 'process-status-tag process-status-tag-validated'
        },
        completed: { 
            text: '已完成', 
            icon: <CheckOutlined />,
            className: 'process-status-tag process-status-tag-completed'
        },
    };
    
    const statusInfo = statusMap[status] || { 
        text: status, 
        icon: null,
        className: 'process-status-tag' 
    };
    
    return (
        <Tag 
            icon={statusInfo.icon}
            className={statusInfo.className}
        >
            {statusInfo.text}
        </Tag>
    );
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
    userList,
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
            
            setLoading(true);
            const success = await onUpdateStatus(eventId, values, currentStatus);
            
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
            width="90%"
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ 
                    status: currentStatus,
                    description: '',
                    assignedUser: '',
                }}
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

                <Form.Item
                    name="description"
                    label="步骤描述"
                    rules={[{ max: 500, message: '步骤描述不能超过500个字符' }]}
                >
                    <TextArea
                        placeholder="请输入步骤描述（可选）"
                        rows={4}
                        maxLength={500}
                        showCount
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
                        style={{ width: '100%' }}
                    >
                        {userList?.map(user => (
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
    onStatisticsRefresh,
    onListRefresh,
}) => {
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const { handleUpdateStatus } = useProcessStatus();

    /**
     * 处理操作成功后的刷新
     */
    const handleOperationSuccess = () => {
        // 刷新详情数据
        if (processDetail?.eventId && onRefresh) {
            onRefresh(processDetail.eventId);
        }
        // 刷新统计数据（图表）
        if (onStatisticsRefresh) {
            onStatisticsRefresh();
        }
        // 刷新列表数据（表格）
        if (onListRefresh) {
            onListRefresh();
        }
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
     * 例如："分配给:admin" -> "分配给:超管"
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
                width="90%"
                styles={{
                    body: { padding: '16px' },
                }}
            >
                <Spin spinning={loading}>
                    {processDetail ? (
                        <>
                            {/* 操作日志 */}
                            {operationLogs.length > 0 && (
                                <>
                                    <Divider orientation="left">操作日志</Divider>
                                    <Timeline
                                        items={operationLogs.map((log) => {
                                            // 格式化时间戳为 HH:mm:ss 格式
                                            const formatTime = (timestamp) => {
                                                if (!timestamp) return '';
                                                const date = new Date(timestamp * 1000);
                                                const hours = String(date.getHours()).padStart(2, '0');
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                const seconds = String(date.getSeconds()).padStart(2, '0');
                                                return `${hours}:${minutes}:${seconds}`;
                                            };

                                            // 获取操作描述文本
                                            const description = formatOperationDesc(log.operationDesc) || getOperationTypeText(log.operationType);
                                            
                                            // 获取操作人显示名称
                                            const operatorName = getOperatorDisplayName(log);

                                            return {
                                                color: 'blue',
                                                children: (
                                                    <div>
                                                        {/* 时间戳 */}
                                                        <div style={{ 
                                                            color: '#666', 
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            marginBottom: '8px',
                                                        }}>
                                                            {formatTime(log.operationTime)}
                                                        </div>
                                                        {/* 操作描述 */}
                                                        <div style={{ 
                                                            marginBottom: operatorName && operatorName !== '-' ? '4px' : '0',
                                                            lineHeight: '1.6',
                                                        }}>
                                                            <Text style={{ 
                                                                fontSize: '14px',
                                                                color: '#333',
                                                            }}>
                                                                {description}
                                                            </Text>
                                                        </div>
                                                        {/* 操作人 */}
                                                        {operatorName && operatorName !== '-' && (
                                                            <div style={{ 
                                                                color: '#999', 
                                                                fontSize: '12px',
                                                                marginTop: '4px',
                                                            }}>
                                                                {operatorName}
                                                            </div>
                                                        )}
                                                    </div>
                                                ),
                                            };
                                        })}
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
                    onCancel={() => {
                        setStatusModalVisible(false);
                    }}
                    onSuccess={handleOperationSuccess}
                    currentStatus={processDetail.currentStatus}
                    eventId={processDetail.eventId}
                    userList={userList}
                    onUpdateStatus={handleUpdateStatus}
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

// ==================== 统计图表组件 ====================

/**
 * 状态映射配置 - 用于将后端状态值转换为中文显示
 */
const STATUS_MAP = {
    detected: { text: '已检测', color: '#1890ff' },        // 蓝色
    analyzing: { text: '分析中', color: '#13c2c2' },       // 青色
    correlated: { text: '关联分析', color: '#faad14' },   // 橙色
    processing: { text: '处理中', color: '#fa8c16' },     // 橙红色
    validated: { text: '验证中', color: '#2db7f5' },       // 天蓝色（避免与已完成重复）
    completed: { text: '已完成', color: '#52c41a' },       // 绿色
};

/**
 * 流程统计图表组件
 * @param {Object} props - 组件属性
 * @param {Object} props.statistics - 统计数据对象
 * @param {number} props.statistics.totalCount - 总处理流程数
 * @param {number} props.statistics.completedCount - 已完成流程数
 * @param {number} props.statistics.avgDuration - 平均处理时长（秒）
 * @param {Array} props.statistics.statusDistribution - 状态分布数组，每个元素包含 current_status 和 count
 * @param {boolean} props.loading - 加载状态
 */
export const ProcessStatisticsChart = ({ statistics, loading }) => {
    if (loading) {
        return (
            <Card>
                <Spin spinning={loading} />
            </Card>
        );
    }

    if (!statistics) {
        return (
            <Card>
                <Empty description="暂无统计数据" />
            </Card>
        );
    }

    // 获取所有状态的数据，确保所有状态都显示（即使数量为0）
    const getAllStatusData = () => {
        // 创建状态计数的映射
        const statusCountMap = {};
        (statistics.statusDistribution || []).forEach(item => {
            statusCountMap[item.current_status] = item.count || 0;
        });

        // 确保所有状态都包含在数据中
        return Object.keys(STATUS_MAP).map(statusKey => {
            const statusInfo = STATUS_MAP[statusKey];
            return {
                name: statusInfo.text,
                value: statusCountMap[statusKey] || 0,
                count: statusCountMap[statusKey] || 0,
                status: statusKey,
                fill: statusInfo.color,
            };
        });
    };

    // 处理状态分布数据，转换为图表需要的格式（包含所有状态）
    const allStatusData = getAllStatusData();
    const pieChartData = allStatusData.map(item => ({
        name: item.name,
        value: item.value,
        status: item.status,
    }));

    // 处理柱状图数据（状态分布，包含所有状态）
    const barChartData = allStatusData.map(item => ({
        name: item.name,
        count: item.count,
        status: item.status,
        fill: item.fill,
    }));

    // 计算完成率
    const completionRate = statistics.totalCount > 0 
        ? ((statistics.completedCount / statistics.totalCount) * 100).toFixed(1)
        : 0;

    return (
        <div style={{ marginBottom: 24 }}>
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="总处理流程数"
                            value={statistics.totalCount || 0}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="已完成流程数"
                            value={statistics.completedCount || 0}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="完成率"
                            value={completionRate}
                            suffix="%"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="平均处理时长"
                            value={formatDuration(Math.round(statistics.avgDuration || 0))}
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 图表区域 */}
            <Row gutter={16}>
                {/* 状态分布饼图 */}
                <Col span={12}>
                    <Card title="状态分布（环形图）" style={{ height: 400 }}>
                        {pieChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={{
                                            strokeWidth: 1,
                                            stroke: '#999',
                                            strokeDasharray: '0',
                                            strokeOpacity: 0.6,
                                        }}
                                        label={({ name, value, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                                            // 只显示有数据的标签
                                            if (value === 0) return null;
                                            
                                            // 计算标签位置（在扇区外部，使用引导线）
                                            const RADIAN = Math.PI / 180;
                                            // 标签位置在扇区外部，距离外圈一定距离
                                            const radius = outerRadius + 25;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            
                                            // 如果扇区太小（小于3%），不显示标签避免重叠
                                            if (percent < 0.03) return null;
                                            
                                            // 判断标签在左侧还是右侧
                                            const isRight = x > cx;
                                            
                                            return (
                                                <g>
                                                    {/* 状态名称 */}
                                                    <text
                                                        x={x}
                                                        y={y - 8}
                                                        fill="#333"
                                                        textAnchor={isRight ? 'start' : 'end'}
                                                        dominantBaseline="central"
                                                        fontSize={12}
                                                        fontWeight="500"
                                                    >
                                                        {name}
                                                    </text>
                                                    {/* 百分比 */}
                                                    <text
                                                        x={x}
                                                        y={y + 8}
                                                        fill="#666"
                                                        textAnchor={isRight ? 'start' : 'end'}
                                                        dominantBaseline="central"
                                                        fontSize={11}
                                                        fontWeight="400"
                                                    >
                                                        {`${(percent * 100).toFixed(1)}%`}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                        outerRadius={100}
                                        innerRadius={40}
                                        fill="#8884d8"
                                        dataKey="value"
                                        paddingAngle={2}
                                    >
                                        {pieChartData.map((entry, index) => {
                                            const statusInfo = STATUS_MAP[entry.status] || { color: '#8c8c8c' };
                                            return (
                                                <Cell key={`cell-${index}`} fill={statusInfo.color} />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
                                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                            return [`${value} (${percent}%)`, name];
                                        }}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e8e8e8',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                        }}
                                        labelStyle={{
                                            fontWeight: 'bold',
                                            marginBottom: '4px',
                                        }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={60}
                                        iconType="circle"
                                        wrapperStyle={{
                                            paddingTop: '16px',
                                        }}
                                        formatter={(value, entry) => {
                                            const data = pieChartData.find(item => item.name === value);
                                            const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
                                            const percent = total > 0 && data ? ((data.value / total) * 100).toFixed(1) : 0;
                                            return `${value}: ${data?.value || 0} (${percent}%)`;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty description="暂无状态分布数据" />
                        )}
                    </Card>
                </Col>

                {/* 状态分布柱状图 */}
                <Col span={12}>
                    <Card title="状态分布（柱状图）" style={{ height: 400 }}>
                        {barChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 12 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12 }}
                                        label={{ value: '数量', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            const total = barChartData.reduce((sum, item) => sum + item.count, 0);
                                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                            return [`${value} (${percent}%)`, '数量'];
                                        }}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e8e8e8',
                                            borderRadius: '4px',
                                        }}
                                    />
                                    <Bar 
                                        dataKey="count" 
                                        radius={[4, 4, 0, 0]}
                                        label={{ 
                                            position: 'top',
                                            formatter: (value) => value > 0 ? value : ''
                                        }}
                                    >
                                        {barChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty description="暂无状态分布数据" />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};


