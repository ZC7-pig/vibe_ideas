// cloudfunctions/createPost/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'  // 使用与小程序相同的环境ID
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const {
      type,
      title,
      images,
      breed,
      color,
      location,
      description,
      contact,
      lostOrFoundTime,
      serviceMeta,
      adoptStatus
    } = event

    // 参数验证
    if (!title || !images || images.length === 0 || !breed || !color || !location || !description || !contact) {
      return {
        success: false,
        message: '请填写完整信息'
      }
    }

    // 构建帖子数据
    const postData = {
      userId: wxContext.OPENID,
      type,
      title: title.trim(),
      images,
      breed: breed.trim(),
      color: color.trim(),
      location,
      description: description.trim(),
      contact: contact.trim(),
      createTime: new Date(),
      updateTime: new Date(),
      status: 'active',
      viewCount: 0,
      likeCount: 0
    }

    // 添加类型特有字段
    if (lostOrFoundTime) {
      postData.lostOrFoundTime = new Date(lostOrFoundTime)
    }

    if (serviceMeta) {
      postData.serviceMeta = serviceMeta
    }

    if (adoptStatus) {
      postData.adoptStatus = adoptStatus
    }

    // 保存到数据库
    const result = await db.collection('posts').add({
      data: postData
    })

    // 如果是寻宠或发现类型，触发匹配
    if (type === 'lost' || type === 'found') {
      try {
        await cloud.callFunction({
          name: 'matchPosts',
          data: {
            postId: result._id,
            mode: 'realtime'
          }
        })
      } catch (matchError) {
        console.error('匹配失败:', matchError)
        // 匹配失败不影响帖子创建
      }
    }

    return {
      success: true,
      data: {
        _id: result._id,
        createTime: postData.createTime
      }
    }

  } catch (error) {
    console.error('创建帖子失败:', error)
    return {
      success: false,
      message: '创建失败，请重试'
    }
  }
}