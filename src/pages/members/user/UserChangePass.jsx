import { Modal, Form, Input, Button } from 'antd'
import React from 'react'
import { changeUserPass } from '../../../api/user'


// 函数组件
const UserChangePass = ({ visible, onClose, userid, username }) => {

    // 提交
    const handleFormSubmit = async (values) => {
        try {
            const params = {
                ...values,
                userid: userid
            }
            await changeUserPass(params)
        } catch (error) {
            console.error(error)
        }
        // 关闭弹窗
        onClose()

    }

    return (
        <Modal visible={visible} onCancel={onClose} footer={null}>

            <h3>用户名: {username}</h3>

            <Form name="password_form" onFinish={handleFormSubmit} style={{ marginTop: '30px' }}>
                <Form.Item
                    name="password"
                    label="密码"
                    rules={[
                        {
                            required: true,
                            message: '请输入密码！',
                        },
                    ]}
                    hasFeedback
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item
                    name="confirm"
                    label="确认密码"
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        {
                            required: true,
                            message: '请确认密码！',
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve()
                                }
                                return Promise.reject(new Error('两次输入的密码不一致！'))
                            },
                        }),
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Form.Item wrapperCol={{ offset: 100, span: 16 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                        >
                            提交
                        </Button>
                    </Form.Item>
                </div>
            </Form>

        </Modal>
    )
}

export default UserChangePass