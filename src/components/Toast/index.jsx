import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 统一使用顶部居中
const defaultPosition = 'top-center';

// Toast 通知工具函数
export const showToast = {
    // 成功通知
    success: (message, options = {}) => {
        toast.success(message, {
            position: defaultPosition,
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options,
        });
    },

    // 错误通知
    error: (message, options = {}) => {
        toast.error(message, {
            position: defaultPosition,
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options,
        });
    },

    // 警告通知
    warning: (message, options = {}) => {
        toast.warning(message, {
            position: defaultPosition,
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options,
        });
    },

    // 信息通知
    info: (message, options = {}) => {
        toast.info(message, {
            position: defaultPosition,
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options,
        });
    },
};

// Toast 容器组件 - 顶部居中显示，需在 App.jsx 中使用
export const ToastProvider = () => {
    return (
        <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            style={{
                fontSize: '14px',
            }}
        />
    );
};

export default showToast;