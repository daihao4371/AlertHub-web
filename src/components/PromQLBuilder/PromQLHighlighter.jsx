import React, { useMemo } from 'react';

/**
 * PromQL 语法高亮组件
 * 高亮显示 PromQL 查询语句中的关键字、函数、指标名、标签等
 */
const PromQLHighlighter = ({ query }) => {
    const highlightedContent = useMemo(() => {
        if (!query || !query.trim()) {
            return null;
        }

        const text = query;
        const parts = [];
        let lastIndex = 0;

        // 定义高亮规则（按优先级排序，越靠前优先级越高）
        const rules = [
            {
                // 字符串值（引号内的内容）- 最高优先级
                regex: /(["'])([^"']*)\1/g,
                color: '#eb2f96',
                type: 'string'
            },
            {
                // 函数名（后面跟括号或 by 子句）
                regex: /\b(sum|avg|max|min|count|rate|irate|increase|delta|deriv|predict_linear|histogram_quantile|quantile|topk|bottomk|stddev|stdvar|count_values|absent|absent_over_time|clamp_max|clamp_min|changes|day_of_month|day_of_week|days_in_month|hour|minute|month|year|timestamp|vector|scalar|label_replace|label_join|ln|log2|log10|exp|sqrt|abs|ceil|floor|round|clamp|time|sgn|sort|sort_desc)\s*(?:by\s*\([^)]+\))?\s*\(/gi,
                color: '#1890ff',
                type: 'function',
                fontWeight: 600
            },
            {
                // 关键字
                regex: /\b(by|without|on|ignoring|group_left|group_right|and|or|unless|bool|offset)\b/gi,
                color: '#722ed1',
                type: 'keyword',
                fontWeight: 600
            },
            {
                // 标签名和操作符（label=~"value" 或 label="value"）
                regex: /(\w+)\s*(=~?|!=|!~)\s*["']/g,
                color: '#fa8c16',
                type: 'label'
            },
            {
                // 指标名（后面跟 { 或空格+运算符，且不是函数名）
                // 排除已知的函数名和关键字
                regex: /\b([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(?=\{)/g,
                color: '#52c41a',
                type: 'metric'
            },
            {
                // 比较运算符（必须在算术运算符之前）
                regex: /(==|!=|>=|<=|=~|!~)/g,
                color: '#f5222d',
                type: 'operator',
                fontWeight: 600
            },
            {
                // 算术运算符
                regex: /([+\-*/%])/g,
                color: '#f5222d',
                type: 'operator',
                fontWeight: 600
            },
            {
                // 时间单位（数字后的单位，如 5m, 1h）
                regex: /\b(\d+\.?\d*)\s*([smhdwy])\b/g,
                color: '#13c2c2',
                type: 'number'
            },
            {
                // 纯数字
                regex: /\b(\d+\.?\d*)\b/g,
                color: '#13c2c2',
                type: 'number'
            }
        ];

        // 收集所有匹配项
        const matches = [];
        rules.forEach((rule, ruleIndex) => {
            let match;
            const regex = new RegExp(rule.regex.source, rule.regex.flags);
            while ((match = regex.exec(text)) !== null) {
                // 检查是否在字符串内（避免重复高亮）
                let inString = false;
                let quoteCount = 0;
                for (let i = 0; i < match.index; i++) {
                    if ((text[i] === '"' || text[i] === "'") && (i === 0 || text[i - 1] !== '\\')) {
                        quoteCount++;
                    }
                }
                inString = quoteCount % 2 === 1;

                // 如果规则是字符串类型，跳过（已经在字符串内）
                if (rule.type === 'string' && inString) {
                    continue;
                }

                // 如果不在字符串内，或者是字符串规则本身，则添加匹配
                if (!inString || rule.type === 'string') {
                    matches.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0],
                        color: rule.color,
                        fontWeight: rule.fontWeight || 'normal',
                        ruleIndex
                    });
                }
            }
        });

        // 按位置排序并去重
        matches.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            // 相同位置时，优先选择更长的匹配
            return (b.end - b.start) - (a.end - a.start);
        });

        // 移除重叠的匹配（保留优先级更高的，即 ruleIndex 更小的）
        const filteredMatches = [];
        let lastEnd = 0;
        matches.forEach(match => {
            if (match.start >= lastEnd) {
                filteredMatches.push(match);
                lastEnd = match.end;
            } else {
                // 如果重叠，检查优先级（ruleIndex 越小优先级越高）
                const existingMatch = filteredMatches[filteredMatches.length - 1];
                if (match.ruleIndex < existingMatch.ruleIndex) {
                    // 新匹配优先级更高，替换
                    filteredMatches[filteredMatches.length - 1] = match;
                    lastEnd = match.end;
                }
            }
        });

        // 构建高亮部分
        filteredMatches.forEach(match => {
            // 添加匹配前的普通文本
            if (match.start > lastIndex) {
                parts.push({
                    text: text.substring(lastIndex, match.start),
                    color: '#333',
                    fontWeight: 'normal'
                });
            }

            // 添加高亮的匹配文本
            parts.push({
                text: match.text,
                color: match.color,
                fontWeight: match.fontWeight
            });

            lastIndex = match.end;
        });

        // 添加剩余的普通文本
        if (lastIndex < text.length) {
            parts.push({
                text: text.substring(lastIndex),
                color: '#333',
                fontWeight: 'normal'
            });
        }

        // 如果没有匹配到任何内容，返回原始文本
        if (parts.length === 0) {
            parts.push({
                text: text,
                color: '#333',
                fontWeight: 'normal'
            });
        }

        return parts;
    }, [query]);

    if (!query || !query.trim()) {
        return <span style={{ color: '#999' }}>请先选择指标...</span>;
    }

    if (!highlightedContent) {
        return <span style={{ color: '#999' }}>请先选择指标...</span>;
    }

    return (
        <code style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace' }}>
            {highlightedContent.map((part, index) => (
                <span
                    key={index}
                    style={{
                        color: part.color,
                        fontWeight: part.fontWeight
                    }}
                >
                    {part.text}
                </span>
            ))}
        </code>
    );
};

export default PromQLHighlighter;

