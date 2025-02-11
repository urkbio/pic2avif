# 图片转AVIF工具

一个简单易用的图形界面工具，用于将常见图片格式转换为AVIF格式。支持批量转换，针对macOS平台优化。

## 功能特点

- 支持多种图片格式转换：JPG、JPEG、PNG、WebP、TIFF、GIF、BMP、HEIF、HEIC
- 批量转换功能
- 多线程并行处理，充分利用CPU性能
- 针对HEIC/HEIF格式的特殊优化处理
- 简洁直观的用户界面
- 支持拖拽操作

## 安装说明

### 直接下载

1. 从[Releases](https://github.com/urkbio/pic2avif/releases)页面下载最新版本的DMG文件
2. 打开DMG文件，将应用拖入Applications文件夹
3. 在Applications文件夹中双击启动应用

### 从源码构建

如果你想从源码构建应用，请按照以下步骤操作：

```bash
# 克隆仓库
git clone https://github.com/urkbio/pic2avif.git

# 进入项目目录
cd pic2avif

# 安装依赖
npm install

# 启动开发服务器
npm start

# 打包应用
npm run dist
```

## 使用方法

1. 启动应用
2. 点击"选择源文件夹"按钮，选择包含需要转换图片的文件夹
3. 点击"选择目标文件夹"按钮，选择转换后的AVIF文件保存位置
4. 点击"开始转换"按钮，等待转换完成

## 技术实现

- 使用Electron框架构建跨平台桌面应用
- 使用Sharp库进行图片处理和转换
- 采用Worker Threads实现并行处理
- 针对HEIC/HEIF格式，使用系统自带的sips命令进行预处理

## 开发计划

- [ ] 添加转换质量和压缩率的自定义选项
- [ ] 支持更多图片格式
- [ ] 添加转换进度显示
- [ ] 支持取消正在进行的转换任务
- [ ] 添加暗黑模式支持

## 贡献指南

欢迎提交Issue和Pull Request。在提交PR之前，请确保：

1. 代码符合项目的编码规范
2. 添加必要的测试用例
3. 更新相关文档

## 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。