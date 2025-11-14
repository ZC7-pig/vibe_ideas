// 搜索页面
const app = getApp()

Page({
  data: {
    searchKeyword: '',
    searchFocus: true,
    hasSearched: false,
    searchHistory: [],
    hotKeywords: ['金毛', '泰迪', '橘猫', '布偶猫', '哈士奇', '比熊', '英短', '萨摩耶'],
    
    // 搜索结果
    results: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    loadingMore: false,
    refreshing: false,
    
    // 筛选和排序
    activeFilter: 'all',
    sortType: 'time', // time, distance, relevance
    sortText: '按时间排序',
    showSortModal: false,
    
    // 用户位置
    userLocation: null
  },

  onLoad(options) {
    // 获取传入的搜索关键词
    if (options.keyword) {
      this.setData({
        searchKeyword: options.keyword,
        searchFocus: false
      })
      this.performSearch()
    }
    
    // 加载搜索历史
    this.loadSearchHistory()
    
    // 获取用户位置
    this.getUserLocation()
  },

  onShow() {
    // 每次显示页面时更新搜索历史
    this.loadSearchHistory()
  },

  // 获取用户位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      },
      fail: (err) => {
        console.log('获取位置失败:', err)
      }
    })
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || []
      this.setData({
        searchHistory: history.slice(0, 10) // 最多显示10条历史记录
      })
    } catch (err) {
      console.log('加载搜索历史失败:', err)
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    if (!keyword || keyword.trim() === '') return
    
    try {
      let history = wx.getStorageSync('searchHistory') || []
      
      // 移除重复项
      history = history.filter(item => item !== keyword)
      
      // 添加到开头
      history.unshift(keyword)
      
      // 限制历史记录数量
      history = history.slice(0, 20)
      
      wx.setStorageSync('searchHistory', history)
      this.setData({
        searchHistory: history.slice(0, 10)
      })
    } catch (err) {
      console.log('保存搜索历史失败:', err)
    }
  },

  // 清空搜索历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('searchHistory')
            this.setData({
              searchHistory: []
            })
            wx.showToast({
              title: '已清空',
              icon: 'success'
            })
          } catch (err) {
            console.log('清空搜索历史失败:', err)
          }
        }
      }
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 搜索确认
  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }
    
    this.performSearch()
  },

  // 从历史记录搜索
  searchFromHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({
      searchKeyword: keyword,
      searchFocus: false
    })
    this.performSearch()
  },

  // 从热门搜索
  searchFromHot(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({
      searchKeyword: keyword,
      searchFocus: false
    })
    this.performSearch()
  },

  // 执行搜索
  performSearch() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) return
    
    // 保存搜索历史
    this.saveSearchHistory(keyword)
    
    // 重置搜索状态
    this.setData({
      hasSearched: true,
      results: [],
      currentPage: 1,
      hasMore: true,
      totalCount: 0,
      loading: true
    })
    
    this.searchPosts()
  },

  // 搜索帖子
  async searchPosts() {
    if (this.data.loading && this.data.currentPage === 1) {
      // 首次搜索，显示加载状态
    } else if (this.data.loadingMore) {
      return // 防止重复加载
    }
    
    if (this.data.currentPage > 1) {
      this.setData({ loadingMore: true })
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'posts',
        data: {
          action: 'search',
          keyword: this.data.searchKeyword,
          filter: this.data.activeFilter,
          sortType: this.data.sortType,
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          userLocation: this.data.userLocation
        }
      })
      
      if (result.result.success) {
        const { posts, total } = result.result.data
        
        // 处理帖子数据
        const processedPosts = posts.map(post => ({
          ...post,
          typeText: this.getPostTypeText(post.type),
          createTimeRelative: this.getRelativeTime(post.createTime),
          distance: post.distance ? `${post.distance}km` : null
        }))
        
        this.setData({
          results: this.data.currentPage === 1 ? processedPosts : [...this.data.results, ...processedPosts],
          totalCount: total,
          hasMore: posts.length === this.data.pageSize,
          loading: false,
          loadingMore: false
        })
      } else {
        throw new Error(result.result.message || '搜索失败')
      }
    } catch (err) {
      console.error('搜索失败:', err)
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      })
      this.setData({
        loading: false,
        loadingMore: false
      })
    }
  },

  // 切换筛选条件
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.activeFilter) return
    
    this.setData({
      activeFilter: filter,
      currentPage: 1,
      results: [],
      hasMore: true
    })
    
    this.performSearch()
  },

  // 显示排序选项
  showSortOptions() {
    this.setData({
      showSortModal: true
    })
  },

  // 隐藏排序选项
  hideSortOptions() {
    this.setData({
      showSortModal: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 选择排序方式
  selectSort(e) {
    const sortType = e.currentTarget.dataset.sort
    let sortText = '按时间排序'
    
    switch (sortType) {
      case 'time':
        sortText = '按时间排序'
        break
      case 'distance':
        sortText = '按距离排序'
        break
      case 'relevance':
        sortText = '按相关度排序'
        break
    }
    
    this.setData({
      sortType,
      sortText,
      showSortModal: false,
      currentPage: 1,
      results: [],
      hasMore: true
    })
    
    this.performSearch()
  },

  // 加载更多结果
  loadMoreResults() {
    if (!this.data.hasMore || this.data.loadingMore) return
    
    this.setData({
      currentPage: this.data.currentPage + 1
    })
    
    this.searchPosts()
  },

  // 下拉刷新
  onRefresh() {
    this.setData({
      refreshing: true,
      currentPage: 1,
      results: [],
      hasMore: true
    })
    
    this.searchPosts().finally(() => {
      this.setData({
        refreshing: false
      })
    })
  },

  // 查看帖子详情
  viewPost(e) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${postId}`
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 获取帖子类型文本
  getPostTypeText(type) {
    const typeMap = {
      'lost': '寻宠',
      'found': '捡到',
      'adoption': '领养',
      'normal': '日常'
    }
    return typeMap[type] || '未知'
  },

  // 获取相对时间
  getRelativeTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    
    if (diff < minute) {
      return '刚刚'
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`
    } else {
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}-${date.getDate()}`
    }
  }
})