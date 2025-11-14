// cloudfunctions/getUserStats/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 并行查询用户统计数据
    const [postsResult, notificationsResult, unreadNotificationsResult] = await Promise.all([
      // 查询用户发布的帖子数量
      db.collection('posts')
        .where({
          userId: userId,
          status: 'active'
        })
        .count(),
      
      // 查询用户收到的提醒总数
      db.collection('notifications')
        .where({
          userId: userId
        })
        .count(),
      
      // 查询用户未读的提醒数量
      db.collection('notifications')
        .where({
          userId: userId,
          isRead: false
        })
        .count()
    ])

    // 组装统计数据
    const stats = {
      postCount: postsResult.total || 0,
      notificationCount: notificationsResult.total || 0,
      unreadCount: unreadNotificationsResult.total || 0,
      helpCount: 0 // 暂时设为0，后续可以扩展
    }

    return {
      success: true,
      data: stats,
      userId: userId
    }

  } catch (error) {
    console.error('获取用户统计失败:', error)
    return {
      success: false,
      message: '获取统计失败，请重试'
    }
  }
}