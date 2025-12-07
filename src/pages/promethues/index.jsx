import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { PromQLExtension } from '@prometheus-io/codemirror-promql';
import { CustomPrometheusClient } from '../../utils/customPrometheusClient';
import MetricSelector from '../../components/MetricSelector';
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
    '.cm-tooltip.cm-tooltip-autocomplete': {
        '& > ul': {
            maxHeight: '350px',
            fontFamily: '"DejaVu Sans Mono", monospace',
            maxWidth: 'unset',
        },
        '& > ul > li': {
            padding: '2px 1em 2px 3px',
        },
        '& li:hover': {
            backgroundColor: '#ddd',
        },
        '& > ul > li[aria-selected]': {
            backgroundColor: '#d6ebff',
            color: 'unset',
        },
        minWidth: '30%',
    },
    '.cm-completionDetail': {
        float: 'right',
        color: '#999',
    },
    '.cm-tooltip.cm-completionInfo': {
        marginTop: '-11px',
        padding: '10px',
        fontFamily: "'Open Sans', 'Lucida Sans Unicode', 'Lucida Grande', sans-serif;",
        border: 'none',
        backgroundColor: '#d6ebff',
        minWidth: '250px',
        maxWidth: 'min-content',
    },
    '.cm-completionMatchedText': {
        textDecoration: 'none',
        fontWeight: 'bold',
        color: '#0066bf',
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
 * PrometheusPromQL 组件 - 使用 @prometheus-io/codemirror-promql 实现自动补全
 *
 * Props:
 * - datasourceId: 数据源 ID,用于后端 API 调用
 * - value: PromQL 查询语句(可以是字符串或返回字符串的函数)
 * - setPromQL: 更新 PromQL 的回调函数
 * - addr: Prometheus 地址(已废弃,保留用于向后兼容)
 */
export const PrometheusPromQL = (props) => {
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const promqlExtensionRef = useRef(null);
    const [doc, setDoc] = useState('');
    const [metricSelectorVisible, setMetricSelectorVisible] = useState(false);

    // 处理编辑器内容变化
    const onExpressionChange = useCallback((expression) => {
        if (expression !== undefined) {
            setDoc(expression);
        }
    }, []);

    // 从 props 初始化文档内容
    useEffect(() => {
        const propValue = typeof props.value === 'function' ? props.value() : props.value;
        if (propValue !== undefined && propValue !== doc) {
            setDoc(propValue || '');
        }
    }, [props.value]);

    // 初始化编辑器
    useEffect(() => {
        if (!containerRef.current || viewRef.current) {
            return;
        }

        console.log('[PrometheusPromQL] 初始化编辑器, datasourceId:', props.datasourceId);

        // 创建 PromQL Extension 实例
        const promqlExtension = new PromQLExtension();
        promqlExtensionRef.current = promqlExtension;

        // 配置自动补全数据源(必须在 activateCompletion 之前调用)
        if (props.datasourceId) {
            console.log('[PrometheusPromQL] 配置自定义客户端, datasourceId:', props.datasourceId);
            const customClient = new CustomPrometheusClient(props.datasourceId);

            // 使用最新的 API: 直接传递客户端实例
            promqlExtension.setComplete({ remote: customClient });

            console.log('[PrometheusPromQL] 自动补全配置完成');
        } else {
            console.warn('[PrometheusPromQL] 警告: 没有提供 datasourceId, 自动补全将不可用');
        }

        // 激活自动补全和语法检查(必须在 setComplete 之后调用)
        promqlExtension.activateCompletion(true);
        promqlExtension.activateLinter(true);

        // 创建编辑器状态
        const startState = EditorState.create({
            doc: doc || '',
            extensions: [
                theme,
                EditorView.lineWrapping,
                promqlExtension.asExtension(),
                // 监听文档变化
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        const newContent = update.state.doc.toString();
                        onExpressionChange(newContent);
                    }

                    // 失去焦点时更新父组件状态
                    if (update.focusChanged && !update.view.hasFocus) {
                        const content = update.state.doc.toString();
                        if (props.setPromQL) {
                            props.setPromQL(content);
                        }
                    }
                }),
                // 键盘快捷键
                keymap.of([
                    {
                        key: "Escape",
                        run: (v) => {
                            v.contentDOM.blur();
                            return false;
                        },
                    },
                ]),
            ],
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
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []); // 只在组件挂载时执行一次

    // 更新编辑器内容(当 props.value 变化时)
    useEffect(() => {
        if (viewRef.current && doc !== undefined) {
            const currentDoc = viewRef.current.state.doc.toString();
            if (currentDoc !== doc) {
                const currentPosition = viewRef.current.state.selection.main.head;
                const transaction = viewRef.current.state.update({
                    changes: { from: 0, to: viewRef.current.state.doc.length, insert: doc },
                    selection: { anchor: Math.min(currentPosition, doc.length) }
                });
                viewRef.current.dispatch(transaction);
            }
        }
    }, [doc]);

    // 更新数据源配置(当 datasourceId 变化时)
    useEffect(() => {
        if (!promqlExtensionRef.current || !props.datasourceId) {
            return;
        }

        console.log('[PrometheusPromQL] 数据源变化, 重新配置, datasourceId:', props.datasourceId);

        const customClient = new CustomPrometheusClient(props.datasourceId);
        promqlExtensionRef.current.setComplete({ remote: customClient });

        console.log('[PrometheusPromQL] 自动补全配置已更新');
    }, [props.datasourceId]);

    // 处理指标选择
    const handleMetricSelect = useCallback((metric) => {
        if (viewRef.current) {
            const currentDoc = viewRef.current.state.doc.toString();
            const currentPosition = viewRef.current.state.selection.main.head;

            // 在光标位置插入指标名称
            const transaction = viewRef.current.state.update({
                changes: { from: currentPosition, insert: metric },
                selection: { anchor: currentPosition + metric.length }
            });
            viewRef.current.dispatch(transaction);
            viewRef.current.focus();

            // 更新状态
            const newContent = currentDoc.substring(0, currentPosition) + metric + currentDoc.substring(currentPosition);
            setDoc(newContent);
            if (props.setPromQL) {
                props.setPromQL(newContent);
            }
        }
    }, [props.setPromQL]);

    return (
        <>
            <div className="promInputContent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div ref={containerRef} className="cm-expression-input" style={{ flex: 1 }} />
                <Button
                    icon={<SearchOutlined />}
                    onClick={() => setMetricSelectorVisible(true)}
                    disabled={!props.datasourceId}
                    title="指标浏览器"
                >
                    指标
                </Button>
            </div>

            <MetricSelector
                visible={metricSelectorVisible}
                onClose={() => setMetricSelectorVisible(false)}
                datasourceId={props.datasourceId}
                onSelect={handleMetricSelect}
            />
        </>
    );
};