import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { PromQLExtension } from '@prometheus-io/codemirror-promql';
import PromQLBuilder from '../../components/PromQLBuilder';
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

    // 处理编辑器内容变化
    const onExpressionChange = useCallback((expression) => {
        if (onExpressionChangeRef.current) {
            onExpressionChangeRef.current(expression);
        }
    }, []);

    // 从 props 初始化文档内容
    useEffect(() => {
        const propValue = typeof value === 'function' ? value() : value;
        if (propValue !== undefined && propValue !== doc) {
            setDoc(propValue || '');
        }
    }, [value, doc]);

    // 初始化编辑器
    useEffect(() => {
        if (!containerRef.current || viewRef.current) {
            return;
        }

        // 创建 PromQL Extension 实例
        const promqlExtension = new PromQLExtension();
        promqlExtensionRef.current = promqlExtension;

        // 激活语法检查
        promqlExtension.activateLinter(true);

        // 创建编辑器状态
        const extensions = [
            theme,
            EditorView.lineWrapping,
            promqlExtension.asExtension(), // 包含语法高亮和语法检查
            // 监听文档变化
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const newContent = update.state.doc.toString();
                    onExpressionChange(newContent);
                }

                // 失去焦点时更新父组件状态
                if (update.focusChanged && !update.view.hasFocus) {
                    const content = update.state.doc.toString();
                    if (setPromQLRef.current) {
                        setPromQLRef.current(content);
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
        ];
        
        const startState = EditorState.create({
            doc: doc || '',
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
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []); // 编辑器只初始化一次，避免重新创建

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
                    icon={<BuildOutlined />}
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