// =========================================
// :core:common — 纯 Kotlin 工具 / 常量 / 异常体系
// 零 Android 依赖
// =========================================

package com.tutorschedule.common

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * 统一异常体系 — 所有业务异常由此派生
 */
sealed class TutorException(
    message: String,
    cause: Throwable? = null
) : Exception(message, cause) {

    class NetworkError(
        cause: Throwable? = null
    ) : TutorException("网络连接失败，请检查网络", cause)

    class DatabaseError(
        cause: Throwable? = null
    ) : TutorException("本地数据错误", cause)

    class ConflictError(
        val conflicts: List<ConflictDetail>
    ) : TutorException("检测到 ${conflicts.size} 处排课冲突") {
        data class ConflictDetail(
            val type: ConflictType,
            val description: String,
            val relatedLessonIds: List<String>
        )
    }

    class ValidationError(
        val field: String,
        val reason: String
    ) : TutorException("校验失败 [$field]: $reason")

    class NotFoundError(
        val resource: String
    ) : TutorException("$resource 不存在")

    class SyncError(
        cause: Throwable? = null
    ) : TutorException("数据同步失败", cause)

    class Unauthorized(
        cause: Throwable? = null
    ) : TutorException("登录已过期，请重新登录", cause)
}

enum class ConflictType {
    TEACHER_OVERLAP,      // 教师时间重叠
    ROOM_OVERLAP,         // 教室占用冲突
    STUDENT_OVERLAP,      // 学生时间重叠
    TEACHER_REST_DAY,     // 教师休息日
    ROOM_UNAVAILABLE,     // 教室不可用
    HOURS_INSUFFICIENT    // 学生课时不足
}

/**
 * 统一结果包装 — 替代标准库 Result，明确异常类型
 */
sealed class TutorResult<out T> {
    data class Success<T>(val data: T) : TutorResult<T>()
    data class Error(val exception: TutorException) : TutorResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
    val isError: Boolean get() = this is Error

    fun getOrNull(): T? = (this as? Success)?.data
    fun exceptionOrNull(): TutorException? = (this as? Error)?.exception

    inline fun <R> map(transform: (T) -> R): TutorResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Error -> this
    }

    inline fun <R> flatMap(transform: (T) -> TutorResult<R>): TutorResult<R> = when (this) {
        is Success -> transform(data)
        is Error -> this
    }

    inline fun onSuccess(action: (T) -> Unit): TutorResult<T> {
        if (this is Success) action(data)
        return this
    }

    inline fun onError(action: (TutorException) -> Unit): TutorResult<T> {
        if (this is Error) action(exception)
        return this
    }
}

/**
 * 将标准库 Result 转换为 TutorResult（辅助函数）
 */
inline fun <T> runCatchingTutor(block: () -> T): TutorResult<T> =
    try {
        TutorResult.Success(block())
    } catch (e: TutorException) {
        TutorResult.Error(e)
    } catch (e: Exception) {
        TutorResult.Error(TutorException.DatabaseError(e))
    }

/**
 * 周范围工具 — 支持周偏移导航
 */
data class WeekRange(
    val start: Instant,
    val end: Instant
) {
    companion object {
        fun current(timeZone: TimeZone = TimeZone.currentSystemDefault()): WeekRange {
            val now = Clock.System.now().toLocalDateTime(timeZone)
            // 周一为周起始
            val dayOfWeek = now.date.dayOfWeek.ordinal // 0=Mon, 6=Sun
            val weekStart = kotlinx.datetime.LocalDateTime(
                now.date.minus(kotlinx.datetime.DatePeriod(days = dayOfWeek)),
                kotlinx.datetime.LocalTime(0, 0)
            )
            val weekEnd = kotlinx.datetime.LocalDateTime(
                now.date.plus(kotlinx.datetime.DatePeriod(days = 6 - dayOfWeek)),
                kotlinx.datetime.LocalTime(23, 59, 59)
            )
            return WeekRange(
                start = weekStart.toInstant(timeZone),
                end = weekEnd.toInstant(timeZone)
            )
        }
    }

    fun previous(): WeekRange = WeekRange(
        start = start.minus(kotlinx.datetime.DateTimePeriod(days = 7)),
        end = end.minus(kotlinx.datetime.DateTimePeriod(days = 7))
    )

    fun next(): WeekRange = WeekRange(
        start = start.plus(kotlinx.datetime.DateTimePeriod(days = 7)),
        end = end.plus(kotlinx.datetime.DateTimePeriod(days = 7))
    )

    fun contains(instant: Instant): Boolean = instant in start..end
}

