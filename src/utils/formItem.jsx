import React from 'react'
import { Form } from 'antd'

// Shared context for form item path concatenation
export const MyFormItemContext = React.createContext([])

// Convert string or array to array
export function toArr(str) {
    return Array.isArray(str) ? str : [str]
}

// Custom form item component that uses context for path concatenation
export const MyFormItem = ({ name, ...props }) => {
    const prefixPath = React.useContext(MyFormItemContext)
    const concatName = name !== undefined ? [...prefixPath, ...toArr(name)] : undefined
    return <Form.Item name={concatName} {...props} />
}

