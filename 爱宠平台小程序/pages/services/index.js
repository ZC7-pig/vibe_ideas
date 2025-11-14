// pages/services/index.js
import { LOCAL_SERVICES } from '../../config.js'

Page({
  data: {
    services: LOCAL_SERVICES,
    showComingModal: false,
    currentService: {},
    recommendServices: [
      {
        id: 1,
        name: '爱宠动物医院',
        address: '朝阳区xxx路xxx号',
        distance: '1.2km',
        rating: '4.8',
        image: '/assets/hospital-demo.jpg'
      },
      {
        id: 2,
        name: '宠物美容中心',
        address: '海淀区xxx路xxx号',
        distance: '2.1km',
        rating: '4.6',
        image: '/assets/grooming-demo.jpg'
      },
      {
        id: 3,
        name: '宠物训练基地',
        address: '丰台区xxx路xxx号',
        distance: '3.5km',
        rating: '4.7',
        image: '/assets/training-demo.jpg'
      }
    ]
  },

  onLoad() {
    // 页面加载时可以获取用户位置，计算距离
    this.getCurrentLocation()
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('当前位置:', res.latitude, res.longitude)
        // 这里可以根据位置计算到各个服务点的距离
        // 暂时使用模拟数据
      },
      fail: () => {
        console.log('获取位置失败')
      }
    })
  },

  // 点击服务项
  onServiceTap(e) {
    const serviceId = e.currentTarget.dataset.id
    const service = this.data.services.find(item => item.id === serviceId)
    
    if (service) {
      this.setData({
        currentService: service,
        showComingModal: true
      })
    }
  },

  // 关闭即将上线弹窗
  onCloseComingModal() {
    this.setData({
      showComingModal: false,
      currentService: {}
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 提建议
  onSuggestTap() {
    wx.showModal({
      title: '功能建议',
      content: '您希望我们增加哪些宠物服务功能？请联系客服微信：pethelper2024 告诉我们您的想法。',
      confirmText: '复制微信号',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'pethelper2024',
            success: () => {
              wx.showToast({
                title: '已复制微信号',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: '本地宠物服务 - 为您的爱宠提供便捷服务',
      path: '/pages/services/index'
    }
  }
})