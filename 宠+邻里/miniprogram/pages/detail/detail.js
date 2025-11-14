const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    postId: '',
    post: null,
    loading: true,
    error: false,
    userLocation: null,
    distance: '',
    
    // 评论相关
    comments: [],
    commentText: '',
    commentLoading: false,
    hasMoreComments: true,
    commentPage: 1,
    commentPageSize: 10,
    
    // 相似帖子
    similarPosts: [],
    
    // 图片轮播
    currentImageIndex: 0,
    
    // 点赞状态
    isLiked: false,
    likeCount: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        postId: options.id
      })
      this.loadPostDetail()
      this.loadComments()
      this.getUserLocation()
    } else {
      this.setData({
        error: true,
        loading: false
      })
    }
  },

  onShow() {
    // 刷新点赞状态
    if (this.data.postId) {
      this.checkLikeStatus()
    }
  },

  onShareAppMessage() {
    const post = this.data.post
    if (post) {
      return {
        title: post.title || '宠物信息分享',
        path: `/pages/detail/detail?id=${this.data.postId}`,
        imageUrl: post.images && post.images.length > 0 ? post.images[0] : ''
      }
    }
    return {}
  },

  // 获取用户位置
  async getUserLocation() {
    try {
      const location = await util.getUserLocation()
      this.setData({
        userLocation: location
      })
      this.calculateDistance()
    } catch (error) {
      console.error('获取位置失败:', error)
    }
  },

  // 计算距离
  calculateDistance() {
    const { post, userLocation } = this.data
    if (post && post.location && userLocation) {
      const distance = util.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        post.location.latitude,
        post.location.longitude
      )
      this.setData({
        distance: util.formatDistance(distance)
      })
    }
  },

  // 加载帖子详情
  async loadPostDetail() {
    try {
      this.setData({ loading: true })
      
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'getDetail',
          postId: this.data.postId
        }
      })

      if (result.result.success) {
        const post = result.result.data
        // 格式化数据
        post.createTimeFormatted = util.formatTime(new Date(post.createTime))
        post.createTimeRelative = util.getRelativeTime(new Date(post.createTime))
        
        // 处理过期状态
        if (post.expirationDate) {
          post.isExpired = new Date() > new Date(post.expirationDate)
          post.expirationFormatted = util.formatTime(new Date(post.expirationDate))
        }

        this.setData({
          post: post,
          likeCount: post.likeCount || 0,
          loading: false
        })
        
        this.calculateDistance()
        this.checkLikeStatus()
        this.loadSimilarPosts()
      } else {
        throw new Error(result.result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载帖子详情失败:', error)
      this.setData({
        error: true,
        loading: false
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 检查点赞状态
  async checkLikeStatus() {
    if (!app.globalData.isLoggedIn) return
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'checkLike',
          postId: this.data.postId
        }
      })
      
      if (result.result.success) {
        this.setData({
          isLiked: result.result.data.isLiked
        })
      }
    } catch (error) {
      console.error('检查点赞状态失败:', error)
    }
  },

  // 加载评论
  async loadComments(loadMore = false) {
    if (this.data.commentLoading) return
    
    try {
      this.setData({ commentLoading: true })
      
      const page = loadMore ? this.data.commentPage + 1 : 1
      
      const result = await wx.cloud.callFunction({
        name: 'comments',
        data: {
          action: 'list',
          postId: this.data.postId,
          page: page,
          pageSize: this.data.commentPageSize
        }
      })

      if (result.result.success) {
        const newComments = result.result.data.map(comment => {
          comment.createTimeFormatted = util.getRelativeTime(new Date(comment.createTime))
          return comment
        })
        
        this.setData({
          comments: loadMore ? [...this.data.comments, ...newComments] : newComments,
          commentPage: page,
          hasMoreComments: newComments.length === this.data.commentPageSize,
          commentLoading: false
        })
      } else {
        throw new Error(result.result.message || '加载评论失败')
      }
    } catch (error) {
      console.error('加载评论失败:', error)
      this.setData({ commentLoading: false })
      if (!loadMore) {
        wx.showToast({
          title: '加载评论失败',
          icon: 'none'
        })
      }
    }
  },

  // 加载相似帖子
  async loadSimilarPosts() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'getSimilar',
          postId: this.data.postId,
          limit: 3
        }
      })

      if (result.result.success) {
        const similarPosts = result.result.data.map(post => {
          post.createTimeRelative = util.getRelativeTime(new Date(post.createTime))
          return post
        })
        
        this.setData({
          similarPosts: similarPosts
        })
      }
    } catch (error) {
      console.error('加载相似帖子失败:', error)
    }
  },

  // 图片轮播变化
  onImageChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    })
  },

  // 预览图片
  previewImage(e) {
    const { current } = e.currentTarget.dataset
    const { post } = this.data
    
    if (post && post.images) {
      util.previewImage(current, post.images)
    }
  },

  // 点赞/取消点赞
  async toggleLike() {
    if (!app.globalData.isLoggedIn) {
      util.showLoginModal(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        })
      })
      return
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'toggleLike',
          postId: this.data.postId
        }
      })

      if (result.result.success) {
        const { isLiked, likeCount } = result.result.data
        this.setData({
          isLiked: isLiked,
          likeCount: likeCount
        })
        
        wx.showToast({
          title: isLiked ? '已点赞' : '已取消',
          icon: 'success',
          duration: 1000
        })
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 联系作者
  contactAuthor() {
    if (!app.globalData.isLoggedIn) {
      util.showLoginModal(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        })
      })
      return
    }

    const { post } = this.data
    if (!post || !post.contact) return

    const actions = []
    if (post.contact.phone) {
      actions.push('拨打电话')
    }
    if (post.contact.wechat) {
      actions.push('复制微信号')
    }

    if (actions.length === 0) {
      wx.showToast({
        title: '暂无联系方式',
        icon: 'none'
      })
      return
    }

    util.showActionSheet(actions, (index) => {
      if (actions[index] === '拨打电话') {
        util.makePhoneCall(post.contact.phone)
      } else if (actions[index] === '复制微信号') {
        util.copyToClipboard(post.contact.wechat, '微信号已复制')
      }
    })
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    })
  },

  // 提交评论
  async submitComment() {
    if (!app.globalData.isLoggedIn) {
      util.showLoginModal(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        })
      })
      return
    }

    const commentText = this.data.commentText.trim()
    if (!commentText) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '发布中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'comments',
        data: {
          action: 'create',
          postId: this.data.postId,
          content: commentText
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        this.setData({
          commentText: ''
        })
        
        // 重新加载评论
        this.loadComments()
        
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.result.message || '评论失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('提交评论失败:', error)
      wx.showToast({
        title: '评论失败',
        icon: 'none'
      })
    }
  },

  // 加载更多评论
  loadMoreComments() {
    if (this.data.hasMoreComments && !this.data.commentLoading) {
      this.loadComments(true)
    }
  },

  // 查看相似帖子
  viewSimilarPost(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 重新加载
  retry() {
    this.setData({
      error: false,
      loading: true
    })
    this.loadPostDetail()
    this.loadComments()
  }
})