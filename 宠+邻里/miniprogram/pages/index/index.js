// pages/index/index.js
const app = getApp()
const { formatRelativeTime, calculateDistance, formatDistance, previewImage } = require('../../utils/util')

Page({
  data: {
    activeTab: 'all',
    posts: [],
    loading: false,
    noMore: false,
    page: 1,
    pageSize: 10,
    userLocation: null
  },

  onLoad() {
    this.getUserLocation()
    this.loadPosts(true)
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadPosts(true)
  },

  onPullDownRefresh() {
    this.loadPosts(true)
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    this.loadMore()
  },

  // 获取用户位置
  async getUserLocation() {
    try {
      const location = await app.getUserLocation()
      this.setData({ userLocation: location })
    } catch (error) {
      console.log('获取位置失败:', error)
    }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return

    this.setData({
      activeTab: tab,
      posts: [],
      page: 1,
      noMore: false
    })
    this.loadPosts(true)
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { activeTab, page, pageSize, userLocation } = this.data
      
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        sort: 'createdAt_desc'
      }

      // 根据标签筛选类型
      if (activeTab !== 'all') {
        params.type = activeTab
      }

      // 添加位置信息用于距离计算
      if (userLocation) {
        params.location = userLocation
        params.radiusKm = 50 // 50公里范围内
      }

      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'list',
          ...params
        }
      })

      if (result.result.code === 0) {
        const newPosts = result.result.data.posts || []
        const processedPosts = this.processPosts(newPosts)

        this.setData({
          posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
          page: refresh ? 2 : page + 1,
          noMore: newPosts.length < pageSize,
          loading: false
        })
      } else {
        throw new Error(result.result.message)
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      app.showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 处理帖子数据
  processPosts(posts) {
    const { userLocation } = this.data
    
    return posts.map(post => {
      // 格式化时间
      post.relativeTime = formatRelativeTime(post.createdAt)
      
      // 格式化类型文本
      const typeMap = {
        normal: '交流',
        lost: '寻宠',
        found: '发现',
        adoption: post.subType === 'offer' ? '送养' : '求养'
      }
      post.typeText = typeMap[post.type] || '未知'
      
      // 格式化性别文本
      const sexMap = {
        male: '公',
        female: '母',
        unknown: '未知'
      }
      post.sexText = sexMap[post.sex] || '未知'
      
      // 计算距离
      if (userLocation && post.location) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          post.location.latitude,
          post.location.longitude
        )
        post.distance = formatDistance(distance)
      }
      
      // 格式化过期时间
      if (post.expireAt) {
        const now = Date.now()
        const expireTime = post.expireAt
        const diffDays = Math.ceil((expireTime - now) / (24 * 60 * 60 * 1000))
        
        if (diffDays > 0) {
          post.expireText = `${diffDays}天后过期`
        } else {
          post.expireText = '已过期'
        }
      }
      
      return post
    })
  },

  // 加载更多
  loadMore() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadPosts()
    }
  },

  // 预览图片
  previewImage(e) {
    const { current, urls } = e.currentTarget.dataset
    previewImage(current, urls)
  },

  // 联系作者
  async contactAuthor(e) {
    const post = e.currentTarget.dataset.post
    
    if (!app.globalData.isLoggedIn) {
      const loginResult = await app.login()
      if (!loginResult.success) {
        app.showToast('请先登录')
        return
      }
    }

    const actions = []
    if (post.contact.phone) {
      actions.push('拨打电话')
    }
    if (post.contact.wechat) {
      actions.push('复制微信号')
    }

    if (actions.length === 0) {
      app.showToast('暂无联系方式')
      return
    }

    try {
      const { showActionSheet, makePhoneCall, setClipboardData } = require('../../utils/util')
      const index = await showActionSheet(actions)
      
      if (actions[index] === '拨打电话') {
        await makePhoneCall(post.contact.phone)
      } else if (actions[index] === '复制微信号') {
        await setClipboardData(post.contact.wechat)
        app.showToast('微信号已复制')
      }
    } catch (error) {
      console.log('用户取消操作')
    }
  },

  // 点赞/取消点赞
  async toggleLike(e) {
    const postId = e.currentTarget.dataset.id
    
    if (!app.globalData.isLoggedIn) {
      const loginResult = await app.login()
      if (!loginResult.success) {
        app.showToast('请先登录')
        return
      }
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'toggleLike',
          postId
        }
      })

      if (result.result.code === 0) {
        const { liked, likeCount } = result.result.data
        
        // 更新本地数据
        const posts = this.data.posts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              liked,
              likeCount
            }
          }
          return post
        })
        
        this.setData({ posts })
      }
    } catch (error) {
      console.error('点赞失败:', error)
      app.showToast('操作失败')
    }
  },

  // 跳转到搜索页
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 跳转到发布页
  goToPublish() {
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/profile/profile'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/publish/publish'
    })
  }
})