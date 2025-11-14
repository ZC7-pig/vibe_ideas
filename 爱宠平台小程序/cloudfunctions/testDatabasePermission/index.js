// 数据库权限和连接测试云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gqreqi3bc234646'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const testResults = []
  
  try {
    testResults.push(`开始数据库权限测试 - OpenID: ${wxContext.OPENID}`)
    
    // 测试1: 检查users集合是否存在
    try {
      const collectionTest = await db.collection('users').limit(1).get()
      testResults.push(`✅ users集合访问成功，当前记录数: ${collectionTest.data.length}`)
    } catch (error) {
      testResults.push(`❌ users集合访问失败: ${error.message}`)
      return { success: false, results: testResults }
    }
    
    // 测试2: 尝试写入测试数据
    const testData = {
      _openid: wxContext.OPENID,
      testField: 'database_permission_test',
      testTime: new Date()
    }
    
    try {
      const writeResult = await db.collection('users').doc(`test_${wxContext.OPENID}`).set({
        data: testData
      })
      testResults.push(`✅ 测试数据写入成功: ${JSON.stringify(writeResult)}`)
    } catch (error) {
      testResults.push(`❌ 测试数据写入失败: ${error.message}`)
      return { success: false, results: testResults }
    }
    
    // 测试3: 验证数据是否真的写入了
    try {
      const readResult = await db.collection('users').doc(`test_${wxContext.OPENID}`).get()
      if (readResult.data) {
        testResults.push(`✅ 测试数据读取成功: ${JSON.stringify(readResult.data)}`)
      } else {
        testResults.push(`❌ 测试数据读取失败: 数据不存在`)
      }
    } catch (error) {
      testResults.push(`❌ 测试数据读取失败: ${error.message}`)
    }
    
    // 测试4: 清理测试数据
    try {
      await db.collection('users').doc(`test_${wxContext.OPENID}`).remove()
      testResults.push(`✅ 测试数据清理成功`)
    } catch (error) {
      testResults.push(`⚠️ 测试数据清理失败: ${error.message}`)
    }
    
    // 测试5: 检查真实用户数据
    try {
      const userResult = await db.collection('users').doc(wxContext.OPENID).get()
      if (userResult.data) {
        testResults.push(`✅ 发现真实用户数据: ${JSON.stringify(userResult.data)}`)
      } else {
        testResults.push(`⚠️ 未发现真实用户数据`)
      }
    } catch (error) {
      testResults.push(`❌ 查询真实用户数据失败: ${error.message}`)
    }
    
    return {
      success: true,
      results: testResults,
      openid: wxContext.OPENID
    }
    
  } catch (error) {
    testResults.push(`❌ 测试过程出错: ${error.message}`)
    return {
      success: false,
      results: testResults,
      error: error.message
    }
  }
}