// pages/adoption/list.js
import { 
  POST_TYPES, 
  ADOPT_STATUS_NAMES, 
  CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '../../config.js'

const app = getApp()

Page({
  data: {
    adoptions: [],
    loading: false,
    hasMore: true,
    page: 1,
    showApplyModal: false,
    currentAdoptionId: '',
    applicationForm: {
      name: '',
      contact: '',
      environment: '',
      experience: ''
    },
    rescueStations: [
      {
        id: 1,
        name: '爱心动物救助站',
        address: '北京市朝阳区xxx路xxx号',
        phone: '400-123-4567'
      },
      {
        id: 2,
        name: '流浪动物之家',
        address: '北京市海淀区xxx路xxx号',
        phone: '400-234-5678'
      }
    ]
  },

  onLoad() {
    this.loadAdoptions()
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshAdoptions()
  },

  onPullDownRefresh() {
    this.refreshAdoptions()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 刷新收养列表
  refreshAdoptions() {
    this.setData({
      adoptions: [],
      page: 1,
      hasMore: true
    })
    this.loadAdoptions()
  },

  // 加载收养列表
  async loadAdoptions() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const { page } = this.data
      
      const params = {
        type: [POST_TYPES.ADOPT],
        page,
        pageSize: CONFIG.PAGE_SIZE
      }

      // 获取当前位置用于距离计算
      const location = await this.getCurrentLocation()
      if (location) {
        params.center = location
        params.radiusKm = CONFIG.DEFAULT_RADIUS_KM * 2 // 收养信息扩大搜索范围
      }

      // 调用云函数获取收养列表
      const result = await wx.cloud.callFunction({
        name: 'listPosts',
        data: params
      })

      if (result.result.success) {
        const newAdoptions = result.result.data.map(this.formatAdoption)
        const allAdoptions = page === 1 ? newAdoptions : [...this.data.adoptions, ...newAdoptions]
        
        this.setData({
          adoptions: allAdoptions,
          hasMore: newAdoptions.length === CONFIG.PAGE_SIZE,
          page: page + 1
        })
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载收养列表失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 格式化收养数据
  formatAdoption(adoption) {
    return {
      ...adoption,
      adoptStatusText: ADOPT_STATUS_NAMES[adoption.adoptStatus] || adoption.adoptStatus,
      createTimeText: this.formatTime(adoption.createTime),
      userInfo: adoption.userInfo
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now - time

    if (diff < 86400000) { // 1天内
      if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
      } else {
        return `${Math.floor(diff / 3600000)}小时前`
      }
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

  // 点击收养项
  onAdoptionTap(e) {
    const adoptionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post/detail?id=${adoptionId}`
    })
  },

  // 联系发布者
  onContactTap(e) {
    const contact = e.currentTarget.dataset.contact
    wx.showModal({
      title: '联系方式',
      content: contact,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: contact,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  },

  // 申请领养
  onApplyTap(e) {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后申请领养',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/index' })
          }
        }
      })
      return
    }

    const adoptionId = e.currentTarget.dataset.id
    this.setData({
      currentAdoptionId: adoptionId,
      showApplyModal: true
    })

    // 预填用户信息
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        'applicationForm.name': userInfo.nickName || '',
        'applicationForm.contact': userInfo.phoneNumber || ''
      })
    }
  },

  // 关闭申请弹窗
  onCloseApplyModal() {
    this.setData({
      showApplyModal: false,
      currentAdoptionId: '',
      applicationForm: {
        name: '',
        contact: '',
        environment: '',
        experience: ''
      }
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 提交申请
  async onSubmitApplication(e) {
    const formData = e.detail.value
    
    // 表单验证
    if (!formData.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    
    if (!formData.contact.trim()) {
      wx.showToast({ title: '请输入联系方式', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'submitAdoptionApplication',
        data: {
          adoptionId: this.data.currentAdoptionId,
          applicantInfo: {
            name: formData.name.trim(),
            contact: formData.contact.trim(),
            environment: formData.environment.trim(),
            experience: formData.experience.trim()
          }
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '申请提交成功',
          icon: 'success'
        })
        this.onCloseApplyModal()
      } else {
        wx.showToast({
          title: result.result.message || '提交失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('提交申请失败:', error)
      wx.showToast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
    }
  },

  // 联系救助站
  onCallRescue(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showModal({
          title: '联系方式',
          content: phone,
          confirmText: '复制',
          success: (res) => {
            if (res.confirm) {
              wx.setClipboardData({
                data: phone,
                success: () => {
                  wx.showToast({
                    title: '已复制到剪贴板',
                    icon: 'success'
                  })
                }
              })
            }
          }
        })
      }
    })
  },

  // 发布收养信息
  onPublishTap() {
    wx.navigateTo({
      url: '/pages/post/create?type=adopt'
    })
  },

  // 加载更多
  loadMore() {
    this.loadAdoptions()
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '流浪动物收养 - 给它们一个温暖的家',
      path: '/pages/adoption/list'
    }
  }
})