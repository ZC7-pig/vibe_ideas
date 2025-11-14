// cloudfunctions/posts/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    switch (action) {
      case 'create':
        return await createPost(event, wxContext)
      case 'update':
        return await updatePost(event, wxContext)
      case 'delete':
        return await deletePost(event, wxContext)
      case 'detail':
        return await getPostDetail(event, wxContext)
      case 'list':
        return await getPostList(event, wxContext)
      case 'mine':
        return await getMyPosts(event, wxContext)
      case 'toggleLike':
        return await toggleLike(event, wxContext)
      default:
        return {
          code: 400,
          message: '不支持的操作'
        }
    }
  } catch (error) {
    console.error('Posts function error:', error)
    return {
      code: 500,
      message: '服务器内部错误'
    }
  }
}

// 创建帖子
async function createPost(event, wxContext) {
  const { OPENID } = wxContext
  
  if (!OPENID) {
    return {
      code: 401,
      message: '请先登录'
    }
  }

  // 获取用户信息
  const userQuery = await db.collection('users').where({
    openid: OPENID
  }).get()

  if (userQuery.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在'
    }
  }

  const user = userQuery.data[0]

  // 构建帖子数据
  const postData = {
    type: event.type,
    subType: event.subType || null,
    title: event.title,
    content: event.content || '',
    images: event.images || [],
    authorId: user._id,
    breed: event.breed || '',
    color: event.color || '',
    sex: event.sex || '',
    age: event.age || '',
    specialNeeds: event.specialNeeds || '',
    eventDate: event.eventDate || null,
    location: event.location,
    radiusKm: event.radiusKm || null,
    expireAt: event.expireAt || null,
    status: 'active',
    contact: event.contact,
    likeCount: 0,
    commentCount: 0,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }

  try {
    const result = await db.collection('posts').add({
      data: postData
    })

    return {
      code: 0,
      message: 'OK',
      data: {
        _id: result._id
      }
    }
  } catch (error) {
    console.error('Create post error:', error)
    return {
      code: 500,
      message: '创建帖子失败'
    }
  }
}

// 更新帖子
async function updatePost(event, wxContext) {
  const { OPENID } = wxContext
  const { id, patch } = event
  
  if (!OPENID) {
    return {
      code: 401,
      message: '请先登录'
    }
  }

  // 获取用户信息
  const userQuery = await db.collection('users').where({
    openid: OPENID
  }).get()

  if (userQuery.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在'
    }
  }

  const user = userQuery.data[0]

  // 检查帖子是否存在且属于当前用户
  const postQuery = await db.collection('posts').doc(id).get()
  
  if (!postQuery.data) {
    return {
      code: 404,
      message: '帖子不存在'
    }
  }

  if (postQuery.data.authorId !== user._id) {
    return {
      code: 403,
      message: '无权限修改此帖子'
    }
  }

  try {
    await db.collection('posts').doc(id).update({
      data: {
        ...patch,
        updatedAt: db.serverDate()
      }
    })

    return {
      code: 0,
      message: 'OK'
    }
  } catch (error) {
    console.error('Update post error:', error)
    return {
      code: 500,
      message: '更新帖子失败'
    }
  }
}

// 删除帖子
async function deletePost(event, wxContext) {
  const { OPENID } = wxContext
  const { id } = event
  
  if (!OPENID) {
    return {
      code: 401,
      message: '请先登录'
    }
  }

  // 获取用户信息
  const userQuery = await db.collection('users').where({
    openid: OPENID
  }).get()

  if (userQuery.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在'
    }
  }

  const user = userQuery.data[0]

  // 检查帖子是否存在且属于当前用户
  const postQuery = await db.collection('posts').doc(id).get()
  
  if (!postQuery.data) {
    return {
      code: 404,
      message: '帖子不存在'
    }
  }

  if (postQuery.data.authorId !== user._id) {
    return {
      code: 403,
      message: '无权限删除此帖子'
    }
  }

  try {
    // 逻辑删除
    await db.collection('posts').doc(id).update({
      data: {
        status: 'deleted',
        updatedAt: db.serverDate()
      }
    })

    return {
      code: 0,
      message: 'OK'
    }
  } catch (error) {
    console.error('Delete post error:', error)
    return {
      code: 500,
      message: '删除帖子失败'
    }
  }
}

// 获取帖子详情
async function getPostDetail(event, wxContext) {
  const { id } = event
  
  try {
    // 获取帖子信息
    const postQuery = await db.collection('posts').doc(id).get()
    
    if (!postQuery.data || postQuery.data.status === 'deleted') {
      return {
        code: 404,
        message: '帖子不存在'
      }
    }

    const post = postQuery.data

    // 获取作者信息
    const authorQuery = await db.collection('users').doc(post.authorId).get()
    post.author = authorQuery.data

    // 获取评论数量
    const commentCountQuery = await db.collection('comments').where({
      postId: id,
      status: 'active'
    }).count()
    post.commentCount = commentCountQuery.total

    return {
      code: 0,
      message: 'OK',
      data: post
    }
  } catch (error) {
    console.error('Get post detail error:', error)
    return {
      code: 500,
      message: '获取帖子详情失败'
    }
  }
}

