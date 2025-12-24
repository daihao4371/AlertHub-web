import http from '../utils/http';
import {HandleApiError} from "../utils/lib";

async function getDashboardInfo(params) {
    try {
        const res = await http('get', '/api/system/getDashboardInfo', params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function getJaegerService(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => params[key] !== undefined ? `${key}=${params[key]}` : '')
            .filter(Boolean)
            .join('&');
        const res = await http('get', `/api/w8t/c/getJaegerService?${queryString}`);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function queryPromMetrics(params) {
    try {
        const res = await http('get', `/api/w8t/datasource/promQuery`, params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function queryRangePromMetrics(params) {
    try {
        const res = await http('get', `/api/w8t/datasource/promQueryRange`, params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

async function getPromLabelValues(params) {
    try {
        const res = await http('get', `/api/w8t/datasource/promLabelValues`, params);
        return res;
    } catch (error) {
        HandleApiError(error)
        return error
    }
}

/**
 * 获取首页统计数据
 * @param {Object} params - 请求参数
 * @param {string} params.faultCenterId - 故障中心ID（可选）
 * @returns {Promise} 返回统计数据，包括今日告警、过去7天数据及环比数据
 */
async function getDashboardStatistics(params) {
    try {
        const res = await http('get', '/api/system/getDashboardStatistics', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

export {
    getDashboardInfo,
    getJaegerService,
    queryPromMetrics,
    queryRangePromMetrics,
    getPromLabelValues,
    getDashboardStatistics
}