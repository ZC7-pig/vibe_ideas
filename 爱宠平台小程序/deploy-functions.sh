#!/bin/bash

# 爱宠平台小程序 - 云函数部署脚本
# 适用于Mac版微信开发者工具

echo "🚀 开始部署爱宠平台云函数..."

# 检查是否在正确的目录
if [ ! -d "cloudfunctions" ]; then
    echo "❌ 错误：请在小程序根目录下运行此脚本"
    exit 1
fi

# 云函数列表
functions=("createPost" "deletePost" "getPostDetail" "getSimilarPosts" "getUserStats" "listNotifications" "listPosts" "matchPosts" "updatePost" "updateUserProfile" "testDatabasePermission")

echo "📦 准备部署以下云函数："
for func in "${functions[@]}"; do
    echo "  - $func"
done

echo ""
echo "⚠️  请确保："
echo "1. 已在微信开发者工具中开通云开发"
echo "2. 已配置正确的云环境ID"
echo "3. 微信开发者工具处于登录状态"
echo ""

read -p "是否继续部署？(y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "❌ 部署已取消"
    exit 0
fi

echo ""
echo "🔧 开始部署云函数..."

# 进入云函数目录
cd cloudfunctions

# 遍历并部署每个云函数
for func in "${functions[@]}"; do
    if [ -d "$func" ]; then
        echo "📤 正在准备 $func..."
        cd "$func"
        
        # 检查package.json是否存在
        if [ ! -f "package.json" ]; then
            echo "❌ $func/package.json 不存在，跳过"
            cd ..
            continue
        fi
        
        echo "✅ $func 准备完成"
        cd ..
    else
        echo "⚠️  云函数目录 $func 不存在，跳过"
    fi
done

echo ""
echo "✅ 云函数准备完成！"
echo ""
echo "📋 接下来请在微信开发者工具中："
echo "1. 点击工具栏的'云开发'按钮"
echo "2. 进入'云函数'标签页"
echo "3. 点击'上传并部署'按钮"
echo "4. 选择要部署的云函数"
echo ""
echo "🎉 部署完成后即可在小程序中调用云函数！"
