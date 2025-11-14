// pages/notifications/index.js
import { CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../config.js'

const app = getApp()

Page({
  data: {
    notifications: [],
    loading: false,
    hasMore: true,
    page: 1,
    currentFilter: 'all'
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后查看通知',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/index' })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }

    this.loadNotifications()
  },

  onShow() {
    // 每次显示时刷新数据
    if (app.globalData.isLoggedIn) {
      this.refreshNotifications()
    }
  },

  onPullDownRefresh() {
    this.refreshNotifications()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 刷新通知列表
  refreshNotifications() {
    this.setData({
      notifications: [],
      page: 1,
      hasMore: true
    })
    this.loadNotifications()
  },

  // 加载通知列表
  async loadNotifications() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { currentFilter, page } = this.data
      
      const params = {
        page,
        pageSize: CONFIG.PAGE_SIZE
      }

      // 添加筛选条件
      if (currentFilter === 'unread') {
        params.isRead = false
      } else if (currentFilter === 'match') {
        params.type = 'match'
      }

      // 调用云函数获取通知列表
      const result = await wx.cloud.callFunction({
        name: 'listNotifications',
        data: params
      })

      if (result.result.success) {
        const newNotifications = result.result.data.map(this.formatNotification)
        const allNotifications = page === 1 ? newNotifications : [...this.data.notifications, ...newNotifications]
        
        this.setData({
          notifications: allNotifications,
          hasMore: newNotifications.length === CONFIG.PAGE_SIZE,
          page: page + 1
        })

        // 加载相关帖子信息
        this.loadRelatedPosts(newNotifications)
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载通知失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 格式化通知数据
  formatNotification(notification) {
    return {
      ...notification,
      createTimeText: this.formatTime(notification.createTime)
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now - time

    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`
    } else if (diff < 604800000) { // 1周内
      return `${Math.floor(diff / 86400000)}天前`
    } else {
      return time.toLocaleDateString()
    }
  },

  // 加载相关帖子信息
  async loadRelatedPosts(notifications) {
    try {
      const postIds = notifications
        .filter(item => item.matchedPostId)
        .map(item => item.matchedPostId)

      if (postIds.length === 0) return

      const result = await wx.cloud.callFunction({
        name: 'getPostsByIds',
        data: { postIds }
      })

      if (result.result.success) {
        const posts = result.result.data
        const updatedNotifications = this.data.notifications.map(notification => {
          const relatedPost = posts.find(post => post._id === notification.matchedPostId)
          return {
            ...notification,
            relatedPost
          }
        })

        this.setData({
          notifications: updatedNotifications
        })
      }
    } catch (error) {
      console.error('加载相关帖子失败:', error)
    }
  },

  // 筛选类型改变
  onFilterChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      currentFilter: type
    })
    this.refreshNotifications()
  },

  // 点击通知
  async onNotificationTap(e) {
    const notificationId = e.currentTarget.dataset.id
    const postId = e.currentTarget.dataset.postId
    const matchedPostId = e.currentTarget.dataset.matchedPostId

    // 标记为已读
    this.markAsRead(notificationId)

    // 跳转到帖子详情
    if (matchedPostId) {
      wx.navigateTo({
        url: `/pages/post/detail?id=${matchedPostId}`
      })
    } else if (postId) {
      wx.navigateTo({
        url: `/pages/post/detail?id=${postId}`
      })
    }
  },

  // 查看帖子
  onViewPostTap(e) {
    const postId = e.currentTarget.dataset.postId
    wx.navigateTo({
      url: `/pages/post/detail?id=${postId}`
    })
  },

  // 标记单个通知为已读
  async markAsRead(notificationId) {
    try {
      await wx.cloud.callFunction({
        name: 'markNotificationRead',
        data: { notificationId }
      })

      // 更新本地数据
      const notifications = this.data.notifications.map(item => {
        if (item._id === notificationId) {
          return { ...item, isRead: true }
        }
        return item
      })

      this.setData({ notifications })
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  },

  // 全部标记为已读
  async onMarkAllRead() {
    const unreadNotifications = this.data.notifications.filter(item => !item.isRead)
    
    if (unreadNotifications.length === 0) {
      wx.showToast({
        title: '没有未读通知',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '处理中...' })

    try {
      const notificationIds = unreadNotifications.map(item => item._id)
      
      await wx.cloud.callFunction({
        name: 'markNotificationsRead',
        data: { notificationIds }
      })

      // 更新本地数据
      const notifications = this.data.notifications.map(item => ({
        ...item,
        isRead: true
      }))

      this.setData({ notifications })

      wx.hideLoading()
      wx.showToast({
        title: SUCCESS_MESSAGES.NOTIFICATION_READ,
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('批量标记已读失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.OPERATION_FAILED,
        icon: 'none'
      })
    }
  },

  // 清除已读通知
  async onClearRead() {
    const readNotifications = this.data.notifications.filter(item => item.isRead)
    
    if (readNotifications.length === 0) {
      wx.showToast({
        title: '没有已读通知',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认清除',
      content: `将清除${readNotifications.length}条已读通知，此操作不可恢复`,
      confirmText: '清除',
      confirmColor: '#f5222d',
      success: async (res) => {
        if (res.confirm) {
          await this.clearReadNotifications(readNotifications)
        }
      }
    })
  },

  // 执行清除已读通知
  async clearReadNotifications(readNotifications) {
    wx.showLoading({ title: '清除中...' })

    try {
      const notificationIds = readNotifications.map(item => item._id)
      
      await wx.cloud.callFunction({
        name: 'deleteNotifications',
        data: { notificationIds }
      })

      // 更新本地数据
      const notifications = this.data.notifications.filter(item => !item.isRead)
      this.setData({ notifications })

      wx.hideLoading()
      wx.showToast({
        title: '清除成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('清除通知失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.OPERATION_FAILED,
        icon: 'none'
      })
    }
  },

  // 加载更多
  loadMore() {
    this.loadNotifications()
  }
})