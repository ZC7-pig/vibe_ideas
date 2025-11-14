// test/location-test.js
// 地点选择功能测试脚本

import { MAP_CONFIG, checkMapConfig, getRecommendedMapService } from '../config/map.js';

// 环境检查函数
function checkEnvironment() {
  const isWeChatMiniProgram = typeof wx !== 'undefined';
  let hasRouteInfo = false;
  try {
    hasRouteInfo = typeof __route__ !== 'undefined';
  } catch (e) {
    hasRouteInfo = false;
  }
  return { isWeChatMiniProgram, hasRouteInfo };
}

/**
 * 测试地图配置
 */
function testMapConfig() {
  console.log('=== 地图配置测试 ===');
  
  const configResult = checkMapConfig();
  console.log('配置检查结果:', configResult);
  
  if (!configResult.isValid) {
    console.warn('⚠️ 地图API配置不完整，请检查以下问题:');
    configResult.warnings.forEach(warning => {
      console.warn(`- ${warning}`);
    });
  } else {
    console.log('✅ 地图API配置正常');
  }
  
  const recommendedService = getRecommendedMapService();
  console.log(`推荐使用的地图服务: ${recommendedService}`);
  
  return configResult.isValid;
}

/**
 * 测试位置权限
 */
function testLocationPermission() {
  console.log('\n=== 位置权限测试 ===');
  
  const { isWeChatMiniProgram } = checkEnvironment();
  if (!isWeChatMiniProgram) {
    console.warn('⚠️ 非微信小程序环境，跳过权限测试');
    return Promise.resolve(null);
  }
  
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        const hasLocationAuth = res.authSetting['scope.userLocation'];
        console.log('位置权限状态:', hasLocationAuth ? '已授权' : '未授权');
        
        if (hasLocationAuth === false) {
          console.warn('⚠️ 位置权限被拒绝，需要引导用户开启');
        } else if (hasLocationAuth === undefined) {
          console.log('ℹ️ 位置权限未请求，首次使用时会弹出授权');
        } else {
          console.log('✅ 位置权限已授权');
        }
        
        resolve(hasLocationAuth);
      },
      fail: (error) => {
        console.error('获取权限设置失败:', error);
        resolve(false);
      }
    });
  });
}

/**
 * 测试基础定位功能
 */
function testBasicLocation() {
  console.log('\n=== 基础定位测试 ===');
  
  const { isWeChatMiniProgram } = checkEnvironment();
  if (!isWeChatMiniProgram) {
    console.warn('⚠️ 非微信小程序环境，跳过定位测试');
    return Promise.resolve(null);
  }
  
  return new Promise((resolve) => {
    wx.getLocation({
      type: MAP_CONFIG.LOCATION_CONFIG.COORDINATE_TYPE,
      altitude: MAP_CONFIG.LOCATION_CONFIG.ALTITUDE,
      success: (res) => {
        console.log('✅ 基础定位成功:', {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy
        });
        resolve(true);
      },
      fail: (error) => {
        console.error('❌ 基础定位失败:', error);
        resolve(false);
      }
    });
  });
}

/**
 * 测试网络连接
 */
function testNetworkConnection() {
  console.log('\n=== 网络连接测试 ===');
  
  const { isWeChatMiniProgram } = checkEnvironment();
  if (!isWeChatMiniProgram) {
    console.warn('⚠️ 非微信小程序环境，跳过网络测试');
    return Promise.resolve(null);
  }
  
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        console.log('网络类型:', networkType);
        
        if (networkType === 'none') {
          console.error('❌ 无网络连接');
          resolve(false);
        } else {
          console.log('✅ 网络连接正常');
          resolve(true);
        }
      },
      fail: (error) => {
        console.error('获取网络状态失败:', error);
        resolve(false);
      }
    });
  });
}

/**
 * 测试域名白名单配置
 */
function testDomainWhitelist() {
  console.log('\n=== 域名白名单测试 ===');
  
  const { isWeChatMiniProgram } = checkEnvironment();
  if (!isWeChatMiniProgram) {
    console.warn('⚠️ 非微信小程序环境，跳过域名测试');
    return Promise.resolve([]);
  }
  
  const testUrls = [
    MAP_CONFIG.TENCENT_BASE_URL,
    MAP_CONFIG.AMAP_BASE_URL
  ];
  
  const promises = testUrls.map(url => {
    return new Promise((resolve) => {
      wx.request({
        url: `${url}/test`,
        method: 'GET',
        success: () => {
          console.log(`✅ ${url} 域名可访问`);
          resolve(true);
        },
        fail: (error) => {
          if (error.errMsg.includes('domain list')) {
            console.error(`❌ ${url} 未在域名白名单中`);
          } else {
            console.log(`ℹ️ ${url} 域名配置正常（测试接口不存在是正常的）`);
          }
          resolve(false);
        }
      });
    });
  });
  
  return Promise.all(promises);
}

/**
 * 运行所有测试
 */
export async function runLocationTests() {
  console.log('🚀 开始地点选择功能测试...\n');
  
  const results = {
    config: false,
    permission: false,
    location: false,
    network: false,
    domain: false
  };
  
  try {
    // 测试配置
    results.config = testMapConfig();
    
    // 测试网络
    results.network = await testNetworkConnection();
    
    // 测试权限
    results.permission = await testLocationPermission();
    
    // 测试基础定位
    if (results.permission !== false) {
      results.location = await testBasicLocation();
    }
    
    // 测试域名白名单
    if (results.network) {
      const domainResults = await testDomainWhitelist();
      results.domain = domainResults.some(result => result);
    }
    
    // 输出测试总结
    console.log('\n=== 测试总结 ===');
    console.log('配置检查:', results.config ? '✅ 通过' : '❌ 失败');
    console.log('网络连接:', results.network ? '✅ 通过' : '❌ 失败');
    console.log('位置权限:', results.permission === true ? '✅ 已授权' : results.permission === false ? '❌ 被拒绝' : 'ℹ️ 未请求');
    console.log('基础定位:', results.location ? '✅ 通过' : '❌ 失败');
    console.log('域名白名单:', results.domain ? '✅ 通过' : '❌ 失败');
    
    const overallSuccess = results.config && results.network && (results.permission !== false);
    console.log('\n总体状态:', overallSuccess ? '✅ 可以正常使用' : '⚠️ 需要检查配置');
    
    return results;
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    return results;
  }
}

/**
 * 在页面中使用的简化测试函数
 */
export function quickLocationTest() {
  console.log('快速地点功能测试...');
  
  // 检查配置
  const configValid = testMapConfig();
  if (!configValid) {
    wx.showModal({
      title: '配置提醒',
      content: '地图API密钥未配置，请查看控制台了解详情',
      showCancel: false
    });
    return;
  }
  
  // 测试定位
  wx.getLocation({
    type: 'gcj02',
    success: (res) => {
      wx.showToast({
        title: '定位测试成功',
        icon: 'success'
      });
      console.log('定位结果:', res);
    },
    fail: (error) => {
      wx.showModal({
        title: '定位测试失败',
        content: error.errMsg || '请检查位置权限设置',
        showCancel: false
      });
      console.error('定位失败:', error);
    }
  });
}

export default {
  runLocationTests,
  quickLocationTest,
  testMapConfig,
  testLocationPermission,
  testBasicLocation
};