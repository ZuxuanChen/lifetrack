# 家教排课软件 — 项目生成总结

## 一、修正版架构的核心改进

相比第一版，v2 修正了 10 项关键缺陷：

| 缺陷 | 修正 |
|------|------|
| 缺少 DataSource 接口抽象 | `:core:data` 定义接口，`:core:local` / `:core:remote` 分别实现 |
| 数据库实体越界暴露 | 引入 `LessonDataModel` 作为 Data 层内部模型，隔离 Entity ↔ Domain |
| MVI 副作用缺失 | 引入 `ScheduleEffect` 通道（Toast / Dialog / Navigate） |
| 模块职责边界模糊 | 拆分为 `:design-system`（UI）和 `:core:common`（纯工具） |
| 缺少类型安全导航 | 新增 `:core:navigation` 模块，Feature 间解耦 |
| DTO/Mapper 未定义 | Mapper 集中在 `:core:data`，DTO 仅存在于 `:core:remote` |
| 异常体系不一致 | 定义 `TutorException` 密封类 + `TutorResult<T>` 统一包装 |
| 同步策略伪代码 | 定义 `SyncEngine` 接口 + `NetworkMonitor` 抽象 |
| 模块依赖方向错误 | 严格单向依赖：`feature` → `domain` ← `data` ← `local` / `remote` |

## 二、完整文件清单

```
tutor-schedule/
├── build.gradle.kts
├── settings.gradle.kts
├── docs/
│   ├── 家教排课软件_架构设计书.md         (v1.0 原始版)
│   └── 家教排课软件_架构设计书_v2.md      (v2.0 修正版 + 问题分析)
│
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── kotlin/com/tutorschedule/app/
│           ├── TutorScheduleApplication.kt
│           ├── MainActivity.kt
│           ├── AppNavHost.kt
│           └── di/
│               └── AppModule.kt              # Navigation + NetworkMonitor + SyncEngine 绑定
│
├── core/common/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/common/
│       └── Common.kt                         # TutorException / TutorResult / WeekRange / TimeSlot / ID包装 / Subject / GradeLevel
│
├── core/domain/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/domain/
│       ├── model/Models.kt                   # Lesson / Student / Teacher / ScheduleRule / RecurrencePattern / Conflict / Consumption
│       ├── repository/Repositories.kt        # LessonRepository / StudentRepository / TeacherRepository / ConflictChecker 接口
│       └── usecase/ScheduleUseCases.kt       # GetWeeklySchedule / CreateLesson / MoveLesson / DeleteLesson / CheckConflict
│
├── core/data/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/data/
│       ├── datasource/
│       │   └── DataSourceInterfaces.kt       # LessonLocalDataSource / LessonRemoteDataSource / StudentLocalDataSource / etc.
│       ├── model/DataModels.kt               # LessonDataModel / StudentDataModel / TeacherDataModel
│       ├── mapper/Mappers.kt                 # LessonMapper / StudentMapper / TeacherMapper (Domain ↔ DataModel ↔ Entity/DTO)
│       ├── repository/
│       │   └── RepositoryImpls.kt            # LessonRepositoryImpl / StudentRepositoryImpl / TeacherRepositoryImpl / ScheduleConflictChecker / NetworkMonitor / SyncEngine
│       └── di/
│           └── RepositoryModule.kt           # Hilt Repository 绑定
│
├── core/local/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/local/
│       ├── entity/Entities.kt                # LessonEntity / StudentEntity / TeacherEntity (Room)
│       ├── dao/Daos.kt                       # LessonDao / StudentDao / TeacherDao
│       ├── database/TutorDatabase.kt         # Room Database
│       ├── datasource/
│       │   ├── RoomLessonDataSource.kt       # Room 实现 LessonLocalDataSource
│       │   ├── RoomStudentDataSource.kt        # Room 实现 StudentLocalDataSource
│       │   └── RoomTeacherDataSource.kt      # Room 实现 TeacherLocalDataSource
│       └── di/
│           └── LocalDataSourceModule.kt      # Hilt Local DS 绑定 + Database Provider
│
├── core/remote/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/remote/
│       ├── dto/Dtos.kt                       # ApiResponse / LessonDto / StudentDto / TeacherDto / CreateLessonRequest / etc.
│       ├── api/TutorScheduleApi.kt           # Retrofit 接口定义
│       ├── datasource/
│       │   ├── RetrofitLessonDataSource.kt   # Retrofit 实现 LessonRemoteDataSource
│       │   ├── RetrofitStudentDataSource.kt  # Retrofit 实现 StudentRemoteDataSource
│       │   └── RetrofitTeacherDataSource.kt  # Retrofit 实现 TeacherRemoteDataSource
│       └── di/
│           └── RemoteDataSourceModule.kt     # Hilt Remote DS 绑定 + Retrofit/OkHttp Provider
│
├── design-system/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/designsystem/theme/
│       ├── Color.kt                          # 主色/学科色/功能色定义
│       └── TutorTheme.kt                     # MaterialTheme 包装 + 扩展 CompositionLocal
│
├── core-navigation/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/tutorschedule/navigation/
│       └── NavigationInterfaces.kt           # ScheduleNavigation / StudentNavigation / TeacherNavigation 接口 + 实现
│
└── feature/schedule/
    ├── build.gradle.kts
    └── src/main/kotlin/com/tutorschedule/feature/schedule/
        ├── ScheduleContract.kt               # ScheduleUiState / ScheduleIntent / ScheduleEffect / LessonUiModel / TimeSlotUiModel
        ├── ScheduleViewModel.kt              # MVI ViewModel：StateFlow + Effect Channel
        ├── WeeklyScheduleScreen.kt           # Compose 周视图主页面（含拖拽排课、冲突横幅、时间标尺）
        └── di/
            └── ScheduleModule.kt           # 排课模块 Hilt 模块（预留扩展点）
```

