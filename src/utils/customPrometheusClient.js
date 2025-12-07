/**
 * 自定义 Prometheus 客户端 - 通过后端代理访问 Prometheus API
 *
 * 职责:
 * 1. 实现 PrometheusClient 接口,满足 @prometheus-io/codemirror-promql 的要求
 * 2. 所有请求通过后端 /api/w8t/prometheus/* 代理转发
 * 3. 使用 datasourceId 实现多数据源支持和租户隔离
 *
 * PrometheusClient 接口 (@prometheus-io/codemirror-promql 最新版):
 * - labelNames(metricName?: string): Promise<string[]>
 * - labelValues(labelName: string, metricName?: string, matchers?: Matcher[]): Promise<string[]>
 * - metricMetadata(): Promise<Record<string, MetricMetadata[]>>
 * - series(metricName: string, matchers?: Matcher[], labelName?: string): Promise<Map<string, string>[]>
 * - metricNames(): Promise<string[]>  // 注意: 新版本不再接受 prefix 参数
 * - flags(): Promise<Record<string, string>>
 */

import {
    getPrometheusMetrics,
    getPrometheusLabels,
    getPrometheusLabelValues,
    getPrometheusSeries
} from '../api/prometheus';

/**
 * CustomPrometheusClient - 自定义 Prometheus 客户端实现
 *
 * 该客户端通过后端代理访问 Prometheus,相比直连方式有以下优势:
 * - 安全性: 不暴露 Prometheus 地址和认证信息给前端
 * - 权限控制: 通过后端中间件实现租户隔离和权限验证
 * - 审计: 后端可以记录所有 API 调用日志
 * - 灵活性: 可以在后端层面实现缓存、限流等策略
 */
export class CustomPrometheusClient {
    /**
     * 构造函数
     * @param {string} datasourceId - 数据源 ID,用于后端路由到正确的 Prometheus 实例
     */
    constructor(datasourceId) {
        if (!datasourceId) {
            throw new Error('datasourceId 不能为空');
        }
        this.datasourceId = datasourceId;
        console.log('[CustomPrometheusClient] 初始化,datasourceId:', datasourceId);
    }

    /**
     * 获取所有标签名称列表
     * 用于 PromQL 编辑器的标签补全功能
     *
     * @param {string} [metricName] - 可选,限定查询范围的指标名称
     * @returns {Promise<string[]>} 标签名称列表
     */
    async labelNames(metricName) {
        console.log('[CustomPrometheusClient] labelNames 被调用, metricName:', metricName);
        try {
            const params = {
                datasourceId: this.datasourceId
            };

            // 如果指定了 metricName,添加到参数中
            if (metricName) {
                params.metricName = metricName;
            }

            console.log('[CustomPrometheusClient] labelNames 请求参数:', params);
            const response = await getPrometheusLabels(params);

            // 返回数据数组
            const labels = response.data.data || [];
            console.log('[CustomPrometheusClient] labelNames 返回:', labels.length, '个标签');
            return labels;
        } catch (error) {
            console.error('[CustomPrometheusClient] 获取标签名称失败:', error);
            return []; // 返回空数组而不是抛出异常,避免中断编辑器
        }
    }

    /**
     * 获取指定标签的所有值列表
     * 用于 PromQL 编辑器的标签值补全功能
     *
     * @param {string} labelName - 标签名称 (如 "job", "instance")
     * @param {string} [metricName] - 可选,限定查询范围的指标名称
     * @param {Array} [matchers] - 可选,匹配器列表(暂未使用)
     * @returns {Promise<string[]>} 标签值列表
     */
    async labelValues(labelName, metricName, matchers) {
        console.log('[CustomPrometheusClient] labelValues 被调用, labelName:', labelName, 'metricName:', metricName);
        try {
            const params = {
                datasourceId: this.datasourceId,
                labelName: labelName
            };

            // 如果指定了 metricName,添加到参数中
            if (metricName) {
                params.metricName = metricName;
            }

            // 注意: matchers 参数当前后端未实现,这里忽略

            console.log('[CustomPrometheusClient] labelValues 请求参数:', params);
            const response = await getPrometheusLabelValues(params);

            // 返回数据数组
            const values = response.data.data || [];
            console.log('[CustomPrometheusClient] labelValues 返回:', values.length, '个值');
            return values;
        } catch (error) {
            console.error(`[CustomPrometheusClient] 获取标签值失败 (labelName=${labelName}):`, error);
            return []; // 返回空数组而不是抛出异常
        }
    }

    /**
     * 获取所有指标名称列表
     * 用于 PromQL 编辑器的指标名称补全功能
     *
     * 注意: 新版本的 @prometheus-io/codemirror-promql 不再接受 prefix 参数
     *
     * @returns {Promise<string[]>} 指标名称列表
     */
    async metricNames() {
        console.log('[CustomPrometheusClient] metricNames 被调用');
        try {
            const response = await getPrometheusMetrics(this.datasourceId);

            // 返回所有指标
            const metrics = response.data.data || [];

            console.log('[CustomPrometheusClient] metricNames 返回:', metrics.length, '个指标');
            return metrics;
        } catch (error) {
            console.error('获取指标名称失败:', error);
            return []; // 返回空数组而不是抛出异常
        }
    }

    /**
     * 查询时间序列元数据
     * 用于 PromQL 编辑器的序列信息查询
     *
     * @param {string} metricName - 指标名称
     * @param {Array} [matchers] - 可选,匹配器列表
     * @param {string} [labelName] - 可选,标签名称(暂未使用)
     * @returns {Promise<Array<Map<string, string>>>} 序列元数据列表
     */
    async series(metricName, matchers, labelName) {
        try {
            // 构建匹配器字符串
            // 新版本 API 期望 metricName 和 matchers 分别传递
            const matcherStrings = [];

            // 添加指标名称匹配器
            if (metricName) {
                matcherStrings.push(`{__name__="${metricName}"}`);
            }

            // 如果有其他 matchers,也添加进去
            if (matchers && matchers.length > 0) {
                // 这里需要根据后端 API 格式转换 matchers
                // 暂时简化处理
                matchers.forEach(m => {
                    if (typeof m === 'string') {
                        matcherStrings.push(m);
                    }
                });
            }

            const params = {
                datasourceId: this.datasourceId,
                matchers: matcherStrings.length > 0 ? matcherStrings : ['{__name__=~".+"}']
            };

            const response = await getPrometheusSeries(params);

            // 将后端返回的对象数组转换为 Map 数组
            const seriesData = response.data.data || [];
            return seriesData.map(item => {
                const map = new Map();
                Object.entries(item).forEach(([key, value]) => {
                    map.set(key, value);
                });
                return map;
            });
        } catch (error) {
            console.error('获取序列元数据失败:', error);
            return []; // 返回空数组而不是抛出异常
        }
    }

    /**
     * 获取指标元数据
     * @prometheus-io/codemirror-promql 需要此方法,但当前后端未实现
     *
     * @returns {Promise<Record<string, Array<{type: string, help: string}>>>}
     */
    async metricMetadata() {
        // 当前后端未实现该接口,返回空对象
        // 如果未来需要支持,可以在后端添加对应的代理接口
        console.warn('metricMetadata 方法暂未实现,返回空数据');
        return {};
    }

    /**
     * 获取 Prometheus 配置标志
     * @prometheus-io/codemirror-promql 需要此方法,但当前后端未实现
     *
     * @returns {Promise<Record<string, string>>}
     */
    async flags() {
        // 当前后端未实现该接口,返回空对象
        console.warn('flags 方法暂未实现,返回空数据');
        return {};
    }
}