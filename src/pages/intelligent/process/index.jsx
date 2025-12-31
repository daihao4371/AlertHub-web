import React, { useState, useEffect } from 'react';
import { Table, Empty } from 'antd';
import { HandleShowTotal } from '../../../utils/lib';
import { useProcessData, useProcessDetail, useWindowHeight } from './hooks';
import { createTableColumns, SearchBar, ProcessDetailDrawer } from './components';

/**
 * 处理记录页面
 * 展示所有处理流程追踪记录
 */
export const IntelligentProcess = () => {
    // 搜索和筛选状态
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFaultCenter, setSelectedFaultCenter] = useState('');

    // 数据管理 Hook
    const {
        processList,
        loading,
        faultCenterList,
        userList,
        pagination,
        setPagination,
        loadFaultCenterList,
        loadUserList,
        loadProcessList,
    } = useProcessData();

    // 详情管理 Hook
    const {
        detailDrawerVisible,
        processDetail,
        operationLogs,
        detailLoading,
        handleViewDetail,
        handleCloseDetail,
        refreshDetail,
    } = useProcessDetail();

    // 窗口高度 Hook
    const height = useWindowHeight();

    // 处理分页变化
    const handleTableChange = (newPagination) => {
        loadProcessList(newPagination.current, newPagination.pageSize, selectedFaultCenter, searchQuery);
    };

    // 处理搜索
    const handleSearch = () => {
        setPagination(prev => ({ ...prev, current: 1 }));
        loadProcessList(1, pagination.pageSize, selectedFaultCenter, searchQuery);
    };

    // 处理重置
    const handleReset = () => {
        setSearchQuery('');
        setSelectedFaultCenter('');
        setPagination(prev => ({ ...prev, current: 1 }));
        loadProcessList(1, pagination.pageSize, '', '');
    };

    // 处理刷新
    const handleRefresh = () => {
        loadProcessList(pagination.current, pagination.pageSize, selectedFaultCenter, searchQuery);
    };

    // 初始化加载
    useEffect(() => {
        loadFaultCenterList();
        loadUserList();
        loadProcessList(1, 10, '', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 创建表格列
    const columns = createTableColumns(faultCenterList, userList, handleViewDetail);

    return (
        <div style={{ textAlign: 'left', padding: '24px' }}>
            {/* 搜索和筛选区域 */}
            <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedFaultCenter={selectedFaultCenter}
                setSelectedFaultCenter={setSelectedFaultCenter}
                faultCenterList={faultCenterList}
                onSearch={handleSearch}
                onReset={handleReset}
                onRefresh={handleRefresh}
            />

            {/* 表格 */}
            <Table
                columns={columns}
                dataSource={processList}
                loading={loading}
                rowKey="id"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showTotal: HandleShowTotal,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}
                scroll={{
                    y: height - 300,
                    x: 'max-content',
                }}
                locale={{
                    emptyText: <Empty description="暂无处理流程记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
            />

            {/* 详情抽屉 */}
            <ProcessDetailDrawer
                visible={detailDrawerVisible}
                onClose={handleCloseDetail}
                processDetail={processDetail}
                operationLogs={operationLogs}
                loading={detailLoading}
                faultCenterList={faultCenterList}
                userList={userList}
                onRefresh={refreshDetail}
            />
        </div>
    );
};
