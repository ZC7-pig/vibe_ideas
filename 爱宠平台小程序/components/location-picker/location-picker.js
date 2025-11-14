// components/location-picker/location-picker.js
import LocationService from '../../utils/location.js';
import { MAP_CONFIG } from '../../config/map.js';

Component({
  properties: {
    // 当前选中的位置
    location: {
      type: Object,
      value: null
    },
    // 是否显示手动输入选项
    showManualInput: {
      type: Boolean,
      value: true
    },
    // 占位符文本
    placeholder: {
      type: String,
      value: '点击选择地点'
    }
  },

  data: {
    showModal: false,
    searchKeyword: '',
    searchResults: [],
    currentLocation: null,
    isSearching: false,
    showManualInputDialog: false,
    manualAddress: '',
    searchTimer: null
  },

  methods: {
    // 打开地点选择器
    openLocationPicker() {
      this.setData({ showModal: true });
      this.getCurrentLocation();
    },

    // 关闭地点选择器
    closeLocationPicker() {
      this.setData({ 
        showModal: false,
        searchKeyword: '',
        searchResults: [],
        showManualInputDialog: false,
        manualAddress: ''
      });
    },

    // 获取当前位置
    async getCurrentLocation() {
      wx.showLoading({ title: '获取位置中...' });
      
      try {
        // 检查位置权限
        const permission = await LocationService.checkLocationPermission();
        if (permission.denied) {
          const authorized = await LocationService.requestLocationPermission();
          if (!authorized) {
            wx.hideLoading();
            return;
          }
        }

        // 获取当前位置和地址信息
        const locationInfo = await LocationService.getCurrentLocationWithAddress();
        
        this.setData({ currentLocation: locationInfo });
        wx.hideLoading();
        
      } catch (error) {
        wx.hideLoading();
        console.error('获取位置失败:', error);
        
        if (error.code === 'AUTH_DENIED') {
          wx.showModal({
            title: '位置权限',
            content: error.message + '，' + error.suggestion,
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: error.message || '获取位置失败',
            icon: 'none'
          });
          
          // 如果获取当前位置失败，提供备用方案
          this.fallbackToChooseLocation();
        }
      }
    },

    // 备用方案：使用微信原生地点选择
    async fallbackToChooseLocation() {
      try {
        const location = await LocationService.chooseLocation();
        this.selectLocation(location);
      } catch (error) {
        console.error('选择位置失败:', error);
        
        if (error.code === 'USER_CANCEL') {
          return;
        }
        
        if (error.code === 'AUTH_DENIED') {
          wx.showModal({
            title: '位置权限',
            content: error.message + '，' + error.suggestion,
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showModal({
            title: '提示',
            content: '无法使用地图选择位置，是否手动输入地址？',
            success: (res) => {
              if (res.confirm) {
                this.setData({ showManualInputDialog: true });
              }
            }
          });
        }
      }
    },

    // 使用当前位置
    useCurrentLocation() {
      if (this.data.currentLocation) {
        this.selectLocation(this.data.currentLocation);
      } else {
        this.getCurrentLocation();
      }
    },

    // 打开微信地点选择器
    openWechatLocationPicker() {
      this.closeLocationPicker();
      this.fallbackToChooseLocation();
    },

    // 打开手动输入对话框
    openManualInputDialog() {
      this.setData({
        showManualInputDialog: true
      });
    },

    // 关闭手动输入对话框
    closeManualInputDialog() {
      this.setData({
        showManualInputDialog: false
      });
    },

    // 搜索地点
    onSearchInput(e) {
      const keyword = e.detail.value;
      this.setData({ searchKeyword: keyword });
      
      // 清除之前的搜索定时器
      if (this.data.searchTimer) {
        clearTimeout(this.data.searchTimer);
      }
      
      if (keyword.trim()) {
        // 设置新的搜索定时器（防抖）
        const timer = setTimeout(() => {
          this.searchLocation(keyword.trim());
        }, MAP_CONFIG.SEARCH_CONFIG.SEARCH_DEBOUNCE);
        
        this.setData({ searchTimer: timer });
      } else {
        this.setData({ searchResults: [] });
      }
    },

    // 地点搜索
    async searchLocation(keyword) {
      if (this.data.isSearching) return;
      
      this.setData({ isSearching: true });
      
      try {
        // 获取搜索选项
        const options = {};
        if (this.data.currentLocation) {
          options.latitude = this.data.currentLocation.lat;
          options.longitude = this.data.currentLocation.lng;
        }
        
        const results = await LocationService.searchLocation(keyword, options);
        this.setData({ 
          searchResults: results,
          isSearching: false 
        });
        
      } catch (error) {
        console.error('搜索失败:', error);
        this.setData({ isSearching: false });
        
        wx.showToast({
          title: error.message || '搜索失败',
          icon: 'none'
        });
      }
    },

    // 选择搜索结果中的地点
    selectSearchResult(e) {
      const index = e.currentTarget.dataset.index;
      const location = this.data.searchResults[index];
      this.selectLocation(location);
    },

    // 手动输入地址
    onManualAddressInput(e) {
      this.setData({ manualAddress: e.detail.value });
    },

    // 确认手动输入的地址
    confirmManualAddress() {
      const address = this.data.manualAddress.trim();
      if (!address) {
        wx.showToast({
          title: '请输入地址',
          icon: 'none'
        });
        return;
      }

      const location = {
        name: address,
        address: address,
        lat: null,
        lng: null,
        isManual: true
      };

      this.selectLocation(location);
    },

    // 选择位置
    selectLocation(location) {
      this.setData({ showModal: false });
      
      // 触发父组件事件
      this.triggerEvent('locationchange', { location });
    }
  }
});