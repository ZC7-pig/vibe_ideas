// cloudfunctions/deletePost/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'  // 使用与小程序相同的环境ID
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { postId } = event

    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      }
    }

    // 获取帖子信息
    const postResult = await db.collection('posts')
      .doc(postId)
      .get()

    if (!postResult.data) {
      return {
        success: false,
        message: '帖子不存在'
      }
    }

    const post = postResult.data

    // 检查是否是帖子的所有者（直接使用openid比较）
    if (post.userId !== wxContext.OPENID) {
      return {
        success: false,
        message: '没有权限删除此帖子'
      }
    }

    // 删除帖子
    await db.collection('posts')
      .doc(postId)
      .remove()

    // 删除相关的图片（如果有的话）
    if (post.images && post.images.length > 0) {
      try {
        // 这里可以添加删除云存储中图片的逻辑
        // 由于图片可能在其他地方使用，这里暂时不删除图片
        console.log('帖子包含图片，但保留在云存储中:', post.images)
      } catch (imageError) {
        console.error('删除图片失败:', imageError)
      }
    }

    // 删除相关的通知
    try {
      await db.collection('notifications')
        .where({
          postId: postId
        })
        .remove()
    } catch (notificationError) {
      console.error('删除相关通知失败:', notificationError)
    }

    return {
      success: true,
      message: '删除成功'
    }

  } catch (error) {
    console.error('删除帖子失败:', error)
    return {
      success: false,
      message: '删除失败，请重试'
    }
  }
}