import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { getProcessTraceList, getProcessTrace, getOperationLogs, updateProcessStatus, getProcessStatistics } from '../../../api/processTrace';
import { FaultCenterList } from '../../../api/faultCenter';
import { getUserList } from '../../../api/user';

/**
 * 处理流程数据管理 Hook
 */
export const useProcessData = () => {
    const [processList, setProcessList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [faultCenterList, setFaultCenterList] = useState([]);
    const [userList, setUserList] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    /**
     * 加载故障中心列表
     */
    const loadFaultCenterList = useCallback(async () => {
        try {
            const res = await FaultCenterList({});
            if (res && res.data) {
                setFaultCenterList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            console.error('加载故障中心列表失败:', error);
        }
    }, []);

    /**
     * 加载用户列表
     */
    const loadUserList = useCallback(async () => {
        try {
            const res = await getUserList({});
            if (res && res.data) {
                setUserList(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
        }
    }, []);

    /**
     * 加载处理流程记录列表
     */
    const loadProcessList = useCallback(async (page = 1, pageSize = 10, selectedFaultCenter = '', searchQuery = '') => {
        setLoading(true);
        try {
            const params = {
                page,
                pageSize,
            };

            // 添加筛选条件
            if (selectedFaultCenter) {
                params.faultCenterId = selectedFaultCenter;
            }
            if (searchQuery) {
                params.eventId = searchQuery;
            }

            const response = await getProcessTraceList(params);

            // 处理返回数据
            if (response && response.code === 200 && response.data) {
                const data = response.data;
                const processData = data.list || [];
                setProcessList(processData);
                setPagination({
                    current: data.page || page,
                    pageSize: data.pageSize || pageSize,
                    total: data.total || 0,
                });
            } else {
                setProcessList([]);
                setPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch (error) {
            console.error('加载处理流程记录失败:', error);
            message.error('加载处理流程记录失败');
            setProcessList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        processList,
        loading,
        faultCenterList,
        userList,
        pagination,
        setPagination,
        loadFaultCenterList,
        loadUserList,
        loadProcessList,
    };
};

/**
 * 处理流程详情管理 Hook
 */
export const useProcessDetail = () => {
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [processDetail, setProcessDetail] = useState(null);
    const [operationLogs, setOperationLogs] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    /**
     * 处理查看详情
     */
    const handleViewDetail = async (record) => {
        setDetailDrawerVisible(true);
        setDetailLoading(true);
        
        try {
            // 并行加载详情和操作日志
            const [detailRes, logsRes] = await Promise.all([
                getProcessTrace({ fingerprint: record.eventId }),
                getOperationLogs({ fingerprint: record.eventId, page: 1, pageSize: 50 })
            ]);

            // 处理详情数据
            if (detailRes && detailRes.code === 200 && detailRes.data) {
                setProcessDetail(detailRes.data);
            } else {
                message.error('获取处理流程详情失败');
                setProcessDetail(null);
            }

            // 处理操作日志数据
            if (logsRes && logsRes.code === 200 && logsRes.data) {
                setOperationLogs(logsRes.data.list || []);
            } else {
                setOperationLogs([]);
            }
        } catch (error) {
            console.error('加载处理流程详情失败:', error);
            message.error('加载处理流程详情失败');
            setProcessDetail(null);
            setOperationLogs([]);
        } finally {
            setDetailLoading(false);
        }
    };

    /**
     * 关闭详情抽屉
     */
    const handleCloseDetail = () => {
        setDetailDrawerVisible(false);
        setProcessDetail(null);
        setOperationLogs([]);
    };

    /**
     * 刷新详情数据
     */
    const refreshDetail = async (eventId) => {
        if (!eventId) return;

        try {
            // 并行加载详情和操作日志
            const [detailRes, logsRes] = await Promise.all([
                getProcessTrace({ fingerprint: eventId }),
                getOperationLogs({ fingerprint: eventId, page: 1, pageSize: 50 })
            ]);

            // 处理详情数据
            if (detailRes && detailRes.code === 200 && detailRes.data) {
                setProcessDetail(detailRes.data);
            }

            // 处理操作日志数据
            if (logsRes && logsRes.code === 200 && logsRes.data) {
                setOperationLogs(logsRes.data.list || []);
            }
        } catch (error) {
            console.error('刷新处理流程详情失败:', error);
        }
    };

    return {
        detailDrawerVisible,
        processDetail,
        operationLogs,
        detailLoading,
        handleViewDetail,
        handleCloseDetail,
        refreshDetail,
    };
};

/**
 * 处理流程状态管理 Hook
 */
export const useProcessStatus = () => {
    /**
     * 更新处理状态
     * @param {string} eventId - 告警事件ID
     * @param {Object} values - 表单值
     * @param {string} currentStatus - 当前状态
     * @returns {Promise<boolean>} 是否操作成功
     */
    const handleUpdateStatus = async (eventId, values, currentStatus = '') => {
        if (!eventId) {
            message.error('参数不完整');
            return false;
        }

        try {
            const { status } = values;
            if (!status) {
                message.error('请选择新状态');
                return false;
            }
            if (status === currentStatus) {
                message.warning('新状态与当前状态相同');
                return false;
            }

            const params = { eventId, status };
            
            // 支持可选的描述和分配处理人
            if (values.description) {
                params.description = values.description;
            }
            if (values.assignedUser) {
                params.assignedUser = values.assignedUser;
            }

            const response = await updateProcessStatus(params);

            if (response && response.code === 200) {
                message.success('状态更新成功');
                return true;
            } else {
                message.error(response?.msg || '状态更新失败');
                return false;
            }
        } catch (error) {
            console.error('更新处理状态失败:', error);
            message.error('更新处理状态失败');
            return false;
        }
    };

    return {
        handleUpdateStatus,
    };
};

/**
 * 窗口高度监听 Hook
 */
export const useWindowHeight = () => {
    const [height, setHeight] = useState(window.innerHeight);

    useEffect(() => {
        const handleResize = () => {
            setHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return height;
};

/**
 * 流程统计数据管理 Hook
 */
export const useProcessStatistics = () => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);

    /**
     * 加载统计数据
     * @param {number} startTime - 开始时间戳（可选）
     * @param {number} endTime - 结束时间戳（可选）
     */
    const loadStatistics = useCallback(async (startTime, endTime) => {
        setLoading(true);
        try {
            const params = {};
            if (startTime) {
                params.startTime = startTime;
            }
            if (endTime) {
                params.endTime = endTime;
            }

            const response = await getProcessStatistics(params);

            if (response && response.code === 200 && response.data) {
                setStatistics(response.data);
            } else {
                setStatistics(null);
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            message.error('加载统计数据失败');
            setStatistics(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        statistics,
        loading,
        loadStatistics,
    };
};

