const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    isLoggedIn: false,
    activeTab: 'system',
    tabNames: {
      system: '系统',
      match: '匹配',
      comment: '评论'
    },
    
    // 消息数据
    messages: [],
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    
    // 未读数量
    systemUnreadCount: 0,
    matchUnreadCount: 0,
    commentUnreadCount: 0,
    hasUnread: false,
    
    // 消息详情弹窗
    showMessageDetail: false,
    selectedMessage: null
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadMessages()
      this.loadUnreadCounts()
    }
  },

  onPullDownRefresh() {
    this.onRefresh()
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({
      isLoggedIn: isLoggedIn
    })
    
    if (isLoggedIn) {
      this.loadMessages()
      this.loadUnreadCounts()
    }
  },

  // 前往登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 切换消息类型
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    
    this.setData({
      activeTab: tab,
      messages: [],
      page: 1,
      hasMore: true
    })
    
    this.loadMessages()
  },

  // 刷新消息
  onRefresh() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    
    this.loadMessages().finally(() => {
      this.setData({
        refreshing: false
      })
      wx.stopPullDownRefresh()
    })
    
    this.loadUnreadCounts()
  },

  // 加载消息列表
  async loadMessages(loadMore = false) {
    if (this.data.loading || this.data.loadingMore) return
    if (loadMore && !this.data.hasMore) return
    
    try {
      this.setData({
        [loadMore ? 'loadingMore' : 'loading']: true
      })
      
      const page = loadMore ? this.data.page + 1 : 1
      
      const result = await wx.cloud.callFunction({
        name: 'notifications',
        data: {
          action: 'list',
          type: this.data.activeTab,
          page: page,
          pageSize: this.data.pageSize
        }
      })

      if (result.result.success) {
        const newMessages = result.result.data.map(message => {
          message.createTimeFormatted = util.getRelativeTime(new Date(message.createTime))
          return message
        })
        
        const messages = loadMore ? [...this.data.messages, ...newMessages] : newMessages
        const hasUnread = messages.some(msg => !msg.isRead)
        
        this.setData({
          messages: messages,
          page: page,
          hasMore: newMessages.length === this.data.pageSize,
          hasUnread: hasUnread,
          loading: false,
          loadingMore: false
        })
      } else {
        throw new Error(result.result.message || '加载消息失败')
      }
    } catch (error) {
      console.error('加载消息失败:', error)
      this.setData({
        loading: false,
        loadingMore: false
      })
      
      if (!loadMore) {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    }
  },

  // 加载更多消息
  loadMoreMessages() {
    this.loadMessages(true)
  },

  // 加载未读数量
  async loadUnreadCounts() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'notifications',
        data: {
          action: 'getUnreadCounts'
        }
      })

      if (result.result.success) {
        const counts = result.result.data
        this.setData({
          systemUnreadCount: counts.system || 0,
          matchUnreadCount: counts.match || 0,
          commentUnreadCount: counts.comment || 0
        })
        
        // 更新tabBar徽章
        const totalUnread = (counts.system || 0) + (counts.match || 0) + (counts.comment || 0)
        if (totalUnread > 0) {
          wx.setTabBarBadge({
            index: 2,
            text: totalUnread > 99 ? '99+' : totalUnread.toString()
          })
        } else {
          wx.removeTabBarBadge({
            index: 2
          })
        }
      }
    } catch (error) {
      console.error('加载未读数量失败:', error)
    }
  },

  // 查看消息详情
  viewMessage(e) {
    const message = e.currentTarget.dataset.message
    
    this.setData({
      selectedMessage: message,
      showMessageDetail: true
    })
    
    // 标记为已读
    if (!message.isRead) {
      this.markMessageRead(message.id)
    }
  },

  // 关闭消息详情
  closeMessageDetail() {
    this.setData({
      showMessageDetail: false,
      selectedMessage: null
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击模态框内容时关闭弹窗
  },

  // 查看相关帖子
  viewRelatedPost() {
    const message = this.data.selectedMessage
    if (message && message.data && message.data.postId) {
      this.closeMessageDetail()
      wx.navigateTo({
        url: `/pages/detail/detail?id=${message.data.postId}`
      })
    }
  },

  // 标记单条消息为已读
  async markMessageRead(messageId) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'notifications',
        data: {
          action: 'markRead',
          messageId: messageId
        }
      })

      if (result.result.success) {
        // 更新本地数据
        const messages = this.data.messages.map(msg => {
          if (msg.id === messageId) {
            msg.isRead = true
          }
          return msg
        })
        
        const hasUnread = messages.some(msg => !msg.isRead)
        
        this.setData({
          messages: messages,
          hasUnread: hasUnread
        })
        
        // 更新未读数量
        this.loadUnreadCounts()
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  },

  // 全部标记为已读
  async markAllRead() {
    try {
      wx.showLoading({ title: '处理中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'notifications',
        data: {
          action: 'markAllRead',
          type: this.data.activeTab
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        // 更新本地数据
        const messages = this.data.messages.map(msg => {
          msg.isRead = true
          return msg
        })
        
        this.setData({
          messages: messages,
          hasUnread: false
        })
        
        // 更新未读数量
        this.loadUnreadCounts()
        
        wx.showToast({
          title: '已全部标记为已读',
          icon: 'success'
        })
      } else {
        throw new Error(result.result.message || '操作失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('标记全部已读失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 分享消息
  onShareAppMessage() {
    return {
      title: '宠物社区消息',
      path: '/pages/messages/messages'
    }
  }
})