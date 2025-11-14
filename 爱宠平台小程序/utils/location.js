// utils/location.js
// 地理位置服务工具类

import { MAP_CONFIG, checkMapConfig, getRecommendedMapService } from '../config/map.js';

/**
 * 地理位置服务类
 */
class LocationService {
  
  /**
   * 获取当前位置
   * @param {Object} options 配置选项
   * @returns {Promise} 位置信息
   */
  static getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        type: MAP_CONFIG.LOCATION_CONFIG.COORDINATE_TYPE,
        altitude: MAP_CONFIG.LOCATION_CONFIG.ALTITUDE,
        highAccuracyExpireTime: MAP_CONFIG.LOCATION_CONFIG.TIMEOUT,
        ...options
      };

      wx.getLocation({
        ...defaultOptions,
        success: (res) => {
          const location = {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            speed: res.speed || 0,
            altitude: res.altitude || 0
          };
          resolve(location);
        },
        fail: (error) => {
          console.error('获取位置失败:', error);
          reject(this.handleLocationError(error));
        }
      });
    });
  }

  /**
   * 逆地理编码 - 坐标转地址
   * @param {number} latitude 纬度
   * @param {number} longitude 经度
   * @returns {Promise} 地址信息
   */
  static reverseGeocode(latitude, longitude) {
    return new Promise((resolve, reject) => {
      // 优先使用腾讯地图API
      this.tencentReverseGeocode(latitude, longitude)
        .then(resolve)
        .catch(() => {
          // 备用方案：使用高德地图API
          this.amapReverseGeocode(latitude, longitude)
            .then(resolve)
            .catch(reject);
        });
    });
  }

  /**
   * 腾讯地图逆地理编码
   */
  static tencentReverseGeocode(latitude, longitude) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${MAP_CONFIG.TENCENT_BASE_URL}/ws/geocoder/v1/`,
        data: {
          location: `${latitude},${longitude}`,
          key: MAP_CONFIG.TENCENT_MAP_KEY,
          get_poi: 1,
          poi_options: 'address_format=short;radius=1000;policy=5'
        },
        success: (res) => {
          if (res.data.status === 0) {
            const result = res.data.result;
            const locationInfo = {
              name: result.formatted_addresses?.recommend || result.address,
              address: result.address,
              province: result.address_component.province,
              city: result.address_component.city,
              district: result.address_component.district,
              street: result.address_component.street,
              lat: latitude,
              lng: longitude,
              pois: result.pois || []
            };
            resolve(locationInfo);
          } else {
            reject(new Error(res.data.message || '逆地理编码失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 高德地图逆地理编码（备用）
   */
  static amapReverseGeocode(latitude, longitude) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${MAP_CONFIG.AMAP_BASE_URL}/v3/geocode/regeo`,
        data: {
          location: `${longitude},${latitude}`, // 高德地图经纬度顺序相反
          key: MAP_CONFIG.AMAP_KEY,
          radius: 1000,
          extensions: 'all'
        },
        success: (res) => {
          if (res.data.status === '1' && res.data.regeocode) {
            const regeocode = res.data.regeocode;
            const addressComponent = regeocode.addressComponent;
            
            const locationInfo = {
              name: regeocode.formatted_address,
              address: regeocode.formatted_address,
              province: addressComponent.province,
              city: addressComponent.city,
              district: addressComponent.district,
              street: addressComponent.streetNumber?.street || '',
              lat: latitude,
              lng: longitude,
              pois: regeocode.pois || []
            };
            resolve(locationInfo);
          } else {
            reject(new Error('逆地理编码失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 地点搜索
   * @param {string} keyword 搜索关键词
   * @param {Object} options 搜索选项
   * @returns {Promise} 搜索结果
   */
  static searchLocation(keyword, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        latitude,
        longitude,
        radius = MAP_CONFIG.SEARCH_CONFIG.DEFAULT_RADIUS,
        limit = MAP_CONFIG.SEARCH_CONFIG.SEARCH_LIMIT
      } = options;

      if (!keyword || !keyword.trim()) {
        resolve([]);
        return;
      }

      // 优先使用腾讯地图搜索
      this.tencentSearch(keyword, { latitude, longitude, radius, limit })
        .then(resolve)
        .catch(() => {
          // 备用方案：使用高德地图搜索
          this.amapSearch(keyword, { latitude, longitude, radius, limit })
            .then(resolve)
            .catch(reject);
        });
    });
  }

  /**
   * 腾讯地图地点搜索
   */
  static tencentSearch(keyword, options = {}) {
    return new Promise((resolve, reject) => {
      const { latitude, longitude, radius, limit } = options;
      
      const requestData = {
        keyword: keyword,
        key: MAP_CONFIG.TENCENT_MAP_KEY,
        page_size: limit
      };

      // 如果有位置信息，添加附近搜索
      if (latitude && longitude) {
        requestData.boundary = `nearby(${latitude},${longitude},${radius})`;
      }

      wx.request({
        url: `${MAP_CONFIG.TENCENT_BASE_URL}/ws/place/v1/search`,
        data: requestData,
        success: (res) => {
          if (res.data.status === 0) {
            const results = res.data.data.map(item => ({
              id: item.id,
              name: item.title,
              address: item.address,
              lat: item.location.lat,
              lng: item.location.lng,
              distance: item.distance || 0,
              category: item.category
            }));
            resolve(results);
          } else {
            reject(new Error(res.data.message || '搜索失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 高德地图地点搜索（备用）
   */
  static amapSearch(keyword, options = {}) {
    return new Promise((resolve, reject) => {
      const { latitude, longitude, radius, limit } = options;

      const requestData = {
        keywords: keyword,
        key: MAP_CONFIG.AMAP_KEY,
        offset: limit,
        page: 1,
        extensions: 'all'
      };

      // 如果有位置信息，添加附近搜索
      if (latitude && longitude) {
        requestData.location = `${longitude},${latitude}`;
        requestData.radius = radius;
      }

      wx.request({
        url: `${MAP_CONFIG.AMAP_BASE_URL}/v3/place/text`,
        data: requestData,
        success: (res) => {
          if (res.data.status === '1' && res.data.pois) {
            const results = res.data.pois.map(item => {
              const [lng, lat] = item.location.split(',').map(Number);
              return {
                id: item.id,
                name: item.name,
                address: item.address,
                lat: lat,
                lng: lng,
                distance: parseInt(item.distance) || 0,
                category: item.type
              };
            });
            resolve(results);
          } else {
            reject(new Error('搜索失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 打开微信地点选择器
   * @param {Object} options 选择器选项
   * @returns {Promise} 选择的位置
   */
  static chooseLocation(options = {}) {
    return new Promise((resolve, reject) => {
      wx.chooseLocation({
        ...options,
        success: (res) => {
          const location = {
            name: res.name || res.address,
            address: res.address,
            lat: res.latitude,
            lng: res.longitude
          };
          resolve(location);
        },
        fail: (error) => {
          reject(this.handleLocationError(error));
        }
      });
    });
  }

  /**
   * 获取当前位置并转换为地址
   * @returns {Promise} 当前位置信息
   */
  static getCurrentLocationWithAddress() {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. 获取当前坐标
        const coords = await this.getCurrentLocation();
        
        // 2. 转换为地址
        const locationInfo = await this.reverseGeocode(coords.latitude, coords.longitude);
        
        resolve(locationInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 计算两点间距离（米）
   * @param {number} lat1 纬度1
   * @param {number} lng1 经度1
   * @param {number} lat2 纬度2
   * @param {number} lng2 经度2
   * @returns {number} 距离（米）
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 角度转弧度
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * 处理位置相关错误
   * @param {Object} error 错误对象
   * @returns {Object} 格式化的错误信息
   */
  static handleLocationError(error) {
    const errorMap = {
      'getLocation:fail auth deny': {
        code: 'AUTH_DENIED',
        message: '用户拒绝了位置权限',
        suggestion: '请在设置中开启位置权限'
      },
      'getLocation:fail:ERROR_NOCELL': {
        code: 'NO_SIGNAL',
        message: '无法获取位置信息',
        suggestion: '请检查网络连接或移动到信号较好的地方'
      },
      'chooseLocation:fail cancel': {
        code: 'USER_CANCEL',
        message: '用户取消了位置选择',
        suggestion: ''
      },
      'chooseLocation:fail auth deny': {
        code: 'AUTH_DENIED',
        message: '用户拒绝了位置权限',
        suggestion: '请在设置中开启位置权限'
      }
    };

    const errorInfo = errorMap[error.errMsg] || {
      code: 'UNKNOWN_ERROR',
      message: '位置服务异常',
      suggestion: '请重试或联系客服'
    };

    return {
      ...errorInfo,
      originalError: error
    };
  }

  /**
   * 检查位置权限
   * @returns {Promise} 权限状态
   */
  static checkLocationPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const locationAuth = res.authSetting['scope.userLocation'];
          resolve({
            authorized: locationAuth === true,
            denied: locationAuth === false,
            notAsked: locationAuth === undefined
          });
        },
        fail: () => {
          resolve({
            authorized: false,
            denied: false,
            notAsked: true
          });
        }
      });
    });
  }

  /**
   * 请求位置权限
   * @returns {Promise} 授权结果
   */
  static requestLocationPermission() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => resolve(true),
        fail: () => {
          // 用户拒绝授权，引导到设置页面
          wx.showModal({
            title: '位置权限',
            content: '需要位置权限才能使用地点相关功能，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    resolve(settingRes.authSetting['scope.userLocation'] === true);
                  },
                  fail: () => resolve(false)
                });
              } else {
                resolve(false);
              }
            }
          });
        }
      });
    });
  }
}

export default LocationService;