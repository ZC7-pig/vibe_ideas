// pages/post/edit.js
import { 
  POST_TYPES, 
  POST_TYPE_NAMES, 
  PET_BREEDS, 
  PET_COLORS, 
  SERVICE_TYPES,
  ADOPT_STATUS,
  CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} from '../../config.js'

const app = getApp()

Page({
  data: {
    postId: '',
    currentType: 'lost',
    breedOptions: PET_BREEDS,
    colorOptions: PET_COLORS,
    breedIndex: -1,
    colorIndex: -1,
    submitting: false,
    formData: {
      title: '',
      images: [],
      breed: '',
      color: '',
      location: {
        name: '',
        lat: 0,
        lng: 0
      },
      description: '',
      contact: '',
      lostOrFoundDate: '',
      serviceType: 'provide',
      price: '',
      adoptStatus: 'pending'
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ postId: options.id })
      this.loadPostData(options.id)
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

  // 加载帖子数据
  async loadPostData(postId) {
    wx.showLoading({ title: '加载中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getPostDetail',
        data: { postId }
      })

      if (result.result.success) {
        const post = result.result.data
        
        // 检查是否是当前用户的帖子
        let userId = null
        try {
          const userResult = await wx.cloud.callFunction({
            name: 'getUserStats',
            data: {}
          })
          if (userResult.result.success && userResult.result.userId) {
            userId = userResult.result.userId
          }
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
        
        // 验证权限 - 只有帖子所有者才能编辑
        if (!userId || post.userId !== userId) {
          wx.showToast({
            title: '没有权限编辑此帖子',
            icon: 'none'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
          return
        }
        
        // 填充表单数据
        const breedIndex = this.data.breedOptions.indexOf(post.breed)
        const colorIndex = this.data.colorOptions.indexOf(post.color)
        
        this.setData({
          currentType: post.type,
          breedIndex: breedIndex >= 0 ? breedIndex : -1,
          colorIndex: colorIndex >= 0 ? colorIndex : -1,
          formData: {
            title: post.title,
            images: post.images,
            breed: post.breed,
            color: post.color,
            location: post.location,
            description: post.description,
            contact: post.contact,
            lostOrFoundDate: post.lostOrFoundTime ? this.formatDate(post.lostOrFoundTime) : '',
            serviceType: post.serviceMeta?.type || 'provide',
            price: post.serviceMeta?.price || '',
            adoptStatus: post.adoptStatus || 'pending'
          }
        })
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
      console.error('加载帖子数据失败:', error)
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

  // 格式化日期
  formatDate(timestamp) {
    const date = new Date(timestamp)
    return date.toISOString().split('T')[0]
  },

  // 类型改变
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentType: type })
  },

  // 输入框改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  // 品种选择
  onBreedChange(e) {
    const index = e.detail.value
    this.setData({
      breedIndex: index,
      'formData.breed': this.data.breedOptions[index]
    })
  },

  // 毛色选择
  onColorChange(e) {
    const index = e.detail.value
    this.setData({
      colorIndex: index,
      'formData.color': this.data.colorOptions[index]
    })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.lostOrFoundDate': e.detail.value
    })
  },

  // 服务类型选择
  onServiceTypeChange(e) {
    this.setData({
      'formData.serviceType': e.detail.value
    })
  },

  // 收养状态选择
  onAdoptStatusChange(e) {
    this.setData({
      'formData.adoptStatus': e.detail.value
    })
  },

  // 选择图片
  onChooseImage() {
    const maxCount = 9 - this.data.formData.images.length
    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFiles.map(file => file.tempFilePath))
      }
    })
  },

  // 上传图片
  async uploadImages(tempFilePaths) {
    wx.showLoading({ title: '上传中...' })

    try {
      const uploadPromises = tempFilePaths.map(async (filePath) => {
        const cloudPath = `posts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
        const result = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        })
        return result.fileID
      })

      const fileIDs = await Promise.all(uploadPromises)
      const newImages = [...this.data.formData.images, ...fileIDs]
      
      this.setData({
        'formData.images': newImages
      })

      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('上传图片失败:', error)
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      })
    }
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.formData.images
    images.splice(index, 1)
    this.setData({
      'formData.images': images
    })
  },

  // 位置选择
  onLocationChange(e) {
    // 这里可以集成地图选择组件
    console.log('位置选择功能待实现')
  },

  // 表单验证
  validateForm() {
    const { formData, currentType } = this.data

    if (!formData.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return false
    }

    if (formData.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' })
      return false
    }

    if (!formData.breed) {
      wx.showToast({ title: '请选择品种', icon: 'none' })
      return false
    }

    if (!formData.color) {
      wx.showToast({ title: '请选择毛色', icon: 'none' })
      return false
    }

    if (!formData.location.name) {
      wx.showToast({ title: '请选择地点', icon: 'none' })
      return false
    }

    if (!formData.description.trim()) {
      wx.showToast({ title: '请输入详细描述', icon: 'none' })
      return false
    }

    if (!formData.contact.trim()) {
      wx.showToast({ title: '请输入联系方式', icon: 'none' })
      return false
    }

    // 寻宠和发现类型需要时间
    if ((currentType === 'lost' || currentType === 'found') && !formData.lostOrFoundDate) {
      wx.showToast({ 
        title: `请选择${currentType === 'lost' ? '丢失' : '发现'}时间`, 
        icon: 'none' 
      })
      return false
    }

    return true
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return

    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再编辑帖子',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/profile/index'
            })
          }
        }
      })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中...' })

    try {
      const { formData, currentType, postId } = this.data

      // 构建提交数据
      const submitData = {
        postId,
        title: formData.title.trim(),
        images: formData.images,
        breed: formData.breed,
        color: formData.color,
        location: formData.location,
        description: formData.description.trim(),
        contact: formData.contact.trim()
      }

      // 根据类型添加特定字段
      if (currentType === 'lost' || currentType === 'found') {
        submitData.lostOrFoundTime = formData.lostOrFoundDate
      }

      if (currentType === 'service') {
        submitData.serviceMeta = {
          type: formData.serviceType,
          price: formData.price
        }
      }

      // 调用云函数更新帖子
      const result = await wx.cloud.callFunction({
        name: 'updatePost',
        data: submitData
      })

      if (result.result.success) {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result.result.message || '保存失败')
      }

    } catch (error) {
      console.error('保存帖子失败:', error)
      wx.showToast({
        title: error.message || ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  }
})