// cloudfunctions/matchPosts/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'  // 使用与小程序相同的环境ID
})

const db = cloud.database()
const _ = db.command

// 颜色相似词映射
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
  const wxContext = cloud.getWXContext()
  
  try {
    const { postId, mode = 'realtime' } = event

    if (mode === 'realtime' && !postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      }
    }

    let matchCount = 0

    if (mode === 'realtime') {
      // 即时匹配：为指定帖子寻找匹配
      matchCount = await matchSinglePost(postId)
    } else if (mode === 'batch') {
      // 批量匹配：扫描所有近期帖子
      matchCount = await batchMatchPosts()
    }

    return {
      success: true,
      matchCount
    }

  } catch (error) {
    console.error('匹配失败:', error)
    return {
      success: false,
      message: '匹配失败，请重试'
    }
  }
}

// 为单个帖子寻找匹配
async function matchSinglePost(postId) {
  try {
    // 获取目标帖子
    const postResult = await db.collection('posts').doc(postId).get()
    if (!postResult.data) {
      return 0
    }

    const targetPost = postResult.data

    // 只为寻宠和发现类型的帖子进行匹配
    if (targetPost.type !== 'lost' && targetPost.type !== 'found') {
      return 0
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

    let matchCount = 0

    // 对每个候选帖子计算匹配度
    for (const candidate of candidates) {
      const score = calculateMatchScore(targetPost, candidate)
      
      if (score >= 70) { // 匹配阈值
        // 创建双向提醒
        await createMatchNotification(targetPost, candidate, score)
        await createMatchNotification(candidate, targetPost, score)
        matchCount++
      }
    }

    return matchCount

  } catch (error) {
    console.error('单个帖子匹配失败:', error)
    return 0
  }
}

// 批量匹配所有帖子
async function batchMatchPosts() {
  try {
    // 获取近7天内的所有寻宠和发现帖子
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const postsResult = await db.collection('posts')
      .where({
        type: _.in(['lost', 'found']),
        status: 'active',
        createTime: _.gte(sevenDaysAgo)
      })
      .get()

    const posts = postsResult.data
    const lostPosts = posts.filter(p => p.type === 'lost')
    const foundPosts = posts.filter(p => p.type === 'found')

    let totalMatches = 0

    // 寻宠帖子与发现帖子进行匹配
    for (const lostPost of lostPosts) {
      for (const foundPost of foundPosts) {
        if (lostPost.userId === foundPost.userId) continue // 跳过同一用户

        const score = calculateMatchScore(lostPost, foundPost)
        
        if (score >= 70) {
          // 检查是否已经创建过提醒
          const existingNotification = await db.collection('notifications')
            .where({
              userId: lostPost.userId,
              postId: lostPost._id,
              matchedPostId: foundPost._id
            })
            .get()

          if (existingNotification.data.length === 0) {
            await createMatchNotification(lostPost, foundPost, score)
            await createMatchNotification(foundPost, lostPost, score)
            totalMatches++
          }
        }
      }
    }

    return totalMatches

  } catch (error) {
    console.error('批量匹配失败:', error)
    return 0
  }
}

// 计算匹配评分
function calculateMatchScore(post1, post2) {
  let score = 0

  // 品种匹配
  if (post1.breed && post2.breed) {
    const breed1 = post1.breed.toLowerCase()
    const breed2 = post2.breed.toLowerCase()
    
    if (breed1 === breed2) {
      score += MATCH_WEIGHTS.BREED_EXACT
    } else if (breed1.includes(breed2) || breed2.includes(breed1)) {
      score += MATCH_WEIGHTS.BREED
    }
  }

  // 毛色匹配
  if (post1.color && post2.color) {
    const color1 = post1.color
    const color2 = post2.color
    
    if (color1 === color2) {
      score += MATCH_WEIGHTS.COLOR
    } else {
      // 检查相似颜色
      const similarColors = COLOR_SIMILARITY_MAP[color1] || []
      if (similarColors.includes(color2)) {
        score += MATCH_WEIGHTS.COLOR_SIMILAR
      }
    }
  }

  // 地理位置匹配
  if (post1.location && post2.location && 
      post1.location.lat && post1.location.lng &&
      post2.location.lat && post2.location.lng) {
    
    const distance = calculateDistance(
      post1.location.lat, post1.location.lng,
      post2.location.lat, post2.location.lng
    )
    
    if (distance <= 5) { // 5公里内
      score += MATCH_WEIGHTS.LOCATION
    } else if (distance <= 10) { // 10公里内部分分数
      score += MATCH_WEIGHTS.LOCATION * 0.5
    }
  }

  // 时间匹配
  if (post1.lostOrFoundTime && post2.lostOrFoundTime) {
    const timeDiff = Math.abs(new Date(post1.lostOrFoundTime) - new Date(post2.lostOrFoundTime))
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
    
    if (daysDiff <= 3) { // 3天内
      score += MATCH_WEIGHTS.TIME
    } else if (daysDiff <= 7) { // 7天内部分分数
      score += MATCH_WEIGHTS.TIME * 0.5
    }
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

// 创建匹配提醒
async function createMatchNotification(sourcePost, matchedPost, score) {
  try {
    const message = `您${sourcePost.type === 'lost' ? '寻找' : '发现'}的${sourcePost.breed}与[${matchedPost.location.name}${matchedPost.type === 'lost' ? '丢失' : '发现'}的${matchedPost.breed}]高度相似（匹配度${score}%），快去看看吧！`

    await db.collection('notifications').add({
      data: {
        userId: sourcePost.userId,
        postId: sourcePost._id,
        matchedPostId: matchedPost._id,
        message,
        score,
        isRead: false,
        createTime: new Date()
      }
    })

  } catch (error) {
    console.error('创建提醒失败:', error)
  }
}