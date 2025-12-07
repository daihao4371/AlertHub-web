/**
 * PromQL 编辑器补全功能配置工具
 * 
 * 功能: 将 Prometheus API 请求转换为后端代理 API 请求
 * 用于 @prometheus-io/codemirror-promql 的自动补全功能
 */

import http from './http';

/**
 * 从 PromQL 查询语句中提取指标名称
 * 例如: "node_load1{instance=~\"\"}" -> "node_load1"
 * 例如: "node_load1" -> "node_load1"
 * 例如: "sum(node_load1)" -> null (函数调用,不提取)
 * 
 * @param {string} promql - PromQL 查询语句
 * @returns {string|null} 提取的指标名称,如果无法提取则返回 null
 */
function extractMetricNameFromPromQL(promql) {
    if (!promql || typeof promql !== 'string') {
        return null;
    }
    
    // 移除空白字符
    const trimmed = promql.trim();
    if (!trimmed) {
        return null;
    }
    
    // 如果以函数名开头(如 sum, rate, avg 等),不提取指标名称
    // 因为这种情况下指标名称在函数参数中,提取会更复杂
    const functionPattern = /^(sum|avg|min|max|count|rate|increase|delta|irate|histogram_quantile|quantile|stddev|stdvar|topk|bottomk|count_values|group|absent|absent_over_time|clamp_min|clamp_max|changes|deriv|exp|floor|histogram_count|histogram_sum|histogram_fraction|holt_winters|idelta|increase|irate|label_replace|ln|log2|log10|predict_linear|resets|round|scalar|sort|sort_desc|sqrt|time|timestamp|vector|year|day_of_month|day_of_week|days_in_month|hour|minute|month)\s*\(/i;
    if (functionPattern.test(trimmed)) {
        // 如果是函数调用,尝试从参数中提取
        // 例如: sum(node_load1{...}) -> node_load1
        const paramMatch = trimmed.match(/\(([^)]+)\)/);
        if (paramMatch && paramMatch[1]) {
            const param = paramMatch[1].trim();
            // 递归提取参数中的指标名称
            return extractMetricNameFromPromQL(param);
        }
        return null;
    }
    
    // 匹配指标名称模式: 以字母或下划线开头,后跟字母、数字、下划线、冒号
    // 在遇到 { 或空格或 ( 之前的所有字符
    // 支持: node_load1, node_load1{...}, node_load1{instance=~""}
    const metricMatch = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/);
    if (metricMatch && metricMatch[1]) {
        const metricName = metricMatch[1];
        // 验证: 确保不是 PromQL 关键字
        const keywords = ['and', 'or', 'unless', 'on', 'ignoring', 'group_left', 'group_right', 'by', 'without', 'bool', 'offset', 'start', 'end'];
        if (keywords.includes(metricName.toLowerCase())) {
            return null;
        }
        return metricName;
    }
    
    return null;
}

/**
 * 创建 PromQL 补全配置的自定义 fetch 函数
 * 
 * @param {string} datasourceId - 数据源 ID
 * @param {Function} getCurrentQuery - 可选,获取当前编辑器内容的函数
 * @returns {Function} 自定义 fetch 函数
 */
