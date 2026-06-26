import axios from 'axios'
import { message } from 'antd'

// 创建 axios 实例
const request = axios.create({
    baseURL: '',
    timeout: 60000,
})

// 请求拦截器：自动带上 token
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器：统一处理错误
request.interceptors.response.use(
    (response) => {
        return response.data
    },
    (error) => {
        console.error('请求错误:', error)

        if (error.response?.status === 401) {
            // token 过期或无效，跳转到登录页
            localStorage.removeItem('token')
            window.location.href = '/login'
            message.error('登录已过期，请重新登录')
        } else {
            message.error(error.response?.data?.detail || '请求失败')
        }

        return Promise.reject(error)
    }
)

export default request