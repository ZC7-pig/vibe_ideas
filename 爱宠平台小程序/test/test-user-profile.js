// 测试用户信息存储功能
const app = getApp()

Page({
  data: {
    testResults: [],
    testing: false
  },

  onLoad() {
    this.addTestResult('用户信息存储测试页面加载完成', 'info')
  },

  // 添加测试结果
  addTestResult(message, type = 'info') {
    const results = this.data.testResults
    results.push({
      message: `[${new Date().toLocaleTimeString()}] ${message}`,
      type: type,
      time: new Date().toLocaleTimeString()
    })
    this.setData({ testResults: results })
    console.log(`[${type.toUpperCase()}] ${message}`)
  },

  // 测试用户信息存储
  async testUserProfile() {
    this.setData({ testing: true, testResults: [] })
    
    try {
      this.addTestResult('开始测试用户信息存储功能', 'info')
      
      // 步骤1: 检查当前登录状态
      this.addTestResult(`当前登录状态: ${app.globalData.isLoggedIn ? '已登录' : '未登录'}`, 'info')
      
      if (!app.globalData.isLoggedIn) {
        this.addTestResult('用户未登录，需要先登录', 'warning')
        return
      }

      // 步骤2: 获取用户信息
      const userInfo = app.globalData.userInfo
      this.addTestResult(`获取用户信息: ${JSON.stringify(userInfo)}`, 'info')

      // 步骤3: 直接调用updateUserProfile云函数
      this.addTestResult('调用updateUserProfile云函数...', 'info')
      
      const result = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        }
      })

      this.addTestResult(`云函数返回结果: ${JSON.stringify(result)}`, 'success')
      
      if (result.result.success) {
        this.addTestResult('✅ 用户信息存储成功', 'success')
        
        // 步骤4: 验证用户数据是否真的存储了
        await this.verifyUserDataStored()
      } else {
        this.addTestResult(`❌ 用户信息存储失败: ${result.result.message}`, 'error')
      }

    } catch (error) {
      this.addTestResult(`❌ 测试过程出错: ${error.message}`, 'error')
      console.error('测试过程出错:', error)
    } finally {
      this.setData({ testing: false })
    }
  },

  // 验证用户数据是否真的存储在数据库中
  async verifyUserDataStored() {
    try {
      this.addTestResult('验证用户数据是否存储在数据库中...', 'info')
      
      // 使用getUserStats云函数来获取用户信息
      const statsResult = await wx.cloud.callFunction({
        name: 'getUserStats',
        data: {}
      })

      this.addTestResult(`getUserStats返回: ${JSON.stringify(statsResult)}`, 'info')
      
      if (statsResult.result.success) {
        this.addTestResult(`✅ 用户ID验证成功: ${statsResult.result.userId}`, 'success')
        
        // 直接查询users集合
        const db = wx.cloud.database()
        const userResult = await db.collection('users')
          .where({
            _openid: statsResult.result.userId
          })
          .get()
        
        this.addTestResult(`直接查询users集合结果: ${JSON.stringify(userResult)}`, 'info')
        
        if (userResult.data.length > 0) {
          this.addTestResult('✅ 用户数据确实存储在数据库中', 'success')
          this.addTestResult(`用户数据详情: ${JSON.stringify(userResult.data[0])}`, 'success')
        } else {
          this.addTestResult('⚠️ 未在users集合中找到用户数据', 'warning')
          
          // 尝试通过文档ID直接查询
          try {
            const directResult = await db.collection('users').doc(statsResult.result.userId).get()
            this.addTestResult(`通过文档ID直接查询结果: ${JSON.stringify(directResult)}`, 'info')
            
            if (directResult.data) {
              this.addTestResult('✅ 通过文档ID找到了用户数据', 'success')
            } else {
              this.addTestResult('❌ 通过文档ID也未找到用户数据', 'error')
            }
          } catch (directError) {
            this.addTestResult(`❌ 直接查询失败: ${directError.message}`, 'error')
          }
        }
      } else {
        this.addTestResult(`❌ getUserStats调用失败: ${statsResult.result.message}`, 'error')
      }
      
    } catch (error) {
      this.addTestResult(`❌ 验证过程出错: ${error.message}`, 'error')
      console.error('验证过程出错:', error)
    }
  },

  // 测试数据库集合是否存在
  async testDatabaseCollections() {
    this.setData({ testing: true, testResults: [] })
    
    try {
      this.addTestResult('开始测试数据库集合...', 'info')
      
      const db = wx.cloud.database()
      
      // 测试users集合
      try {
        const usersTest = await db.collection('users').limit(1).get()
        this.addTestResult(`✅ users集合存在，当前记录数: ${usersTest.data.length}`, 'success')
      } catch (error) {
        this.addTestResult(`❌ users集合访问失败: ${error.message}`, 'error')
      }
      
      // 测试posts集合
      try {
        const postsTest = await db.collection('posts').limit(1).get()
        this.addTestResult(`✅ posts集合存在，当前记录数: ${postsTest.data.length}`, 'success')
      } catch (error) {
        this.addTestResult(`❌ posts集合访问失败: ${error.message}`, 'error')
      }
      
      // 测试notifications集合
      try {
        const notificationsTest = await db.collection('notifications').limit(1).get()
        this.addTestResult(`✅ notifications集合存在，当前记录数: ${notificationsTest.data.length}`, 'success')
      } catch (error) {
        this.addTestResult(`❌ notifications集合访问失败: ${error.message}`, 'error')
      }
      
    } catch (error) {
      this.addTestResult(`❌ 数据库测试出错: ${error.message}`, 'error')
    } finally {
      this.setData({ testing: false })
    }
  },

  // 测试登录流程
  async testLoginFlow() {
    this.setData({ testing: true, testResults: [] })
    
    try {
      this.addTestResult('开始测试完整登录流程', 'info')
      
      // 调用app.login()
      this.addTestResult('调用app.login()...', 'info')
      const userInfo = await app.login()
      
      this.addTestResult(`登录成功，用户信息: ${JSON.stringify(userInfo)}`, 'success')
      
      // 等待一段时间让云函数执行
      this.addTestResult('等待2秒让云函数执行完成...', 'info')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 验证用户数据
      await this.verifyUserDataStored()
      
    } catch (error) {
      this.addTestResult(`❌ 登录流程出错: ${error.message}`, 'error')
      console.error('登录流程出错:', error)
    } finally {
      this.setData({ testing: false })
    }
  },

  // 测试数据库权限
  async testDatabasePermission() {
    this.setData({ testing: true, testResults: [] })
    
    try {
      this.addTestResult('开始测试数据库权限...', 'info')
      
      const result = await wx.cloud.callFunction({
        name: 'testDatabasePermission',
        data: {}
      })
      
      this.addTestResult(`数据库权限测试返回: ${JSON.stringify(result)}`, 'info')
      
      if (result.result.success) {
        result.result.results.forEach(resultMsg => {
          if (resultMsg.includes('✅')) {
            this.addTestResult(resultMsg, 'success')
          } else if (resultMsg.includes('❌')) {
            this.addTestResult(resultMsg, 'error')
          } else if (resultMsg.includes('⚠️')) {
            this.addTestResult(resultMsg, 'warning')
          } else {
            this.addTestResult(resultMsg, 'info')
          }
        })
      } else {
        this.addTestResult(`❌ 数据库权限测试失败: ${result.result.error}`, 'error')
        if (result.result.results) {
          result.result.results.forEach(resultMsg => {
            this.addTestResult(resultMsg, 'error')
          })
        }
      }
      
    } catch (error) {
      this.addTestResult(`❌ 数据库权限测试出错: ${error.message}`, 'error')
      console.error('数据库权限测试出错:', error)
    } finally {
      this.setData({ testing: false })
    }
  },

  // 清除测试结果
  clearResults() {
    this.setData({ testResults: [] })
  }
})