export function createPromQLCompletionFetch(datasourceId, getCurrentQuery = null) {
    if (!datasourceId) {
        console.warn('PromQL 补全功能需要提供 datasourceId');
        return null;
    }

    /**
     * 自定义 fetch 函数
     * 将 Prometheus API 请求转换为后端代理 API 请求
     * 
     * @param {string|Request} input - 请求 URL 字符串或 Request 对象
     * @param {RequestInit} init - Fetch 选项
     * @returns {Promise<Response>} Fetch Response 对象
     */
    return async (input, init = {}) => {
        // 获取当前编辑器内容(如果提供了 getCurrentQuery 函数)
        // 重要: 在每次 fetchFn 被调用时都重新获取编辑器内容,确保获取到最新的内容
        let currentQuery = null;
        if (getCurrentQuery) {
            try {
                currentQuery = getCurrentQuery();
            } catch (e) {
                // 静默处理错误
            }
        }
        
        try {
            // 处理不同的输入格式
            let urlString;
            if (typeof input === 'string') {
                urlString = input;
            } else if (input instanceof Request) {
                urlString = input.url;
            } else {
                throw new Error('不支持的请求格式');
            }

            // 解析 Prometheus API 路径
            // 可能是完整 URL 或相对路径
            let url;
            try {
                url = new URL(urlString);
            } catch (e) {
                // 如果是相对路径,使用基础 URL
                url = new URL(urlString, 'http://localhost');
            }
            
            const pathname = url.pathname;
            const searchParams = url.searchParams;

            // 映射 Prometheus API 到后端 API
            // 注意: pathname 可能包含 /api/v1 前缀,也可能不包含
            const normalizedPath = pathname.replace(/^\/api\/v1/, '') || pathname;


            let backendUrl;
            let backendParams = { datasourceId };
            
            if (normalizedPath === '/label/__name__/values' || pathname === '/api/v1/label/__name__/values') {
                // 获取指标名称列表
                // 这是最重要的补全类型: 当用户输入指标名称时,应该优先显示从后端获取的指标列表
                // 而不是内置的聚合函数或操作符
                backendUrl = '/api/w8t/prometheus/metrics';
            } else if (normalizedPath === '/labels' || pathname === '/api/v1/labels') {
                // 获取标签名称列表
                // 当用户在 {} 中输入标签名称时,会触发此请求
                // 例如: node_load1{in...} 会请求所有可用的标签名称
                backendUrl = '/api/w8t/prometheus/labels';
                
                // 如果 Prometheus API 有 match[] 参数,转换为 metricName
                const matchParams = searchParams.getAll('match[]');
                if (matchParams.length > 0) {
                    // 尝试从 match[] 中提取指标名称
                    // 例如: match[]=node_load1 或 match[]=node_cpu_seconds_total
                    const firstMatch = matchParams[0];
                    // 如果 match 是简单的指标名称(不包含标签选择器),直接使用
                        if (!firstMatch.includes('{') && !firstMatch.includes('=')) {
                            backendParams.metricName = firstMatch;
                        } else {
                            // 如果 match 包含标签选择器,尝试提取指标名称
                            // 例如: match[]=node_load1{instance="localhost:9090"}
                            const metricMatch = firstMatch.match(/^([^{]+)/);
                            if (metricMatch && metricMatch[1]) {
                                backendParams.metricName = metricMatch[1];
                            }
                        }
                    }
            } else if ((normalizedPath.startsWith('/label/') && normalizedPath.endsWith('/values')) ||
                       (pathname.startsWith('/api/v1/label/') && pathname.endsWith('/values'))) {
                // 获取标签值列表
                // 路径格式: /api/v1/label/{labelName}/values 或 /label/{labelName}/values
                // 这是标签值补全的关键步骤: 当用户输入 node_load{instance=~""} 时,需要获取 instance 标签的所有值
                const match = pathname.match(/\/label\/(.+)\/values$/) || normalizedPath.match(/\/label\/(.+)\/values$/);
                const labelName = match?.[1];
                if (labelName) {
                    backendUrl = '/api/w8t/prometheus/label_values';
                    backendParams.labelName = decodeURIComponent(labelName);
                    
                    // 处理 match[] 参数: Prometheus API 可能通过 URL 参数或 POST body 传递
                    // 格式可能是: match[]=node_load 或 match[]=["node_load"] 或 body 中的 JSON
                    let metricNameFromMatch = null;
                    
                    // 方法1: 从 URL 查询参数中获取 match[]
                    const matchParams = searchParams.getAll('match[]');
                    if (matchParams.length > 0) {
                        const firstMatch = matchParams[0];
                        // 尝试解析 JSON 格式 (如 ["node_load"])
                        try {
                            const parsed = JSON.parse(firstMatch);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                metricNameFromMatch = parsed[0];
                            } else if (typeof parsed === 'string') {
                                metricNameFromMatch = parsed;
                            }
                        } catch (e) {
                            // 不是 JSON,直接使用字符串
                            metricNameFromMatch = firstMatch;
                        }
                    }
                    
                    // 方法2: 从 POST body 中获取 match[] (如果 URL 参数中没有)
                    // 注意: Prometheus 客户端可能通过 POST body 发送 match[] 参数
                    // 关键: 需要先读取 body,但要注意 body 可能已经被消耗
                    if (!metricNameFromMatch && init.body) {
                        try {
                            let bodyText;
                            if (typeof init.body === 'string') {
                                bodyText = init.body;
                            } else if (init.body instanceof ReadableStream) {
                                // 如果是 ReadableStream,需要先读取
                                // 注意: 如果 body 已经被读取过,需要 clone
                                try {
                                    bodyText = await init.body.text();
                                } catch (e) {
                                    // 如果 body 已经被消耗,尝试 clone
                                    if (init.body.tee) {
                                        const [body1, body2] = init.body.tee();
                                        bodyText = await body1.text();
                                        // 将 body2 重新赋值给 init.body,以便后续使用
                                        init.body = body2;
                                    } else {
                                        throw e;
                                    }
                                }
                            } else if (init.body instanceof FormData) {
                                // FormData 格式,尝试获取 match[] 参数
                                const matchValue = init.body.get('match[]');
                                if (matchValue) {
                                    metricNameFromMatch = typeof matchValue === 'string' ? matchValue : String(matchValue);
                                }
                            } else {
                                bodyText = String(init.body);
                            }
                            
                            // 如果还没有获取到,尝试解析 body 为 JSON
                            if (!metricNameFromMatch && bodyText) {
                                try {
                                    const bodyData = JSON.parse(bodyText);
                                    if (bodyData.match && Array.isArray(bodyData.match) && bodyData.match.length > 0) {
                                        metricNameFromMatch = bodyData.match[0];
                                    } else if (bodyData.match && typeof bodyData.match === 'string') {
                                        metricNameFromMatch = bodyData.match;
                                    } else if (Array.isArray(bodyData) && bodyData.length > 0) {
                                        // 如果 body 直接是数组格式
                                        metricNameFromMatch = bodyData[0];
                                    }
                                } catch (parseError) {
                                    // JSON 解析失败,静默处理
                                }
                            }
                        } catch (e) {
                            // body 读取失败,静默处理
                        }
                    }
                    
                    // 从 match 中提取指标名称
                    if (metricNameFromMatch) {
                        // 清理指标名称: 去除引号和空白字符
                        let cleanedMetricName = metricNameFromMatch.trim();
                        // 去除 JSON 字符串中的引号
                        if ((cleanedMetricName.startsWith('"') && cleanedMetricName.endsWith('"')) ||
                            (cleanedMetricName.startsWith("'") && cleanedMetricName.endsWith("'"))) {
                            cleanedMetricName = cleanedMetricName.slice(1, -1);
                        }
                        
                        // 如果 match 是简单的指标名称(不包含标签选择器),直接使用
                        if (!cleanedMetricName.includes('{') && !cleanedMetricName.includes('=')) {
                            backendParams.metricName = cleanedMetricName;
                        } else {
                            // 如果 match 包含标签选择器,尝试提取指标名称
                            // 例如: match[]=node_load1{instance="localhost:9090"} 或 match[]=node_load1{instance=~".*"}
                            const metricMatch = cleanedMetricName.match(/^([^{]+)/);
                            if (metricMatch && metricMatch[1]) {
                                backendParams.metricName = metricMatch[1].trim();
                            }
                        }
                    } else {
                        // 没有 match 参数,尝试从当前编辑器内容中提取指标名称
                        // 这是关键: 当用户输入 node_load1{instance=~""} 时,我们可以从编辑器内容中提取 "node_load1"
                        // 这是与 Grafana 保持一致的关键: Grafana 也会从当前查询中提取指标名称
                        if (currentQuery && currentQuery.trim()) {
                            const extractedMetricName = extractMetricNameFromPromQL(currentQuery);
                            if (extractedMetricName) {
                                backendParams.metricName = extractedMetricName;
                            }
                        }
                    }
                } else {
                    throw new Error(`无法解析标签名称: ${pathname}`);
                }
            } else if (normalizedPath === '/metadata' || pathname === '/api/v1/metadata') {
                // Prometheus metadata API: 用于获取指标的元数据信息(帮助文本、类型等)
                // 注意: 我们的后端代理暂未实现此 API,返回空响应以避免错误
                // 这不影响基本的补全功能(指标名称、标签名称、标签值)
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: []
                    }),
                    {
                        status: 200,
                        statusText: 'OK',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            } else {
                // 其他不支持的 API 路径,返回错误响应
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        error: `不支持的 API 路径: ${pathname}`
                    }),
                    {
                        status: 404,
                        statusText: 'Not Found',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // 处理时间范围参数(如果有)
            // 注意: Prometheus API 可能传递 ISO 8601 时间字符串或 Unix 时间戳(毫秒)
            // 我们需要将其转换为 Unix 时间戳(秒)传递给后端
            const start = searchParams.get('start');
            const end = searchParams.get('end');
            if (start) {
                // 尝试解析时间: 可能是 ISO 8601 字符串或 Unix 时间戳(毫秒)
                let startTimestamp;
                if (start.includes('T') || start.includes('-')) {
                    // ISO 8601 格式,转换为 Unix 时间戳(秒)
                    startTimestamp = Math.floor(new Date(start).getTime() / 1000);
                } else {
                    // Unix 时间戳,可能是秒或毫秒
                    const parsed = parseInt(start, 10);
                    // 如果大于 1e12,认为是毫秒,需要转换为秒
                    startTimestamp = parsed > 1e12 ? Math.floor(parsed / 1000) : parsed;
                }
                // 只有当时间戳有效时才传递(大于 0)
                if (startTimestamp > 0) {
                    backendParams.start = startTimestamp;
                }
            }
            if (end) {
                // 尝试解析时间: 可能是 ISO 8601 字符串或 Unix 时间戳(毫秒)
                let endTimestamp;
                if (end.includes('T') || end.includes('-')) {
                    // ISO 8601 格式,转换为 Unix 时间戳(秒)
                    endTimestamp = Math.floor(new Date(end).getTime() / 1000);
                } else {
                    // Unix 时间戳,可能是秒或毫秒
                    const parsed = parseInt(end, 10);
                    // 如果大于 1e12,认为是毫秒,需要转换为秒
                    endTimestamp = parsed > 1e12 ? Math.floor(parsed / 1000) : parsed;
                }
                // 只有当时间戳有效时才传递(大于 0)
                if (endTimestamp > 0) {
                    backendParams.end = endTimestamp;
                }
            }

            // 调用后端 API
            // 注意: Prometheus 客户端默认使用 POST 方法调用 /api/v1/labels 和 /api/v1/series
            // 但我们的后端 /labels 和 /label_values 只支持 GET,需要转换
            // /series 支持 POST,保持不变
            const originalMethod = init.method || (init.body ? 'POST' : 'GET');
            
            // 对于 /labels 和 /label_values,强制使用 GET(即使客户端发送 POST)
            // 对于 /series,使用 POST
            let actualMethod = originalMethod;
            if ((normalizedPath === '/labels' || pathname === '/api/v1/labels') && originalMethod === 'POST') {
                actualMethod = 'GET';
            }
            if ((normalizedPath.startsWith('/label/') && normalizedPath.endsWith('/values')) && originalMethod === 'POST') {
                actualMethod = 'GET';
            }
            
            // 调用后端 API
            let responseData;
            try {
                if (actualMethod === 'POST' || (init.body && actualMethod !== 'GET')) {
                    // POST 请求(如 /api/v1/series)
                    responseData = await http('post', backendUrl, backendParams);
                } else {
                    // GET 请求
                    responseData = await http('get', backendUrl, backendParams);
                }
            } catch (apiError) {
                // 记录 API 调用错误
                console.error('[PromQL 补全] 后端 API 调用失败:', {
                    url: backendUrl,
                    params: backendParams,
                    error: apiError
                });
                throw apiError;
            }

            // 后端 API 返回格式: { code: 200, data: { status: "success", data: [...] }, msg: "success" }
            // 需要转换为 Prometheus API 格式: { status: "success", data: [...] }
            let prometheusResponse;
            
            // 处理后端响应格式
            if (responseData) {
                // 情况1: 标准后端响应格式 { code: 200, data: {...}, msg: "success" }
                if (responseData.code === 200 && responseData.data) {
                    const innerData = responseData.data;
                    
                    // 如果内层 data 已经是 Prometheus 格式 { status: "success", data: [...] }
                    if (innerData.status && innerData.data !== undefined) {
                        prometheusResponse = innerData;
                    } 
                    // 如果内层 data 是数组,包装成 Prometheus 格式
                    else if (Array.isArray(innerData)) {
                        prometheusResponse = {
                            status: 'success',
                            data: innerData
                        };
                    }
                    // 如果内层 data 是对象但没有 status,尝试提取 data 字段
                    else if (typeof innerData === 'object' && innerData.data !== undefined) {
                        prometheusResponse = {
                            status: 'success',
                            data: Array.isArray(innerData.data) ? innerData.data : [innerData.data]
                        };
                    }
                    // 其他情况,尝试直接使用
                    else {
                        prometheusResponse = {
                            status: 'success',
                            data: Array.isArray(innerData) ? innerData : (innerData ? [innerData] : [])
                        };
                    }
                }
                // 情况2: 直接返回 Prometheus 格式 { status: "success", data: [...] }
                else if (responseData.status && responseData.data !== undefined) {
                    prometheusResponse = responseData;
                }
                // 情况3: 直接返回数组
                else if (Array.isArray(responseData)) {
                    prometheusResponse = {
                        status: 'success',
                        data: responseData
                    };
                }
                // 情况4: 其他格式,尝试包装
                else {
                    prometheusResponse = {
                        status: 'success',
                        data: []
                    };
                }
            } else {
                // 空响应
                prometheusResponse = {
                    status: 'success',
                    data: []
                };
            }

            // 确保返回标准 Prometheus API 格式
            if (!prometheusResponse.status) {
                prometheusResponse = {
                    status: 'success',
                    data: Array.isArray(prometheusResponse) ? prometheusResponse : []
                };
            }
            
            // 确保 data 是数组格式
            if (!Array.isArray(prometheusResponse.data)) {
                // 尝试转换为数组
                if (prometheusResponse.data && typeof prometheusResponse.data === 'object') {
                    // 如果是对象,尝试提取值
                    const values = Object.values(prometheusResponse.data);
                    prometheusResponse.data = values.length > 0 ? values : [];
                } else {
                    prometheusResponse.data = [];
                }
            }
            
            // 确保数组中的元素都是字符串
            if (Array.isArray(prometheusResponse.data)) {
                prometheusResponse.data = prometheusResponse.data.map(item => {
                    // 确保返回字符串
                    return String(item);
                }).filter(item => item && item.trim()); // 过滤空值
            }

            // 创建 Response 对象
            return new Response(
                JSON.stringify(prometheusResponse),
                {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (error) {
            console.error('[PromQL 补全] 请求失败:', {
                error: error.message,
                stack: error.stack,
                url: input instanceof Request ? input.url : input
            });
            
            // 返回错误响应
            return new Response(
                JSON.stringify({
                    status: 'error',
                    errorType: error.name || 'UnknownError',
                    error: error.message || '请求失败'
                }),
                {
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    };
}

