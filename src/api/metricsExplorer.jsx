import http from '../utils/http';
import { HandleApiError } from "../utils/lib";

// 获取指标列表 (分页)
export async function getMetrics(params) {
    try {
        const res = await http('get', '/api/w8t/metrics-explorer/metrics', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}

// 获取指标分类
export async function getMetricsCategories(params) {
    try {
        const res = await http('get', '/api/w8t/metrics-explorer/categories', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}

// 查询指标时序数据 (增强版)
export async function queryMetricsRange(data) {
    try {
        const res = await http('post', '/api/w8t/metrics-explorer/query_range', data);
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}