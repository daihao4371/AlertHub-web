import React, { useContext, useMemo } from 'react';
import { Form } from 'antd';

// 表单上下文 - 用于处理嵌套表单字段路径
const MyFormItemContext = React.createContext([]);

// 将字符串或数组转换为数组
const toArr = (str) => (Array.isArray(str) ? str : [str]);

// 表单字段组组件 - 用于设置表单字段的前缀路径
export const MyFormItemGroup = ({ prefix, children }) => {
    const prefixPath = useContext(MyFormItemContext);
    const concatPath = useMemo(() => [...prefixPath, ...toArr(prefix)], [prefixPath, prefix]);
    return <MyFormItemContext.Provider value={concatPath}>{children}</MyFormItemContext.Provider>;
};

// 表单字段项组件 - 自动处理嵌套字段路径
export const MyFormItem = ({ name, ...props }) => {
    const prefixPath = useContext(MyFormItemContext);
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined;
    return <Form.Item name={concatName} {...props} />;
};

// 帮助文本样式
export const helpTextStyle = { fontSize: '12px', color: '#7f838a', marginBottom: '16px' };

// 按钮容器样式
export const buttonContainerStyle = { 
    display: 'flex', 
    justifyContent: 'flex-end', 
    gap: '10px', 
    marginTop: '24px' 
};

// 单选按钮选项
export const radioOptions = [
    { label: '启用', value: true },
    { label: '禁用', value: false },
];

