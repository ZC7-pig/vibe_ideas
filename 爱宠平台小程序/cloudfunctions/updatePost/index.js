// cloudfunctions/updatePost/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    const {
      postId,
      title,
      images,
      breed,
      color,
      location,
      description,
      contact,
      lostOrFoundTime,
      serviceMeta
    } = event

    // 验证必需参数
    if (!postId || !title || !breed || !color || !location || !description || !contact) {
      return {
        success: false,
        message: '请填写完整信息'
      }
    }

    // 验证图片数量
    if (!images || images.length === 0) {
      return {
        success: false,
        message: '请至少上传一张图片'
      }
    }

    // 首先检查帖子是否存在且属于当前用户
    const postResult = await db.collection('posts').doc(postId).get()
    
    if (!postResult.data) {
      return {
        success: false,
        message: '帖子不存在'
      }
    }

    if (postResult.data.userId !== userId) {
      return {
        success: false,
        message: '无权限编辑此帖子'
      }
    }

    // 获取用户IP地址信息（模拟，实际需要通过其他方式获取）
    const ipInfo = await getIPLocation(wxContext.CLIENTIP || '127.0.0.1')

    // 构建更新数据
    const updateData = {
      title,
      images,
      breed,
      color,
      location,
      description,
      contact,
      updateTime: new Date(),
      updateIP: ipInfo.province || '未知'
    }

    // 根据帖子类型添加特定字段
    if (lostOrFoundTime) {
      updateData.lostOrFoundTime = new Date(lostOrFoundTime)
    }

    if (serviceMeta) {
      updateData.serviceMeta = serviceMeta
    }

    // 更新帖子
    await db.collection('posts').doc(postId).update({
      data: updateData
    })

    return {
      success: true,
      data: {
        _id: postId,
        updateTime: updateData.updateTime,
        updateIP: updateData.updateIP
      }
    }

  } catch (error) {
    console.error('更新帖子失败:', error)
    return {
      success: false,
      message: '更新失败，请重试'
    }
  }
}

// 获取IP地址对应的省份信息（简化版本）
async function getIPLocation(ip) {
  try {
    // 这里可以调用第三方IP定位服务
    // 为了演示，我们返回一些模拟数据
    const provinces = ['北京', '上海', '广东', '浙江', '江苏', '山东', '河南', '四川', '湖北', '湖南']
    const randomProvince = provinces[Math.floor(Math.random() * provinces.length)]
    
    return {
      province: randomProvince,
      ip: ip
    }
  } catch (error) {
    console.error('获取IP位置失败:', error)
    return {
      province: '未知',
      ip: ip
    }
  }
}