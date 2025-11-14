// edit.js
const app = getApp()

Page({
  data: {
    danmuText: '',
    textColor: '#FFFFFF',
    bgColor: '#000000',
    fontSize: 60,
    effect: 'none', // none, scroll, blink, gradient
    effectIndex: 0, // 新增：当前选中的效果索引
    effectSpeed: 5,
    colorOptions: [
      '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', 
      '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
    ],
    bgColorOptions: [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
      '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
    ],
    effectOptions: [
      { id: 'none', name: '无' },
      { id: 'scroll', name: '滚动' },
      { id: 'blink', name: '闪烁' },
      { id: 'gradient', name: '渐变' }
    ],
    commonPhrases: []
  },
  
  onLoad(options) {
    // 加载常用语
    this.setData({
      commonPhrases: app.globalData.commonPhrases
    })
    
    // 如果是从历史记录进入，加载历史弹幕
    if (options.type === 'history' && app.globalData.historyDanmu.length > 0) {
      const lastDanmu = app.globalData.historyDanmu[0]
      this.setData({
        danmuText: lastDanmu.text,
        textColor: lastDanmu.textColor,
        bgColor: lastDanmu.bgColor,
        fontSize: lastDanmu.fontSize,
        effect: lastDanmu.effect,
        effectSpeed: lastDanmu.effectSpeed
      })
    }
  },
  
  // 输入文字
  onInput(e) {
    this.setData({
      danmuText: e.detail.value
    })
  },
  
  // 选择文字颜色
  selectTextColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      textColor: color
    })
  },
  
  // 选择背景颜色
  selectBgColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      bgColor: color
    })
  },
  
  // 调整字体大小
  changeFontSize(e) {
    const type = e.currentTarget.dataset.type
    let fontSize = this.data.fontSize
    
    if (type === 'increase') {
      fontSize = Math.min(fontSize + 10, 100)
    } else {
      fontSize = Math.max(fontSize - 10, 20)
    }
    
    this.setData({
      fontSize
    })
  },
  
  // 选择动效
  selectEffect(e) {
    const index = e.detail.value;
    const effectId = this.data.effectOptions[index].id;
    this.setData({
      effectIndex: index,
      effect: effectId
    })
  },
  
  // 调整动效速度
  changeEffectSpeed(e) {
    this.setData({
      effectSpeed: e.detail.value
    })
  },
  
  // 选择常用语
  selectPhrase(e) {
    const phrase = e.currentTarget.dataset.phrase
    this.setData({
      danmuText: phrase
    })
  },
  
  // 预览弹幕
  previewDanmu() {
    if (!this.data.danmuText.trim()) {
      wx.showToast({
        title: '请输入弹幕内容',
        icon: 'none'
      })
      return
    }
    
    const danmuData = {
      text: this.data.danmuText,
      textColor: this.data.textColor,
      bgColor: this.data.bgColor,
      fontSize: this.data.fontSize,
      effect: this.data.effect,
      effectSpeed: this.data.effectSpeed
    }
    
    // 保存到历史记录
    const historyDanmu = app.globalData.historyDanmu || []
    // 检查是否已存在相同内容
    const existIndex = historyDanmu.findIndex(item => item.text === danmuData.text)
    if (existIndex !== -1) {
      historyDanmu.splice(existIndex, 1)
    }
    historyDanmu.unshift(danmuData)
    // 最多保存20条记录
    if (historyDanmu.length > 20) {
      historyDanmu.pop()
    }
    app.globalData.historyDanmu = historyDanmu
    
    // 跳转到预览页
    // 先将数据保存到全局变量
    app.globalData.tempDanmuData = danmuData;
    
    wx.navigateTo({
      url: '/pages/preview/preview',
      success: (res) => {
        // 尝试通过事件通道传递数据，但不依赖它
        try {
          if (res.eventChannel && typeof res.eventChannel.emit === 'function') {
            res.eventChannel.emit('danmuData', danmuData);
          }
        } catch (error) {
          console.error('通过事件通道传递数据失败:', error);
          // 已经保存到全局变量，所以这里不需要额外处理
        }
      },
      fail: (error) => {
        console.error('跳转到预览页失败:', error);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    })
  },
  
  // 直接显示弹幕
  showDanmu() {
    if (!this.data.danmuText.trim()) {
      wx.showToast({
        title: '请输入弹幕内容',
        icon: 'none'
      })
      return
    }
    
    const danmuData = {
      text: this.data.danmuText,
      textColor: this.data.textColor,
      bgColor: this.data.bgColor,
      fontSize: this.data.fontSize,
      effect: this.data.effect,
      effectSpeed: this.data.effectSpeed
    }
    
    // 保存到历史记录
    const historyDanmu = app.globalData.historyDanmu || []
    // 检查是否已存在相同内容
    const existIndex = historyDanmu.findIndex(item => item.text === danmuData.text)
    if (existIndex !== -1) {
      historyDanmu.splice(existIndex, 1)
    }
    historyDanmu.unshift(danmuData)
    // 最多保存20条记录
    if (historyDanmu.length > 20) {
      historyDanmu.pop()
    }
    app.globalData.historyDanmu = historyDanmu
    
    // 跳转到显示页
    // 先将数据保存到全局变量
    app.globalData.tempDanmuData = danmuData;
    
    wx.navigateTo({
      url: '/pages/display/display',
      success: (res) => {
        // 尝试通过事件通道传递数据，但不依赖它
        try {
          if (res.eventChannel && typeof res.eventChannel.emit === 'function') {
            res.eventChannel.emit('danmuData', danmuData);
          }
        } catch (error) {
          console.error('通过事件通道传递数据失败:', error);
          // 已经保存到全局变量，所以这里不需要额外处理
        }
      },
      fail: (error) => {
        console.error('跳转到显示页失败:', error);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    })
  }
})