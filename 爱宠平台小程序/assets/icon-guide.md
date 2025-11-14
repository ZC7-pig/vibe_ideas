# 图标使用指南

## 当前状态
为了避免启动错误，我们暂时移除了 tabBar 的图标配置。小程序现在可以正常启动，但底部导航栏没有图标。

## 添加图标步骤

### 1. 准备图标文件
你需要准备以下6个图标文件（建议尺寸：81x81px）：

- `home.png` - 首页图标（未选中）
- `home_active.png` - 首页图标（选中）
- `add.png` - 发布图标（未选中）
- `add_active.png` - 发布图标（选中）
- `me.png` - 我的图标（未选中）
- `me_active.png` - 我的图标（选中）

### 2. 将图标文件放入 assets 文件夹

### 3. 修改 app.json
将 tabBar 配置修改为：

```json
"tabBar": {
  "list": [
    {
      "pagePath": "pages/home/index",
      "text": "首页",
      "iconPath": "assets/home.png",
      "selectedIconPath": "assets/home_active.png"
    },
    {
      "pagePath": "pages/post/create",
      "text": "发布",
      "iconPath": "assets/add.png",
      "selectedIconPath": "assets/add_active.png"
    },
    {
      "pagePath": "pages/profile/index",
      "text": "我的",
      "iconPath": "assets/me.png",
      "selectedIconPath": "assets/me_active.png"
    }
  ],
  "color": "#666",
  "selectedColor": "#FF8C00",
  "backgroundColor": "#ffffff",
  "borderStyle": "black"
}
```

## 图标设计建议

- 使用简洁的线性图标风格
- 主色调使用橙色（#FF8C00）
- 融入宠物相关元素
- 保持一致的视觉风格

## 在线图标资源

- Iconfont (阿里巴巴矢量图标库)
- Feather Icons
- Material Design Icons
- Font Awesome

## 临时解决方案

如果暂时没有图标，可以：
1. 使用纯文字的 tabBar（当前状态）
2. 下载免费图标并调整尺寸
3. 使用在线图标生成工具