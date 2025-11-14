// cloudfunctions/getPostDetail/index.js
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

    // 获取帖子详情
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

    // 增加浏览次数
    try {
      await db.collection('posts')
        .doc(postId)
        .update({
          data: {
            viewCount: db.command.inc(1)
          }
        })
    } catch (updateError) {
      console.error('更新浏览次数失败:', updateError)
    }

    // 获取发布者信息
    const userResult = await db.collection('users')
      .where({
        _openid: post.userId
      })
      .get()

    let userInfo = null

    if (userResult.data.length > 0) {
      const user = userResult.data[0]
      userInfo = {
        avatarUrl: user.avatarUrl,
        nickName: user.nickName
      }
    }

    // 组装返回数据
    const result = {
      ...post,
      userInfo
    }

    return {
      success: true,
      data: result
    }

  } catch (error) {
    console.error('获取帖子详情失败:', error)
    return {
      success: false,
      message: '获取详情失败，请重试'
    }
  }
}