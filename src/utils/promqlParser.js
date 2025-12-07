/**
 * PromQL 解析器工具
 * 用于将 PromQL 查询语句反向解析为构建器状态
 */


/**
 * 解析 PromQL 查询语句，提取指标、标签过滤器和操作
 * @param {string} query - PromQL 查询语句
 * @returns {Object} 解析结果 { expressions, operations }
 * expressions: [{ metric, labelFilters, operator }]
 */
export function parsePromQL(query) {
    if (!query || typeof query !== 'string') {
        return { expressions: [], operations: [] };
    }

    const trimmedQuery = query.trim();
    const operations = [];
    const expressions = [];

    /**
     * 解析包含算术运算的表达式
     */
    function parseExpressionsWithArithmetic(queryStr) {
        const exprList = [];
        const arithmeticOps = /[+\-*/%]/;
        
        if (!arithmeticOps.test(queryStr)) {
            // 没有算术运算符，尝试解析单个指标
            const single = parseMetricAndFilters(queryStr);
            if (single.metric) {
                return [{ metric: single.metric, labelFilters: single.labelFilters || [], operator: null }];
            }
            return [];
        }

        // 找到所有算术运算符的位置（在标签过滤器外）
        let depth = 0;
        let inQuotes = false;
        let quoteChar = null;
        const opPositions = [];
        
        for (let i = 0; i < queryStr.length; i++) {
            const char = queryStr[i];
            
            // 处理引号
            if ((char === '"' || char === "'") && (i === 0 || queryStr[i - 1] !== '\\')) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = null;
                }
                continue;
            }
            
            if (inQuotes) continue;
            
            // 处理括号和花括号
            if (char === '{' || char === '(') depth++;
            if (char === '}' || char === ')') depth--;
            
            // 在标签过滤器外且遇到算术运算符
            if (depth === 0 && arithmeticOps.test(char)) {
                opPositions.push({ index: i, operator: char });
            }
        }

        if (opPositions.length === 0) {
            // 没有找到运算符，解析整个字符串
            const single = parseMetricAndFilters(queryStr);
            if (single.metric) {
                return [{ metric: single.metric, labelFilters: single.labelFilters || [], operator: null }];
            }
            return [];
        }

        // 按运算符位置分割表达式
        // 注意：运算符前后可能有空格，需要正确处理
        let lastIndex = 0;
        opPositions.forEach((op, idx) => {
            // 提取运算符前的表达式（去除尾部空格）
            const exprStr = queryStr.substring(lastIndex, op.index).trim();
            if (exprStr) {
                const parsed = parseMetricAndFilters(exprStr);
                if (parsed.metric) {
                    // 第一个表达式的运算符是 null，后续表达式的运算符是它前面的运算符
                    exprList.push({
                        metric: parsed.metric,
                        labelFilters: parsed.labelFilters || [],
                        operator: idx === 0 ? null : opPositions[idx - 1].operator
                    });
                }
            }
            // 跳过运算符本身
            lastIndex = op.index + 1;
            // 跳过运算符后的空格（如果有）
            while (lastIndex < queryStr.length && queryStr[lastIndex] === ' ') {
                lastIndex++;
            }
        });

        // 处理最后一个表达式（在最后一个运算符之后）
        const lastExprStr = queryStr.substring(lastIndex).trim();
        if (lastExprStr) {
            const parsed = parseMetricAndFilters(lastExprStr);
            if (parsed.metric) {
                // 最后一个表达式的运算符是最后一个运算符
                exprList.push({
                    metric: parsed.metric,
                    labelFilters: parsed.labelFilters || [],
                    operator: opPositions.length > 0 ? opPositions[opPositions.length - 1].operator : null
                });
            }
        }

        return exprList;
    }


    /**
     * 解析指标和标签过滤器
     * 支持处理包含算术运算的表达式（如 metric1{...} - metric2{...}）
     */
    function parseMetricAndFilters(queryStr) {
        queryStr = queryStr.trim();
        
        // 如果包含算术运算符（+, -, *, /, %），尝试提取第一个指标
        const arithmeticOps = /[+\-*/%]/;
        if (arithmeticOps.test(queryStr)) {
            // 找到第一个算术运算符的位置
            let firstOpIndex = -1;
            let depth = 0;
            let inQuotes = false;
            let quoteChar = null;
            
            for (let i = 0; i < queryStr.length; i++) {
                const char = queryStr[i];
                
                // 处理引号
                if ((char === '"' || char === "'") && (i === 0 || queryStr[i - 1] !== '\\')) {
                    if (!inQuotes) {
                        inQuotes = true;
                        quoteChar = char;
                    } else if (char === quoteChar) {
                        inQuotes = false;
                        quoteChar = null;
                    }
                    continue;
                }
                
                if (inQuotes) continue;
                
                // 处理括号
                if (char === '{') depth++;
                if (char === '}') depth--;
                
                // 在标签过滤器外且遇到算术运算符
                if (depth === 0 && arithmeticOps.test(char)) {
                    firstOpIndex = i;
                    break;
                }
            }
            
            if (firstOpIndex > 0) {
                // 提取第一个操作数（指标）
                queryStr = queryStr.substring(0, firstOpIndex).trim();
            }
        }
        
        // 匹配指标名称和标签过滤器: metric{label1="value1", label2=~"value2"}
        const metricPattern = /^([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(?:\{([^}]*)\})?$/;
        const match = queryStr.match(metricPattern);

        if (match) {
            const metricName = match[1];
            const filtersStr = match[2] || '';
            const filters = parseLabelFilters(filtersStr);

            return {
                metric: metricName,
                labelFilters: filters
            };
        }

        return { metric: null, labelFilters: [] };
    }

    /**
     * 解析标签过滤器字符串
     */
    function parseLabelFilters(filtersStr) {
        if (!filtersStr.trim()) {
            return [];
        }

        const filters = [];
        // 匹配标签过滤器: label operator "value" 或 label operator 'value'
        // 支持 =, !=, =~, !~ 操作符
        // 支持单引号和双引号
        // 注意：=~ 和 !~ 必须在 = 和 != 之前匹配，避免误匹配
        // 操作符前后可能有空格，但标准格式是无空格的（label=~"value"）
        const filterPattern = /(\w+)\s*(=~|!~|!=|=)\s*(["'])([^"']*)\3/g;
        let match;

        while ((match = filterPattern.exec(filtersStr)) !== null) {
            filters.push({
                label: match[1],
                operator: match[2],
                value: match[4]
            });
        }

        return filters;
    }

    // 先提取最外层的函数，然后解析内部表达式
    let innerQuery = trimmedQuery;
    
    // 检查是否有外层函数包裹（从外到内）
    while (true) {
        const funcPattern = /^(\w+)\s*(?:by\s*\(([^)]+)\))?\s*\((.+)\)$/;
        const funcMatch = innerQuery.match(funcPattern);
        
        if (!funcMatch) break;
        
        const funcName = funcMatch[1];
        const byClause = funcMatch[2] ? funcMatch[2].trim() : null;
        innerQuery = funcMatch[3].trim();
        
        // 检查是否是时间范围函数
        if (['rate', 'irate', 'increase'].includes(funcName)) {
            const rangeMatch = innerQuery.match(/^(.+)\[([^\]]+)\]$/);
            if (rangeMatch) {
                innerQuery = rangeMatch[1].trim();
                operations.push({
                    func: funcName,
                    params: { range: rangeMatch[2].trim() }
                });
            } else {
                operations.push({
                    func: funcName,
                    params: { range: '5m' }
                });
            }
        } else if (['sum', 'avg', 'max', 'min', 'count'].includes(funcName)) {
            operations.push({
                func: funcName,
                params: { by: byClause || '' }
            });
        } else {
            // 未知函数，停止解析
            break;
        }
    }
    
    // 解析内部表达式（可能包含多个指标和算术运算）
    const parsedExprs = parseExpressionsWithArithmetic(innerQuery);
    if (parsedExprs.length > 0) {
        expressions.push(...parsedExprs);
    } else {
        // 如果没有算术运算，尝试解析单个指标
        const single = parseMetricAndFilters(innerQuery);
        if (single.metric) {
            expressions.push({
                metric: single.metric,
                labelFilters: single.labelFilters || [],
                operator: null
            });
        }
    }

    // 操作已经按从外到内的顺序添加到 operations 数组
    // 但我们需要从内到外的顺序，所以反转数组
    const reversedOps = operations.reverse();

    return {
        expressions: expressions.length > 0 ? expressions : [{ metric: null, labelFilters: [], operator: null }],
        operations: reversedOps
    };
}

/**
 * 从编辑器内容解析 PromQL
 * 如果提供了 initialQuery，则使用它；否则尝试从编辑器获取
 */
export function parseFromEditor(editorContent) {
    if (!editorContent) {
        return { metric: null, labelFilters: [], operations: [] };
    }
    return parsePromQL(editorContent);
}

