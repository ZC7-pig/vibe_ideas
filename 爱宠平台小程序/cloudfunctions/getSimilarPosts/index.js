// cloudfunctions/getSimilarPosts/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'
})

const db = cloud.database()
const _ = db.command

// 颜色相似词映射（与matchPosts保持一致）
const COLOR_SIMILARITY_MAP = {
  '金色': ['浅金色', '黄色', '浅黄色', '奶油色'],
  '浅金色': ['金色', '黄色', '浅黄色', '奶油色'],
  '黄色': ['金色', '浅金色', '浅黄色', '奶油色'],
  '浅黄色': ['金色', '浅金色', '黄色', '奶油色'],
  '黑色': ['深灰', '黑灰'],
  '深灰': ['黑色', '浅灰'],
  '白色': ['米白', '乳白', '奶油色'],
  '米白': ['白色', '乳白', '奶油色'],
  '乳白': ['白色', '米白', '奶油色'],
  '棕色': ['深棕', '浅棕'],
  '深棕': ['棕色', '浅棕'],
  '浅棕': ['棕色', '深棕']
}

// 匹配权重配置
const MATCH_WEIGHTS = {
  BREED: 40,
  BREED_EXACT: 50,
  COLOR: 30,
  COLOR_SIMILAR: 20,
  LOCATION: 20,
  TIME: 10
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { postId, limit = 5 } = event

  try {
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      }
    }

    // 获取目标帖子
    const targetPostResult = await db.collection('posts').doc(postId).get()
    if (!targetPostResult.data) {
      return {
        success: false,
        message: '帖子不存在'
      }
    }

    const targetPost = targetPostResult.data

    // 只为寻宠和发现类型的帖子寻找相似信息
    if (targetPost.type !== 'lost' && targetPost.type !== 'found') {
      return {
        success: true,
        data: []
      }
    }

    // 确定要匹配的类型（寻宠匹配发现，发现匹配寻宠）
    const matchType = targetPost.type === 'lost' ? 'found' : 'lost'

    // 查询候选帖子（近7天内的相反类型帖子）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const candidatesResult = await db.collection('posts')
      .where({
        type: matchType,
        status: 'active',
        createTime: _.gte(sevenDaysAgo),
        userId: _.neq(targetPost.userId) // 排除自己的帖子
      })
      .get()

    const candidates = candidatesResult.data

    // 计算每个候选帖子的匹配度
    const scoredCandidates = candidates.map(candidate => {
      const score = calculateMatchScore(targetPost, candidate)
      return {
        ...candidate,
        matchScore: score
      }
    })

    // 按匹配度排序并返回前N个
    const topMatches = scoredCandidates
      .filter(item => item.matchScore >= 60) // 匹配度阈值
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)

    // 获取用户信息
    const userIds = [...new Set(topMatches.map(post => post.userId))]
    let usersMap = {}
    
    if (userIds.length > 0) {
      const usersResult = await db.collection('users')
        .where({
          _openid: _.in(userIds)
        })
        .get()
      
      usersResult.data.forEach(user => {
        usersMap[user._openid] = {
          avatarUrl: user.avatarUrl,
          nickName: user.nickName
        }
      })
    }

    // 组装返回数据
    const result = topMatches.map(post => ({
      ...post,
      userInfo: usersMap[post.userId] || null
    }))

    return {
      success: true,
      data: result
    }

  } catch (error) {
    console.error('获取相似帖子失败:', error)
    return {
      success: false,
      message: '获取相似帖子失败，请重试'
    }
  }
}

// 计算匹配分数
function calculateMatchScore(targetPost, candidatePost) {
  let score = 0

  // 品种匹配
  if (targetPost.breed && candidatePost.breed) {
    const targetBreed = targetPost.breed.toLowerCase()
    const candidateBreed = candidatePost.breed.toLowerCase()
    
    if (targetBreed === candidateBreed) {
      score += MATCH_WEIGHTS.BREED_EXACT
    } else if (targetBreed.includes(candidateBreed) || candidateBreed.includes(targetBreed)) {
      score += MATCH_WEIGHTS.BREED
    }
  }

  // 毛色匹配
  if (targetPost.color && candidatePost.color) {
    const targetColor = targetPost.color.toLowerCase()
    const candidateColor = candidatePost.color.toLowerCase()
    
    if (targetColor === candidateColor) {
      score += MATCH_WEIGHTS.COLOR
    } else {
      // 检查相似颜色
      const similarColors = COLOR_SIMILARITY_MAP[targetColor] || []
      if (similarColors.includes(candidateColor)) {
        score += MATCH_WEIGHTS.COLOR_SIMILAR
      }
    }
  }

  // 地理位置匹配
  if (targetPost.location && candidatePost.location && 
      targetPost.location.lat && targetPost.location.lng &&
      candidatePost.location.lat && candidatePost.location.lng) {
    
    const distance = calculateDistance(
      targetPost.location.lat, targetPost.location.lng,
      candidatePost.location.lat, candidatePost.location.lng
    )
    
    // 5公里内得满分，超过10公里不得分
    if (distance <= 5) {
      score += MATCH_WEIGHTS.LOCATION
    } else if (distance <= 10) {
      score += MATCH_WEIGHTS.LOCATION * (1 - (distance - 5) / 5)
    }
  }

  // 时间匹配（基于发帖时间）
  const timeDiff = Math.abs(targetPost.createTime - candidatePost.createTime)
  const dayDiff = timeDiff / (1000 * 60 * 60 * 24)
  
  // 3天内得满分，超过7天不得分
  if (dayDiff <= 3) {
    score += MATCH_WEIGHTS.TIME
  } else if (dayDiff <= 7) {
    score += MATCH_WEIGHTS.TIME * (1 - (dayDiff - 3) / 4)
  }

  return Math.round(score)
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