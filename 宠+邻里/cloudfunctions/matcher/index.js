// 智能匹配云函数
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
      case 'findMatches':
        return await findMatches(data, OPENID)
      case 'getRecommendations':
        return await getRecommendations(data, OPENID)
      case 'reportMatch':
        return await reportMatch(data, OPENID)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (err) {
    console.error('匹配操作失败:', err)
    return {
      success: false,
      message: '操作失败',
      error: err.message
    }
  }
}

// 寻找匹配
async function findMatches(data, openid) {
  const { postId } = data

  if (!postId) {
    return {
      success: false,
      message: '帖子ID不能为空'
    }
  }

  // 获取帖子信息
  const postResult = await db.collection('posts').doc(postId).get()
  if (!postResult.data) {
    return {
      success: false,
      message: '帖子不存在'
    }
  }

  const post = postResult.data

  // 只对寻宠和捡到类型的帖子进行匹配
  if (!['lost', 'found'].includes(post.type)) {
    return {
      success: false,
      message: '该类型帖子不支持匹配'
    }
  }

  // 寻找匹配的帖子
  const matches = await findMatchingPosts(post)

  // 如果找到匹配，创建匹配记录和通知
  if (matches.length > 0) {
    for (const match of matches) {
      await createMatchRecord(post, match, openid)
      await createMatchNotification(post, match)
    }
  }

  return {
    success: true,
    data: {
      matches: matches.map(match => ({
        id: match._id,
        title: match.title,
        type: match.type,
        petInfo: match.petInfo,
        location: match.location,
        images: match.images,
        similarity: match.similarity,
        distance: match.distance,
        createTime: match.createTime
      }))
    }
  }
}

// 获取推荐帖子
async function getRecommendations(data, openid) {
  const { page = 1, pageSize = 10, userLocation } = data

  // 获取用户的帖子历史，分析偏好
  const userPostsResult = await db.collection('posts').where({
    authorId: openid,
    isDeleted: false
  }).orderBy('createTime', 'desc').limit(20).get()

  const userPosts = userPostsResult.data

  // 分析用户偏好
  const preferences = analyzeUserPreferences(userPosts)

  // 获取推荐帖子
  const skip = (page - 1) * pageSize
  let query = db.collection('posts').where({
    authorId: _.neq(openid),
    isDeleted: false,
    status: 'active'
  })

  // 根据偏好筛选
  if (preferences.preferredTypes.length > 0) {
    query = query.where({
      type: _.in(preferences.preferredTypes)
    })
  }

  const result = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize * 2) // 获取更多数据用于筛选
    .get()

  let recommendations = result.data

  // 计算推荐分数
  recommendations = recommendations.map(post => ({
    ...post,
    score: calculateRecommendationScore(post, preferences, userLocation)
  }))

  // 按分数排序并取前pageSize个
  recommendations = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, pageSize)

  return {
    success: true,
    data: {
      recommendations,
      hasMore: recommendations.length === pageSize
    }
  }
}

// 举报匹配结果
async function reportMatch(data, openid) {
  const { matchId, reason } = data

  if (!matchId || !reason) {
    return {
      success: false,
      message: '匹配ID和举报原因不能为空'
    }
  }

  // 创建举报记录
  await db.collection('match_reports').add({
    data: {
      matchId,
      reporterId: openid,
      reason,
      createTime: Date.now(),
      status: 'pending'
    }
  })

  return {
    success: true,
    message: '举报成功，我们会尽快处理'
  }
}

