// index.js
const app = getApp()

Page({
  data: {
    motto: '手持横屏全屏弹幕',
    userInfo: {},
    hasUserInfo: false
  },
  
  onLoad() {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    }
  },
  
  // 跳转到弹幕编辑页
  goToEdit() {
    wx.navigateTo({
      url: '/pages/edit/edit'
    })
  },
  
  // 跳转到我的弹幕历史页
  goToHistory() {
    const historyDanmu = app.globalData.historyDanmu || []
    if (historyDanmu.length === 0) {
      wx.showToast({
        title: '暂无历史记录',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/edit/edit?type=history'
    })
  },
  
  // 跳转到多人联动页
  goToGroup() {
    wx.navigateTo({
      url: '/pages/group/group'
    })
  },
  
  // 跳转到设置页
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})