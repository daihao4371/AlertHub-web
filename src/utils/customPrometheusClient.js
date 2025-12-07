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
     * 当用户在指标选择器 {} 内输入时，会自动调用此方法获取可用的标签名称
     * 如果提供了 metricName，则只返回该指标相关的标签
     *
     * @param {string} [metricName] - 可选,限定查询范围的指标名称
     * @returns {Promise<string[]>} 标签名称列表
     */
    async labelNames(metricName) {
        console.log('[CustomPrometheusClient] labelNames 被调用, metricName:', metricName);
        try {
            console.log('[CustomPrometheusClient] labelNames 请求参数: datasourceId=', this.datasourceId, 'metricName=', metricName);
            const response = await getPrometheusLabels(this.datasourceId, metricName);

            // 检查响应是否有效
            if (!response || !response.data) {
                console.warn('[CustomPrometheusClient] labelNames: 响应数据无效', response);
                return [];
            }

            // 检查是否是错误响应
            if (response.status !== 200 && response.status !== undefined) {
                console.warn('[CustomPrometheusClient] labelNames: 响应状态码异常', response.status);
                return [];
            }

            // 返回数据数组
            const labels = response.data.data || [];
            console.log('[CustomPrometheusClient] labelNames 返回:', labels.length, '个标签');
            
            // 确保返回的是字符串数组
            if (Array.isArray(labels)) {
                return labels.map(l => String(l));
            }
            
            return [];
        } catch (error) {
            console.error('[CustomPrometheusClient] 获取标签名称失败:', error);
            return []; // 返回空数组而不是抛出异常,避免中断编辑器
        }
    }

    /**
     * 获取指定标签的所有值列表
     * 用于 PromQL 编辑器的标签值补全功能
     * 
     * 当用户在标签选择器中输入 label= 或 label=~ 后，会自动调用此方法获取该标签的所有可能值
     * 例如：输入 instance= 后，会显示所有 instance 标签的值
     *
     * @param {string} labelName - 标签名称 (如 "job", "instance")
     * @param {string} [metricName] - 可选,限定查询范围的指标名称（当前后端 API 暂不支持）
     * @param {Array} [matchers] - 可选,匹配器列表（当前后端 API 暂不支持）
     * @returns {Promise<string[]>} 标签值列表
     */
    async labelValues(labelName, metricName, matchers) {
        console.log('[CustomPrometheusClient] labelValues 被调用, labelName:', labelName, 'metricName:', metricName);
        try {
            if (!labelName) {
                console.warn('[CustomPrometheusClient] labelValues: labelName 为空');
                return [];
            }

            console.log('[CustomPrometheusClient] labelValues 请求参数: datasourceId=', this.datasourceId, 'labelName=', labelName);
            const response = await getPrometheusLabelValues(this.datasourceId, labelName);

            // 检查响应是否有效
            if (!response || !response.data) {
                console.warn('[CustomPrometheusClient] labelValues: 响应数据无效', response);
                return [];
            }

            // 检查是否是错误响应
            if (response.status !== 200 && response.status !== undefined) {
                console.warn('[CustomPrometheusClient] labelValues: 响应状态码异常', response.status);
                return [];
            }

            // 返回数据数组
            const values = response.data.data || [];
            console.log('[CustomPrometheusClient] labelValues 返回:', values.length, '个值');
            
            // 确保返回的是字符串数组
            if (Array.isArray(values)) {
                return values.map(v => String(v));
            }
            
            return [];
        } catch (error) {
            console.error(`[CustomPrometheusClient] 获取标签值失败 (labelName=${labelName}):`, error);
            return []; // 返回空数组而不是抛出异常，避免中断编辑器
        }
    }

    /**
     * 获取所有指标名称列表
     * 用于 PromQL 编辑器的指标名称补全功能
     *
     * 注意: 新版本的 @prometheus-io/codemirror-promql 不再接受 prefix 参数
     * 补全功能会在用户输入时自动调用此方法获取指标列表
     *
     * @returns {Promise<string[]>} 指标名称列表
     */
    async metricNames() {
        console.log('[CustomPrometheusClient] metricNames 被调用');
        try {
            const response = await getPrometheusMetrics(this.datasourceId);

            // 检查响应是否有效
            if (!response || !response.data) {
                console.warn('[CustomPrometheusClient] metricNames: 响应数据无效', response);
                return [];
            }

            // 检查是否是错误响应
            if (response.status !== 200 && response.status !== undefined) {
                console.warn('[CustomPrometheusClient] metricNames: 响应状态码异常', response.status);
                return [];
            }

            // 返回所有指标
            const metrics = response.data.data || [];

            console.log('[CustomPrometheusClient] metricNames 返回:', metrics.length, '个指标');
            
            // 确保返回的是字符串数组
            if (Array.isArray(metrics)) {
                return metrics.map(m => String(m));
            }
            
            return [];
        } catch (error) {
            console.error('[CustomPrometheusClient] 获取指标名称失败:', error);
            return []; // 返回空数组而不是抛出异常，避免中断编辑器
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