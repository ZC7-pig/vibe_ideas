// 通知云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  try {
    switch (action) {
      case 'list':
        return await getNotifications(data, OPENID)
      case 'markRead':
        return await markAsRead(data, OPENID)
      case 'markAllRead':
        return await markAllAsRead(data, OPENID)
      case 'delete':
        return await deleteNotification(data, OPENID)
      case 'getUnreadCount':
        return await getUnreadCount(OPENID)
      case 'create':
        return await createNotification(data)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (err) {
    console.error('通知操作失败:', err)
    return {
      success: false,
      message: '操作失败',
      error: err.message
    }
  }
}

// 获取通知列表
async function getNotifications(data, openid) {
  const { type = 'all', page = 1, pageSize = 20 } = data

  const skip = (page - 1) * pageSize
  let query = db.collection('notifications').where({
    toUserId: openid
  })

  // 按类型筛选
  if (type !== 'all') {
    query = query.where({
      type
    })
  }

  const result = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取总数
  const countResult = await query.count()

  // 处理通知数据，添加相关信息
  const notifications = await Promise.all(result.data.map(async (notification) => {
    const processedNotification = { ...notification }

    // 获取发送者信息（如果不是系统通知）
    if (notification.fromUserId && notification.fromUserId !== 'system') {
      try {
        const userResult = await db.collection('users').where({
          openid: notification.fromUserId
        }).get()
        
        if (userResult.data.length > 0) {
          processedNotification.fromUser = {
            nickname: userResult.data[0].nickname,
            avatar: userResult.data[0].avatar
          }
        }
      } catch (err) {
        console.error('获取发送者信息失败:', err)
      }
    }

    // 获取相关帖子信息
    if (notification.postId) {
      try {
        const postResult = await db.collection('posts').doc(notification.postId).get()
        if (postResult.data) {
          processedNotification.post = {
            id: postResult.data._id,
            title: postResult.data.title,
            type: postResult.data.type,
            images: postResult.data.images
          }
        }
      } catch (err) {
        console.error('获取帖子信息失败:', err)
      }
    }

    // 获取匹配帖子信息（用于匹配通知）
    if (notification.matchPostId) {
      try {
        const matchPostResult = await db.collection('posts').doc(notification.matchPostId).get()
        if (matchPostResult.data) {
          processedNotification.matchPost = {
            id: matchPostResult.data._id,
            title: matchPostResult.data.title,
            type: matchPostResult.data.type,
            images: matchPostResult.data.images
          }
        }
      } catch (err) {
        console.error('获取匹配帖子信息失败:', err)
      }
    }

    // 添加相对时间
    processedNotification.relativeTime = getRelativeTime(notification.createTime)

    return processedNotification
  }))

  return {
    success: true,
    data: {
      notifications,
      total: countResult.total,
      hasMore: skip + notifications.length < countResult.total
    }
  }
}

// 标记为已读
async function markAsRead(data, openid) {
  const { notificationId } = data

  if (!notificationId) {
    return {
      success: false,
      message: '通知ID不能为空'
    }
  }

  // 验证通知是否属于当前用户
  const notificationResult = await db.collection('notifications').doc(notificationId).get()
  if (!notificationResult.data || notificationResult.data.toUserId !== openid) {
    return {
      success: false,
      message: '通知不存在或无权限'
    }
  }

  // 标记为已读
  await db.collection('notifications').doc(notificationId).update({
    data: {
      isRead: true,
      readTime: Date.now()
    }
  })

  return {
    success: true,
    message: '标记成功'
  }
}

// 标记全部为已读
async function markAllAsRead(data, openid) {
  const { type = 'all' } = data

  let query = db.collection('notifications').where({
    toUserId: openid,
    isRead: false
  })

  // 按类型筛选
  if (type !== 'all') {
    query = query.where({
      type
    })
  }

  // 获取所有未读通知
  const result = await query.get()

  // 批量更新为已读
  const batch = db.batch()
  const now = Date.now()

  result.data.forEach(notification => {
    const ref = db.collection('notifications').doc(notification._id)
    batch.update(ref, {
      isRead: true,
      readTime: now
    })
  })

  await batch.commit()

  return {
    success: true,
    message: `已标记 ${result.data.length} 条通知为已读`
  }
}

// 删除通知
async function deleteNotification(data, openid) {
  const { notificationId } = data

  if (!notificationId) {
    return {
      success: false,
      message: '通知ID不能为空'
    }
  }

  // 验证通知是否属于当前用户
  const notificationResult = await db.collection('notifications').doc(notificationId).get()
  if (!notificationResult.data || notificationResult.data.toUserId !== openid) {
    return {
      success: false,
      message: '通知不存在或无权限'
    }
  }

  // 删除通知
  await db.collection('notifications').doc(notificationId).remove()

  return {
    success: true,
    message: '删除成功'
  }
}

// 获取未读数量
async function getUnreadCount(openid) {
  // 获取各类型未读数量
  const systemCount = await db.collection('notifications').where({
    toUserId: openid,
    type: 'system',
    isRead: false
  }).count()

  const matchCount = await db.collection('notifications').where({
    toUserId: openid,
    type: 'match',
    isRead: false
  }).count()

  const commentCount = await db.collection('notifications').where({
    toUserId: openid,
    type: _.in(['comment', 'reply']),
    isRead: false
  }).count()

  const likeCount = await db.collection('notifications').where({
    toUserId: openid,
    type: 'like',
    isRead: false
  }).count()

  const totalCount = systemCount.total + matchCount.total + commentCount.total + likeCount.total

  return {
    success: true,
    data: {
      total: totalCount,
      system: systemCount.total,
      match: matchCount.total,
      comment: commentCount.total,
      like: likeCount.total
    }
  }
}

// 创建通知
async function createNotification(data) {
  const { type, fromUserId, toUserId, content, postId, commentId, matchPostId } = data

  if (!type || !toUserId || !content) {
    return {
      success: false,
      message: '通知类型、接收者和内容不能为空'
    }
  }

  // 检查是否需要去重（避免重复通知）
  if (type === 'like' && postId) {
    const existingResult = await db.collection('notifications').where({
      type: 'like',
      fromUserId,
      toUserId,
      postId,
      createTime: _.gte(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
    }).get()

    if (existingResult.data.length > 0) {
      return {
        success: true,
        message: '通知已存在，跳过创建'
      }
    }
  }

  const notification = {
    type,
    fromUserId,
    toUserId,
    content,
    isRead: false,
    createTime: Date.now()
  }

  // 添加可选字段
  if (postId) notification.postId = postId
  if (commentId) notification.commentId = commentId
  if (matchPostId) notification.matchPostId = matchPostId

  const result = await db.collection('notifications').add({
    data: notification
  })

  return {
    success: true,
    data: {
      notificationId: result._id
    }
  }
}

// 获取相对时间
function getRelativeTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}-${date.getDate()}`
  }
}