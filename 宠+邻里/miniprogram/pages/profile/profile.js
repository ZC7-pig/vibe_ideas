const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    isLoggedIn: false,
    userInfo: {},
    userStats: {
      postCount: 0,
      likeCount: 0,
      helpCount: 0
    },
    recentPosts: [],
    
    // 编辑资料
    showEditProfile: false,
    editUserInfo: {},
    uploading: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadUserInfo()
      this.loadUserStats()
      this.loadRecentPosts()
    }
  },

  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      Promise.all([
        this.loadUserInfo(),
        this.loadUserStats(),
        this.loadRecentPosts()
      ]).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: app.globalData.userInfo || {}
    })
  },

  // 登录
  async login() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'login'
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        const userInfo = result.result.data
        
        // 更新全局状态
        app.globalData.isLoggedIn = true
        app.globalData.userInfo = userInfo
        
        this.setData({
          isLoggedIn: true,
          userInfo: userInfo
        })
        
        // 加载用户数据
        this.loadUserStats()
        this.loadRecentPosts()
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.result.message || '登录失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除全局状态
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = {}
          
          this.setData({
            isLoggedIn: false,
            userInfo: {},
            userStats: {
              postCount: 0,
              likeCount: 0,
              helpCount: 0
            },
            recentPosts: []
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'getUserInfo'
        }
      })

      if (result.result.success) {
        const userInfo = result.result.data
        
        // 更新全局和本地状态
        app.globalData.userInfo = userInfo
        this.setData({
          userInfo: userInfo
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'getUserStats'
        }
      })

      if (result.result.success) {
        this.setData({
          userStats: result.result.data
        })
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
    }
  },

  // 加载最近发布的帖子
  async loadRecentPosts() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'getUserPosts',
          page: 1,
          pageSize: 4
        }
      })

      if (result.result.success) {
        const posts = result.result.data.map(post => {
          post.createTimeRelative = util.getRelativeTime(new Date(post.createTime))
          post.typeText = this.getPostTypeText(post.type, post.subType)
          return post
        })
        
        this.setData({
          recentPosts: posts
        })
      }
    } catch (error) {
      console.error('加载最近帖子失败:', error)
    }
  },

  // 获取帖子类型文本
  getPostTypeText(type, subType) {
    const typeMap = {
      normal: '日常',
      lost: '寻宠',
      found: '捡到',
      adoption: subType === 'give' ? '送养' : '领养'
    }
    return typeMap[type] || '未知'
  },

  // 编辑资料
  editProfile() {
    this.setData({
      showEditProfile: true,
      editUserInfo: { ...this.data.userInfo }
    })
  },

  // 关闭编辑资料
  closeEditProfile() {
    this.setData({
      showEditProfile: false,
      editUserInfo: {}
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击模态框内容时关闭弹窗
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await util.chooseImage(1)
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const tempFilePath = res.tempFilePaths[0]
        
        // 压缩图片
        const compressedPath = await util.compressImage(tempFilePath, 0.8)
        
        this.setData({
          'editUserInfo.avatarUrl': compressedPath
        })
      }
    } catch (error) {
      console.error('选择头像失败:', error)
      wx.showToast({
        title: '选择头像失败',
        icon: 'none'
      })
    }
  },

  // 昵称输入
  onNickNameInput(e) {
    this.setData({
      'editUserInfo.nickName': e.detail.value
    })
  },

  // 个人简介输入
  onBioInput(e) {
    this.setData({
      'editUserInfo.bio': e.detail.value
    })
  },

  // 保存资料
  async saveProfile() {
    const editUserInfo = this.data.editUserInfo
    
    if (!editUserInfo.nickName || !editUserInfo.nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      let avatarUrl = editUserInfo.avatarUrl
      
      // 如果头像是本地路径，需要上传
      if (avatarUrl && avatarUrl.startsWith('http://tmp/')) {
        avatarUrl = await util.uploadToCloud(avatarUrl, 'avatars')
      }
      
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'updateProfile',
          userInfo: {
            nickName: editUserInfo.nickName.trim(),
            bio: editUserInfo.bio || '',
            avatarUrl: avatarUrl
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        const updatedUserInfo = result.result.data
        
        // 更新全局和本地状态
        app.globalData.userInfo = updatedUserInfo
        this.setData({
          userInfo: updatedUserInfo,
          showEditProfile: false,
          editUserInfo: {}
        })
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.result.message || '保存失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('保存资料失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 查看帖子详情
  viewPost(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 前往我的发布
  goToMyPosts() {
    wx.navigateTo({
      url: '/pages/my-posts/my-posts'
    })
  },

  // 前往我的点赞
  goToMyLikes() {
    wx.navigateTo({
      url: '/pages/my-likes/my-likes'
    })
  },

  // 前往我的评论
  goToMyComments() {
    wx.navigateTo({
      url: '/pages/my-comments/my-comments'
    })
  },

  // 前往发布页面
  goToPublish() {
    wx.switchTab({
      url: '/pages/publish/publish'
    })
  },

  // 前往通知设置
  goToNotificationSettings() {
    wx.navigateTo({
      url: '/pages/notification-settings/notification-settings'
    })
  },

  // 前往隐私设置
  goToPrivacySettings() {
    wx.navigateTo({
      url: '/pages/privacy-settings/privacy-settings'
    })
  },

  // 前往关于我们
  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    })
  },

  // 前往意见反馈
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '宠物社区 - 找到你的毛孩子',
      path: '/pages/index/index'
    }
  }
})