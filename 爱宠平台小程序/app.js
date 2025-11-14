// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-9gqreqi3bc234646', // 请替换为你的云环境ID
        traceUser: true,
      })
    }

    // 检查登录状态
    this.checkLoginStatus()
  },

  onShow() {
    // 小程序显示时检查更新
    this.checkForUpdate()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }
  },

  // 检查小程序更新
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
        }
      })
    }
  },

  // 用户登录
  login() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          const userInfo = res.userInfo
          // 保存用户信息到本地存储
          wx.setStorageSync('userInfo', userInfo)
          this.globalData.userInfo = userInfo
          this.globalData.isLoggedIn = true
          
          // 调用云函数保存用户信息
          wx.cloud.callFunction({
            name: 'updateUserProfile',
            data: {
              avatarUrl: userInfo.avatarUrl,
              nickName: userInfo.nickName
            }
          }).then((result) => {
            console.log('updateUserProfile调用成功:', result)
            resolve(userInfo)
          }).catch((error) => {
            console.error('updateUserProfile调用失败:', error)
            reject(error)
          })
        },
        fail: reject
      })
    })
  },

  // 用户登出
  logout() {
    wx.removeStorageSync('userInfo')
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
  },

  // 全局数据
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    currentLocation: null
  }
})