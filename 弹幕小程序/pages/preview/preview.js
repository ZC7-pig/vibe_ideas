// preview.js
Page({
  data: {
    danmuData: null,
    isLandscape: false
  },
  
  onLoad(options) {
    
    // 安全地获取事件通道
    try {
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
      if (eventChannel) {
        eventChannel.on('danmuData', (data) => {
          if (data) {
            this.setData({
              danmuData: data
            });
          }
        });
      } else {
        console.log('无法获取事件通道，尝试从全局变量获取数据');
        // 尝试从全局变量获取数据
        const app = getApp();
        if (app && app.globalData && app.globalData.tempDanmuData) {
          this.setData({
            danmuData: app.globalData.tempDanmuData
          });
          // 使用后清除
          app.globalData.tempDanmuData = null;
        } else {
          // 如果没有数据，设置默认值
          this.setData({
            danmuData: {
              text: '弹幕文本',
              textColor: '#ffffff',
              bgColor: '#000000',
              fontSize: 36,
              effect: 'none',
              effectSpeed: 5
            }
          });
        }
      }
    } catch (error) {
      console.error('获取事件通道失败:', error);
    }
    
    // 监听设备方向变化
    wx.onDeviceMotionChange((res) => {
      const { gamma } = res
      // 判断是否横屏
      const isLandscape = Math.abs(gamma) > 45
      this.setData({
        isLandscape
      })
    })
  },
  
  onUnload() {
    // 取消监听设备方向
    wx.offDeviceMotionChange()
  },
  
  // 返回编辑页
  goBack() {
    wx.navigateBack()
  },
  
  // 全屏显示
  showFullscreen() {
    // 先准备好要传递的数据
    const danmuDataToPass = {
      text: this.data.danmuData.text || '',
      textColor: this.data.danmuData.textColor || '#ffffff',
      bgColor: this.data.danmuData.bgColor || '#000000',
      fontSize: this.data.danmuData.fontSize || 36,
      effect: this.data.danmuData.effect || 'none',
      effectSpeed: this.data.danmuData.effectSpeed || 5,
      isLandscape: this.data.isLandscape || false
    };
    
    // 先将数据保存到全局变量，确保数据传递
    try {
      const app = getApp();
      app.globalData = app.globalData || {};
      app.globalData.tempDanmuData = danmuDataToPass;
    } catch (error) {
      console.error('保存数据到全局变量失败:', error);
    }
    
    // 延迟一下再跳转，确保全局变量设置完成
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/display/display',
        success: (res) => {
          // 尝试通过事件通道传递数据，但不依赖它
          try {
            if (res.eventChannel && typeof res.eventChannel.emit === 'function') {
              res.eventChannel.emit('danmuData', danmuDataToPass);
            }
          } catch (error) {
            console.error('通过事件通道传递数据失败:', error);
            // 已经保存到全局变量，所以这里不需要额外处理
          }
        },
        fail: (error) => {
          console.error('跳转到全屏显示页失败:', error);
          wx.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    }, 100);
  },
  
  // 切换横竖屏
  toggleOrientation() {
    this.setData({
      isLandscape: !this.data.isLandscape
    })
  },
  
  // 获取动画样式
  getAnimationStyle() {
    if (!this.data.danmuData) return ''
    
    const { effect, effectSpeed } = this.data.danmuData
    let animationStyle = ''
    
    switch (effect) {
      case 'scroll':
        animationStyle = `animation: scrollText ${11 - effectSpeed}s linear infinite;`
        break
      case 'blink':
        animationStyle = `animation: blinkText ${11 - effectSpeed}s ease infinite;`
        break
      case 'gradient':
        animationStyle = `animation: gradientText ${11 - effectSpeed}s ease infinite;`
        break
      default:
        animationStyle = ''
    }
    
    return animationStyle
  }
})