// 寻找匹配的帖子
async function findMatchingPosts(targetPost) {
  const { type, petInfo, location } = targetPost

  // 确定要匹配的帖子类型
  const matchType = type === 'lost' ? 'found' : 'lost'

  // 基础查询条件
  let query = db.collection('posts').where({
    type: matchType,
    isDeleted: false,
    status: 'active',
    authorId: _.neq(targetPost.authorId)
  })

  // 时间范围限制（最近30天）
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  query = query.where({
    createTime: _.gte(thirtyDaysAgo)
  })

  const result = await query.get()
  let candidates = result.data

  // 计算匹配度
  candidates = candidates.map(candidate => {
    const similarity = calculateSimilarity(targetPost, candidate)
    const distance = calculateDistance(targetPost.location, candidate.location)
    
    return {
      ...candidate,
      similarity,
      distance
    }
  })

  // 筛选高匹配度的帖子
  const matches = candidates.filter(candidate => {
    return candidate.similarity >= 0.6 && candidate.distance <= 10 // 相似度>=60%，距离<=10km
  })

  // 按匹配度排序
  return matches.sort((a, b) => {
    // 综合相似度和距离计算最终分数
    const scoreA = a.similarity * 0.7 + (1 - a.distance / 50) * 0.3
    const scoreB = b.similarity * 0.7 + (1 - b.distance / 50) * 0.3
    return scoreB - scoreA
  }).slice(0, 5) // 最多返回5个匹配结果
}

// 计算相似度
function calculateSimilarity(post1, post2) {
  let score = 0
  let totalWeight = 0

  const pet1 = post1.petInfo || {}
  const pet2 = post2.petInfo || {}

  // 品种匹配 (权重: 0.3)
  if (pet1.breed && pet2.breed) {
    totalWeight += 0.3
    if (pet1.breed === pet2.breed) {
      score += 0.3
    } else if (isSimilarBreed(pet1.breed, pet2.breed)) {
      score += 0.15
    }
  }

  // 颜色匹配 (权重: 0.25)
  if (pet1.color && pet2.color) {
    totalWeight += 0.25
    if (pet1.color === pet2.color) {
      score += 0.25
    } else if (isSimilarColor(pet1.color, pet2.color)) {
      score += 0.1
    }
  }

  // 性别匹配 (权重: 0.15)
  if (pet1.sex && pet2.sex) {
    totalWeight += 0.15
    if (pet1.sex === pet2.sex) {
      score += 0.15
    }
  }

  // 年龄匹配 (权重: 0.1)
  if (pet1.age && pet2.age) {
    totalWeight += 0.1
    const ageDiff = Math.abs(parseInt(pet1.age) - parseInt(pet2.age))
    if (ageDiff <= 1) {
      score += 0.1
    } else if (ageDiff <= 3) {
      score += 0.05
    }
  }

  // 特征描述匹配 (权重: 0.2)
  if (post1.description && post2.description) {
    totalWeight += 0.2
    const textSimilarity = calculateTextSimilarity(post1.description, post2.description)
    score += textSimilarity * 0.2
  }

  return totalWeight > 0 ? score / totalWeight : 0
}

// 判断相似品种
function isSimilarBreed(breed1, breed2) {
  const similarBreeds = {
    '金毛': ['拉布拉多', '边牧'],
    '拉布拉多': ['金毛', '边牧'],
    '泰迪': ['比熊', '贵宾'],
    '比熊': ['泰迪', '贵宾'],
    '英短': ['美短', '蓝猫'],
    '美短': ['英短', '蓝猫']
  }
  
  return similarBreeds[breed1]?.includes(breed2) || false
}

// 判断相似颜色
function isSimilarColor(color1, color2) {
  const similarColors = {
    '黄色': ['金色', '棕色'],
    '金色': ['黄色', '棕色'],
    '棕色': ['黄色', '金色', '咖啡色'],
    '黑色': ['深灰', '炭黑'],
    '白色': ['米白', '奶白']
  }
  
  return similarColors[color1]?.includes(color2) || false
}

// 计算文本相似度（简单实现）
function calculateTextSimilarity(text1, text2) {
  const words1 = text1.split('')
  const words2 = text2.split('')
  
  let commonChars = 0
  const maxLength = Math.max(words1.length, words2.length)
  
  for (let char of words1) {
    if (words2.includes(char)) {
      commonChars++
    }
  }
  
  return commonChars / maxLength
}

