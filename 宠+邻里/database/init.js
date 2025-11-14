// 数据库初始化脚本
// 在微信开发者工具的云开发控制台中运行此脚本

const cloud = require('wx-server-sdk')

cloud.init({
  env: 'your-env-id' // 替换为你的环境ID
})

const db = cloud.database()

// 初始化数据库
async function initDatabase() {
  console.log('开始初始化数据库...')

  try {
    // 创建集合并设置索引
    await createCollections()
    await createIndexes()
    
    console.log('数据库初始化完成！')
  } catch (err) {
    console.error('数据库初始化失败:', err)
  }
}

// 创建集合
async function createCollections() {
  const collections = [
    'users',           // 用户信息
    'posts',           // 帖子
    'comments',        // 评论
    'likes',           // 帖子点赞
    'comment_likes',   // 评论点赞
    'notifications',   // 通知
    'matches',         // 匹配记录
    'match_reports',   // 匹配举报
    'user_settings'    // 用户设置
  ]

  for (const collectionName of collections) {
    try {
      // 尝试创建集合（通过插入一条临时数据）
      await db.collection(collectionName).add({
        data: {
          _temp: true,
          createTime: Date.now()
        }
      })
      
      // 删除临时数据
      const tempResult = await db.collection(collectionName).where({
        _temp: true
      }).get()
      
      if (tempResult.data.length > 0) {
        await db.collection(collectionName).doc(tempResult.data[0]._id).remove()
      }
      
      console.log(`集合 ${collectionName} 创建成功`)
    } catch (err) {
      console.log(`集合 ${collectionName} 可能已存在:`, err.message)
    }
  }
}

// 创建索引
async function createIndexes() {
  console.log('开始创建索引...')

  // 用户集合索引
  await createIndex('users', [
    { field: 'openid', unique: true },
    { field: 'createTime' },
    { field: 'lastLoginTime' }
  ])

  // 帖子集合索引
  await createIndex('posts', [
    { field: 'authorId' },
    { field: 'type' },
    { field: 'status' },
    { field: 'isDeleted' },
    { field: 'createTime' },
    { field: 'updateTime' },
    { field: 'location.latitude' },
    { field: 'location.longitude' },
    { field: 'petInfo.breed' },
    { field: 'petInfo.color' },
    { field: 'petInfo.sex' },
    // 复合索引
    { field: ['type', 'status', 'isDeleted', 'createTime'] },
    { field: ['authorId', 'isDeleted', 'createTime'] },
    { field: ['type', 'location.latitude', 'location.longitude'] }
  ])

  // 评论集合索引
  await createIndex('comments', [
    { field: 'postId' },
    { field: 'authorId' },
    { field: 'parentId' },
    { field: 'isDeleted' },
    { field: 'createTime' },
    // 复合索引
    { field: ['postId', 'isDeleted', 'createTime'] },
    { field: ['postId', 'parentId', 'isDeleted'] }
  ])

  // 点赞集合索引
  await createIndex('likes', [
    { field: 'postId' },
    { field: 'userId' },
    { field: 'createTime' },
    // 复合索引
    { field: ['postId', 'userId'], unique: true },
    { field: ['userId', 'createTime'] }
  ])

  // 评论点赞集合索引
  await createIndex('comment_likes', [
    { field: 'commentId' },
    { field: 'userId' },
    { field: 'createTime' },
    // 复合索引
    { field: ['commentId', 'userId'], unique: true }
  ])

  // 通知集合索引
  await createIndex('notifications', [
    { field: 'toUserId' },
    { field: 'fromUserId' },
    { field: 'type' },
    { field: 'isRead' },
    { field: 'createTime' },
    { field: 'postId' },
    // 复合索引
    { field: ['toUserId', 'isRead', 'createTime'] },
    { field: ['toUserId', 'type', 'isRead'] }
  ])

  // 匹配记录集合索引
  await createIndex('matches', [
    { field: 'post1Id' },
    { field: 'post2Id' },
    { field: 'user1Id' },
    { field: 'user2Id' },
    { field: 'status' },
    { field: 'createTime' },
    // 复合索引
    { field: ['user1Id', 'status', 'createTime'] },
    { field: ['user2Id', 'status', 'createTime'] }
  ])

  // 匹配举报集合索引
  await createIndex('match_reports', [
    { field: 'matchId' },
    { field: 'reporterId' },
    { field: 'status' },
    { field: 'createTime' }
  ])

  // 用户设置集合索引
  await createIndex('user_settings', [
    { field: 'userId', unique: true },
    { field: 'updateTime' }
  ])

  console.log('索引创建完成')
}

