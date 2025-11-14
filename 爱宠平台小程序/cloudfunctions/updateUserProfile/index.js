// cloudfunctions/updateUserProfile/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'  // 使用与小程序相同的环境ID
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    console.log('=== updateUserProfile 开始执行 ===')
    console.log('接收到的事件数据:', event)
    console.log('用户OpenID:', wxContext.OPENID)
    
    const { avatarUrl, nickName, phoneNumber } = event

    const userData = {
      _openid: wxContext.OPENID,
      updateTime: new Date()
    }

    if (avatarUrl) userData.avatarUrl = avatarUrl
    if (nickName) userData.nickName = nickName
    if (phoneNumber) userData.phoneNumber = phoneNumber

    console.log('准备写入的用户数据:', userData)

    // 尝试更新用户信息，如果不存在则创建
    try {
      console.log('尝试更新现有用户...')
      const updateResult = await db.collection('users').doc(wxContext.OPENID).update({
        data: userData
      })
      console.log('用户信息更新成功:', wxContext.OPENID, updateResult)
    } catch (updateError) {
      console.log('用户不存在，创建新用户:', wxContext.OPENID)
      console.log('更新失败原因:', updateError.message)
      
      // 如果更新失败（用户不存在），则创建新用户
      userData.createTime = new Date()
      console.log('准备创建新用户，数据:', userData)
      
      try {
        const createResult = await db.collection('users').doc(wxContext.OPENID).set({
          data: userData
        })
        console.log('新用户创建成功:', wxContext.OPENID, createResult)
        
        // 验证创建是否成功
        const verifyResult = await db.collection('users').doc(wxContext.OPENID).get()
        console.log('创建后验证查询结果:', verifyResult)
        
      } catch (createError) {
        console.error('创建用户失败:', createError)
        throw createError
      }
    }

    console.log('=== updateUserProfile 执行完成 ===')
    return {
      success: true,
      data: userData
    }

  } catch (error) {
    console.error('更新用户资料失败:', error)
    console.error('错误详情:', {
      openid: wxContext.OPENID,
      eventData: event,
      errorMessage: error.message,
      errorStack: error.stack
    })
    return {
      success: false,
      message: '更新失败，请重试'
    }
  }
}