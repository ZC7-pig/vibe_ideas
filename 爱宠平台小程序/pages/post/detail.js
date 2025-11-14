// pages/post/detail.js
import { 
  POST_TYPE_NAMES, 
  SERVICE_TYPE_NAMES, 
  ADOPT_STATUS_NAMES,
  ERROR_MESSAGES 
} from '../../config.js'

Page({
  data: {
    post: null,
    currentImageIndex: 0,
    showContactModal: false,
    similarPosts: [],
    isOwner: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadPostDetail(options.id)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载帖子详情
  async loadPostDetail(postId) {
    wx.showLoading({ title: '加载中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getPostDetail',
        data: { postId }
      })

      if (result.result.success) {
        const post = this.formatPost(result.result.data)
        
        // 检查是否是当前用户的帖子
        let isOwner = false
        try {
          const userResult = await wx.cloud.callFunction({
            name: 'getUserStats',
            data: {}
          })
          if (userResult.result.success && userResult.result.userId) {
            isOwner = post.userId === userResult.result.userId
          }
        } catch (error) {
          console.log('获取用户信息失败:', error)
          isOwner = false
        }
        
        this.setData({ 
          post,
          isOwner
        })

        // 如果是寻宠或发现类型，加载相似信息
        if (post.type === 'lost' || post.type === 'found') {
          this.loadSimilarPosts(postId)
        }
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载帖子详情失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } finally {
      wx.hideLoading()
    }
  },

  // 加载相似帖子
  async loadSimilarPosts(postId) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getSimilarPosts',
        data: { 
          postId,
          limit: 5
        }
      })

      if (result.result.success) {
        this.setData({
          similarPosts: result.result.data.map(item => ({
            ...item,
            matchScore: Math.round(item.matchScore || 0)
          }))
        })
      }
    } catch (error) {
      console.error('加载相似帖子失败:', error)
    }
  },

  // 格式化帖子数据
  formatPost(post) {
    const formatted = {
      ...post,
      typeText: POST_TYPE_NAMES[post.type] || post.type,
      createTimeText: this.formatTime(post.createTime),
      updateTimeText: post.updateTime ? this.formatTime(post.updateTime) : null,
      updateDateText: post.updateTime ? this.formatDate(post.updateTime) : null,
      userInfo: post.userInfo
    }

    // 格式化时间字段
    if (post.lostOrFoundTime) {
      formatted.lostOrFoundTimeText = this.formatDate(post.lostOrFoundTime)
    }

    // 格式化服务信息
    if (post.serviceMeta) {
      formatted.serviceMeta = {
        ...post.serviceMeta,
        modeText: SERVICE_TYPE_NAMES[post.serviceMeta.mode] || post.serviceMeta.mode
      }
    }

    // 格式化收养状态
    if (post.adoptStatus) {
      formatted.adoptStatusText = ADOPT_STATUS_NAMES[post.adoptStatus] || post.adoptStatus
    }

    return formatted
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

  // 格式化日期
  formatDate(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  },

  // 图片轮播变化
  onSwiperChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    })
  },

  // 点击图片预览
  onImageTap(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.post.images
    
    wx.previewImage({
      current: images[index],
      urls: images
    })
  },

  // 联系发布者
  onContactTap() {
    this.setData({
      showContactModal: true
    })
  },

  // 关闭联系弹窗
  onCloseContactModal() {
    this.setData({
      showContactModal: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 复制联系方式
  onCopyContact(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
        this.onCloseContactModal()
      }
    })
  },

  // 分享
  onShareTap() {
    // 触发分享
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  // 相似提醒
  async onSimilarTap() {
    wx.showLoading({ title: '匹配中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'matchPosts',
        data: {
          postId: this.data.post._id,
          mode: 'realtime'
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        const matchCount = result.result.matchCount || 0
        if (matchCount > 0) {
          wx.showToast({
            title: `找到${matchCount}条相似信息`,
            icon: 'success'
          })
          // 重新加载相似帖子
          this.loadSimilarPosts(this.data.post._id)
        } else {
          wx.showToast({
            title: '暂无相似信息',
            icon: 'none'
          })
        }
      } else {
        wx.showToast({
          title: result.result.message || '匹配失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('相似匹配失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    }
  },

  // 点击相似帖子
  onSimilarPostTap(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post/detail?id=${postId}`
    })
  },

  // 编辑帖子
  onEditTap() {
    const postId = this.data.post._id
    wx.navigateTo({
      url: `/pages/post/edit?id=${postId}`
    })
  },

  // 删除帖子
  onDeleteTap() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个帖子吗？此操作不可恢复。',
      confirmText: '删除',
      confirmColor: '#f44336',
      success: async (res) => {
        if (res.confirm) {
          await this.deletePost()
        }
      }
    })
  },

  // 执行删除操作
  async deletePost() {
    wx.showLoading({ title: '删除中...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deletePost',
        data: {
          postId: this.data.post._id
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        })
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: result.result.message || '删除失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('删除帖子失败:', error)
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      })
    }
  },

  // 分享配置
  onShareAppMessage() {
    const post = this.data.post
    if (!post) return {}

    return {
      title: post.title,
      path: `/pages/post/detail?id=${post._id}`,
      imageUrl: post.images.length > 0 ? post.images[0] : ''
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const post = this.data.post
    if (!post) return {}

    return {
      title: post.title,
      query: `id=${post._id}`,
      imageUrl: post.images.length > 0 ? post.images[0] : ''
    }
  }
})