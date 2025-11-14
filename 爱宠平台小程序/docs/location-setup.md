# 地点选择功能配置说明

## 概述

新的地点选择功能提供了多种获取位置信息的方式，解决了原有地点填写无法使用的问题。

## 功能特性

✅ **多种定位方式**
- 微信官方 `wx.getLocation` API 获取当前位置
- 微信官方 `wx.chooseLocation` 地图选择
- 腾讯地图API逆地理编码
- 高德地图API备用方案
- 地点搜索功能
- 手动输入地址

✅ **智能降级策略**
- 自动检测权限状态
- 多种API自动切换
- 友好的错误提示

✅ **用户体验优化**
- 搜索防抖处理
- 加载状态提示
- 权限引导

## 配置步骤

### 1. 申请地图API密钥

#### 腾讯地图API（推荐）
1. 访问 [腾讯位置服务](https://lbs.qq.com/)
2. 注册账号并创建应用
3. 获取API密钥

#### 高德地图API（备用）
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册账号并创建应用
3. 获取API密钥

### 2. 配置API密钥

编辑 `config/map.js` 文件：

```javascript
export const MAP_CONFIG = {
  // 腾讯地图API密钥（主要使用）
  TENCENT_MAP_KEY: '你的腾讯地图API密钥',
  
  // 高德地图API密钥（备用）
  AMAP_KEY: '你的高德地图API密钥',
  
  // 其他配置保持默认即可
};
```

### 3. 配置微信公众平台

在微信公众平台配置服务器域名白名单：

**开发管理 > 开发设置 > 服务器域名**

添加以下域名到 `request合法域名`：
- `https://apis.map.qq.com`（腾讯地图）
- `https://restapi.amap.com`（高德地图）

### 4. 配置小程序权限

在 `app.json` 中确保包含位置权限：

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于小程序位置接口的效果展示"
    }
  }
}
```

## 使用方法

### 在页面中使用

1. **在页面配置文件中引入组件**（如 `create.json`）：
```json
{
  "usingComponents": {
    "location-picker": "/components/location-picker/location-picker"
  }
}
```

2. **在页面模板中使用**：
```xml
<location-picker 
  location="{{formData.location}}"
  placeholder="请选择地点"
  enable-manual="{{true}}"
  bind:locationchange="onLocationChange">
</location-picker>
```

3. **在页面JS中处理事件**：
```javascript
onLocationChange(e) {
  const location = e.detail.location;
  this.setData({
    'formData.location': location
  });
}
```

### 组件属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| location | Object | null | 当前选中的位置信息 |
| placeholder | String | "请选择地点" | 占位符文本 |
| enable-manual | Boolean | true | 是否启用手动输入 |

### 位置对象结构

```javascript
{
  name: "位置名称",
  address: "详细地址", 
  lat: 纬度,
  lng: 经度
}
```

## 功能测试

### 自动化测试

项目提供了自动化测试脚本，可以快速检查配置和功能状态：

```javascript
// 在页面JS中导入测试模块
import { quickLocationTest, runLocationTests } from '../../test/location-test.js';

// 快速测试（适合开发调试）
quickLocationTest();

// 完整测试（适合部署前检查）
runLocationTests().then(results => {
  console.log('测试结果:', results);
});
```

### 手动测试场景

#### 1. 基础功能测试

**权限正常情况：**
- 点击地点选择
- 选择"获取当前位置"
- 验证是否正确获取位置和地址

**权限拒绝情况：**
- 拒绝位置权限
- 验证是否显示权限引导
- 验证备用方案是否生效

#### 2. 搜索功能测试

**关键词搜索：**
- 输入地点关键词（如"北京大学"）
- 验证搜索结果准确性
- 选择搜索结果并确认

**附近搜索：**
- 先获取当前位置
- 搜索附近地点（如"咖啡厅"）
- 验证结果按距离排序

#### 3. 手动输入测试

**完整地址输入：**
- 选择"手动输入"
- 输入完整地址信息
- 验证地址保存和显示

#### 4. 网络异常测试

**断网情况：**
- 断开网络连接
- 测试各功能降级表现
- 验证错误提示

**API异常：**
- 配置错误的API密钥
- 验证错误处理和备用方案

### 测试检查清单

- [ ] API密钥配置正确
- [ ] 微信公众平台域名白名单已添加
- [ ] 位置权限配置正确
- [ ] 获取当前位置功能正常
- [ ] 地图选择功能正常
- [ ] 地点搜索功能正常
- [ ] 手动输入功能正常
- [ ] 权限拒绝时的降级方案正常
- [ ] 网络异常时的错误处理正常
- [ ] 各种边界情况处理正常

## 常见问题

### Q: 地点选择没有反应？
A: 检查以下配置：
1. API密钥是否正确配置
2. 微信公众平台域名白名单是否添加
3. 小程序位置权限是否配置

### Q: 搜索不到结果？
A: 可能原因：
1. 网络连接问题
2. API密钥配额不足
3. 搜索关键词过于模糊

### Q: 定位不准确？
A: 建议：
1. 在室外开阔环境测试
2. 检查手机GPS设置
3. 使用地图选择功能手动调整

## 技术支持

如遇到问题，请检查：
1. 微信开发者工具控制台错误信息
2. 网络请求是否成功
3. API密钥配置是否正确

更多技术细节请参考：
- [微信小程序位置接口文档](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html)
- [腾讯位置服务文档](https://lbs.qq.com/miniProgram/jsSdk/jsSdkGuide/jsSdkOverview)
- [高德地图API文档](https://lbs.amap.com/api/webservice/summary)