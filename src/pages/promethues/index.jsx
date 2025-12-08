import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { autocompletion, completionKeymap, acceptCompletion, closeBrackets } from "@codemirror/autocomplete";
import { PromQLExtension } from '@prometheus-io/codemirror-promql';
import PromQLBuilder from '../../components/PromQLBuilder';
import { createPromQLCompletionFetch } from '../../utils/promqlCompletion';
import './index.css';

// PromQL 编辑器主题样式
const theme = EditorView.theme({
    '&': {
        '&.cm-focused': {
            outline: 'none',
            borderColor: '#40a9ff',
            boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)',
        },
    },
    '.cm-scroller': {
        overflow: 'visible',
        fontFamily: '"DejaVu Sans Mono", monospace',
    },
    '.cm-placeholder': {
        fontFamily:
            '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
    },
    '.cm-matchingBracket': {
        color: '#000',
        backgroundColor: '#dedede',
        fontWeight: 'bold',
        outline: '1px dashed transparent',
    },
    '.cm-nonmatchingBracket': { borderColor: 'red' },
    '.cm-tooltip': {
        backgroundColor: '#f8f8f8',
        borderColor: 'rgba(52, 79, 113, 0.2)',
    },
    '.cm-line': {
        '&::selection': {
            backgroundColor: '#add6ff',
        },
        '& > span::selection': {
            backgroundColor: '#add6ff',
        },
    },
    '.cm-selectionMatch': {
        backgroundColor: '#e6f3ff',
    },
    '.cm-diagnostic': {
        '&.cm-diagnostic-error': {
            borderLeft: '3px solid #e65013',
        },
    },
});

// 导出 PromDoc 函数(保持兼容性)
export const PromDoc = () => {
    return "";
};

/**
 * PrometheusPromQL 组件 - 使用 @prometheus-io/codemirror-promql 实现 PromQL 编辑器
 *
 * Props:
 * - datasourceId: 数据源 ID,用于查询构建器
 * - value: PromQL 查询语句(可以是字符串或返回字符串的函数)
 * - setPromQL: 更新 PromQL 的回调函数
 * - addr: Prometheus 地址(已废弃,保留用于向后兼容)
 */
