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
// 完全基于 Prometheus API: /api/v1/labels
async function getPrometheusLabels(datasourceId, metricName = null, start = null, end = null) {
    try {
        const params = { datasourceId };
        if (metricName) {
            params.metricName = metricName;
        }
        if (start) {
            params.start = start;
        }
        if (end) {
            params.end = end;
        }
        const res = await http('get', '/api/w8t/prometheus/labels', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}

// 获取 Prometheus 标签值列表
// 完全基于 Prometheus API: /api/v1/label/{labelName}/values
async function getPrometheusLabelValues(datasourceId, labelName, metricName = null, start = null, end = null) {
    try {
        const params = { 
            datasourceId,
            labelName
        };
        if (metricName) {
            params.metricName = metricName;
        }
        if (start) {
            params.start = start;
        }
        if (end) {
            params.end = end;
        }
        const res = await http('get', '/api/w8t/prometheus/label_values', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}

// 获取 Prometheus 时间序列元数据
// 基于 Prometheus API: /api/v1/series
async function getPrometheusSeries(datasourceId, matchers, start = null, end = null) {
    try {
        const params = {
            datasourceId,
            'match[]': matchers
        };
        if (start) {
            params.start = start;
        }
        if (end) {
            params.end = end;
        }
        const res = await http('post', '/api/w8t/prometheus/series', params);
        return res;
    } catch (error) {
        HandleApiError(error);
        throw error;
    }
}

export {
    getPrometheusMetrics,
    getPrometheusLabels,
    getPrometheusLabelValues,
    getPrometheusSeries
};