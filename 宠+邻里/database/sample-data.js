// 示例数据脚本
// 在微信开发者工具的云开发控制台中运行此脚本

const cloud = require('wx-server-sdk')

cloud.init({
  env: 'your-env-id' // 替换为你的环境ID
})

const db = cloud.database()

// 添加示例数据
async function addSampleData() {
  console.log('开始添加示例数据...')

  try {
    // 添加示例用户
    await addSampleUsers()
    
    // 添加示例帖子
    await addSamplePosts()
    
    // 添加示例评论
    await addSampleComments()
    
    // 添加示例通知
    await addSampleNotifications()
    
    console.log('示例数据添加完成！')
  } catch (err) {
    console.error('添加示例数据失败:', err)
  }
}

// 添加示例用户
async function addSampleUsers() {
  const users = [
    {
      openid: 'user001',
      nickname: '爱宠小王',
      avatar: 'https://example.com/avatar1.jpg',
      bio: '资深铲屎官，专业寻宠10年',
      location: {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区'
      },
      postCount: 5,
      likeCount: 23,
      helpCount: 8,
      createTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
      lastLoginTime: Date.now() - 2 * 60 * 60 * 1000,
      updateTime: Date.now() - 2 * 60 * 60 * 1000
    },
    {
      openid: 'user002',
      nickname: '猫咪救助站',
      avatar: 'https://example.com/avatar2.jpg',
      bio: '专业猫咪救助，为流浪猫找家',
      location: {
        latitude: 31.2304,
        longitude: 121.4737,
        address: '上海市黄浦区'
      },
      postCount: 12,
      likeCount: 56,
      helpCount: 15,
      createTime: Date.now() - 60 * 24 * 60 * 60 * 1000,
      lastLoginTime: Date.now() - 30 * 60 * 1000,
      updateTime: Date.now() - 30 * 60 * 1000
    },
    {
      openid: 'user003',
      nickname: '狗狗爱好者',
      avatar: 'https://example.com/avatar3.jpg',
      bio: '喜欢各种狗狗，乐于助人',
      location: {
        latitude: 22.3193,
        longitude: 114.1694,
        address: '广东省深圳市'
      },
      postCount: 3,
      likeCount: 12,
      helpCount: 4,
      createTime: Date.now() - 15 * 24 * 60 * 60 * 1000,
      lastLoginTime: Date.now() - 60 * 60 * 1000,
      updateTime: Date.now() - 60 * 60 * 1000
    }
  ]

  for (const user of users) {
    try {
      await db.collection('users').add({ data: user })
      console.log(`用户 ${user.nickname} 添加成功`)
    } catch (err) {
      console.error(`用户 ${user.nickname} 添加失败:`, err.message)
    }
  }
}

