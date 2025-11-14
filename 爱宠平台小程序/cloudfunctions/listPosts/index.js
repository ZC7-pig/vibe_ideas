// cloudfunctions/listPosts/index.js
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
      type = [],
      search = '',
      page = 1,
      pageSize = 20,
      userId = null,
      center = null,
      radiusKm = 5
    } = event

    // 构建查询条件
    let whereCondition = {
      status: 'active' // 只查询活跃状态的帖子
    }

    // 类型筛选
    if (type.length > 0) {
      whereCondition.type = _.in(type)
    }

    // 用户筛选（我的发布）
    if (userId === 'current') {
      whereCondition.userId = wxContext.OPENID
    } else if (userId) {
      whereCondition.userId = userId
    }

    // 搜索条件
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      whereCondition = _.and([
        whereCondition,
        _.or([
          { title: searchRegex },
          { breed: searchRegex },
          { color: searchRegex },
          { description: searchRegex },
          { 'location.name': searchRegex }
        ])
      ])
    }

    // 分页计算
    const skip = (page - 1) * pageSize

    // 查询帖子
    const postsResult = await db.collection('posts')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    let posts = postsResult.data

    // 地理位置过滤（如果提供了中心点）
    if (center && center.lat && center.lng) {
      posts = posts.filter(post => {
        if (!post.location || !post.location.lat || !post.location.lng) {
          return true // 如果帖子没有位置信息，保留
        }
        
        const distance = calculateDistance(
          center.lat, center.lng,
          post.location.lat, post.location.lng
        )
        
        return distance <= radiusKm
      })
    }

    // 获取用户信息
    const userIds = [...new Set(posts.map(post => post.userId))]
    const usersResult = await db.collection('users')
      .where({
        _openid: _.in(userIds)
      })
      .get()

    const usersMap = {}
    usersResult.data.forEach(user => {
      usersMap[user._openid] = {
        avatarUrl: user.avatarUrl,
        nickName: user.nickName
      }
    })

    // 组装返回数据
    const result = posts.map(post => ({
      ...post,
      userInfo: usersMap[post.userId] || null
    }))

    return {
      success: true,
      data: result
    }

  } catch (error) {
    console.error('获取帖子列表失败:', error)
    return {
      success: false,
      message: '获取列表失败，请重试'
    }
  }
}

// 计算两点间距离（公里）
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}