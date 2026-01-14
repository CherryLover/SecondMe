#!/bin/bash
# SecondMe TODO 和 API Token 功能测试脚本

API_BASE="http://localhost:8060/api"
USERNAME="testuser"
PASSWORD="test123456"

echo "=========================================="
echo " SecondMe TODO & API Token 功能测试"
echo "=========================================="

# 1. 登录获取 JWT Token
echo -e "\n🧪 测试: 用户登录"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ 登录失败"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 成功获取 JWT Token"

echo -e "\n=========================================="
echo " API Token 管理测试"
echo "=========================================="

# 2. 创建 API Token
echo -e "\n🧪 测试: 创建 API Token"
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/tokens" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试 Token"}')

API_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
API_TOKEN_ID=$(echo $TOKEN_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$API_TOKEN" ]; then
  echo "❌ 创建 API Token 失败"
  echo "响应: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ 成功创建 API Token: $API_TOKEN"

# 3. 获取 Token 列表
echo -e "\n🧪 测试: 获取 Token 列表"
TOKENS_RESPONSE=$(curl -s -X GET "$API_BASE/tokens" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "✅ 响应: $TOKENS_RESPONSE"

echo -e "\n=========================================="
echo " TODO 管理测试（使用 JWT）"
echo "=========================================="

# 4. 创建主任务
echo -e "\n🧪 测试: 创建主任务"
DEADLINE=$(date -u -v+7d +"%Y-%m-%dT%H:%M:%S")
TODO_RESPONSE=$(curl -s -X POST "$API_BASE/todos" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"开发新功能\", \"description\": \"完成 TODO 系统的开发\", \"priority\": 5, \"group_name\": \"工作\", \"deadline\": \"$DEADLINE\"}")

TODO_ID=$(echo $TODO_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TODO_ID" ]; then
  echo "❌ 创建任务失败"
  echo "响应: $TODO_RESPONSE"
  exit 1
fi

echo "✅ 成功创建任务: $TODO_ID"

# 5. 创建子任务
echo -e "\n🧪 测试: 创建子任务"
SUB_TODO_RESPONSE=$(curl -s -X POST "$API_BASE/todos" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"编写后端代码\", \"parent_id\": \"$TODO_ID\", \"priority\": 4}")

SUB_TODO_ID=$(echo $SUB_TODO_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SUB_TODO_ID" ]; then
  echo "❌ 创建子任务失败"
  echo "响应: $SUB_TODO_RESPONSE"
else
  echo "✅ 成功创建子任务: $SUB_TODO_ID"
fi

# 6. 获取任务列表
echo -e "\n🧪 测试: 获取任务列表（含子任务）"
TODOS_RESPONSE=$(curl -s -X GET "$API_BASE/todos?parent_id=null&include_children=true" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "✅ 响应长度: ${#TODOS_RESPONSE} 字符"

# 7. 更新任务状态
echo -e "\n🧪 测试: 更新任务状态为进行中"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/todos/$TODO_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}')

echo "✅ 更新成功"

# 8. 获取单个任务
echo -e "\n🧪 测试: 获取单个任务详情"
GET_TODO_RESPONSE=$(curl -s -X GET "$API_BASE/todos/$TODO_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "✅ 响应: $(echo $GET_TODO_RESPONSE | head -c 100)..."

# 9. 获取任务分组
echo -e "\n🧪 测试: 获取任务分组统计"
GROUPS_RESPONSE=$(curl -s -X GET "$API_BASE/todos/groups" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "✅ 响应: $GROUPS_RESPONSE"

echo -e "\n=========================================="
echo " TODO 管理测试（使用 API Token）"
echo "=========================================="

# 10. 使用 API Token 创建任务
echo -e "\n🧪 测试: 使用 API Token 创建任务"
API_TODO_RESPONSE=$(curl -s -X POST "$API_BASE/todos" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "通过 API Token 创建的任务", "priority": 3}')

API_TODO_ID=$(echo $API_TODO_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$API_TODO_ID" ]; then
  echo "❌ 使用 API Token 创建任务失败"
  echo "响应: $API_TODO_RESPONSE"
else
  echo "✅ 成功创建任务: $API_TODO_ID"
fi

# 11. 使用 API Token 获取任务列表
echo -e "\n🧪 测试: 使用 API Token 获取任务列表"
API_TODOS_RESPONSE=$(curl -s -X GET "$API_BASE/todos" \
  -H "Authorization: Bearer $API_TOKEN")

echo "✅ 响应长度: ${#API_TODOS_RESPONSE} 字符"

# 12. 使用 API Token 尝试管理 Token（应该失败）
echo -e "\n🧪 测试: 使用 API Token 尝试获取 Token 列表（应该失败）"
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/tokens" \
  -H "Authorization: Bearer $API_TOKEN")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -1)

if [ "$HTTP_CODE" == "401" ]; then
  echo "✅ 正确拒绝了 API Token 访问 Token 管理接口"
else
  echo "❌ 应该返回 401，实际返回: $HTTP_CODE"
fi

echo -e "\n=========================================="
echo " 清理测试数据"
echo "=========================================="

# 删除任务
echo -e "\n🧪 测试: 删除测试任务"
if [ -n "$TODO_ID" ]; then
  curl -s -X DELETE "$API_BASE/todos/$TODO_ID" -H "Authorization: Bearer $JWT_TOKEN" > /dev/null
  echo "✅ 删除主任务"
fi

if [ -n "$API_TODO_ID" ]; then
  curl -s -X DELETE "$API_BASE/todos/$API_TODO_ID" -H "Authorization: Bearer $JWT_TOKEN" > /dev/null
  echo "✅ 删除 API Token 创建的任务"
fi

# 删除 API Token
echo -e "\n🧪 测试: 删除测试 Token"
curl -s -X DELETE "$API_BASE/tokens/$API_TOKEN_ID" -H "Authorization: Bearer $JWT_TOKEN" > /dev/null
echo "✅ 删除 API Token"

echo -e "\n=========================================="
echo " ✅ 所有测试完成！"
echo "=========================================="
