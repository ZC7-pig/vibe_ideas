// cloudfunctions/auth/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    switch (action) {
      case 'login':
        return await login(wxContext)
      default:
        return {
          code: 400,
          message: '不支持的操作'
        }
    }
  } catch (error) {
    console.error('Auth function error:', error)
    return {
      code: 500,
      message: '服务器内部错误'
    }
  }
}

// 登录处理
async function login(wxContext) {
  const { OPENID, UNIONID } = wxContext
  
  if (!OPENID) {
    return {
      code: 401,
      message: '获取用户信息失败'
    }
  }

  try {
    // 查找用户是否已存在
    const userQuery = await db.collection('users').where({
      openid: OPENID
    }).get()

    let user
    
    if (userQuery.data.length > 0) {
      // 用户已存在，更新最后登录时间
      user = userQuery.data[0]
      await db.collection('users').doc(user._id).update({
        data: {
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 新用户，创建用户记录
      const createResult = await db.collection('users').add({
        data: {
          openid: OPENID,
          unionid: UNIONID || null,
          nickName: '用户' + Math.random().toString(36).substr(2, 6),
          avatarUrl: '',
          gender: 0,
          city: '',
          province: '',
          country: '',
          phoneNumber: '',
          location: null,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
      
      // 获取新创建的用户信息
      const newUserQuery = await db.collection('users').doc(createResult._id).get()
      user = newUserQuery.data
    }

    return {
      code: 0,
      message: 'OK',
      data: {
        openid: OPENID,
        user: {
          _id: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          gender: user.gender,
          city: user.city,
          province: user.province,
          country: user.country,
          phoneNumber: user.phoneNumber,
          location: user.location
        }
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      code: 500,
      message: '登录失败'
    }
  }
}