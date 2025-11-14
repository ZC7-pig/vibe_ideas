// 评论云函数
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
      case 'create':
        return await createComment(data, OPENID)
      case 'list':
        return await getComments(data)
      case 'delete':
        return await deleteComment(data, OPENID)
      case 'like':
        return await toggleCommentLike(data, OPENID)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (err) {
    console.error('评论操作失败:', err)
    return {
      success: false,
      message: '操作失败',
      error: err.message
    }
  }
}

// 创建评论
async function createComment(data, openid) {
  const { postId, content, parentId = null, replyToUserId = null } = data

  // 验证必填字段
  if (!postId || !content) {
    return {
      success: false,
      message: '帖子ID和评论内容不能为空'
    }
  }

  // 验证内容长度
  if (content.length > 500) {
    return {
      success: false,
      message: '评论内容不能超过500字'
    }
  }

  // 获取用户信息
  const userResult = await db.collection('users').where({
    openid
  }).get()

  if (userResult.data.length === 0) {
    return {
      success: false,
      message: '用户不存在'
    }
  }

  const user = userResult.data[0]

  // 验证帖子是否存在
  const postResult = await db.collection('posts').doc(postId).get()
  if (!postResult.data) {
    return {
      success: false,
      message: '帖子不存在'
    }
  }

  // 如果是回复评论，验证父评论是否存在
  if (parentId) {
    const parentResult = await db.collection('comments').doc(parentId).get()
    if (!parentResult.data) {
      return {
        success: false,
        message: '父评论不存在'
      }
    }
  }

  const now = Date.now()
  const comment = {
    postId,
    content,
    parentId,
    replyToUserId,
    authorId: openid,
    authorInfo: {
      nickname: user.nickname,
      avatar: user.avatar
    },
    likeCount: 0,
    replyCount: 0,
    createTime: now,
    updateTime: now,
    isDeleted: false
  }

  // 创建评论
  const result = await db.collection('comments').add({
    data: comment
  })

  // 更新帖子评论数
  await db.collection('posts').doc(postId).update({
    data: {
      commentCount: _.inc(1),
      updateTime: now
    }
  })

  // 如果是回复评论，更新父评论回复数
  if (parentId) {
    await db.collection('comments').doc(parentId).update({
      data: {
        replyCount: _.inc(1),
        updateTime: now
      }
    })
  }

  // 创建通知（如果不是自己的帖子）
  const post = postResult.data
  if (post.authorId !== openid) {
    await createNotification({
      type: 'comment',
      fromUserId: openid,
      toUserId: post.authorId,
      postId,
      commentId: result._id,
      content: `${user.nickname} 评论了你的帖子`
    })
  }

  // 如果是回复评论且不是回复自己的评论
  if (replyToUserId && replyToUserId !== openid) {
    await createNotification({
      type: 'reply',
      fromUserId: openid,
      toUserId: replyToUserId,
      postId,
      commentId: result._id,
      content: `${user.nickname} 回复了你的评论`
    })
  }

  return {
    success: true,
    data: {
      commentId: result._id,
      ...comment
    }
  }
}

// 获取评论列表
async function getComments(data) {
  const { postId, page = 1, pageSize = 20, parentId = null } = data

  if (!postId) {
    return {
      success: false,
      message: '帖子ID不能为空'
    }
  }

  const skip = (page - 1) * pageSize
  let query = db.collection('comments').where({
    postId,
    isDeleted: false
  })

  // 如果指定了parentId，则获取回复；否则获取顶级评论
  if (parentId) {
    query = query.where({
      parentId
    })
  } else {
    query = query.where({
      parentId: _.eq(null)
    })
  }

  const result = await query
    .orderBy('createTime', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 获取总数
  const countResult = await query.count()

  return {
    success: true,
    data: {
      comments: result.data,
      total: countResult.total,
      hasMore: skip + result.data.length < countResult.total
    }
  }
}

// 删除评论
async function deleteComment(data, openid) {
  const { commentId } = data

  if (!commentId) {
    return {
      success: false,
      message: '评论ID不能为空'
    }
  }

  // 获取评论信息
  const commentResult = await db.collection('comments').doc(commentId).get()
  if (!commentResult.data) {
    return {
      success: false,
      message: '评论不存在'
    }
  }

  const comment = commentResult.data

  // 验证权限（只能删除自己的评论）
  if (comment.authorId !== openid) {
    return {
      success: false,
      message: '无权限删除此评论'
    }
  }

  const now = Date.now()

  // 软删除评论
  await db.collection('comments').doc(commentId).update({
    data: {
      isDeleted: true,
      deleteTime: now,
      updateTime: now
    }
  })

  // 更新帖子评论数
  await db.collection('posts').doc(comment.postId).update({
    data: {
      commentCount: _.inc(-1),
      updateTime: now
    }
  })

  // 如果是回复评论，更新父评论回复数
  if (comment.parentId) {
    await db.collection('comments').doc(comment.parentId).update({
      data: {
        replyCount: _.inc(-1),
        updateTime: now
      }
    })
  }

  return {
    success: true,
    message: '删除成功'
  }
}

// 点赞/取消点赞评论
async function toggleCommentLike(data, openid) {
  const { commentId } = data

  if (!commentId) {
    return {
      success: false,
      message: '评论ID不能为空'
    }
  }

  // 检查是否已点赞
  const likeResult = await db.collection('comment_likes').where({
    commentId,
    userId: openid
  }).get()

  const now = Date.now()
  let isLiked = false

  if (likeResult.data.length > 0) {
    // 已点赞，取消点赞
    await db.collection('comment_likes').doc(likeResult.data[0]._id).remove()
    await db.collection('comments').doc(commentId).update({
      data: {
        likeCount: _.inc(-1),
        updateTime: now
      }
    })
    isLiked = false
  } else {
    // 未点赞，添加点赞
    await db.collection('comment_likes').add({
      data: {
        commentId,
        userId: openid,
        createTime: now
      }
    })
    await db.collection('comments').doc(commentId).update({
      data: {
        likeCount: _.inc(1),
        updateTime: now
      }
    })
    isLiked = true
  }

  return {
    success: true,
    data: {
      isLiked
    }
  }
}

// 创建通知
async function createNotification(data) {
  try {
    await db.collection('notifications').add({
      data: {
        ...data,
        isRead: false,
        createTime: Date.now()
      }
    })
  } catch (err) {
    console.error('创建通知失败:', err)
  }
}