# 资源文件说明

此文件夹用于存放小程序的静态资源文件。

## 文件结构

```
assets/
├── icons/              # 图标文件
│   ├── home.png        # 首页图标
│   ├── home_active.png # 首页激活图标
│   ├── add.png         # 发布图标
│   ├── add_active.png  # 发布激活图标
│   ├── me.png          # 我的图标
│   └── me_active.png   # 我的激活图标
├── images/             # 图片文件
│   ├── default-avatar.png    # 默认头像
│   ├── share-image.jpg       # 分享图片
│   ├── hospital-demo.jpg     # 医院示例图
│   ├── grooming-demo.jpg     # 美容示例图
│   └── training-demo.jpg     # 训练示例图
└── README.md          # 本说明文件
```

## 图标规范

- **尺寸**：建议使用 81x81px（3倍图）
- **格式**：PNG格式，支持透明背景
- **命名**：使用小写字母和下划线，如 `home_active.png`

## 图片规范

- **格式**：JPG/PNG格式
- **大小**：单个文件不超过2MB
- **命名**：使用有意义的英文名称

## 使用说明

在小程序中引用资源文件时，使用相对路径：

```javascript
// 在WXML中
<image src="/assets/images/default-avatar.png"></image>

// 在JS中
const imagePath = '/assets/icons/home.png'
```

## 注意事项

1. 所有资源文件都会被打包到小程序中，注意控制总大小
2. 建议对图片进行压缩优化
3. 图标文件建议使用矢量图标或高清图片
4. 避免使用中文文件名

## 图标制作建议

可以使用以下工具制作图标：
- Sketch
- Figma
- Adobe Illustrator
- 在线图标生成工具

推荐的图标风格：
- 线性简约风格
- 融入宠物元素
- 保持一致的视觉风格
- 符合微信小程序设计规范