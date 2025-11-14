// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-9gqreqi3bc234646',
        traceUser: true,
      });
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  globalData: {
    userInfo: null,
    openid: null,
    userId: null,
    isLoggedIn: false
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    const userId = wx.getStorageSync('userId');
    
    if (userInfo && openid && userId) {
      this.globalData.userInfo = userInfo;
      this.globalData.openid = openid;
      this.globalData.userId = userId;
      this.globalData.isLoggedIn = true;
    }
  },

  // 登录
  async login() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: { action: 'login' }
      });

      if (result.result.code === 0) {
        const { openid, user } = result.result.data;
        
        this.globalData.openid = openid;
        this.globalData.userId = user._id;
        this.globalData.userInfo = user;
        this.globalData.isLoggedIn = true;

        // 缓存到本地
        wx.setStorageSync('openid', openid);
        wx.setStorageSync('userId', user._id);
        wx.setStorageSync('userInfo', user);

        return { success: true, user };
      } else {
        throw new Error(result.result.message);
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 退出登录
  logout() {
    this.globalData.userInfo = null;
    this.globalData.openid = null;
    this.globalData.userId = null;
    this.globalData.isLoggedIn = false;

    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userId');
  },

  // 获取用户位置
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          });
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 显示加载提示
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  // 隐藏加载提示
  hideLoading() {
    wx.hideLoading();
  },

  // 显示消息提示
  showToast(title, icon = 'none', duration = 2000) {
    wx.showToast({
      title,
      icon,
      duration
    });
  }
});