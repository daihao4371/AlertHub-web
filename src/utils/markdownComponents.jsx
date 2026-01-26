/**
 * Shared Markdown Components for AI Chat
 * Provides reusable components for XMarkdown rendering with CodeHighlighter
 */
import React, { useCallback } from 'react';
import { CodeHighlighter } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
// Import base XMarkdown styles
import '@ant-design/x-markdown/es/XMarkdown/index.css';

/**
 * Custom pre block renderer - removes outer wrapper to avoid nesting
 * XMarkdown renders code blocks as <pre><code>...</code></pre>
 * CodeHighlighter provides its own container, so we remove the <pre> wrapper
 */
export const PreBlock = ({ children }) => <>{children}</>;

/**
 * Custom code block renderer with CodeHighlighter
 * Handles both code blocks (with language) and inline code
 */
export const CodeBlock = ({ className, children, ...props }) => {
    // Extract language from className (e.g., "language-python" -> "python")
    const lang = className?.match(/language-(\w+)/)?.[1] || '';

    // Inline code: no language class
    if (!lang) {
        return <code className={className} {...props}>{children}</code>;
    }

    // Code block: use CodeHighlighter for string content
    if (typeof children !== 'string') return null;

    return <CodeHighlighter lang={lang}>{children}</CodeHighlighter>;
};

/**
 * Markdown components configuration for XMarkdown
 */
export const markdownComponents = {
    pre: PreBlock,
    code: CodeBlock,
};

/**
 * Hook to create a memoized markdown renderer
 * @returns {Function} renderMarkdown function
 */
export const useMarkdownRenderer = () => {
    return useCallback((content, info) => {
        if (!content) return null;

        const isStreaming = info?.status === 'loading';

        return (
            <XMarkdown
                content={content}
                className="x-markdown"
                config={{
                    breaks: true,
                    gfm: true,
                }}
                streaming={{
                    hasNextChunk: isStreaming,
                }}
                components={markdownComponents}
            />
        );
    }, []);
};
