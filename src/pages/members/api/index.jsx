import { Input, Button, Card, Space, Tag, message, Tree } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
import { getApiPermissions } from '../../../api/casbinPermission';
import { SearchOutlined, ReloadOutlined, ApiOutlined } from '@ant-design/icons';
import { HandleShowTotal } from "../../../utils/lib";

const { Search } = Input;

/**
 * API 管理页面
 * 参考用户管理的布局和样式，以树形选择展示 API
 * group 底下显示 api 的路径、请求方法和描述
 */
export const ApiManagement = () => {
    const [apiList, setApiList] = useState([]); // API 列表
    const [loading, setLoading] = useState(false); // 加载状态
    const [searchValue, setSearchValue] = useState(''); // 搜索关键字
    const [expandedKeys, setExpandedKeys] = useState([]); // 展开的节点
    const [height, setHeight] = useState(window.innerHeight); // 动态高度

    // 动态调整高度
    useEffect(() => {
        const handleResize = () => setHeight(window.innerHeight);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 加载 API 列表
    const loadApiList = async () => {
        setLoading(true);
        try {
            const res = await getApiPermissions();
            if (res && res.data && Array.isArray(res.data)) {
                setApiList(res.data);
            } else {
                setApiList([]);
                if (res?.code === 403) {
                    message.warning('无权限查看 API 列表');
                }
            }
        } catch (error) {
            console.error('获取 API 列表失败:', error);
            message.error('获取 API 列表失败');
            setApiList([]);
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        loadApiList();
    }, []);

    // 将 API 列表转换为树形结构数据
    const treeData = useMemo(() => {
        if (!apiList || apiList.length === 0) {
            return [];
        }

        // 过滤搜索关键字
        let filteredApis = apiList;
        if (searchValue) {
            const searchLower = searchValue.toLowerCase();
            filteredApis = apiList.filter(api => {
                const pathMatch = api.path?.toLowerCase().includes(searchLower);
                const methodMatch = api.method?.toLowerCase().includes(searchLower);
                const descMatch = api.description?.toLowerCase().includes(searchLower);
                const groupMatch = api.apiGroup?.toLowerCase().includes(searchLower);
                return pathMatch || methodMatch || descMatch || groupMatch;
            });
        }

        // 按分组归类 API
        const groupMap = new Map();
        filteredApis.forEach(api => {
            const group = api.apiGroup || '未分组';
            if (!groupMap.has(group)) {
                groupMap.set(group, []);
            }
            groupMap.get(group).push(api);
        });

        // 转换为树形结构
        const treeNodes = [];
        groupMap.forEach((apis, groupName) => {
            const children = apis.map(api => ({
                title: (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        flexWrap: 'wrap',
                        padding: '4px 0'
                    }}>
                        {/* HTTP 方法标签 */}
                        <Tag color={
                            api.method === 'GET' ? 'blue' : 
                            api.method === 'POST' ? 'green' : 
                            api.method === 'PUT' ? 'orange' : 
                            api.method === 'DELETE' ? 'red' : 
                            api.method === 'PATCH' ? 'purple' : 'default'
                        }>
                            {api.method}
                        </Tag>
                        {/* API 路径 */}
                        <span style={{ 
                            fontWeight: 500, 
                            color: '#1890ff', 
                            marginRight: '8px',
                            fontFamily: 'monospace'
                        }}>
                            {api.path}
                        </span>
                        {/* 描述 */}
                        {api.description && (
                            <span style={{ 
                                color: '#8c8c8c', 
                                fontSize: '12px'
                            }}>
                                {api.description}
                            </span>
                        )}
                    </div>
                ),
                key: `api-${api.id}`,
                isLeaf: true,
                apiData: api,
            }));

            treeNodes.push({
                title: (
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                        {groupName}
                        <span style={{ 
                            marginLeft: '8px', 
                            color: '#8c8c8c', 
                            fontSize: '12px', 
                            fontWeight: 400 
                        }}>
                            ({apis.length})
                        </span>
                    </span>
                ),
                key: `group-${groupName}`,
                children: children,
            });
        });

        // 按分组名称排序
        treeNodes.sort((a, b) => {
            const aName = a.key.replace('group-', '');
            const bName = b.key.replace('group-', '');
            return aName.localeCompare(bName, 'zh-CN');
        });

        return treeNodes;
    }, [apiList, searchValue]);

    // 处理树节点展开/收起
    const onExpand = (expandedKeysValue) => {
        setExpandedKeys(expandedKeysValue);
    };

    // 搜索处理
    const onSearch = (value) => {
        setSearchValue(value);
        // 如果有搜索值，自动展开所有节点
        if (value) {
            const allKeys = treeData.map(node => node.key);
            setExpandedKeys(allKeys);
        }
    };

    // 展开所有节点
    const expandAll = () => {
        const allKeys = treeData.map(node => node.key);
        setExpandedKeys(allKeys);
    };

    // 收起所有节点
    const collapseAll = () => {
        setExpandedKeys([]);
    };

    return (
        <>
            {/* 搜索和操作栏 - 参考用户管理页面的布局 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Search
                    allowClear
                    placeholder="搜索 API 路径、方法、描述或分组"
                    onSearch={onSearch}
                    onChange={(e) => {
                        if (!e.target.value) {
                            setSearchValue('');
                            setExpandedKeys([]);
                        }
                    }}
                    style={{ width: 400 }}
                    prefix={<SearchOutlined />}
                />
                <Space>
                    <Button
                        onClick={expandAll}
                        disabled={treeData.length === 0}
                    >
                        展开全部
                    </Button>
                    <Button
                        onClick={collapseAll}
                        disabled={treeData.length === 0}
                    >
                        收起全部
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadApiList}
                        loading={loading}
                    >
                        刷新
                    </Button>
                </Space>
            </div>

            {/* API 树形展示卡片 - 参考用户管理页面的样式 */}
            <div style={{ 
                overflowX: 'auto', 
                marginTop: 10,
                backgroundColor: "#fff",
                borderRadius: "8px",
                overflow: "hidden",
                padding: '16px'
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        加载中...
                    </div>
                ) : treeData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        {searchValue ? '未找到匹配的 API' : '暂无 API 数据'}
                    </div>
                ) : (
                    <div style={{ 
                        maxHeight: height - 280, 
                        overflowY: 'auto',
                        padding: '8px'
                    }}>
                        <Tree
                            showLine={{ showLeafIcon: false }}
                            expandedKeys={expandedKeys}
                            onExpand={onExpand}
                            treeData={treeData}
                            style={{
                                backgroundColor: 'transparent',
                            }}
                        />
                    </div>
                )}
            </div>

            {/* 统计信息 */}
            {!loading && apiList.length > 0 && (
                <div style={{ 
                    marginTop: 16, 
                    color: '#8c8c8c', 
                    fontSize: '12px',
                    textAlign: 'right'
                }}>
                    共 {apiList.length} 个 API
                    {searchValue && `，筛选出 ${treeData.reduce((sum, node) => sum + (node.children?.length || 0), 0)} 个`}
                </div>
            )}
        </>
    );
};