export const PrometheusPromQL = (props) => {
    // 解构 props 以避免 ESLint 警告
    const { value, setPromQL, datasourceId } = props;
    
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const promqlExtensionRef = useRef(null);
    // 用于标记是否正在由外部更新编辑器内容,避免循环更新
    const isExternalUpdateRef = useRef(false);
    // 防抖定时器引用,用于延迟状态更新
    const debounceTimerRef = useRef(null);
    const [doc, setDoc] = useState('');
    const [builderVisible, setBuilderVisible] = useState(false);

    // 使用 ref 保存回调函数，避免编辑器重新初始化
    const onExpressionChangeRef = useRef(null);
    const setPromQLRef = useRef(null);

    // 更新回调函数引用
    onExpressionChangeRef.current = (expression) => {
        if (expression !== undefined) {
            setDoc(expression);
        }
    };
    setPromQLRef.current = setPromQL;

    // 从 props 初始化文档内容(仅在组件挂载时)
    useEffect(() => {
        const propValue = typeof value === 'function' ? value() : value;
        if (propValue !== undefined && !viewRef.current) {
            setDoc(propValue || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 只在组件挂载时初始化一次

    // 初始化编辑器(只初始化一次)
    useEffect(() => {
        if (!containerRef.current || viewRef.current) {
            return;
        }

        // 创建 PromQL Extension 实例
        // 根据官方文档: https://www.npmjs.com/package/@prometheus-io/codemirror-promql
        // 基本用法: new PromQLExtension().setComplete({ remote: { url: '...' } })
        const promqlExtension = new PromQLExtension();
        promqlExtensionRef.current = promqlExtension;

        // 激活语法检查
        promqlExtension.activateLinter(true);

        // 配置远程补全功能(必须在创建编辑器之前配置)
        // 这是启用指标名称和标签补全的关键步骤
        if (datasourceId) {
            // 创建一个函数来获取当前编辑器内容,用于从 PromQL 语句中提取指标名称
            // 重要: 这个函数会在 fetchFn 被调用时执行,此时编辑器应该已经创建
            // 使用闭包捕获 viewRef,确保每次调用时都能获取最新的编辑器内容
            const getCurrentQuery = () => {
                // 优先从 viewRef 获取编辑器内容(这是最准确的)
                if (viewRef.current) {
                    try {
                        return viewRef.current.state.doc.toString();
                    } catch (e) {
                        // 静默处理错误
                    }
                }
                // 如果编辑器还不存在,尝试从 doc state 获取(作为 fallback)
                return doc || '';
            };
            const customFetch = createPromQLCompletionFetch(datasourceId, getCurrentQuery);
            if (customFetch) {
                try {
                    // 动态获取基础 URL,避免硬编码
                    // 注意: @prometheus-io/codemirror-promql 会自动在基础 URL 后添加 /api/v1 前缀
                    // 所以这里只需要提供 origin,不要包含 /api/v1
                    // 这个 URL 只是虚拟的,实际请求通过 fetchFn 处理
                    const prometheusApiBaseUrl = window.location.origin;
                    
                    // 配置远程补全: 这是启用指标名称和标签补全的关键
                    // 根据官方文档: https://www.npmjs.com/package/@prometheus-io/codemirror-promql
                    // 重要: url 参数是唯一的强制参数,用于初始化 Prometheus 客户端
                    // 如果没有这个参数,其余配置会被忽略,Prometheus 客户端不会被初始化
                    // 这会导致标签补全链路被中断
                    // 
                    // 补全流程:
                    // 1. 用户输入指标名称 → 触发 /api/v1/label/__name__/values 获取指标列表
                    // 2. 用户输入 { → 触发 /api/v1/labels 获取标签名称列表
                    // 3. 用户输入标签名称 → 触发 /api/v1/label/{labelName}/values 获取标签值列表
                    const completionConfig = {
                        remote: {
                            // ✅ 关键: url 参数是唯一的强制参数,必须在 remote 对象中
                            // 这个 URL 是虚拟的,实际请求通过 fetchFn 处理
                            // @prometheus-io/codemirror-promql 会自动在基础 URL 后添加 /api/v1 前缀
                            url: prometheusApiBaseUrl,
                            // 自定义 fetch 函数,将 Prometheus API 请求转换为后端代理 API
                            fetchFn: customFetch,
                            // 查询时间范围(12小时)
                            lookbackInterval: 12 * 60 * 60 * 1000,
                            // HTTP 方法
                            // 注意: Prometheus 客户端默认使用 POST 方法调用 /api/v1/labels 和 /api/v1/series
                            // 虽然我们的后端 /labels 只支持 GET,但 fetchFn 会自动转换 POST 为 GET
                            // 所以这里不设置 httpMethod,让客户端使用默认的 POST,由 fetchFn 处理转换
                            // httpMethod: 'GET', // 注释掉,让客户端使用默认 POST,由 fetchFn 转换
                            // 错误处理
                            httpErrorHandler: (error) => {
                                console.error('[PromQL 补全] HTTP 错误:', error);
                            }
                        },
                        // 启用缓存以提高性能
                        cache: {
                            maxAge: 5 * 60 * 1000, // 5分钟缓存
                        },
                        // maxMetricsMetadata: 最大指标元数据数量
                        // 问题: 如果设置过低(如 1000),只会加载前 1000 个指标
                        // 这会导致 node_load* 等指标可能没有被加载,从而无法获取标签
                        // 解决方案: 根据诊断文档,应该设置为 10000 或更大,确保所有指标都被加载
                        maxMetricsMetadata: 10000, // 10000 确保加载足够多的指标,包括 node_load* 等
                    };
                    
                    // 验证配置: 确保 url 参数存在
                    if (!completionConfig.remote.url) {
                        console.error('[PromQL 编辑器] ❌ 错误: remote.url 参数缺失!');
                        console.error('[PromQL 编辑器] ❌ 根据官方文档,url 是唯一的强制参数,没有它配置会被忽略');
                        throw new Error('remote.url 参数是必需的');
                    }
                    
                    // 应用配置
                    // 根据官方文档: setComplete() 会自动激活补全功能,不需要手动调用 activateCompletion()
                    promqlExtension.setComplete(completionConfig);
                    
                    // 确保补全功能已激活(在 setComplete 之后再次确认)
                    promqlExtension.activateCompletion(true);
                } catch (error) {
                    console.error('[PromQL 编辑器] ❌ 配置远程补全失败:', error);
                }
            }
        }

        // 创建编辑器状态
        const extensions = [
            theme,
            EditorView.lineWrapping,
            promqlExtension.asExtension(), // 包含语法高亮和语法检查
            // 启用自动配对括号: 输入 { 时自动补全 }
            // 支持: {}, [], (), "", ''
            closeBrackets(),
            // 启用自动补全(自动触发,无需快捷键)
            // autocompletion() 默认会在输入时自动触发补全
            // 配置选项:
            // - minLength: 最小字符数,输入至少 1 个字符后触发
            // - defaultKeymap: 启用默认快捷键(Ctrl/Cmd+Space 手动触发)
            // 重要: PromQLExtension 会根据上下文自动判断补全类型
            // - 在输入指标名称时,会优先触发远程补全(/api/v1/label/__name__/values)获取指标列表
            // - 在输入函数时,会显示内置函数列表
            // - 在输入聚合操作符时,会显示聚合操作符列表
            autocompletion({
                minLength: 1, // 输入至少 1 个字符后触发补全
                defaultKeymap: true, // 启用默认快捷键
                // 确保补全能够正确触发
                activateOnTyping: true, // 输入时自动激活
            }),
            // 补全快捷键映射(兼容 macOS)
            keymap.of([
                ...completionKeymap,
                // Tab 键: 当补全面板打开时,接受当前选中的补全项
                {
                    key: "Tab",
                    run: acceptCompletion,
                },
                // Escape 键: 关闭补全面板或取消焦点
                {
                    key: "Escape",
                    run: (v) => {
                        v.contentDOM.blur();
                        return false;
                    },
                },
            ]),
            // 监听文档变化
            EditorView.updateListener.of((update) => {
                // 如果是外部更新触发的,不处理,避免循环
                if (isExternalUpdateRef.current) {
                    return;
                }
                
                if (update.docChanged) {
                    const newContent = update.state.doc.toString();
                    
                    // 清除之前的防抖定时器
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }
                    
                    // 使用防抖延迟状态更新,避免频繁更新导致循环
                    debounceTimerRef.current = setTimeout(() => {
                        // 更新本地状态(用于同步显示)
                        setDoc(newContent);
                        // 使用 ref 调用回调,避免依赖问题
                        if (onExpressionChangeRef.current) {
                            onExpressionChangeRef.current(newContent);
                        }
                        // 实时更新父组件状态
                        if (setPromQLRef.current) {
                            setPromQLRef.current(newContent);
                        }
                    }, 50); // 50ms 防抖延迟
                }
            }),
        ];
        
        // 使用初始 doc 值创建编辑器状态
        const initialDoc = typeof value === 'function' ? value() : (value || '');
        const startState = EditorState.create({
            doc: initialDoc || '',
            extensions: extensions,
        });

        // 创建编辑器视图
        viewRef.current = new EditorView({
            state: startState,
            parent: containerRef.current,
        });

        // 自动聚焦
        viewRef.current.focus();

        // 清理函数
        return () => {
            // 清除防抖定时器
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datasourceId]); // 当 datasourceId 变化时重新初始化编辑器以更新补全配置

    // 更新补全配置(当 datasourceId 变化时,编辑器已存在)
    // 注意: 如果编辑器已创建,需要重新配置补全功能
    useEffect(() => {
        if (!promqlExtensionRef.current || !datasourceId || !viewRef.current) {
            return;
        }

        // 配置补全数据源(使用后端代理 API)
        // 创建一个函数来获取当前编辑器内容,用于从 PromQL 语句中提取指标名称
        const getCurrentQuery = () => {
            return viewRef.current ? viewRef.current.state.doc.toString() : '';
        };
        const customFetch = createPromQLCompletionFetch(datasourceId, getCurrentQuery);
        if (customFetch) {
            try {
                // 动态获取基础 URL,避免硬编码
                // 注意: @prometheus-io/codemirror-promql 会自动在基础 URL 后添加 /api/v1 前缀
                // 所以这里只需要提供 origin,不要包含 /api/v1
                // 这个 URL 只是虚拟的,实际请求通过 fetchFn 处理
                const prometheusApiBaseUrl = window.location.origin;
                
                // 重新配置远程补全功能
                // 根据官方文档: url 参数是唯一的强制参数,必须在 remote 对象中
                const completionConfig = {
                    remote: {
                        // ✅ 关键: url 参数是唯一的强制参数,必须在 remote 对象中
                        // 这个 URL 是虚拟的,实际请求通过 fetchFn 处理
                        url: prometheusApiBaseUrl,
                        // 自定义 fetch 函数,将 Prometheus API 请求转换为后端代理 API
                        fetchFn: customFetch,
                        // 查询时间范围(12小时)
                        lookbackInterval: 12 * 60 * 60 * 1000,
                        // HTTP 方法
                        // 注意: Prometheus 客户端默认使用 POST 方法调用 /api/v1/labels 和 /api/v1/series
                        // 虽然我们的后端 /labels 只支持 GET,但 fetchFn 会自动转换 POST 为 GET
                        // 所以这里不设置 httpMethod,让客户端使用默认的 POST,由 fetchFn 处理转换
                        // httpMethod: 'GET', // 注释掉,让客户端使用默认 POST,由 fetchFn 转换
                        // 错误处理
                        httpErrorHandler: (error) => {
                            console.error('[PromQL 补全] HTTP 错误:', error);
                        }
                    },
                    // 启用缓存以提高性能
                    cache: {
                        maxAge: 5 * 60 * 1000, // 5分钟缓存
                    },
                    // maxMetricsMetadata: 最大指标元数据数量
                    // 注意: 如果设置过低(如 1000),只会加载前 1000 个指标
                    // 这会导致 node_load* 等指标可能没有被加载,从而无法获取标签
                    // 根据诊断文档,应该设置为 10000 或更大
                    maxMetricsMetadata: 10000, // 10000 确保加载足够多的指标,包括 node_load* 等
                };
                
                // 验证配置: 确保 url 参数存在
                if (!completionConfig.remote.url) {
                    console.error('[PromQL 编辑器] ❌ 错误: remote.url 参数缺失!');
                    console.error('[PromQL 编辑器] ❌ 根据官方文档,url 是唯一的强制参数,没有它配置会被忽略');
                    return;
                }
                
                // 应用配置
                // 根据官方文档: setComplete() 会自动激活补全功能,不需要手动调用 activateCompletion()
                promqlExtensionRef.current.setComplete(completionConfig);
                
                // 确保补全功能已激活(在 setComplete 之后再次确认)
                promqlExtensionRef.current.activateCompletion(true);
            } catch (error) {
                console.error('[PromQL 编辑器] ❌ 更新补全配置失败:', error);
            }
            }
    }, [datasourceId]); // 当 datasourceId 变化时更新补全配置

    // 更新编辑器内容(当 props.value 从外部变化时,不是用户输入)
    useEffect(() => {
        if (!viewRef.current) return;
        
        const propValue = typeof value === 'function' ? value() : value;
        if (propValue === undefined) return;
        
            const currentDoc = viewRef.current.state.doc.toString();
        // 只有当外部传入的值与当前编辑器内容不同时才更新
        // 这样可以避免用户输入时被外部值覆盖
        if (propValue !== currentDoc) {
            // 标记这是外部更新,避免触发 updateListener 导致循环
            isExternalUpdateRef.current = true;
            
                const currentPosition = viewRef.current.state.selection.main.head;
                const transaction = viewRef.current.state.update({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: propValue },
                selection: { anchor: Math.min(currentPosition, propValue.length) }
                });
                viewRef.current.dispatch(transaction);
            setDoc(propValue);
            
            // 在下一个事件循环中重置标志,确保用户输入能正常触发更新
            setTimeout(() => {
                isExternalUpdateRef.current = false;
            }, 0);
        }
    }, [value]); // 只依赖 value,不依赖 doc,避免用户输入时的循环更新


    // 处理查询构建
    const handleQueryBuild = useCallback((query) => {
        if (viewRef.current && query) {
            // 替换整个内容为构建的查询
            const transaction = viewRef.current.state.update({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: query },
                selection: { anchor: query.length }
            });
            viewRef.current.dispatch(transaction);
            viewRef.current.focus();

            // 更新状态
            setDoc(query);
            if (setPromQL) {
                setPromQL(query);
            }
        }
    }, [setPromQL]); // 添加 setPromQL 依赖项

    return (
        <>
            <div className="promInputContent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div ref={containerRef} className="cm-expression-input" style={{ flex: 1 }} />
                <Button
                    type="primary"
                    icon={<BuildOutlined />}
                    style={{backgroundColor: '#000', borderColor: '#000', color: '#fff', height: '32px'}}
                    onClick={() => setBuilderVisible(true)}
                    disabled={!datasourceId}
                    title="查询构建器"
                >
                    构建器
                </Button>
            </div>

            <PromQLBuilder
                visible={builderVisible}
                onClose={() => setBuilderVisible(false)}
                datasourceId={datasourceId}
                onBuild={handleQueryBuild}
                initialQuery={viewRef.current ? viewRef.current.state.doc.toString() : doc}
            />
        </>
    );
};