// 添加示例帖子
async function addSamplePosts() {
  const posts = [
    {
      title: '寻找走失的金毛犬',
      description: '我家金毛豆豆昨天晚上在公园走失了，它很温顺，看到请联系我！非常着急，重金酬谢！',
      type: 'lost',
      status: 'active',
      images: [
        'https://example.com/dog1.jpg',
        'https://example.com/dog2.jpg'
      ],
      petInfo: {
        breed: '金毛',
        color: '金黄色',
        sex: '公',
        age: '3岁',
        eventDate: Date.now() - 24 * 60 * 60 * 1000,
        specialFeatures: '脖子上有红色项圈，左耳有小缺口'
      },
      location: {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区朝阳公园'
      },
      contactInfo: {
        phone: '138****8888',
        wechat: 'pet_lover_001'
      },
      authorId: 'user001',
      authorInfo: {
        nickname: '爱宠小王',
        avatar: 'https://example.com/avatar1.jpg'
      },
      likeCount: 15,
      commentCount: 8,
      viewCount: 120,
      isDeleted: false,
      createTime: Date.now() - 24 * 60 * 60 * 1000,
      updateTime: Date.now() - 24 * 60 * 60 * 1000,
      expireTime: Date.now() + 30 * 24 * 60 * 60 * 1000
    },
    {
      title: '捡到一只小橘猫',
      description: '在小区门口捡到一只小橘猫，很亲人，应该是家养的。现在在我家暂时照顾，希望主人看到能联系我。',
      type: 'found',
      status: 'active',
      images: [
        'https://example.com/cat1.jpg'
      ],
      petInfo: {
        breed: '橘猫',
        color: '橘色',
        sex: '母',
        age: '6个月',
        eventDate: Date.now() - 12 * 60 * 60 * 1000,
        specialFeatures: '很亲人，会用猫砂，应该是家养的'
      },
      location: {
        latitude: 31.2304,
        longitude: 121.4737,
        address: '上海市黄浦区某小区'
      },
      contactInfo: {
        phone: '139****9999',
        wechat: 'cat_helper_002'
      },
      authorId: 'user002',
      authorInfo: {
        nickname: '猫咪救助站',
        avatar: 'https://example.com/avatar2.jpg'
      },
      likeCount: 23,
      commentCount: 12,
      viewCount: 89,
      isDeleted: false,
      createTime: Date.now() - 12 * 60 * 60 * 1000,
      updateTime: Date.now() - 12 * 60 * 60 * 1000,
      expireTime: Date.now() + 30 * 24 * 60 * 60 * 1000
    },
    {
      title: '可爱布偶猫找新家',
      description: '由于工作调动，无法继续照顾我的布偶猫咪咪。它很乖很听话，希望能找到一个爱它的新主人。',
      type: 'adoption',
      status: 'active',
      images: [
        'https://example.com/cat2.jpg',
        'https://example.com/cat3.jpg'
      ],
      petInfo: {
        breed: '布偶猫',
        color: '蓝双色',
        sex: '母',
        age: '2岁',
        specialFeatures: '已绝育，疫苗齐全，性格温顺'
      },
      location: {
        latitude: 22.3193,
        longitude: 114.1694,
        address: '广东省深圳市南山区'
      },
      contactInfo: {
        phone: '137****7777',
        wechat: 'pet_owner_003'
      },
      authorId: 'user003',
      authorInfo: {
        nickname: '狗狗爱好者',
        avatar: 'https://example.com/avatar3.jpg'
      },
      likeCount: 31,
      commentCount: 18,
      viewCount: 156,
      isDeleted: false,
      createTime: Date.now() - 6 * 60 * 60 * 1000,
      updateTime: Date.now() - 6 * 60 * 60 * 1000,
      expireTime: Date.now() + 60 * 24 * 60 * 60 * 1000
    },
    {
      title: '我家的小柯基日常',
      description: '分享一下我家小柯基的日常生活，今天带它去公园玩，超级开心！',
      type: 'normal',
      status: 'active',
      images: [
        'https://example.com/dog3.jpg',
        'https://example.com/dog4.jpg'
      ],
      petInfo: {
        breed: '柯基',
        color: '三色',
        sex: '公',
        age: '1岁'
      },
      location: {
        latitude: 39.9042,
        longitude: 116.4074,
        address: '北京市朝阳区'
      },
      authorId: 'user001',
      authorInfo: {
        nickname: '爱宠小王',
        avatar: 'https://example.com/avatar1.jpg'
      },
      likeCount: 8,
      commentCount: 5,
      viewCount: 45,
      isDeleted: false,
      createTime: Date.now() - 2 * 60 * 60 * 1000,
      updateTime: Date.now() - 2 * 60 * 60 * 1000
    }
  ]

  for (const post of posts) {
    try {
      const result = await db.collection('posts').add({ data: post })
      console.log(`帖子 "${post.title}" 添加成功，ID: ${result._id}`)
      
      // 保存帖子ID用于后续添加评论
      post._id = result._id
    } catch (err) {
      console.error(`帖子 "${post.title}" 添加失败:`, err.message)
    }
  }

  return posts
}