## 三、依赖关系图（严格单向）

```
:app
├── :feature:schedule → :core:domain, :design-system, :core-navigation
├── :feature:student  → :core:domain, :design-system, :core-navigation
├── :feature:teacher  → :core:domain, :design-system, :core-navigation
├── :feature:settings → :core:domain, :design-system, :core-navigation
├── :core:local       → :core:data (实现 DataSource 接口)
├── :core:remote      → :core:data (实现 DataSource 接口)
├── :core:data        → :core:domain, :core:common
├── :core:domain      → :core:common
├── :design-system     → (仅 Compose 基础库)
└── :core-navigation   → (仅 Navigation 类型)
```

**关键规则**：
- `:core:domain` 零 Android 依赖，可独立单元测试
- `:core:data` 不依赖 `:core:local` / `:core:remote`，只定义接口
- `:feature:xxx` 不接触 Room Entity 或 Retrofit DTO
- `:design-system` 不接触 ViewModel / Repository

## 四、三层模型隔离

```
Domain Model          Data Model            Local Entity          Remote DTO
(Lesson)              (LessonDataModel)     (LessonEntity)        (LessonDto)
    ↑                      ↑                      ↑                      ↑
    │                      │                      │                      │
RepositoryImpl ←── Mapper ─┘                      │                      │
    │                                             │                      │
DataSource 接口 ←────  RoomLessonDataSource ────┘                      │
DataSource 接口 ←──────────────────────── RetrofitLessonDataSource ───┘
```

## 五、MVI + Effect 数据流

```
User Action → ViewModel.onIntent()
                    │
                    ├──→ UseCase → Repository → DataSource
                    │       │
                    │       └──→ 业务结果
                    │
                    ├──→ _uiState.update()   (持续性状态，驱动重组)
                    │
                    └──→ _effect.send()      (一次性副作用，Toast/导航/弹窗)
                              │
                              └──→ UI 通过 LaunchedEffect 收集并消费
```

## 六、可编译性检查