/**
 * 时间段工具
 */
data class TimeSlot(
    val start: kotlinx.datetime.LocalDateTime,
    val end: kotlinx.datetime.LocalDateTime
) {
    init {
        require(start < end) { "开始时间必须早于结束时间" }
    }

    fun durationMinutes(): Int =
        ((end.toInstant(TimeZone.currentSystemDefault()).epochSeconds -
                start.toInstant(TimeZone.currentSystemDefault()).epochSeconds) / 60).toInt()

    fun overlaps(other: TimeSlot): Boolean =
        start < other.end && end > other.start
}

/**
 * ID 类型安全包装 — 避免 String 到处飞
 */
@JvmInline
value class LessonId(val value: String) {
    override fun toString(): String = value
}

@JvmInline
value class StudentId(val value: String) {
    override fun toString(): String = value
}

@JvmInline
value class TeacherId(val value: String) {
    override fun toString(): String = value
}

@JvmInline
value class RoomId(val value: String) {
    override fun toString(): String = value
}

/**
 * 学科枚举 — 内置颜色映射
 */
enum class Subject(val displayName: String, val colorHex: String) {
    MATH("数学", "#5B8BD8"),
    ENGLISH("英语", "#E07A5F"),
    PHYSICS("物理", "#81C784"),
    CHEMISTRY("化学", "#FFB74D"),
    CHINESE("语文", "#9575CD"),
    BIOLOGY("生物", "#4DB6AC"),
    HISTORY("历史", "#8D6E63"),
    GEOGRAPHY("地理", "#64B5F6"),
    POLITICS("政治", "#90A4AE"),
    OTHERS("其他", "#BDBDBD");

    companion object {
        fun fromDisplay(name: String): Subject =
            entries.find { it.displayName == name } ?: OTHERS
    }
}

/**
 * 年级枚举
 */
enum class GradeLevel(val displayName: String, val sortOrder: Int) {
    PRIMARY_1("小学一年级", 1),
    PRIMARY_2("小学二年级", 2),
    PRIMARY_3("小学三年级", 3),
    PRIMARY_4("小学四年级", 4),
    PRIMARY_5("小学五年级", 5),
    PRIMARY_6("小学六年级", 6),
    MIDDLE_1("初中一年级", 7),
    MIDDLE_2("初中二年级", 8),
    MIDDLE_3("初中三年级", 9),
    HIGH_1("高中一年级", 10),
    HIGH_2("高中二年级", 11),
    HIGH_3("高中三年级", 12),
    UNIVERSITY("大学", 13),
    ADULT("成人", 14);
}

/**
 * 课程状态
 */
enum class LessonStatus {
    SCHEDULED,    // 已排课
    COMPLETED,    // 已完成
    CANCELLED,    // 已取消
    NO_SHOW,      // 学生未到
    MAKEUP        // 补课
}

/**
 * 通用常量
 */
object TutorConstants {
    const val DEFAULT_LESSON_DURATION_MIN = 90
    const val MIN_LESSON_DURATION_MIN = 30
    const val MAX_LESSON_DURATION_MIN = 240
    const val TEACHER_MAX_DAILY_LESSONS = 8
    const val DATABASE_NAME = "tutor_schedule.db"
    const val DATASTORE_NAME = "tutor_prefs"
    const val BASE_API_URL = "https://api.tutorschedule.com/v1/"
}
