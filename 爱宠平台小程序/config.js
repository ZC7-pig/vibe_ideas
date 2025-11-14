// config.js - 应用配置文件

// 基础配置
export const CONFIG = {
  // 匹配配置
  DEFAULT_RADIUS_KM: 5,
  MATCH_SCORE_THRESHOLD: 70,
  MATCH_RECENT_DAYS: 7,
  CRON_MATCH_INTERVAL_MIN: 15,
  
  // 分页配置
  PAGE_SIZE: 20,
  MAX_IMAGES: 9,
  
  // 云环境配置
  CLOUD_ENV: 'cloud1-9gqreqi3bc234646' // 请替换为实际的云环境ID
}

// 帖子类型配置
export const POST_TYPES = {
  LOST: 'lost',
  FOUND: 'found',
  FOSTER: 'foster',
  BREED: 'breed',
  ADOPT: 'adopt',
  SERVICE: 'service',
  ACTIVITY: 'activity'
}

// 帖子类型显示名称
export const POST_TYPE_NAMES = {
  [POST_TYPES.LOST]: '寻宠',
  [POST_TYPES.FOUND]: '发现',
  [POST_TYPES.FOSTER]: '寄养',
  [POST_TYPES.BREED]: '配种',
  [POST_TYPES.ADOPT]: '收养',
  [POST_TYPES.SERVICE]: '服务',
  [POST_TYPES.ACTIVITY]: '活动'
}

// 常见宠物品种
export const PET_BREEDS = [
  '金毛',
  '拉布拉多',
  '哈士奇',
  '萨摩耶',
  '边境牧羊犬',
  '德国牧羊犬',
  '泰迪',
  '比熊',
  '博美',
  '柯基',
  '法斗',
  '英斗',
  '阿拉斯加',
  '松狮',
  '雪纳瑞',
  '吉娃娃',
  '贵宾',
  '中华田园犬',
  '英短',
  '美短',
  '布偶',
  '暹罗',
  '波斯',
  '折耳',
  '加菲',
  '缅因',
  '俄蓝',
  '银渐层',
  '金渐层',
  '中华田园猫',
  '其他'
]

// 常见毛色
export const PET_COLORS = [
  '金色',
  '浅金色',
  '黄色',
  '浅黄色',
  '黑色',
  '深灰',
  '浅灰',
  '白色',
  '米白',
  '乳白',
  '棕色',
  '深棕',
  '浅棕',
  '红色',
  '橙色',
  '奶油色',
  '银色',
  '蓝色',
  '黑白相间',
  '黄白相间',
  '棕白相间',
  '三花',
  '玳瑁',
  '虎斑',
  '其他'
]

// 颜色相似词映射
export const COLOR_SIMILARITY_MAP = {
  '金色': ['浅金色', '黄色', '浅黄色', '奶油色'],
  '浅金色': ['金色', '黄色', '浅黄色', '奶油色'],
  '黄色': ['金色', '浅金色', '浅黄色', '奶油色'],
  '浅黄色': ['金色', '浅金色', '黄色', '奶cream色'],
  '黑色': ['深灰', '黑灰'],
  '深灰': ['黑色', '浅灰'],
  '白色': ['米白', '乳白', '奶cream色'],
  '米白': ['白色', '乳白', '奶cream色'],
  '乳白': ['白色', '米白', '奶cream色'],
  '棕色': ['深棕', '浅棕'],
  '深棕': ['棕色', '浅棕'],
  '浅棕': ['棕色', '深棕']
}

// 服务类型
export const SERVICE_TYPES = {
  PROVIDE: 'provide',
  SEEK: 'seek'
}

export const SERVICE_TYPE_NAMES = {
  [SERVICE_TYPES.PROVIDE]: '提供',
  [SERVICE_TYPES.SEEK]: '寻求'
}

// 收养状态
export const ADOPT_STATUS = {
  PENDING: 'pending',
  ADOPTED: 'adopted'
}

export const ADOPT_STATUS_NAMES = {
  [ADOPT_STATUS.PENDING]: '待领养',
  [ADOPT_STATUS.ADOPTED]: '已领养'
}

// 本地服务分类
export const LOCAL_SERVICES = [
  {
    id: 'activity',
    name: '宠物活动',
    icon: '🎉',
    description: '宠物聚会、训练课程等活动信息'
  },
  {
    id: 'hospital',
    name: '宠物医院',
    icon: '🏥',
    description: '附近宠物医院、诊所信息'
  },
  {
    id: 'funeral',
    name: '宠物殡葬',
    icon: '🕯️',
    description: '宠物殡葬、纪念服务信息'
  }
]

// 匹配评分权重
export const MATCH_WEIGHTS = {
  BREED: 40,
  BREED_EXACT: 50,
  COLOR: 30,
  COLOR_SIMILAR: 20,
  LOCATION: 20,
  TIME: 10
}

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  LOGIN_REQUIRED: '请先登录',
  LOCATION_DENIED: '需要位置权限才能使用此功能',
  UPLOAD_FAILED: '图片上传失败，请重试',
  FORM_INVALID: '请填写完整信息',
  OPERATION_FAILED: '操作失败，请重试'
}

// 成功消息
export const SUCCESS_MESSAGES = {
  POST_CREATED: '发布成功',
  POST_UPDATED: '更新成功',
  POST_DELETED: '删除成功',
  NOTIFICATION_READ: '已标记为已读'
}