// 计算距离（简化版，实际应使用地理位置API）
function calculateDistance(loc1, loc2) {
  if (!loc1 || !loc2 || !loc1.latitude || !loc2.latitude) {
    return 999 // 无位置信息时返回很大的距离
  }

  const lat1 = loc1.latitude
  const lon1 = loc1.longitude
  const lat2 = loc2.latitude
  const lon2 = loc2.longitude

  const R = 6371 // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // 保留一位小数
}

// 分析用户偏好
function analyzeUserPreferences(userPosts) {
  const typeCount = {}
  const breedCount = {}
  const colorCount = {}

  userPosts.forEach(post => {
    // 统计帖子类型偏好
    typeCount[post.type] = (typeCount[post.type] || 0) + 1

    // 统计宠物品种偏好
    if (post.petInfo?.breed) {
      breedCount[post.petInfo.breed] = (breedCount[post.petInfo.breed] || 0) + 1
    }

    // 统计颜色偏好
    if (post.petInfo?.color) {
      colorCount[post.petInfo.color] = (colorCount[post.petInfo.color] || 0) + 1
    }
  })

  return {
    preferredTypes: Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a]),
    preferredBreeds: Object.keys(breedCount).sort((a, b) => breedCount[b] - breedCount[a]),
    preferredColors: Object.keys(colorCount).sort((a, b) => colorCount[b] - colorCount[a])
  }
}

// 计算推荐分数
function calculateRecommendationScore(post, preferences, userLocation) {
  let score = 0

  // 类型偏好分数 (权重: 0.3)
  if (preferences.preferredTypes.includes(post.type)) {
    const typeIndex = preferences.preferredTypes.indexOf(post.type)
    score += (1 - typeIndex * 0.2) * 0.3
  }

  // 品种偏好分数 (权重: 0.2)
  if (post.petInfo?.breed && preferences.preferredBreeds.includes(post.petInfo.breed)) {
    const breedIndex = preferences.preferredBreeds.indexOf(post.petInfo.breed)
    score += (1 - breedIndex * 0.2) * 0.2
  }

  // 距离分数 (权重: 0.2)
  if (userLocation && post.location) {
    const distance = calculateDistance(userLocation, post.location)
    if (distance <= 50) {
      score += (1 - distance / 50) * 0.2
    }
  }

  // 时间新鲜度分数 (权重: 0.2)
  const daysSincePost = (Date.now() - post.createTime) / (24 * 60 * 60 * 1000)
  if (daysSincePost <= 7) {
    score += (1 - daysSincePost / 7) * 0.2
  }

  // 互动热度分数 (权重: 0.1)
  const totalInteractions = (post.likeCount || 0) + (post.commentCount || 0)
  if (totalInteractions > 0) {
    score += Math.min(totalInteractions / 10, 1) * 0.1
  }

  return Math.round(score * 100) / 100 // 保留两位小数
}

// 创建匹配记录
async function createMatchRecord(post1, post2, userId) {
  try {
    await db.collection('matches').add({
      data: {
        post1Id: post1._id,
        post2Id: post2._id,
        user1Id: post1.authorId,
        user2Id: post2.authorId,
        similarity: post2.similarity,
        distance: post2.distance,
        status: 'pending',
        createTime: Date.now(),
        createdBy: userId
      }
    })
  } catch (err) {
    console.error('创建匹配记录失败:', err)
  }
}

// 创建匹配通知
async function createMatchNotification(post1, post2) {
  try {
    // 通知帖子1的作者
    await db.collection('notifications').add({
      data: {
        type: 'match',
        fromUserId: 'system',
        toUserId: post1.authorId,
        postId: post1._id,
        matchPostId: post2._id,
        content: `系统为您找到了可能的匹配信息`,
        isRead: false,
        createTime: Date.now()
      }
    })

    // 通知帖子2的作者
    await db.collection('notifications').add({
      data: {
        type: 'match',
        fromUserId: 'system',
        toUserId: post2.authorId,
        postId: post2._id,
        matchPostId: post1._id,
        content: `系统为您找到了可能的匹配信息`,
        isRead: false,
        createTime: Date.now()
      }
    })
  } catch (err) {
    console.error('创建匹配通知失败:', err)
  }
}