// 获取帖子列表
async function getPostList(event, wxContext) {
  const { 
    type, 
    keyword, 
    location, 
    radiusKm = 50, 
    page = 1, 
    pageSize = 10,
    sort = 'createdAt_desc'
  } = event

  try {
    let query = db.collection('posts').where({
      status: 'active'
    })

    // 过滤过期帖子
    query = query.where({
      expireAt: _.or(_.eq(null), _.gt(Date.now()))
    })

    // 按类型筛选
    if (type && type !== 'all') {
      query = query.where({
        type: type
      })
    }

    // 关键字搜索
    if (keyword) {
      query = query.where(_.or([
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { content: db.RegExp({ regexp: keyword, options: 'i' }) },
        { breed: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
    }

    // 排序
    const [sortField, sortOrder] = sort.split('_')
    query = query.orderBy(sortField, sortOrder === 'desc' ? 'desc' : 'asc')

    // 分页
    const skip = (page - 1) * pageSize
    query = query.skip(skip).limit(pageSize)

    const result = await query.get()
    const posts = result.data

    // 获取作者信息
    const authorIds = [...new Set(posts.map(post => post.authorId))]
    const authorsQuery = await db.collection('users').where({
      _id: _.in(authorIds)
    }).get()
    
    const authorsMap = {}
    authorsQuery.data.forEach(author => {
      authorsMap[author._id] = author
    })

    // 组装数据
    posts.forEach(post => {
      post.author = authorsMap[post.authorId] || {}
    })

    return {
      code: 0,
      message: 'OK',
      data: {
        posts,
        hasMore: posts.length === pageSize
      }
    }
  } catch (error) {
    console.error('Get post list error:', error)
    return {
      code: 500,
      message: '获取帖子列表失败'
    }
  }
}

// 获取我的帖子
async function getMyPosts(event, wxContext) {
  const { OPENID } = wxContext
  const { page = 1, pageSize = 10 } = event
  
  if (!OPENID) {
    return {
      code: 401,
      message: '请先登录'
    }
  }

  // 获取用户信息
  const userQuery = await db.collection('users').where({
    openid: OPENID
  }).get()

  if (userQuery.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在'
    }
  }

  const user = userQuery.data[0]

  try {
    const skip = (page - 1) * pageSize
    const result = await db.collection('posts')
      .where({
        authorId: user._id,
        status: _.neq('deleted')
      })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    const posts = result.data
    
    // 添加作者信息
    posts.forEach(post => {
      post.author = user
    })

    return {
      code: 0,
      message: 'OK',
      data: {
        posts,
        hasMore: posts.length === pageSize
      }
    }
  } catch (error) {
    console.error('Get my posts error:', error)
    return {
      code: 500,
      message: '获取我的帖子失败'
    }
  }
}

// 点赞/取消点赞
async function toggleLike(event, wxContext) {
  const { OPENID } = wxContext
  const { postId } = event
  
  if (!OPENID) {
    return {
      code: 401,
      message: '请先登录'
    }
  }

  // 获取用户信息
  const userQuery = await db.collection('users').where({
    openid: OPENID
  }).get()

  if (userQuery.data.length === 0) {
    return {
      code: 401,
      message: '用户不存在'
    }
  }

  const user = userQuery.data[0]

  try {
    // 检查是否已点赞
    const likeQuery = await db.collection('likes').where({
      postId,
      userId: user._id
    }).get()

    let liked = false
    let likeCount = 0

    if (likeQuery.data.length > 0) {
      // 取消点赞
      await db.collection('likes').doc(likeQuery.data[0]._id).remove()
      
      // 更新帖子点赞数
      await db.collection('posts').doc(postId).update({
        data: {
          likeCount: _.inc(-1)
        }
      })
    } else {
      // 添加点赞
      await db.collection('likes').add({
        data: {
          postId,
          userId: user._id,
          createdAt: db.serverDate()
        }
      })
      
      // 更新帖子点赞数
      await db.collection('posts').doc(postId).update({
        data: {
          likeCount: _.inc(1)
        }
      })
      
      liked = true
    }

    // 获取最新点赞数
    const postQuery = await db.collection('posts').doc(postId).get()
    likeCount = postQuery.data.likeCount || 0

    return {
      code: 0,
      message: 'OK',
      data: {
        liked,
        likeCount
      }
    }
  } catch (error) {
    console.error('Toggle like error:', error)
    return {
      code: 500,
      message: '操作失败'
    }
  }
}