// 添加示例评论
async function addSampleComments() {
  // 获取已添加的帖子
  const postsResult = await db.collection('posts').limit(10).get()
  const posts = postsResult.data

  if (posts.length === 0) {
    console.log('没有找到帖子，跳过添加评论')
    return
  }

  const comments = [
    {
      postId: posts[0]._id,
      content: '我也在附近，帮你留意一下！',
      parentId: null,
      replyToUserId: null,
      authorId: 'user002',
      authorInfo: {
        nickname: '猫咪救助站',
        avatar: 'https://example.com/avatar2.jpg'
      },
      likeCount: 3,
      replyCount: 1,
      isDeleted: false,
      createTime: Date.now() - 20 * 60 * 60 * 1000,
      updateTime: Date.now() - 20 * 60 * 60 * 1000
    },
    {
      postId: posts[0]._id,
      content: '谢谢你！真的很感谢',
      parentId: null, // 这里应该是上一条评论的ID，但为了简化先设为null
      replyToUserId: 'user002',
      authorId: 'user001',
      authorInfo: {
        nickname: '爱宠小王',
        avatar: 'https://example.com/avatar1.jpg'
      },
      likeCount: 1,
      replyCount: 0,
      isDeleted: false,
      createTime: Date.now() - 19 * 60 * 60 * 1000,
      updateTime: Date.now() - 19 * 60 * 60 * 1000
    },
    {
      postId: posts[1]._id,
      content: '小猫咪好可爱！希望能早日找到主人',
      parentId: null,
      replyToUserId: null,
      authorId: 'user003',
      authorInfo: {
        nickname: '狗狗爱好者',
        avatar: 'https://example.com/avatar3.jpg'
      },
      likeCount: 5,
      replyCount: 0,
      isDeleted: false,
      createTime: Date.now() - 10 * 60 * 60 * 1000,
      updateTime: Date.now() - 10 * 60 * 60 * 1000
    }
  ]

  for (const comment of comments) {
    try {
      await db.collection('comments').add({ data: comment })
      console.log(`评论添加成功`)
    } catch (err) {
      console.error(`评论添加失败:`, err.message)
    }
  }
}

// 添加示例通知
async function addSampleNotifications() {
  const notifications = [
    {
      type: 'system',
      fromUserId: 'system',
      toUserId: 'user001',
      content: '欢迎使用宠+邻里！',
      isRead: false,
      createTime: Date.now() - 30 * 24 * 60 * 60 * 1000
    },
    {
      type: 'comment',
      fromUserId: 'user002',
      toUserId: 'user001',
      content: '猫咪救助站 评论了你的帖子',
      isRead: true,
      createTime: Date.now() - 20 * 60 * 60 * 1000,
      readTime: Date.now() - 19 * 60 * 60 * 1000
    },
    {
      type: 'like',
      fromUserId: 'user003',
      toUserId: 'user002',
      content: '狗狗爱好者 点赞了你的帖子',
      isRead: false,
      createTime: Date.now() - 10 * 60 * 60 * 1000
    }
  ]

  for (const notification of notifications) {
    try {
      await db.collection('notifications').add({ data: notification })
      console.log(`通知添加成功`)
    } catch (err) {
      console.error(`通知添加失败:`, err.message)
    }
  }
}

// 清空示例数据
async function clearSampleData() {
  console.log('开始清空示例数据...')

  const collections = ['users', 'posts', 'comments', 'likes', 'notifications']

  for (const collectionName of collections) {
    try {
      const result = await db.collection(collectionName).get()
      const batch = db.batch()

      result.data.forEach(doc => {
        batch.delete(db.collection(collectionName).doc(doc._id))
      })

      await batch.commit()
      console.log(`集合 ${collectionName} 清空完成`)
    } catch (err) {
      console.error(`清空集合 ${collectionName} 失败:`, err.message)
    }
  }

  console.log('示例数据清空完成！')
}

// 导出函数
module.exports = {
  addSampleData,
  clearSampleData
}

// 如果直接运行此文件，则执行添加示例数据
if (require.main === module) {
  addSampleData()
}