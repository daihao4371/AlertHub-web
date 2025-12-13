import React from 'react';
import { Input } from 'antd';
import './MetricsSearch.css';

const { Search } = Input;

/**
 * 指标搜索组件
 * 负责指标搜索的 UI 展示
 */
export const MetricsSearch = ({ 
    searchKeyword, 
    loading, 
    disabled, 
    onSearchChange 
}) => {
    return (
        <div className="metrics-explorer__search-section">
            <div className="metrics-explorer__search-label">搜索指标</div>
            <Search
                placeholder="搜索指标"
                value={searchKeyword}
                onChange={(e) => onSearchChange(e.target.value)}
                onSearch={onSearchChange}
                allowClear
                loading={loading}
                disabled={disabled}
                className="metrics-explorer__search-input"
            />
        </div>
    );
};

