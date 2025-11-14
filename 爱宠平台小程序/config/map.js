// config/map.js
// 地图API配置文件

/**
 * 地图服务配置
 * 
 * 使用说明：
 * 1. 腾讯地图API密钥申请：https://lbs.qq.com/
 * 2. 高德地图API密钥申请：https://lbs.amap.com/
 * 3. 需要在微信公众平台配置服务器域名白名单
 * 
 * 域名白名单配置：
 * - 腾讯地图：apis.map.qq.com
 * - 高德地图：restapi.amap.com
 */

export const MAP_CONFIG = {
  // 腾讯地图API密钥（主要使用）
  TENCENT_MAP_KEY: '3HFBZ-HGWC7-62YXN-HX6XF-SEJZF-GUFHK',
  
  // 高德地图API密钥（备用）
  AMAP_KEY: 'YOUR_AMAP_KEY',
  
  // API服务地址
  TENCENT_BASE_URL: 'https://apis.map.qq.com',
  AMAP_BASE_URL: 'https://restapi.amap.com',
  
  // 搜索配置
  SEARCH_CONFIG: {
    // 默认搜索半径（米）
    DEFAULT_RADIUS: 5000,
    // 搜索结果数量限制
    SEARCH_LIMIT: 20,
    // 搜索防抖延迟（毫秒）
    SEARCH_DEBOUNCE: 500
  },
  
  // 位置精度配置
  LOCATION_CONFIG: {
    // 位置类型：wgs84（GPS坐标）、gcj02（国测局坐标）
    COORDINATE_TYPE: 'gcj02',
    // 是否获取高度信息
    ALTITUDE: false,
    // 高精度定位
    HIGH_ACCURACY: true,
    // 定位超时时间（毫秒）
    TIMEOUT: 10000
  }
};

/**
 * 检查API密钥配置
 * @returns {Object} 配置检查结果
 */
export function checkMapConfig() {
  const result = {
    isValid: false,
    hasTencent: false,
    hasAmap: false,
    warnings: []
  };
  
  // 检查腾讯地图配置
  if (MAP_CONFIG.TENCENT_MAP_KEY && MAP_CONFIG.TENCENT_MAP_KEY !== 'YOUR_TENCENT_MAP_KEY') {
    result.hasTencent = true;
  } else {
    result.warnings.push('腾讯地图API密钥未配置');
  }
  
  // 检查高德地图配置
  if (MAP_CONFIG.AMAP_KEY && MAP_CONFIG.AMAP_KEY !== 'YOUR_AMAP_KEY') {
    result.hasAmap = true;
  } else {
    result.warnings.push('高德地图API密钥未配置');
  }
  
  // 至少需要一个API密钥
  result.isValid = result.hasTencent || result.hasAmap;
  
  if (!result.isValid) {
    result.warnings.push('请至少配置一个地图API密钥');
  }
  
  return result;
}

/**
 * 获取推荐的地图服务
 * @returns {string} 推荐的服务类型：'tencent' | 'amap'
 */
export function getRecommendedMapService() {
  const config = checkMapConfig();
  
  // 优先使用腾讯地图
  if (config.hasTencent) {
    return 'tencent';
  }
  
  // 备用高德地图
  if (config.hasAmap) {
    return 'amap';
  }
  
  // 都没有配置，返回腾讯（需要用户配置）
  return 'tencent';
}

export default MAP_CONFIG;