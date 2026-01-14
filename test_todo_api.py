#!/usr/bin/env python3
"""
SecondMe TODO 和 API Token 功能测试脚本
测试所有新增的 API 端点
"""

import requests
import json
from datetime import datetime, timedelta

API_BASE = "http://localhost:8060/api"

# 测试用户凭证（需要先登录获取 token）
USERNAME = "admin"
PASSWORD = "admin123"

def print_section(title):
    """打印测试章节标题"""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)

def print_test(name):
    """打印测试名称"""
    print(f"\n🧪 测试: {name}")

def print_result(success, message=""):
    """打印测试结果"""
    if success:
        print(f"✅ 成功{': ' + message if message else ''}")
    else:
        print(f"❌ 失败{': ' + message if message else ''}")

def login():
    """登录获取 JWT Token"""
    print_test("用户登录")
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        token = data["access_token"]
        print_result(True, f"获取到 JWT Token")
        return token
    else:
        print_result(False, f"状态码: {response.status_code}")
        print(response.text)
        return None

def test_api_tokens(token):
    """测试 API Token 管理功能"""
    print_section("API Token 管理测试")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. 获取 Token 列表（应该为空）
    print_test("获取 Token 列表（初始）")
    response = requests.get(f"{API_BASE}/tokens", headers=headers)
    if response.status_code == 200:
        tokens = response.json()["tokens"]
        print_result(True, f"获取到 {len(tokens)} 个 Token")
    else:
        print_result(False, f"状态码: {response.status_code}")
        return None

    # 2. 创建 API Token
    print_test("创建 API Token")
    response = requests.post(
        f"{API_BASE}/tokens",
        headers=headers,
        json={"name": "测试 Token"}
    )
    if response.status_code == 200:
        api_token_data = response.json()
        api_token = api_token_data["token"]
        api_token_id = api_token_data["id"]
        print_result(True, f"Token: {api_token}")
        print(f"   Preview: {api_token_data['token_preview']}")
    else:
        print_result(False, f"状态码: {response.status_code}")
        print(response.text)
        return None

    # 3. 再次获取 Token 列表
    print_test("获取 Token 列表（创建后）")
    response = requests.get(f"{API_BASE}/tokens", headers=headers)
    if response.status_code == 200:
        tokens = response.json()["tokens"]
        print_result(True, f"获取到 {len(tokens)} 个 Token")
        if len(tokens) > 0:
            print(f"   第一个 Token: {tokens[0]['name']} - {tokens[0]['token_preview']}")
    else:
        print_result(False, f"状态码: {response.status_code}")

    return api_token, api_token_id

def test_todo_with_jwt(token):
    """使用 JWT Token 测试 TODO 功能"""
    print_section("TODO 管理测试（使用 JWT）")
    headers = {"Authorization": f"Bearer {token}"}
    todo_ids = []

    # 1. 创建主任务
    print_test("创建主任务")
    deadline = (datetime.now() + timedelta(days=7)).isoformat()
    response = requests.post(
        f"{API_BASE}/todos",
        headers=headers,
        json={
            "title": "开发新功能",
            "description": "完成 TODO 系统的开发",
            "priority": 5,
            "group_name": "工作",
            "deadline": deadline
        }
    )
    if response.status_code == 200:
        todo = response.json()
        todo_ids.append(todo["id"])
        print_result(True, f"ID: {todo['id']}, 标题: {todo['title']}")
    else:
        print_result(False, f"状态码: {response.status_code}")
        print(response.text)
        return []

    # 2. 创建子任务
    print_test("创建子任务")
    response = requests.post(
        f"{API_BASE}/todos",
        headers=headers,
        json={
            "title": "编写后端代码",
            "parent_id": todo_ids[0],
            "priority": 4
        }
    )
    if response.status_code == 200:
        sub_todo = response.json()
        todo_ids.append(sub_todo["id"])
        print_result(True, f"子任务 ID: {sub_todo['id']}")
    else:
        print_result(False, f"状态码: {response.status_code}")
        print(response.text)

    # 3. 获取任务列表（包含子任务）
    print_test("获取任务列表（含子任务）")
    response = requests.get(
        f"{API_BASE}/todos?parent_id=null&include_children=true",
        headers=headers
    )
    if response.status_code == 200:
        todos = response.json()["todos"]
        print_result(True, f"获取到 {len(todos)} 个顶层任务")
        if len(todos) > 0 and len(todos[0].get("children", [])) > 0:
            print(f"   第一个任务有 {len(todos[0]['children'])} 个子任务")
    else:
        print_result(False, f"状态码: {response.status_code}")

    # 4. 更新任务状态
    print_test("更新任务状态为进行中")
    response = requests.put(
        f"{API_BASE}/todos/{todo_ids[0]}",
        headers=headers,
        json={"status": "in_progress"}
    )
    if response.status_code == 200:
        todo = response.json()
        print_result(True, f"状态: {todo['status']}")
    else:
        print_result(False, f"状态码: {response.status_code}")

    # 5. 获取单个任务
    print_test("获取单个任务详情")
    response = requests.get(f"{API_BASE}/todos/{todo_ids[0]}", headers=headers)
    if response.status_code == 200:
        todo = response.json()
        print_result(True, f"标题: {todo['title']}, 状态: {todo['status']}")
    else:
        print_result(False, f"状态码: {response.status_code}")

    # 6. 批量更新任务状态
    print_test("批量更新任务状态为已完成")
    response = requests.patch(
        f"{API_BASE}/todos/batch",
        headers=headers,
        json={"ids": todo_ids, "status": "completed"}
    )
    if response.status_code == 200:
        result = response.json()
        print_result(True, f"更新了 {result['updated_count']} 个任务")
    else:
        print_result(False, f"状态码: {response.status_code}")

    # 7. 获取任务分组
    print_test("获取任务分组统计")
    response = requests.get(f"{API_BASE}/todos/groups", headers=headers)
    if response.status_code == 200:
        groups = response.json()["groups"]
        print_result(True, f"获取到 {len(groups)} 个分组")
        for group in groups:
            print(f"   - {group['name']}: {group['count']} 个任务")
    else:
        print_result(False, f"状态码: {response.status_code}")

    return todo_ids

