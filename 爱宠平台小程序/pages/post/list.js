// pages/post/list.js
import { 
  POST_TYPES, 
  POST_TYPE_NAMES, 
  CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '../../config.js'

const app = getApp()

Page({
  data: {
    posts: [],
    loading: false,
    hasMore: true,
    page: 1,
    currentFilter: 'all',
    listType: 'all', // all, my
    showFilter: true,
    showActionSheet: false,
    currentPostId: '',
    emptyText: '暂无帖子',
    emptyDesc: '快来发布第一条信息吧',
    emptyActionText: '立即发布',
    showEmptyAction: true
  },

  onLoad(options) {
    // 根据参数设置列表类型
    if (options.type) {
      this.setListType(options.type)
    }
    
    this.loadPosts()
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshPosts()
  },

  onPullDownRefresh() {
    this.refreshPosts()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 设置列表类型
  setListType(type) {
    const config = {
      my: {
        listType: 'my',
        showFilter: true,
        emptyText: '您还没有发布过信息',
        emptyDesc: '快来发布第一条信息吧',
        emptyActionText: '立即发布',
        showEmptyAction: true
      },
      all: {
        listType: 'all',
        showFilter: true,
        emptyText: '暂无帖子',
        emptyDesc: '快来发布第一条信息吧',
        emptyActionText: '立即发布',
        showEmptyAction: true
      }
    }

    const typeConfig = config[type] || config.all
    this.setData(typeConfig)

    // 设置页面标题
    if (type === 'my') {
      wx.setNavigationBarTitle({ title: '我的发布' })
    }
  },

  // 刷新帖子列表
  refreshPosts() {
    this.setData({
      posts: [],
      page: 1,
      hasMore: true
    })
    this.loadPosts()
  },

  // 加载帖子列表
  async loadPosts() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { currentFilter, page, listType } = this.data
      
      const params = {
        page,
        pageSize: CONFIG.PAGE_SIZE
      }

      // 添加类型筛选
      if (currentFilter !== 'all') {
        params.type = [currentFilter]
      }

      // 如果是"我的发布"，只查询当前用户的帖子
      if (listType === 'my') {
        if (!app.globalData.isLoggedIn) {
          wx.showModal({
            title: '提示',
            content: '请先登录后查看您的发布',
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
        params.userId = 'current' // 云函数中会自动获取当前用户ID
      }

      // 调用云函数获取帖子列表
      const result = await wx.cloud.callFunction({
        name: 'listPosts',
        data: params
      })

      if (result.result.success) {
        const newPosts = result.result.data.map(this.formatPost)
        const allPosts = page === 1 ? newPosts : [...this.data.posts, ...newPosts]
        
        this.setData({
          posts: allPosts,
          hasMore: newPosts.length === CONFIG.PAGE_SIZE,
          page: page + 1
        })
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 格式化帖子数据
  formatPost(post) {
    return {
      ...post,
      typeText: POST_TYPE_NAMES[post.type] || post.type,
      createTimeText: this.formatTime(post.createTime),
      statusText: this.getStatusText(post)
    }
  },

  // 获取状态文本
  getStatusText(post) {
    // 根据帖子类型和状态返回相应文本
    if (post.status === 'completed') {
      return '已完成'
    } else if (post.status === 'closed') {
      return '已关闭'
    } else {
      return '进行中'
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

  // 筛选类型改变
  onFilterChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      currentFilter: type
    })
    this.refreshPosts()
  },

  // 点击帖子
  onPostTap(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post/detail?id=${postId}`
    })
  },

  // 更多操作
  onMoreTap(e) {
    const postId = e.currentTarget.dataset.id
    this.setData({
      currentPostId: postId,
      showActionSheet: true
    })
  },

  // 关闭操作菜单
  onCloseActionSheet() {
    this.setData({
      showActionSheet: false,
      currentPostId: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 编辑帖子
  onEditPost() {
    const postId = this.data.currentPostId
    wx.navigateTo({
      url: `/pages/post/edit?id=${postId}`
    })
    this.onCloseActionSheet()
  },

  // 分享帖子
  onSharePost() {
    const postId = this.data.currentPostId
    const post = this.data.posts.find(item => item._id === postId)
    
    if (post) {
      wx.showShareMenu({
        withShareTicket: true
      })
    }
    this.onCloseActionSheet()
  },

  // 删除帖子
  onDeletePost() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条信息吗？',
      confirmText: '删除',
      confirmColor: '#f5222d',
      success: async (res) => {
        if (res.confirm) {
          await this.deletePost()
        }
      }
    })
    this.onCloseActionSheet()
  },

  // 执行删除
  async deletePost() {
    const postId = this.data.currentPostId
    
    wx.showLoading({ title: '删除中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'deletePost',
        data: { postId }
      })

      if (result.result.success) {
        // 从列表中移除已删除的帖子
        const posts = this.data.posts.filter(item => item._id !== postId)
        this.setData({ posts })

        wx.hideLoading()
        wx.showToast({
          title: SUCCESS_MESSAGES.POST_DELETED,
          icon: 'success'
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.result.message || ERROR_MESSAGES.OPERATION_FAILED,
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('删除帖子失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    }
  },

  // 空状态操作
  onEmptyAction() {
    wx.switchTab({
      url: '/pages/post/create'
    })
  },

  // 加载更多
  loadMore() {
    this.loadPosts()
  },

  // 分享配置
  onShareAppMessage() {
    const post = this.data.posts.find(item => item._id === this.data.currentPostId)
    if (post) {
      return {
        title: post.title,
        path: `/pages/post/detail?id=${post._id}`,
        imageUrl: post.images.length > 0 ? post.images[0] : ''
      }
    }
    
    return {
      title: '宠物邻里 - 找回你的毛孩子',
      path: '/pages/home/index'
    }
  }
})