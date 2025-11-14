// display.js
Page({
  data: {
    danmuData: null,
    isLandscape: false
  },
  
  onLoad(options) {
    // 立即从全局变量获取数据，确保有默认值
    this.tryGetDataFromGlobal();
    
    // 然后尝试从事件通道获取数据（如果可用）
    setTimeout(() => {
      try {
        // 检查方法是否存在且是函数
        if (typeof this.getOpenerEventChannel === 'function') {
          const eventChannel = this.getOpenerEventChannel();
          if (eventChannel && typeof eventChannel.on === 'function') {
            eventChannel.on('danmuData', (data) => {
              if (data) {
                this.processDanmuData(data);
              }
            });
          }
        }
      } catch (error) {
        console.error('获取事件通道失败:', error);
        // 已经从全局变量获取了数据，所以这里不需要额外处理
      }
    }, 100);
    
    // 保持屏幕常亮
    wx.setKeepScreenOn({
      keepScreenOn: true
    });
    
    // 如果3秒后还没有数据，再次尝试从全局变量获取
    setTimeout(() => {
      if (!this.data.danmuData || !this.data.danmuData.text) {
        this.tryGetDataFromGlobal();
        
        // 如果仍然没有数据，设置默认值确保显示
        if (!this.data.danmuData || !this.data.danmuData.text) {
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
    }, 3000);
  },
  
  // 处理弹幕数据
  processDanmuData(data) {
    if (!data) return;
    
    // 接收来自preview页面的数据，包括横竖屏状态
    const isLandscape = data.isLandscape || false;
    delete data.isLandscape; // 从弹幕数据中移除横竖屏状态
    
    this.setData({
      danmuData: data,
      isLandscape: isLandscape
    });
    
    // 强制横屏模式
    if (isLandscape) {
      this.setLandscapeMode();
    }
  },
  
  // 尝试从全局变量获取数据
  tryGetDataFromGlobal() {
    try {
      const app = getApp();
      // 检查全局数据是否存在
      if (app && app.globalData && app.globalData.tempDanmuData) {
        const data = app.globalData.tempDanmuData;
        
        // 验证数据完整性
        if (data && typeof data === 'object') {
          // 确保数据有必要的字段
          const validData = {
            text: data.text || '弹幕文本',
            textColor: data.textColor || '#ffffff',
            bgColor: data.bgColor || '#000000',
            fontSize: data.fontSize || 36,
            effect: data.effect || 'none',
            effectSpeed: data.effectSpeed || 5,
            isLandscape: data.isLandscape || false
          };
          
          this.processDanmuData(validData);
          
          // 使用后清除，避免内存泄漏
          app.globalData.tempDanmuData = null;
          return true;
        }
      }
      
      // 如果没有有效数据且当前没有设置数据，则设置默认值
      if (!this.data.danmuData || !this.data.danmuData.text) {
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
      return false;
    } catch (error) {
      console.error('从全局变量获取数据失败:', error);
      // 设置默认值
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
      return false;
    }
    
    // 监听设备方向变化
    wx.onDeviceMotionChange((res) => {
      const { alpha, beta, gamma } = res
      // 判断是否横屏
      const isLandscape = Math.abs(gamma) > 45
      this.setData({
        isLandscape
      })
      
      // 根据设备方向设置横竖屏模式
      if (isLandscape) {
        this.setLandscapeMode();
      }
    })
  },
  
  onUnload() {
    // 取消屏幕常亮
    wx.setKeepScreenOn({
      keepScreenOn: false
    })
    
    // 取消监听设备方向
    wx.offDeviceMotionChange()
  },
  
  // 点击返回
  onTapBack() {
    wx.navigateBack()
  },
  
  // 设置横屏模式
  setLandscapeMode() {
    // 强制横屏模式的额外处理
    setTimeout(() => {
      this.setData({
        isLandscape: true
      });
    }, 100);
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