def test_todo_with_api_token(api_token):
    """使用 API Token 测试 TODO 功能"""
    print_section("TODO 管理测试（使用 API Token）")
    headers = {"Authorization": f"Bearer {api_token}"}

    # 1. 使用 API Token 创建任务
    print_test("使用 API Token 创建任务")
    response = requests.post(
        f"{API_BASE}/todos",
        headers=headers,
        json={
            "title": "通过 API Token 创建的任务",
            "priority": 3
        }
    )
    if response.status_code == 200:
        todo = response.json()
        todo_id = todo["id"]
        print_result(True, f"成功创建: {todo['title']}")
    else:
        print_result(False, f"状态码: {response.status_code}")
        print(response.text)
        return None

    # 2. 使用 API Token 获取任务列表
    print_test("使用 API Token 获取任务列表")
    response = requests.get(f"{API_BASE}/todos", headers=headers)
    if response.status_code == 200:
        todos = response.json()["todos"]
        print_result(True, f"获取到 {len(todos)} 个任务")
    else:
        print_result(False, f"状态码: {response.status_code}")

    # 3. 使用 API Token 尝试管理 Token（应该失败）
    print_test("使用 API Token 尝试获取 Token 列表（应该失败）")
    response = requests.get(f"{API_BASE}/tokens", headers=headers)
    if response.status_code == 401:
        print_result(True, "正确拒绝了 API Token 访问 Token 管理接口")
    else:
        print_result(False, f"状态码应为 401，实际: {response.status_code}")

    return todo_id

def cleanup(token, todo_ids, api_token_id):
    """清理测试数据"""
    print_section("清理测试数据")
    headers = {"Authorization": f"Bearer {token}"}

    # 删除 TODO
    print_test("删除测试任务")
    deleted = 0
    for todo_id in todo_ids:
        response = requests.delete(f"{API_BASE}/todos/{todo_id}", headers=headers)
        if response.status_code == 200:
            deleted += 1
    print_result(True, f"删除了 {deleted}/{len(todo_ids)} 个任务")

    # 删除 API Token
    print_test("删除测试 Token")
    response = requests.delete(f"{API_BASE}/tokens/{api_token_id}", headers=headers)
    if response.status_code == 200:
        print_result(True)
    else:
        print_result(False, f"状态码: {response.status_code}")

def main():
    print("=" * 60)
    print(" SecondMe TODO & API Token 功能测试")
    print("=" * 60)

    # 1. 登录
    jwt_token = login()
    if not jwt_token:
        print("\n❌ 登录失败，测试终止")
        return

    # 2. 测试 API Token 管理
    result = test_api_tokens(jwt_token)
    if not result:
        print("\n❌ API Token 测试失败，测试终止")
        return
    api_token, api_token_id = result

    # 3. 使用 JWT 测试 TODO
    jwt_todo_ids = test_todo_with_jwt(jwt_token)
    if not jwt_todo_ids:
        print("\n❌ TODO 测试失败，测试终止")
        return

    # 4. 使用 API Token 测试 TODO
    api_token_todo_id = test_todo_with_api_token(api_token)
    if api_token_todo_id:
        jwt_todo_ids.append(api_token_todo_id)

    # 5. 清理测试数据
    cleanup(jwt_token, jwt_todo_ids, api_token_id)

    print("\n" + "=" * 60)
    print(" ✅ 所有测试完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
