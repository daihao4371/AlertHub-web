# AlertHub Web - 前端项目

AlertHub 的前端监控面板,基于 React 构建的现代化告警监控系统界面。

## 📦 技术栈

- **框架**: React 18
- **构建工具**: Create React App
- **样式**: Tailwind CSS 4.x
- **状态管理**: React Hooks
- **路由**: React Router

## 🐳 Docker 镜像

### 官方镜像地址
- **前端镜像**: `registry.cn-hangzhou.aliyuncs.com/devops-dh/watchalert-web:beta-v1`

### 使用 Docker 运行

```bash
# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/devops-dh/watchalert-web:beta-v1

# 运行容器
docker run -d \
  --name watchalert-web \
  -p 80:80 \
  -e TZ=Asia/Shanghai \
  registry.cn-hangzhou.aliyuncs.com/devops-dh/watchalert-web:beta-v1
```

访问 [http://localhost](http://localhost) 即可查看应用。

> 💡 **提示**: 该镜像已包含编译后的静态文件和 Nginx 配置,开箱即用。

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖

```bash
npm install
```

### 开发运行

启动开发服务器:

```bash
npm start
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

开发模式下,修改代码后页面会自动重新加载,同时可以在控制台看到 lint 错误提示。

### 生产构建

构建生产版本:

```bash
npm run build
```

构建产物将输出到 `build` 目录,文件已经过压缩优化,并且文件名包含了哈希值,可直接用于生产环境部署。

### 运行测试

启动交互式测试监听模式:

```bash
npm test
```

更多测试信息请参考 [运行测试文档](https://facebook.github.io/create-react-app/docs/running-tests)。

## 📁 项目结构

```
web/
├── public/          # 静态资源
├── src/
│   ├── api/        # API 请求封装
│   ├── components/ # 公共组件
│   ├── pages/      # 页面组件
│   ├── img/        # 图片资源
│   ├── App.js      # 应用主组件
│   └── index.js    # 应用入口
├── package.json
└── README.md
```

## 🔧 配置说明

### 环境变量

项目使用 `.env` 文件配置环境变量,主要配置项:

- `REACT_APP_API_URL`: 后端 API 地址

### Tailwind CSS

Tailwind 配置文件位于 `tailwind.config.js`,可根据需要自定义主题和插件。

## 📝 开发指南

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 React Hooks 最佳实践
- 组件命名使用 PascalCase
- 文件命名使用 camelCase

### Git 提交

提交前端代码:

```bash
./push-frontend.sh "你的提交信息"
```

或手动提交:

```bash
git add .
git commit -m "feat: 你的功能描述"
git push origin master
```

## 📚 更多资源

- [Create React App 文档](https://facebook.github.io/create-react-app/docs/getting-started)
- [React 官方文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)

## ⚙️ 高级配置

### 代码分割

参考文档: [代码分割](https://facebook.github.io/create-react-app/docs/code-splitting)

### 包体积分析

参考文档: [分析包体积](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### PWA 配置

参考文档: [渐进式 Web 应用](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### 部署

参考文档: [部署指南](https://facebook.github.io/create-react-app/docs/deployment)

## 🐛 故障排查

### 构建失败

如果 `npm run build` 构建失败,请参考: [构建故障排查](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## 📄 许可证

本项目基于开源项目改造而来,用于个人学习和使用。

## 🔗 相关仓库

- 后端仓库: [AlertHub](https://github.com/daihao4371/AlertHub)
- 前端仓库: [AlertHub-web](https://github.com/daihao4371/AlertHub-web)