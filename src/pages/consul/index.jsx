import { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Input,
    Select,
    Space,
    Tag,
    Card,
    Row,
    Col,
    Statistic,
    Drawer,
    Descriptions,
    Popconfirm,
    message,
    Alert,
    Tooltip,
    Tabs,
    Form,
    Modal,
    InputNumber,
} from 'antd';
import {
    SyncOutlined,
    SearchOutlined,
    ReloadOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    StopOutlined,
    ExclamationCircleOutlined,
    HistoryOutlined,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import {
    GetConsulTargets,
    SyncConsulTargets,
    GetConsulTargetById,
    RegisterConsulTarget,
    DeregisterConsulTarget,
    GetConsulTargetsByTag,
    GetConsulTargetsByJobAndTag,
    UpdateConsulTargetTags,
} from '../../api/consul';
import { OfflineLogs } from './OfflineLogs';
import './index.css';

const { Search } = Input;
const { Option } = Select;

// 常量定义
const EMPTY_STATE_STYLE = { textAlign: 'center', padding: '40px' };

/**
 * Consul 服务发现管理页面
 * 提供目标列表、搜索、同步、详情查看、注销等功能
 */
export const Consul = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    
    // 搜索和过滤条件
    const [keyword, setKeyword] = useState('');
    const [jobFilter, setJobFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [tagFilter, setTagFilter] = useState(''); // 标签过滤
    
    // 统计信息
    const [summary, setSummary] = useState({
        totalCount: 0,
        upCount: 0,
        downCount: 0,
        availabilityRate: 0,
    });
    
    // 详情模态框
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 编辑标签相关状态
    const [editTagsMode, setEditTagsMode] = useState(false); // 是否处于编辑标签模式
    const [editTagsForm] = Form.useForm();
    const [editTagsLoading, setEditTagsLoading] = useState(false);

    // 标签页状态
    const [activeTab, setActiveTab] = useState('targets');
    
    // 注册服务相关状态
    const [registerVisible, setRegisterVisible] = useState(false);
    const [registerForm] = Form.useForm();
    const [registerLoading, setRegisterLoading] = useState(false);

    // 获取目标列表
    const fetchTargets = async (page, size) => {
        setLoading(true);
        try {
            let res;
            
            // 如果同时使用标签过滤和状态过滤，需要获取所有数据再过滤
            const needClientFilter = statusFilter && (tagFilter || (jobFilter && tagFilter));
            
            // 优先级：同时选择 Job 和标签 > 只选择标签 > 普通查询
            if (jobFilter && tagFilter) {
                // 如果需要客户端过滤，获取所有数据（使用大页面大小）
                const fetchSize = needClientFilter ? 10000 : size;
                res = await GetConsulTargetsByJobAndTag({
                    index: 1,
                    size: fetchSize,
                    job: jobFilter,
                    keyword: tagFilter,
                });
            } else if (tagFilter) {
                // 如果需要客户端过滤，获取所有数据（使用大页面大小）
                const fetchSize = needClientFilter ? 10000 : size;
                res = await GetConsulTargetsByTag({
                    index: 1,
                    size: fetchSize,
                    job: tagFilter,
                });
            } else {
                // 普通查询，后端支持状态过滤
                res = await GetConsulTargets({
                    index: page,
                    size: size,
                    ...(keyword && { keyword }),
                    ...(jobFilter && { job: jobFilter }),
                    ...(statusFilter && { status: statusFilter }),
                });
            }
            
            if (res.code === 200 && res.data) {
                let listData = res.data.list;
                listData = Array.isArray(listData) ? listData : [];
                
                // 如果需要在客户端进行状态过滤
                if (needClientFilter) {
                    const filteredData = listData.filter(item => item.status === statusFilter);
                    // 客户端分页
                    const startIndex = (page - 1) * size;
                    const endIndex = startIndex + size;
                    const paginatedData = filteredData.slice(startIndex, endIndex);
                    setList(paginatedData);
                    setTotal(filteredData.length);
                } else {
                    setList(listData);
                    setTotal(res.data.total || 0);
                }
                
                if (res.data.summary) {
                    setSummary(res.data.summary);
                }
            } else {
                message.error(res.msg || '获取目标列表失败');
            }
        } catch (error) {
            console.error('获取目标列表失败:', error);
            message.error('获取目标列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 同步目标
    const handleSync = async () => {
        setSyncLoading(true);
        try {
            const res = await SyncConsulTargets({});
            if (res.code === 200) {
                message.success('同步成功');
                // 同步后刷新列表
                fetchTargets(currentPage, pageSize);
            }
        } catch (error) {
            console.error('同步失败:', error);
        } finally {
            setSyncLoading(false);
        }
    };

    // 查看详情
    const handleViewDetail = async (record) => {
        setDetailVisible(true);
        setDetailLoading(true);
        setEditTagsMode(false); // 重置编辑模式
        try {
            const res = await GetConsulTargetById({ id: record.id });
            if (res.code === 200 && res.data) {
                setDetailData(res.data);
            } else {
                message.error('获取详情失败');
            }
        } catch (error) {
            console.error('获取详情失败:', error);
            message.error('获取详情失败');
        } finally {
            setDetailLoading(false);
        }
    };

    // 注销目标
    const handleDeregister = async (record) => {
        try {
            const res = await DeregisterConsulTarget({
                id: record.id,
                reason: '手动注销',
            });
            if (res.code === 200) {
                message.success('目标已注销');
                // 刷新列表
                fetchTargets(currentPage, pageSize);
            }
        } catch (error) {
            console.error('注销失败:', error);
        }
    };

    // 打开编辑标签（复用查看详情的逻辑）
    const handleOpenEditTags = async (record) => {
        await handleViewDetail(record);
        setEditTagsMode(true);
    };

    // 保存标签
    const handleSaveTags = async () => {
        try {
            const values = await editTagsForm.validateFields();
            if (!detailData || !detailData.id) {
                message.error('目标信息不存在');
                return;
            }

            // 将表单的键值对数组转换为标签对象
            const labelsObj = {};
            if (values.labels && Array.isArray(values.labels)) {
                values.labels.forEach((item) => {
                    if (item.key && item.value) {
                        labelsObj[item.key] = item.value;
                    }
                });
            }

            setEditTagsLoading(true);
            const res = await UpdateConsulTargetTags({
                id: detailData.id,
                labels: labelsObj,
            });

            if (res.code === 200) {
                message.success('标签更新成功');
                setEditTagsMode(false);
                editTagsForm.resetFields();
                
                // 刷新详情数据
                const refreshRes = await GetConsulTargetById({ id: detailData.id });
                if (refreshRes.code === 200 && refreshRes.data) {
                    setDetailData(refreshRes.data);
                }
                
                // 刷新列表
                fetchTargets(currentPage, pageSize);
            }
        } catch (error) {
            if (error.errorFields) {
                // 表单验证错误
                return;
            }
            console.error('更新标签失败:', error);
            message.error('更新标签失败');
        } finally {
            setEditTagsLoading(false);
        }
    };

    // 通用过滤处理函数
    const handleFilterChange = (setter) => (value) => {
        setter(value);
        setCurrentPage(1);
    };

    // 搜索和过滤处理
    const handleSearch = handleFilterChange(setKeyword);
    const handleStatusFilter = handleFilterChange(setStatusFilter);
    const handleJobFilter = handleFilterChange(setJobFilter);
    const handleTagFilter = handleFilterChange(setTagFilter);

    // 重置过滤
    const handleReset = () => {
        setKeyword('');
        setJobFilter('');
        setStatusFilter('');
        setTagFilter('');
        setCurrentPage(1);
    };

    // 打开注册服务弹窗
    const handleOpenRegister = () => {
        registerForm.resetFields();
        registerForm.setFieldsValue({
            tags: [],
            labels: [],
        });
        setRegisterVisible(true);
    };

    // 保存注册服务
    const handleSaveRegister = async () => {
        try {
            const values = await registerForm.validateFields();
            
            // 将表单的标签键值对数组转换为对象
            const labelsObj = {};
            if (values.labels && Array.isArray(values.labels)) {
                values.labels.forEach((item) => {
                    if (item.key && item.value) {
                        labelsObj[item.key] = item.value;
                    }
                });
            }

            setRegisterLoading(true);
            const res = await RegisterConsulTarget({
                serviceId: values.serviceId,
                serviceName: values.serviceName,
                address: values.address,
                port: values.port,
                job: values.job || '',
                tags: values.tags || [],
                labels: labelsObj,
            });

            if (res.code === 200) {
                message.success('服务注册成功');
                setRegisterVisible(false);
                registerForm.resetFields();
                // 刷新列表
                fetchTargets(currentPage, pageSize);
            }
        } catch (error) {
            if (error.errorFields) {
                // 表单验证错误
                return;
            }
            console.error('注册服务失败:', error);
        } finally {
            setRegisterLoading(false);
        }
    };

    // 分页变化
    const handleTableChange = (page, size) => {
        setCurrentPage(page);
        setPageSize(size);
    };
    
    // 当过滤条件或分页变化时，重新获取数据
    useEffect(() => {
        fetchTargets(currentPage, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyword, jobFilter, statusFilter, tagFilter, currentPage, pageSize]);

    // 监听 detailData 和 editTagsMode 变化，自动初始化表单
    useEffect(() => {
        if (editTagsMode && detailData && detailData.labels && typeof detailData.labels === 'object') {
            // 将标签对象转换为表单格式（键值对数组）
            const labelsArray = Object.entries(detailData.labels).map(([key, value]) => ({
                key,
                value: String(value),
            }));
            editTagsForm.setFieldsValue({ labels: labelsArray });
        } else if (editTagsMode && (!detailData || !detailData.labels)) {
            // 如果没有标签，初始化为空数组
            editTagsForm.setFieldsValue({ labels: [] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editTagsMode, detailData]);

    // 状态配置映射
    const statusConfig = {
        passing: { icon: CheckCircleOutlined, text: 'Passing', className: 'exporter-status-tag exporter-status-tag-up' },
        critical: { icon: CloseCircleOutlined, text: 'Critical', className: 'exporter-status-tag exporter-status-tag-down' },
        'no checks': { icon: StopOutlined, text: 'No checks', className: 'exporter-status-tag exporter-status-tag-unknown' },
        warning: { icon: ExclamationCircleOutlined, text: 'Warning', className: 'exporter-status-tag exporter-status-tag-warning' },
    };

    // 状态标签渲染
    const renderStatus = (status) => {
        const config = statusConfig[status];
        if (config) {
            const Icon = config.icon;
            return (
                <Tag icon={<Icon />} className={config.className}>
                    {config.text}
                </Tag>
            );
        }
        // 未知状态格式化
        const formattedStatus = status 
            ? status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            : status;
        return <Tag className="exporter-status-tag">{formattedStatus}</Tag>;
    };

    // 标签渲染函数（可复用）
    const renderLabels = (labels, maxDisplay = Infinity) => {
        if (!labels || typeof labels !== 'object') {
            return '-';
        }
        const labelEntries = Object.entries(labels);
        if (labelEntries.length === 0) {
            return '-';
        }
        const displayEntries = labelEntries.slice(0, maxDisplay);
        const remaining = labelEntries.length - maxDisplay;
        return (
            <Space size={[0, 8]} wrap>
                {displayEntries.map(([key, value]) => (
                    <Tag key={key} size="small">
                        {key}: {value}
                    </Tag>
                ))}
                {remaining > 0 && <Tag size="small">+{remaining}</Tag>}
            </Space>
        );
    };

    // 表格列定义
    const columns = [
        {
            title: '实例地址',
            dataIndex: 'instance',
            key: 'instance',
            width: 180,
            ellipsis: true,
            render: (text, record) => (
                <Tooltip title="点击查看详情">
                    <span 
                        style={{ color: '#1890ff', cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(record);
                        }}
                    >
                        {text}
                    </span>
                </Tooltip>
            ),
        },
        {
            title: 'Job',
            dataIndex: 'job',
            key: 'job',
            width: 180,
            ellipsis: true,
        },
        {
            title: '服务名称',
            dataIndex: 'serviceName',
            key: 'serviceName',
            width: 180,
            ellipsis: true,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: renderStatus,
        },
        {
            title: '标签',
            dataIndex: 'labels',
            key: 'labels',
            width: 300,
            ellipsis: true,
            render: (labels) => renderLabels(labels, 3),
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTags(record);
                        }}
                        disabled={record.consulDeregistered}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定要注销此目标吗？"
                        description="注销后该目标将不再被监控"
                        onConfirm={() => handleDeregister(record)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={record.consulDeregistered}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // 获取唯一的 Job 列表（用于过滤）
    const uniqueJobs = Array.from(new Set(list.map(item => item.job).filter(Boolean)));
    
    // 从列表中提取所有标签键，用于标签过滤下拉框
    // 注意：这里提取的是标签的键（key），不是值（value）
    const uniqueTagKeys = Array.from(
        new Set(
            list
                .flatMap(item => {
                    if (item.labels && typeof item.labels === 'object') {
                        return Object.keys(item.labels);
                    }
                    return [];
                })
                .filter(Boolean)
        )
    ).sort();
    
    // 从列表中提取所有标签值（tags数组），用于注册服务时的标签列表下拉选项
    const uniqueTags = Array.from(
        new Set(
            list
                .flatMap(item => {
                    if (item.labels && typeof item.labels === 'object' && item.labels.tags) {
                        // tags 存储在 labels["tags"] 中，是一个数组
                        const tags = item.labels.tags;
                        if (Array.isArray(tags)) {
                            return tags.filter(tag => typeof tag === 'string' && tag.trim() !== '');
                        }
                    }
                    return [];
                })
        )
    ).sort();


    return (
        <div style={{ padding: '24px' }}>
            <Alert
                message="提示"
                description="Consul 配置已迁移至数据源管理。请先在数据源管理中配置类型为 'consul' 的数据源，然后才能使用目标管理功能。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'targets',
                        label: (
                            <span>
                                <CheckCircleOutlined /> 目标管理
                            </span>
                        ),
                        children: (
                            <>
                                {/* 统计卡片 */}
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic
                                                title="总目标数"
                                                value={summary.totalCount}
                                                valueStyle={{ color: '#1890ff' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic
                                                title="正常"
                                                value={summary.upCount}
                                                valueStyle={{ color: '#52c41a' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic
                                                title="异常"
                                                value={summary.downCount}
                                                valueStyle={{ color: '#ff4d4f' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic
                                                title="可用率"
                                                value={summary.availabilityRate}
                                                precision={2}
                                                suffix="%"
                                                valueStyle={{ color: summary.availabilityRate >= 95 ? '#52c41a' : '#faad14' }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                {/* 搜索和操作栏 */}
                                <Card style={{ marginBottom: 16 }}>
                                    <Space size="middle" wrap>
                                        <Search
                                            placeholder="搜索实例地址、Job、服务名称"
                                            allowClear
                                            style={{ width: 300 }}
                                            onSearch={handleSearch}
                                            enterButton={<SearchOutlined />}
                                        />
                                        <Select
                                            placeholder="按状态过滤"
                                            style={{ width: 120 }}
                                            allowClear
                                            value={statusFilter}
                                            onChange={handleStatusFilter}
                                        >
                                            <Option value="passing">Passing</Option>
                                            <Option value="warning">Warning</Option>
                                            <Option value="critical">Critical</Option>
                                            <Option value="no checks">No checks</Option>
                                        </Select>
                                        <Select
                                            placeholder="按 Job 过滤"
                                            style={{ width: 200 }}
                                            allowClear
                                            value={jobFilter}
                                            onChange={handleJobFilter}
                                            showSearch
                                            filterOption={(input, option) =>
                                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                            }
                                        >
                                            {uniqueJobs.map(job => (
                                                <Option key={job} value={job}>{job}</Option>
                                            ))}
                                        </Select>
                                        <Select
                                            placeholder="按标签过滤"
                                            style={{ width: 200 }}
                                            allowClear
                                            value={tagFilter}
                                            onChange={handleTagFilter}
                                            showSearch
                                            filterOption={(input, option) =>
                                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                            }
                                        >
                                            {uniqueTagKeys.map(tagKey => (
                                                <Option key={tagKey} value={tagKey}>{tagKey}</Option>
                                            ))}
                                        </Select>
                                        <Button
                                            icon={<ReloadOutlined />}
                                            onClick={handleReset}
                                        >
                                            重置
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={handleOpenRegister}
                                        >
                                            注册服务
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<SyncOutlined />}
                                            loading={syncLoading}
                                            onClick={handleSync}
                                        >
                                            同步目标
                                        </Button>
                                    </Space>
                                </Card>

                                {/* 目标列表表格 */}
                                <div
                                    style={{
                                        overflowX: 'auto',
                                        marginTop: 10,
                                        borderRadius: 6,
                                    }}
                                >
                                    <Table
                                        columns={columns}
                                        dataSource={list}
                                        rowKey="id"
                                        loading={loading}
                                        pagination={{
                                            current: currentPage,
                                            pageSize: pageSize,
                                            total: total,
                                            showTotal: (total) => `共 ${total} 条`,
                                            pageSizeOptions: ['10', '20', '50', '100'],
                                            showSizeChanger: true,
                                            showQuickJumper: true,
                                            onChange: handleTableChange,
                                            onShowSizeChange: handleTableChange,
                                            size: 'small',
                                        }}
                                        scroll={{ x: 'max-content' }}
                                        style={{
                                            backgroundColor: '#fff',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                        }}
                                    />
                                </div>
                            </>
                        ),
                    },
                    {
                        key: 'offline-logs',
                        label: (
                            <span>
                                <HistoryOutlined /> 注销记录
                            </span>
                        ),
                        children: (
                            <OfflineLogs 
                                activeTab={activeTab}
                                onRefreshTargets={() => fetchTargets(currentPage, pageSize)}
                            />
                        ),
                    },
                ]}
            />

            {/* 目标详情抽屉 */}
            <Drawer
                title="目标详情"
                placement="right"
                onClose={() => {
                    setDetailVisible(false);
                    setEditTagsMode(false);
                    editTagsForm.resetFields();
                }}
                open={detailVisible}
                width="50%"
                height="100vh"
                bodyStyle={{ padding: '24px', height: 'calc(100vh - 55px)', overflow: 'auto' }}
                footer={
                    editTagsMode ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 24px',
                            minHeight: '60px'
                        }}>
                            <Button
                                onClick={() => {
                                    setEditTagsMode(false);
                                    editTagsForm.resetFields();
                                }}
                            >
                                取消
                            </Button>
                            <Button
                                type="primary"
                                onClick={handleSaveTags}
                                loading={editTagsLoading}
                            >
                                保存
                            </Button>
                        </div>
                    ) : null
                }
            >
                {detailLoading ? (
                    <div style={EMPTY_STATE_STYLE}>加载中...</div>
                ) : detailData ? (
                    <Descriptions column={2} bordered>
                        <Descriptions.Item label="ID">{detailData.id}</Descriptions.Item>
                        <Descriptions.Item label="状态">
                            {renderStatus(detailData.status)}
                        </Descriptions.Item>
                        <Descriptions.Item label="实例地址" span={2}>
                            {detailData.instance}
                        </Descriptions.Item>
                        <Descriptions.Item label="Job">{detailData.job || '-'}</Descriptions.Item>
                        <Descriptions.Item label="服务名称">{detailData.serviceName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="服务ID" span={2}>
                            {detailData.serviceId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Consul注销状态">
                            {detailData.consulDeregistered ? (
                                <Tag color="default">已注销</Tag>
                            ) : (
                                <Tag color="success">正常</Tag>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建时间">
                            {detailData.createdAt
                                ? new Date(detailData.createdAt).toLocaleString()
                                : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="标签" span={2}>
                            {editTagsMode ? (
                                // 编辑模式：显示编辑表单
                                <Form
                                    form={editTagsForm}
                                    layout="vertical"
                                    name="editTagsForm"
                                >
                                    <Form.List name="labels">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'key']}
                                                            rules={[{ required: true, message: '请输入标签键' }]}
                                                            style={{ marginBottom: 0 }}
                                                        >
                                                            <Input placeholder="标签键" style={{ width: 200 }} />
                                                        </Form.Item>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'value']}
                                                            rules={[{ required: true, message: '请输入标签值' }]}
                                                            style={{ marginBottom: 0 }}
                                                        >
                                                            <Input placeholder="标签值" style={{ width: 200 }} />
                                                        </Form.Item>
                                                        <Button
                                                            type="link"
                                                            danger
                                                            onClick={() => remove(name)}
                                                        >
                                                            删除
                                                        </Button>
                                                    </Space>
                                                ))}
                                                <Form.Item>
                                                    <Button type="dashed" onClick={() => add()} block icon={<span>+</span>}>
                                                        添加标签
                                                    </Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                </Form>
                            ) : (
                                // 查看模式：只显示标签
                                renderLabels(detailData.labels)
                            )}
                        </Descriptions.Item>
                    </Descriptions>
                ) : (
                    <div style={EMPTY_STATE_STYLE}>暂无数据</div>
                )}
            </Drawer>

            {/* 注册服务弹窗 */}
            <Modal
                title="注册服务到 Consul"
                open={registerVisible}
                onCancel={() => {
                    setRegisterVisible(false);
                    registerForm.resetFields();
                }}
                onOk={handleSaveRegister}
                confirmLoading={registerLoading}
                width={700}
                okText="注册"
                cancelText="取消"
            >
                <Form form={registerForm} layout="vertical">
                    <Form.Item
                        name="serviceId"
                        label="服务ID"
                        rules={[{ required: true, message: '请输入服务ID' }]}
                        tooltip="服务的唯一标识符，在 Consul 中必须唯一"
                    >
                        <Input placeholder="例如: node-exporter-192.168.1.100-9100" />
                    </Form.Item>
                    <Form.Item
                        name="serviceName"
                        label="服务名称"
                        rules={[{ required: true, message: '请输入服务名称' }]}
                    >
                        <Input placeholder="例如: node-exporter" />
                    </Form.Item>
                    <Form.Item
                        name="address"
                        label="服务地址"
                        rules={[{ required: true, message: '请输入服务地址' }]}
                    >
                        <Input placeholder="例如: 192.168.1.100" />
                    </Form.Item>
                    <Form.Item
                        name="port"
                        label="服务端口"
                        rules={[
                            { required: true, message: '请输入服务端口' },
                            { type: 'number', min: 1, max: 65535, message: '端口必须在 1-65535 之间' }
                        ]}
                    >
                        <InputNumber style={{ width: '100%' }} placeholder="例如: 9100" min={1} max={65535} />
                    </Form.Item>
                    <Form.Item
                        name="job"
                        label="Job 名称"
                    >
                        <Input placeholder="例如: node" />
                    </Form.Item>
                    <Form.Item
                        name="tags"
                        label="标签列表"
                        tooltip="标签用于服务发现和过滤，多个标签用逗号分隔"
                    >
                        <Select
                            mode="tags"
                            placeholder="输入标签后按回车添加，或从下拉列表中选择已有标签"
                            style={{ width: '100%' }}
                            tokenSeparators={[',']}
                            options={uniqueTags.map(tag => ({ label: tag, value: tag }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="labels"
                        label="标签键值对"
                        tooltip="用于存储服务的元数据信息"
                    >
                        <Form.List name="labels">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'key']}
                                                rules={[{ required: true, message: '请输入标签键' }]}
                                                style={{ marginBottom: 0, width: 200 }}
                                            >
                                                <Input placeholder="标签键" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'value']}
                                                rules={[{ required: true, message: '请输入标签值' }]}
                                                style={{ marginBottom: 0, width: 200 }}
                                            >
                                                <Input placeholder="标签值" />
                                            </Form.Item>
                                            <Button type="link" danger onClick={() => remove(name)}>
                                                删除
                                            </Button>
                                        </Space>
                                    ))}
                                    <Form.Item>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            添加标签键值对
                                        </Button>
                                    </Form.Item>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>
                </Form>
            </Modal>

        </div>
    );
};