- ✅ `Common.kt` — 纯 Kotlin，无 Android 依赖
- ✅ `Models.kt` — 使用 `kotlinx.datetime`，无 Android SDK
- ✅ `Repositories.kt` — 纯接口，零 Android
- ✅ `UseCases.kt` — 纯业务逻辑
- ✅ `DataModels.kt` — Data 层内部模型
- ✅ `Mappers.kt` — 双向映射（Domain ↔ DataModel）
- ✅ `RepositoryImpls.kt` — Repository + ConflictChecker + 同步策略
- ✅ `Entities.kt` — Room 注解完整
- ✅ `Daos.kt` — Room DAO 完整
- ✅ `TutorDatabase.kt` — Room Database 定义
- ✅ `Room*DataSource.kt` — DataSource 接口实现（Entity ↔ DataModel 映射）
- ✅ `Dtos.kt` — `kotlinx.serialization` 注解完整
- ✅ `TutorScheduleApi.kt` — Retrofit 接口完整
- ✅ `Retrofit*DataSource.kt` — DTO ↔ DataModel 映射
- ✅ `TutorTheme.kt` — MaterialTheme + CompositionLocal 扩展
- ✅ `WeeklyScheduleScreen.kt` — Compose UI + 拖拽手势 + 冲突横幅
- ✅ `ScheduleViewModel.kt` — StateFlow + Effect Channel + MVI 完整
- ✅ `ScheduleContract.kt` — State / Intent / Effect 密封类
- ✅ `AppNavHost.kt` — NavHost + 类型安全路由
- ✅ `build.gradle.kts` — 各模块依赖清晰

## 七、已知简化项（生产环境需补充）

1. **同步引擎**：`StubSyncEngine` 仅为桩实现，需替换为增量同步 + 冲突解决算法
2. ~~**网络监控**：`DefaultNetworkMonitor` 硬编码 `isOnline = true`，需接入 ConnectivityManager~~ ✅ **已修复（v2.1）**
3. ~~**学生名称显示**：`Lesson.toUiModel()` 中 `studentName = "学生"` 为占位符~~ ✅ **已修复（v2.1）**
4. **拖拽落点精度**：当前按 30min 格子对齐，可细化为 15min/5min
5. **日视图页面**：`DailyScheduleScreen` 已预留路由，尚未实现
6. **学生/教师 Feature**：目录结构预留，UI 代码待补充
7. **SQLCipher**：生产环境应加密本地数据库
8. **单元测试**：各层测试类尚未编写，但架构已预留测试点

## 八、v2.1 Bug 修复记录

| 优先级 | 文件 | 问题 | 修复方案 |
|--------|------|------|----------|
| 🔴 P0 | `ScheduleConflictChecker` | 教师可用性检测错误使用**当前系统时间**，导致跨天排课误判 | 改用 `newLesson.scheduleRule.start` 的时间 |
| 🔴 P0 | `ScheduleViewModel` | `studentName = "学生"` 硬编码，所有课程显示相同名称 | 并行加载 `StudentRepository` 数据，按 `studentId` 映射真实姓名 |
| 🟡 P1 | `LessonDao` + `RepositoryImpl` | 按学生/教师查询课程时**全表扫描**再过滤 | 新增 `getLessonsByStudent` / `getLessonsByTeacher` DAO 查询 |
| 🟡 P1 | `DefaultNetworkMonitor` | `isOnline` 硬编码 `true`，离线场景会误判 | 接入 `ConnectivityManager` + `NetworkCapabilities` 动态检测 |
| 🟢 P2 | `WeeklyScheduleScreen` | Effect 通道（Toast / Dialog / 导航）全部空实现 | 接入 `SnackbarHost` + `AlertDialog` + 导航回调 |

## 九、使用方式

```bash
# 1. 将项目导入 Android Studio
# 2. 确保 AGP 8.5.0 + Kotlin 2.0.0 + JDK 17
# 3. Sync Gradle
# 4. 运行 :app 模块
```

如需扩展新功能：
1. 在 `:core:domain` 定义新模型和 Repository 接口
2. 在 `:core:data` 定义 DataSource 接口和 RepositoryImpl
3. 在 `:core:local` / `:core:remote` 实现 DataSource
4. 在 `:feature:xxx` 编写 Compose UI + ViewModel
5. 在 `:app` 的 `AppNavHost` 注册路由

---

*生成时间：2026-05-03*
*架构版本：v2.1*
