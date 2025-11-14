// pages/post/create.js
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
    // 如果有传入类型参数，设置默认类型
    if (options.type && POST_TYPES[options.type.toUpperCase()]) {
      this.setData({
        currentType: options.type
      })
    }

    // 获取用户信息，预填联系方式
    this.loadUserInfo()
    
    // 获取当前位置
    this.getCurrentLocation()
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userInfo = app.globalData.userInfo
      if (userInfo && userInfo.phoneNumber) {
        this.setData({
          'formData.contact': userInfo.phoneNumber
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 逆地理编码获取地址
        this.reverseGeocode(res.latitude, res.longitude)
      },
      fail: () => {
        wx.showToast({
          title: '获取位置失败，请手动选择',
          icon: 'none'
        })
      }
    })
  },

  // 逆地理编码
  reverseGeocode(lat, lng) {
    // 这里应该调用地图API进行逆地理编码
    // 暂时使用模拟数据
    this.setData({
      'formData.location': {
        name: '当前位置',
        lat: lat,
        lng: lng
      }
    })
  },

  // 类型切换
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      currentType: type
    })
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`formData.${field}`]: value
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
    const maxCount = CONFIG.MAX_IMAGES - this.data.formData.images.length
    
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths)
      }
    })
  },

  // 上传图片
  async uploadImages(tempFilePaths) {
    wx.showLoading({ title: '上传中...' })
    
    try {
      const uploadPromises = tempFilePaths.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `posts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: filePath
        })
      })

      const results = await Promise.all(uploadPromises)
      const imageUrls = results.map(result => result.fileID)
      
      this.setData({
        'formData.images': [...this.data.formData.images, ...imageUrls]
      })
      
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: ERROR_MESSAGES.UPLOAD_FAILED,
        icon: 'none'
      })
    }
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.images]
    images.splice(index, 1)
    
    this.setData({
      'formData.images': images
    })
  },

  // 地点选择变化
  onLocationChange(e) {
    const location = e.detail.location;
    this.setData({
      'formData.location': location
    });
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
    
    return true
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) {
      return
    }

    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再发布信息',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/index' })
          }
        }
      })
      return
    }

    this.setData({ submitting: true })

    try {
      const postData = {
        type: this.data.currentType,
        title: this.data.formData.title.trim(),
        images: this.data.formData.images,
        breed: this.data.formData.breed,
        color: this.data.formData.color,
        location: this.data.formData.location,
        description: this.data.formData.description.trim(),
        contact: this.data.formData.contact.trim()
      }

      // 添加类型特有字段
      if (this.data.currentType === 'lost' || this.data.currentType === 'found') {
        if (this.data.formData.lostOrFoundDate) {
          postData.lostOrFoundTime = new Date(this.data.formData.lostOrFoundDate)
        }
      }

      if (this.data.currentType === 'foster' || this.data.currentType === 'breed') {
        postData.serviceMeta = {
          mode: this.data.formData.serviceType,
          price: this.data.formData.price
        }
      }

      if (this.data.currentType === 'adopt') {
        postData.adoptStatus = this.data.formData.adoptStatus
      }

      // 调用云函数创建帖子
      const result = await wx.cloud.callFunction({
        name: 'createPost',
        data: postData
      })

      if (result.result.success) {
        wx.showToast({
          title: SUCCESS_MESSAGES.POST_CREATED,
          icon: 'success'
        })

        // 清空表单
        this.resetForm()

        // 返回首页
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/index' })
        }, 1500)
      } else {
        wx.showToast({
          title: result.result.message || ERROR_MESSAGES.OPERATION_FAILED,
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('发布失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      currentType: 'lost',
      breedIndex: -1,
      colorIndex: -1,
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
        contact: this.data.formData.contact, // 保留联系方式
        lostOrFoundDate: '',
        serviceType: 'provide',
        price: '',
        adoptStatus: 'pending'
      }
    })
  }
})