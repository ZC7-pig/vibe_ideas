// cloudfunctions/listNotifications/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'  // 使用与小程序相同的环境ID
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const {
      page = 1,
      pageSize = 20,
      isRead = null,
      type = null
    } = event

    // 构建查询条件
    let whereCondition = {
      userId: wxContext.OPENID
    }

    // 已读状态筛选
    if (isRead !== null) {
      whereCondition.isRead = isRead
    }

    // 类型筛选
    if (type) {
      whereCondition.type = type
    }

    // 分页计算
    const skip = (page - 1) * pageSize

    // 查询通知
    const notificationsResult = await db.collection('notifications')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: notificationsResult.data
    }

  } catch (error) {
    console.error('获取通知列表失败:', error)
    return {
      success: false,
      message: '获取通知失败，请重试'
    }
  }
}