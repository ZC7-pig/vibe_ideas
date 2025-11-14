// pages/publish/publish.js
const app = getApp()
const { validatePhone, validateWechat, chooseImage, uploadToCloud, chooseLocation, generateRandomString } = require('../../utils/util')

Page({
  data: {
    selectedType: 'normal',
    subType: 'offer',
    submitting: false,
    
    // 帖子类型选项
    postTypes: [
      {
        value: 'normal',
        label: '普通交流',
        desc: '分享宠物生活、交流经验',
        icon: '/images/chat.png'
      },
      {
        value: 'lost',
        label: '寻宠',
        desc: '我的宠物走失了',
        icon: '/images/lost.png'
      },
      {
        value: 'found',
        label: '发现',
        desc: '我发现了走失的宠物',
        icon: '/images/found.png'
      },
      {
        value: 'adoption',
        label: '收养',
        desc: '送养或领养宠物',
        icon: '/images/adoption.png'
      }
    ],

    // 品种选项
    breeds: [
      '中华田园猫', '英国短毛猫', '美国短毛猫', '布偶猫', '暹罗猫', '波斯猫', '缅因猫', '苏格兰折耳猫',
      '中华田园犬', '金毛寻回犬', '拉布拉多犬', '哈士奇', '萨摩耶', '边境牧羊犬', '德国牧羊犬', '比熊犬',
      '泰迪犬', '柯基犬', '法国斗牛犬', '其他'
    ],
    breedIndex: -1,

    // 毛色选项
    colors: [
      '黑色', '白色', '黄色', '棕色', '灰色', '橘色', '黑白', '黄白', '棕白', '三花', '玳瑁', '其他'
    ],
    colorIndex: -1,

    // 年龄选项
    ages: ['幼年（0-1岁）', '成年（1-7岁）', '老年（7岁以上）', '未知'],
    ageIndex: -1,

    // 半径选项
    radiusOptions: [
      { value: 1, label: '1公里' },
      { value: 3, label: '3公里' },
      { value: 5, label: '5公里' },
      { value: 10, label: '10公里' },
      { value: 20, label: '20公里' }
    ],
    radiusIndex: -1,

    // 有效期选项
    expireOptions: [
      { value: 7, label: '7天' },
      { value: 15, label: '15天' },
      { value: 30, label: '30天' },
      { value: 60, label: '60天' },
      { value: 90, label: '90天' }
    ],
    expireIndex: -1,
    selectedExpireOption: null,

    // 表单数据
    formData: {
      title: '',
      content: '',
      images: [],
      breed: '',
      color: '',
      sex: '',
      age: '',
      specialNeeds: '',
      eventDate: '',
      location: null,
      radiusKm: null,
      contact: {
        phone: '',
        wechat: ''
      }
    }
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再发布',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }

    // 设置默认日期为今天
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    this.setData({
      'formData.eventDate': dateStr
    })
  },

  // 选择帖子类型
  selectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      selectedType: type,
      subType: 'offer' // 重置子类型
    })
  },

  // 选择收养子类型
  selectSubType(e) {
    const subtype = e.currentTarget.dataset.subtype
    this.setData({
      subType: subtype
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

  // 联系方式变化
  onContactChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`formData.contact.${field}`]: value
    })
  },

  // 品种选择
  onBreedChange(e) {
    const index = e.detail.value
    this.setData({
      breedIndex: index,
      'formData.breed': this.data.breeds[index]
    })
  },

  // 毛色选择
  onColorChange(e) {
    const index = e.detail.value
    this.setData({
      colorIndex: index,
      'formData.color': this.data.colors[index]
    })
  },

  // 性别选择
  onSexChange(e) {
    const sex = e.currentTarget.dataset.sex
    this.setData({
      'formData.sex': sex
    })
  },

  // 年龄选择
  onAgeChange(e) {
    const index = e.detail.value
    this.setData({
      ageIndex: index,
      'formData.age': this.data.ages[index]
    })
  },

  // 事件日期选择
  onEventDateChange(e) {
    this.setData({
      'formData.eventDate': e.detail.value
    })
  },

  // 半径选择
  onRadiusChange(e) {
    const index = e.detail.value
    const option = this.data.radiusOptions[index]
    this.setData({
      radiusIndex: index,
      'formData.radiusKm': option.value
    })
  },

  // 有效期选择
  onExpireChange(e) {
    const index = e.detail.value
    const option = this.data.expireOptions[index]
    this.setData({
      expireIndex: index,
      selectedExpireOption: option
    })
  },

  // 选择图片
  async chooseImage() {
    try {
      const result = await chooseImage(9 - this.data.formData.images.length)
      const tempFilePaths = result.tempFilePaths

      app.showLoading('上传中...')

      // 上传图片到云存储
      const uploadPromises = tempFilePaths.map(async (filePath) => {
        const cloudPath = `posts/${Date.now()}_${generateRandomString()}.jpg`
        const uploadResult = await uploadToCloud(filePath, cloudPath)
        return uploadResult.fileID
      })

      const fileIDs = await Promise.all(uploadPromises)
      
      this.setData({
        'formData.images': [...this.data.formData.images, ...fileIDs]
      })

      app.hideLoading()
      app.showToast('上传成功', 'success')
    } catch (error) {
      app.hideLoading()
      console.error('上传图片失败:', error)
      app.showToast('上传失败')
    }
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.images]
    images.splice(index, 1)
    this.setData({
      'formData.images': images
    })
  },

  // 选择位置
  async chooseLocation() {
    try {
      const result = await chooseLocation()
      this.setData({
        'formData.location': {
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address
        }
      })
    } catch (error) {
      console.error('选择位置失败:', error)
      app.showToast('选择位置失败')
    }
  },

  // 表单验证
  validateForm() {
    const { selectedType, subType, formData } = this.data
    const errors = []

    // 基本信息验证
    if (!formData.title.trim()) {
      errors.push('请输入标题')
    }

    if (!formData.location) {
      errors.push('请选择地点')
    }

    // 联系方式验证
    if (!formData.contact.phone && !formData.contact.wechat) {
      errors.push('请至少填写一种联系方式')
    }

    if (formData.contact.phone && !validatePhone(formData.contact.phone)) {
      errors.push('手机号格式不正确')
    }

    if (formData.contact.wechat && !validateWechat(formData.contact.wechat)) {
      errors.push('微信号格式不正确')
    }

    // 宠物信息验证（非普通交流帖）
    if (selectedType !== 'normal') {
      if (!formData.breed) errors.push('请选择品种')
      if (!formData.color) errors.push('请选择毛色')
      if (!formData.sex) errors.push('请选择性别')
      if (!formData.age) errors.push('请选择年龄')
      if (!formData.eventDate) errors.push('请选择发生时间')
      if (!formData.radiusKm) errors.push('请选择匹配半径')
      if (!this.data.selectedExpireOption) errors.push('请选择有效期')
    }

    return errors
  },

  // 提交帖子
  async submitPost() {
    if (this.data.submitting) return

    const errors = this.validateForm()
    if (errors.length > 0) {
      app.showToast(errors[0])
      return
    }

    this.setData({ submitting: true })
    app.showLoading('发布中...')

    try {
      const { selectedType, subType, formData, selectedExpireOption } = this.data
      
      // 构建提交数据
      const postData = {
        type: selectedType,
        title: formData.title.trim(),
        content: formData.content.trim(),
        images: formData.images,
        location: formData.location,
        contact: {
          phone: formData.contact.phone.trim(),
          wechat: formData.contact.wechat.trim()
        }
      }

      // 添加收养子类型
      if (selectedType === 'adoption') {
        postData.subType = subType
      }

      // 添加宠物信息（非普通交流帖）
      if (selectedType !== 'normal') {
        postData.breed = formData.breed
        postData.color = formData.color
        postData.sex = formData.sex
        postData.age = formData.age
        postData.specialNeeds = formData.specialNeeds.trim()
        postData.eventDate = new Date(formData.eventDate).getTime()
        postData.radiusKm = formData.radiusKm
        
        // 计算过期时间
        const expireDays = selectedExpireOption.value
        postData.expireAt = Date.now() + (expireDays * 24 * 60 * 60 * 1000)
      }

      // 调用云函数创建帖子
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'create',
          ...postData
        }
      })

      if (result.result.code === 0) {
        app.hideLoading()
        app.showToast('发布成功', 'success')
        
        // 如果是寻宠/发现帖子，触发匹配
        if (selectedType === 'lost' || selectedType === 'found') {
          wx.cloud.callFunction({
            name: 'matcher',
            data: {
              action: 'runForPost',
              postId: result.result.data._id
            }
          }).catch(error => {
            console.error('匹配失败:', error)
          })
        }

        // 返回首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1500)
      } else {
        throw new Error(result.result.message)
      }
    } catch (error) {
      app.hideLoading()
      console.error('发布失败:', error)
      app.showToast('发布失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  }
})