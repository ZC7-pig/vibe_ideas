#!/bin/bash

# 数据库集合检查脚本
# 用于验证云开发数据库集合是否正确创建

echo "🔍 开始检查数据库集合配置..."

echo ""
echo "📋 需要创建的集合列表："
echo "  - users (用户信息)"
echo "  - posts (帖子信息)" 
echo "  - notifications (通知信息)"

echo ""
echo "⚠️  请在微信开发者工具的云开发控制台中："
echo "1. 点击'数据库'标签页"
echo "2. 检查是否存在以下集合："
echo "   ✓ users"
echo "   ✓ posts" 
echo "   ✓ notifications"
echo ""
echo "3. 如果集合不存在，请点击'添加集合'创建"
echo "4. 设置集合权限为'所有用户可读写'（开发阶段）"

echo ""
echo "🔧 数据库权限设置："
echo "开发阶段建议设置："
echo "  - 读权限：true"
echo "  - 写权限：true"
echo ""
echo "生产环境建议设置："
echo "  - 读权限：仅创建者可读写"
echo "  - 写权限：仅创建者可读写"

echo ""
echo "📊 users集合字段说明："
echo "  - _id: 文档ID (使用用户openid)"
echo "  - _openid: 用户微信openid"
echo "  - avatarUrl: 用户头像URL"
echo "  - nickName: 用户昵称"
echo "  - phoneNumber: 手机号(可选)"
echo "  - createTime: 创建时间"
echo "  - updateTime: 更新时间"

echo ""
echo "✅ 检查完成后，请使用小程序中的测试功能验证数据库连接！"