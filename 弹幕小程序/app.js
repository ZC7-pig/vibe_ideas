// app.js
App({
  onLaunch: function() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    
    // 获取系统信息
    wx.getSystemInfo({
      success: res => {
        this.globalData.systemInfo = res
      },
      fail: err => {
        console.error('获取系统信息失败', err)
      }
    })
    
    // 初始化页面路由
    if (typeof __wxConfig !== 'undefined') {
      this.globalData.__route__ = __wxConfig.pages[0]
    }
  },
  
  globalData: {
    systemInfo: null,
    userInfo: null,
    // 历史记录
    historyDanmu: [],
    // 常用语
    commonPhrases: ['加油', '爱你', '我永远支持你', '生日快乐', '恭喜', '太棒了']
  }
})