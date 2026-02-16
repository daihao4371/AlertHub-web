import React, { useState, useCallback, useEffect } from 'react';
import { getCurEventList } from '../../api/event';
import { FaultCenterList } from '../../api/faultCenter';

/**
 * 使用告警数据 Hook
 */
export const useAlertData = () => {
    const [eventList, setEventList] = useState([]);
    const [faultCenterList, setFaultCenterList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    // 加载故障中心列表
    const loadFaultCenterList = useCallback(async () => {
        try {
            const res = await FaultCenterList();
            if (res && res.data) {
                setFaultCenterList(Array.isArray(res.data) ? res.data : []);
                return Array.isArray(res.data) ? res.data : [];
            }
        } catch (error) {
            console.error('加载故障中心列表失败:', error);
        }
        return [];
    }, []);

    // 加载告警列表 - 从所有故障中心聚合
    const loadEventList = useCallback(async (pageIndex = 1, pageSize = 10, faultCenterId = '', centers = null) => {
        setLoading(true);
        try {
            const allEvents = [];
            // 使用传入的故障中心列表，如果没有则使用 state 中的
            const centerList = centers || faultCenterList;

            // 构建故障中心名称映射表
            const centerNameMap = {};
            if (centerList && centerList.length > 0) {
                centerList.forEach(center => {
                    centerNameMap[center.id] = center.name || center.id;
                });
            }

            if (faultCenterId) {
                // 查询指定故障中心
                const res = await getCurEventList({
                    faultCenterId,
                    index: pageIndex,
                    size: pageSize,
                });
                if (res && res.data) {
                    // 添加故障中心名称字段用于显示
                    const events = (res.data.list || []).map(event => ({
                        ...event,
                        faultCenterName: centerNameMap[event.faultCenterId] || event.faultCenterId
                    }));
                    allEvents.push(...events);
                    setPagination({
                        current: res.data.index || pageIndex,
                        pageSize: res.data.size || pageSize,
                        total: res.data.total || 0,
                    });
                }
            } else {
                // 查询所有故障中心
                if (centerList && centerList.length > 0) {
                    for (const fc of centerList) {
                        try {
                            const res = await getCurEventList({
                                faultCenterId: fc.id,
                                index: 1,
                                size: 1000,
                            });
                            if (res && res.data && res.data.list) {
                                // 添加故障中心名称字段用于显示
                                const events = res.data.list.map(event => ({
                                    ...event,
                                    faultCenterName: fc.name || fc.id
                                }));
                                allEvents.push(...events);
                            }
                        } catch (error) {
                            console.error(`查询故障中心 ${fc.id} 失败:`, error);
                        }
                    }
                }
                setPagination({
                    current: 1,
                    pageSize: pageSize,
                    total: allEvents.length,
                });
            }

            setEventList(allEvents);
        } catch (error) {
            console.error('加载告警列表失败:', error);
            setEventList([]);
        } finally {
            setLoading(false);
        }
    }, [faultCenterList]);

    return {
        eventList,
        setEventList,
        faultCenterList,
        loading,
        pagination,
        setPagination,
        loadFaultCenterList,
        loadEventList,
    };
};

/**
 * 使用聚类结果 Hook
 */
export const useClusterResult = () => {
    const [clusterResult, setClusterResult] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

    const openDetail = useCallback((incident) => {
        setSelectedIncident(incident);
        setDetailDrawerOpen(true);
    }, []);

    const closeDetail = useCallback(() => {
        setDetailDrawerOpen(false);
        setSelectedIncident(null);
    }, []);

    return {
        clusterResult,
        setClusterResult,
        selectedIncident,
        detailDrawerOpen,
        openDetail,
        closeDetail,
    };
};

/**
 * 使用窗口高度 Hook
 */
export const useWindowHeight = () => {
    const [height, setHeight] = useState(window.innerHeight);

    useEffect(() => {
        const handleResize = () => {
            setHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return height;
};