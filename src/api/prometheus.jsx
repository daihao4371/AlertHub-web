import http from '../utils/http';
import { HandleApiError } from "../utils/lib";

// 获取 Prometheus 指标名称列表
async function getPrometheusMetrics(datasourceId) {
    try {
        const res = await http('get', '/api/w8t/prometheus/metrics', {
            datasourceId
        });
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 获取 Prometheus 标签名称列表
async function getPrometheusLabels(params) {
    try {
        const res = await http('get', '/api/w8t/prometheus/labels', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 获取 Prometheus 标签值列表
async function getPrometheusLabelValues(params) {
    try {
        const res = await http('get', '/api/w8t/prometheus/label_values', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

// 获取 Prometheus 时间序列元数据
async function getPrometheusSeries(params) {
    try {
        const res = await http('post', '/api/w8t/prometheus/series', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        return error;
    }
}

export {
    getPrometheusMetrics,
    getPrometheusLabels,
    getPrometheusLabelValues,
    getPrometheusSeries
};