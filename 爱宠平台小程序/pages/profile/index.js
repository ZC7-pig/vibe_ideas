// pages/profile/index.js
import { ERROR_MESSAGES } from '../../config.js'

const app = getApp()

Page({
  data: {
    userInfo: null,
    stats: {
      postCount: 0,
      notificationCount: 0,
      unreadCount: 0,
      helpCount: 0
    }
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    if (app.globalData.isLoggedIn) {
      this.loadUserStats()
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo
    this.setData({
      userInfo: userInfo
    })
  },

  // 加载用户统计数据
  async loadUserStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getUserStats',
        data: {}
      })

      if (result.result.success) {
        this.setData({
          stats: result.result.data
        })
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
    }
  },

  // 用户登录
  async onLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      const userInfo = await app.login()
      this.setData({ userInfo })
      
      // 登录成功后加载统计数据
      this.loadUserStats()
      
      wx.hideLoading()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      
      if (error.errMsg && error.errMsg.includes('deny')) {
        wx.showModal({
          title: '提示',
          content: '需要您的授权才能正常使用小程序功能',
          showCancel: false
        })
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后将无法使用部分功能',
      confirmText: '退出',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          app.logout()
          this.setData({
            userInfo: null,
            stats: {
              postCount: 0,
              notificationCount: 0,
              unreadCount: 0,
              helpCount: 0
            }
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 我的发布
  onMyPostsTap() {
    if (!this.checkLogin()) return
    
    wx.navigateTo({
      url: '/pages/post/list?type=my'
    })
  },

  // 我的提醒
  onNotificationsTap() {
    if (!this.checkLogin()) return
    
    wx.navigateTo({
      url: '/pages/notifications/index'
    })
  },

  // 收藏夹
  onFavoritesTap() {
    if (!this.checkLogin()) return
    
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 收养信息
  onAdoptionTap() {
    wx.navigateTo({
      url: '/pages/adoption/list'
    })
  },

  // 本地服务
  onServicesTap() {
    wx.navigateTo({
      url: '/pages/services/index'
    })
  },

  // 设置
  onSettingsTap() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 帮助与反馈
  onHelpTap() {
    wx.showModal({
      title: '帮助与反馈',
      content: '如有问题或建议，请联系客服微信：pethelper2024',
      confirmText: '复制微信号',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'pethelper2024',
            success: () => {
              wx.showToast({
                title: '已复制微信号',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  },

  // 关于我们
  onAboutTap() {
    wx.showModal({
      title: '关于宠物邻里',
      content: '宠物邻里是一个专注于宠物寻找、寄养、收养的本地化服务平台。我们致力于帮助每一个毛孩子找到回家的路，为养宠家庭提供便捷的服务。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 检查登录状态
  checkLogin() {
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后使用此功能',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.onLogin()
          }
        }
      })
      return false
    }
    return true
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '宠物邻里 - 找回你的毛孩子',
      path: '/pages/home/index',
      imageUrl: '/assets/share-image.jpg'
    }
  }
})