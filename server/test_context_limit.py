#!/usr/bin/env python3
"""
测试上下文消息限制功能

测试目标：验证当消息数量超过 MAX_CONTEXT_MESSAGES 时，
只有最近的 N 条消息会被发送给 AI。

测试方法：
1. 先临时修改 MAX_CONTEXT_MESSAGES 为 30
2. 创建一个新话题
3. 发送 35 条消息（超过 30 条限制）
4. 每条消息包含序号标记
5. 最后询问 AI 能看到的最早消息序号
6. 如果功能正常，AI 应该只能看到第 6 条及以后的消息

使用前：请先修改 server/config.py 中的 MAX_CONTEXT_MESSAGES 为 30
"""

import requests
import time
import sys

API_BASE = "http://localhost:8000/api"

# 测试配置
TOTAL_MESSAGES = 35  # 发送的总消息数
CONTEXT_LIMIT = 30   # 上下文限制（需要与 config.py 一致）
EXPECTED_CUTOFF = TOTAL_MESSAGES - CONTEXT_LIMIT + 1  # 预期 AI 能看到的最早消息序号 = 6


def create_topic():
    """创建新话题"""
    response = requests.post(f"{API_BASE}/topics", json={})
    response.raise_for_status()
    topic = response.json()
    print(f"✓ 创建话题: {topic['id']}")
    return topic["id"]


def get_providers():
    """获取服务商列表"""
    response = requests.get(f"{API_BASE}/providers")
    response.raise_for_status()
    data = response.json()
    providers = [p for p in data["providers"] if p["enabled"]]
    if not providers:
        raise Exception("没有可用的服务商，请先配置")
    return providers[0]


def get_models(provider_id):
    """获取模型列表"""
    response = requests.get(f"{API_BASE}/providers/{provider_id}/models")
    response.raise_for_status()
    data = response.json()
    if not data["models"]:
        raise Exception("没有可用的模型")
    return data["models"][0]["id"]


def send_message(topic_id, content, provider_id, model):
    """发送消息（非流式）"""
    response = requests.post(
        f"{API_BASE}/topics/{topic_id}/messages",
        json={
            "content": content,
            "provider_id": provider_id,
            "model": model
        }
    )
    response.raise_for_status()
    return response.json()


def get_messages(topic_id):
    """获取话题的所有消息"""
    response = requests.get(f"{API_BASE}/topics/{topic_id}/messages")
    response.raise_for_status()
    return response.json()["messages"]


def delete_topic(topic_id):
    """删除话题"""
    response = requests.delete(f"{API_BASE}/topics/{topic_id}")
    response.raise_for_status()


def run_test():
    """运行测试"""
    print("=" * 60)
    print("上下文消息限制功能测试")
    print("=" * 60)
    print(f"计划发送 {TOTAL_MESSAGES} 条消息")
    print(f"上下文限制：{CONTEXT_LIMIT} 条")
    print(f"预期 AI 能看到的最早消息：第 {EXPECTED_CUTOFF} 条")
    print("=" * 60)
    print()

    topic_id = None

    try:
        # 1. 获取服务商和模型
        print("[1/4] 获取服务商配置...")
        provider = get_providers()
        print(f"  服务商: {provider['name']}")

        model = get_models(provider["id"])
        print(f"  模型: {model}")
        print()

        # 2. 创建话题
        print("[2/4] 创建测试话题...")
        topic_id = create_topic()
        print()

        # 3. 发送大量消息
        print(f"[3/4] 发送 {TOTAL_MESSAGES} 条消息...")
        print("  （每条消息 AI 都会回复，需要一些时间）")
        print()

        for i in range(1, TOTAL_MESSAGES + 1):
            # 消息内容包含明确的序号标记
            content = f"【消息序号:{i}】这是第 {i} 条测试消息。请记住这个序号。"

            # 显示进度
            progress = i / TOTAL_MESSAGES * 100
            sys.stdout.write(f"\r  进度: {i}/{TOTAL_MESSAGES} ({progress:.1f}%)")
            sys.stdout.flush()

            try:
                send_message(topic_id, content, provider["id"], model)
            except Exception as e:
                print(f"\n  ⚠ 消息 {i} 发送失败: {e}")
                # 继续发送下一条
                continue

            # 避免请求过快
            time.sleep(0.5)

        print("\n  ✓ 消息发送完成")
        print()

        # 4. 验证测试
        print("[4/4] 验证上下文限制...")

        # 统计数据库中的实际消息数
        messages = get_messages(topic_id)
        total_messages = len(messages)
        user_messages = [m for m in messages if m["role"] == "user"]
        print(f"  数据库中总消息数: {total_messages} (用户: {len(user_messages)}, 助手: {total_messages - len(user_messages)})")
        print()

        # 计算预期被截取的情况
        # 每条用户消息对应一条助手回复，所以实际消息数 = 35*2 = 70
        # 限制 30 条时，应该只保留最后 30 条消息
        # 最后 30 条消息中，用户消息序号应该是从 (35 - 15 + 1) = 21 开始
        expected_first_visible = TOTAL_MESSAGES - (CONTEXT_LIMIT // 2) + 1
        print(f"  预期计算：")
        print(f"    总消息数 {total_messages} > 限制 {CONTEXT_LIMIT}")
        print(f"    应截取最后 {CONTEXT_LIMIT} 条消息")
        print(f"    预期 AI 能看到的最早用户消息序号约: {expected_first_visible}")
        print()

        # 发送验证问题
        verify_question = f"""请仔细回顾我们的对话历史，找出所有包含【消息序号:N】标记的消息。

重要：请逐条检查，从最早的消息开始，告诉我：
1. 你能看到的第一条带有【消息序号:N】标记的消息，N是多少？
2. 你能看到的最后一条带有【消息序号:N】标记的消息，N是多少？
3. 你总共能看到多少条带有【消息序号:N】标记的消息？

请只回答数字，格式如：
最早序号: X
最新序号: Y
总数: Z"""

        print("  发送验证问题...")
        result = send_message(topic_id, verify_question, provider["id"], model)

        print()
        print("=" * 60)
        print("AI 回复：")
        print("=" * 60)
        print(result["assistant_message"]["content"])
        print("=" * 60)
        print()

        print("验证说明：")
        print(f"  - 数据库总消息数: {total_messages}")
        print(f"  - 上下文限制: {CONTEXT_LIMIT} 条")
        print(f"  - 如果限制生效，AI 应该只能看到最后 {CONTEXT_LIMIT} 条消息")
        print(f"  - 最早能看到的用户消息序号约为: {expected_first_visible}")
        print(f"  - 请查看服务器日志确认实际截取情况")
        print()

    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # 清理
        if topic_id:
            print("清理测试数据...")
            try:
                delete_topic(topic_id)
                print("  ✓ 测试话题已删除")
            except:
                print("  ⚠ 清理失败，请手动删除")

    print()
    print("测试完成！请根据 AI 的回复判断功能是否正常。")
    return True


if __name__ == "__main__":
    # 检查服务是否运行
    try:
        requests.get(f"{API_BASE}/providers", timeout=5)
    except requests.exceptions.ConnectionError:
        print("✗ 无法连接到服务器，请确保 server/main.py 正在运行")
        print("  运行命令: cd server && python main.py")
        sys.exit(1)

    run_test()