// 创建单个索引的辅助函数
async function createIndex(collectionName, indexes) {
  for (const index of indexes) {
    try {
      if (Array.isArray(index.field)) {
        // 复合索引
        const indexObj = {}
        index.field.forEach(field => {
          indexObj[field] = 1
        })
        console.log(`为集合 ${collectionName} 创建复合索引:`, index.field.join(', '))
      } else {
        // 单字段索引
        console.log(`为集合 ${collectionName} 创建索引: ${index.field}`)
      }
      
      // 注意：微信云开发的索引需要在控制台手动创建
      // 这里只是记录需要创建的索引信息
      
    } catch (err) {
      console.error(`创建索引失败 ${collectionName}.${index.field}:`, err.message)
    }
  }
}

// 数据库集合结构说明
function getCollectionSchemas() {
  return {
    users: {
      description: '用户信息表',
      fields: {
        openid: 'String - 微信用户唯一标识',
        nickname: 'String - 用户昵称',
        avatar: 'String - 头像URL',
        bio: 'String - 个人简介',
        location: 'Object - 用户位置信息',
        postCount: 'Number - 发帖数量',
        likeCount: 'Number - 获赞数量',
        helpCount: 'Number - 帮助数量',
        createTime: 'Number - 创建时间戳',
        lastLoginTime: 'Number - 最后登录时间',
        updateTime: 'Number - 更新时间戳'
      }
    },
    
    posts: {
      description: '帖子表',
      fields: {
        title: 'String - 帖子标题',
        description: 'String - 帖子描述',
        type: 'String - 帖子类型(lost/found/adoption/normal)',
        status: 'String - 帖子状态(active/expired/resolved)',
        images: 'Array - 图片URL数组',
        petInfo: 'Object - 宠物信息',
        location: 'Object - 位置信息',
        contactInfo: 'Object - 联系方式',
        authorId: 'String - 作者openid',
        authorInfo: 'Object - 作者信息快照',
        likeCount: 'Number - 点赞数',
        commentCount: 'Number - 评论数',
        viewCount: 'Number - 浏览数',
        isDeleted: 'Boolean - 是否删除',
        createTime: 'Number - 创建时间戳',
        updateTime: 'Number - 更新时间戳',
        expireTime: 'Number - 过期时间戳'
      }
    },
    
    comments: {
      description: '评论表',
      fields: {
        postId: 'String - 帖子ID',
        content: 'String - 评论内容',
        parentId: 'String - 父评论ID(回复时)',
        replyToUserId: 'String - 回复的用户ID',
        authorId: 'String - 评论者openid',
        authorInfo: 'Object - 评论者信息快照',
        likeCount: 'Number - 点赞数',
        replyCount: 'Number - 回复数',
        isDeleted: 'Boolean - 是否删除',
        createTime: 'Number - 创建时间戳',
        updateTime: 'Number - 更新时间戳'
      }
    },
    
    likes: {
      description: '帖子点赞表',
      fields: {
        postId: 'String - 帖子ID',
        userId: 'String - 用户openid',
        createTime: 'Number - 点赞时间戳'
      }
    },
    
    comment_likes: {
      description: '评论点赞表',
      fields: {
        commentId: 'String - 评论ID',
        userId: 'String - 用户openid',
        createTime: 'Number - 点赞时间戳'
      }
    },
    
    notifications: {
      description: '通知表',
      fields: {
        type: 'String - 通知类型(system/match/comment/reply/like)',
        fromUserId: 'String - 发送者openid',
        toUserId: 'String - 接收者openid',
        content: 'String - 通知内容',
        postId: 'String - 相关帖子ID',
        commentId: 'String - 相关评论ID',
        matchPostId: 'String - 匹配帖子ID',
        isRead: 'Boolean - 是否已读',
        createTime: 'Number - 创建时间戳',
        readTime: 'Number - 阅读时间戳'
      }
    },
    
    matches: {
      description: '匹配记录表',
      fields: {
        post1Id: 'String - 帖子1 ID',
        post2Id: 'String - 帖子2 ID',
        user1Id: 'String - 用户1 openid',
        user2Id: 'String - 用户2 openid',
        similarity: 'Number - 相似度分数',
        distance: 'Number - 距离(km)',
        status: 'String - 状态(pending/confirmed/rejected)',
        createTime: 'Number - 创建时间戳',
        createdBy: 'String - 创建者openid'
      }
    },
    
    match_reports: {
      description: '匹配举报表',
      fields: {
        matchId: 'String - 匹配记录ID',
        reporterId: 'String - 举报者openid',
        reason: 'String - 举报原因',
        status: 'String - 处理状态(pending/processed)',
        createTime: 'Number - 举报时间戳'
      }
    },
    
    user_settings: {
      description: '用户设置表',
      fields: {
        userId: 'String - 用户openid',
        notificationSettings: 'Object - 通知设置',
        privacySettings: 'Object - 隐私设置',
        locationSettings: 'Object - 位置设置',
        createTime: 'Number - 创建时间戳',
        updateTime: 'Number - 更新时间戳'
      }
    }
  }
}

// 导出初始化函数
module.exports = {
  initDatabase,
  getCollectionSchemas
}

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initDatabase()
}