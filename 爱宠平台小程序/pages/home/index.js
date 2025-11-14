// pages/home/index.js
import { POST_TYPES, POST_TYPE_NAMES, CONFIG } from '../../config.js'

const app = getApp()

Page({
  data: {
    posts: [],
    loading: false,
    hasMore: true,
    page: 1,
    searchKeyword: '',
    currentFilter: 'all'
  },

  onLoad() {
    this.loadPosts()
  },

  onShow() {
    // 每次显示页面时刷新数据
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
      const { currentFilter, searchKeyword, page } = this.data
      
      // 构建查询参数
      const params = {
        page,
        pageSize: CONFIG.PAGE_SIZE,
        search: searchKeyword
      }

      // 添加类型筛选
      if (currentFilter !== 'all') {
        params.type = [currentFilter]
      } else {
        // 首页默认显示寻宠和发现
        params.type = [POST_TYPES.LOST, POST_TYPES.FOUND]
      }

      // 获取当前位置用于距离计算
      const location = await this.getCurrentLocation()
      if (location) {
        params.center = location
        params.radiusKm = CONFIG.DEFAULT_RADIUS_KM
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
        title: '网络错误，请重试',
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
      userInfo: post.userInfo
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

  // 获取当前位置
  getCurrentLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            lat: res.latitude,
            lng: res.longitude
          })
        },
        fail: () => {
          resolve(null)
        }
      })
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 执行搜索
  onSearch() {
    this.refreshPosts()
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

  // 点赞
  onLikeTap(e) {
    const postId = e.currentTarget.dataset.id
    // TODO: 实现点赞功能
    console.log('点赞帖子:', postId)
  },

  // 联系
  onCommentTap(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post/detail?id=${postId}`
    })
  },

  // 分享
  onShareTap(e) {
    const postId = e.currentTarget.dataset.id
    // TODO: 实现分享功能
    console.log('分享帖子:', postId)
  },

  // 悬浮按钮点击
  onFabTap() {
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
    return {
      title: '宠物邻里 - 找回你的毛孩子',
      path: '/pages/home/index'
    }
  }
})