# 家教排课软件 — TutorSchedule

一个基于 **Kotlin + Jetpack Compose** 的家教排课 Android 应用，采用 Clean Architecture 分层架构。

## 技术栈

- **UI**: Jetpack Compose + Material3
- **架构**: Clean Architecture（Domain / Data / Local / Remote）
- **依赖注入**: Hilt
- **本地存储**: Room
- **网络**: Retrofit + OkHttp + kotlinx.serialization
- **异步**: Kotlin Coroutines + Flow
- **导航**: Jetpack Navigation Compose
- **日期时间**: kotlinx.datetime

## 模块结构

```
tutor-schedule/
├── app/                    # 应用入口、导航图、全局 DI
├── core/
│   ├── common/             # 异常体系、ID包装、枚举、常量（零Android依赖）
│   ├── domain/             # 业务模型、Repository接口、UseCase（纯Kotlin）
│   ├── data/               # DataSource接口、Repository实现、Mapper
│   ├── local/              # Room数据库、DAO、本地DataSource实现
│   └── remote/             # Retrofit接口、DTO、远程DataSource实现
├── core-navigation/        # 类型安全导航接口
├── design-system/          # 主题色、MaterialTheme包装
└── feature/
    └── schedule/           # 排课Feature：周视图、拖拽排课、冲突检测
```

## 核心功能

- 📅 **周视图排课**：7天 × 时间轴网格，支持 30min 粒度
- 🖐️ **拖拽调整**：长按课程卡片拖拽到空闲时段，自动调整时间
- ⚠️ **冲突检测**：教师/学生/教室时间重叠 + 教师休息日检测
- 👤 **学生名称显示**：课程卡片显示真实学生姓名（非占位符）
- 🌐 **网络感知**：自动判断在线/离线状态，离线时缓存本地操作待同步
- 🔄 **后台同步**：本地优先策略，有网络时自动推送变更

## 导入方式

1. 将项目导入 **Android Studio**（建议版本：Ladybug 或更新）
2. 确保环境：
   - AGP 8.5.0+
   - Kotlin 2.0.0+
   - JDK 17
3. Sync Gradle
4. 运行 `:app` 模块

## 架构依赖规则

```
feature → domain ← data ← local / remote
```

- `:core:domain` **零 Android 依赖**，可独立单元测试
- `:core:data` 不依赖 Room/Retrofit，只定义接口
- `:feature:xxx` 不接触 Room Entity 或 Retrofit DTO

## 已知待完善

| 项 | 说明 |
|----|------|
| 同步引擎 | 当前为桩实现，需替换为增量同步 + 冲突解决 |
| 日视图 | 路由已预留，UI 待实现 |
| 学生/教师管理 | 目录结构已预留，UI 待编写 |
| 单元测试 | 架构已预留测试点，测试类待补充 |
| SQLCipher | 生产环境建议加密本地数据库 |

---

*版本：v2.1*  
*生成时间：2026-05-03*
