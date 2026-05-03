package com.tutorschedule.domain.model

import com.tutorschedule.common.GradeLevel
import com.tutorschedule.common.LessonId
import com.tutorschedule.common.LessonStatus
import com.tutorschedule.common.RoomId
import com.tutorschedule.common.StudentId
import com.tutorschedule.common.Subject
import com.tutorschedule.common.TeacherId
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.DayOfWeek

/**
 * 课程领域模型 — 不可变，包含完整业务约束
 */
data class Lesson(
    val id: LessonId,
    val studentId: StudentId,
    val teacherId: TeacherId,
    val subject: Subject,
    val scheduleRule: ScheduleRule,
    val roomId: RoomId? = null,
    val status: LessonStatus = LessonStatus.SCHEDULED,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    init {
        require(scheduleRule.start < scheduleRule.end) {
            "课程开始时间必须早于结束时间"
        }
    }

    /** 判断给定时间点是否在该课程的时间范围内 */
    fun contains(instant: Instant): Boolean =
        instant >= scheduleRule.start && instant <= scheduleRule.end

    /** 计算课程时长（分钟） */
    fun durationMinutes(): Int =
        ((scheduleRule.end.epochSeconds - scheduleRule.start.epochSeconds) / 60).toInt()
}

/**
 * 排课规则 — 单次或周期
 */
sealed interface ScheduleRule {
    val start: Instant
    val end: Instant

    data class OneTime(
        override val start: Instant,
        override val end: Instant
    ) : ScheduleRule

    data class Recurring(
        val startDate: LocalDate,
        val endDate: LocalDate? = null,
        val recurrence: RecurrencePattern,
        val dailyStartTime: kotlinx.datetime.LocalTime,
        val dailyEndTime: kotlinx.datetime.LocalTime
    ) : ScheduleRule {
        // 返回第一次实例的时间（用于排序和约束校验）
        override val start: Instant get() = LocalDateTime(startDate, dailyStartTime)
            .toInstant(kotlinx.datetime.TimeZone.currentSystemDefault())
        override val end: Instant get() = LocalDateTime(startDate, dailyEndTime)
            .toInstant(kotlinx.datetime.TimeZone.currentSystemDefault())
    }
}

/**
 * 复现模式 — 支持按天/周/月重复
 */
data class RecurrencePattern(
    val frequency: Frequency,
    val interval: Int = 1,
    val daysOfWeek: Set<DayOfWeek> = emptySet(),
    val exceptionDates: Set<LocalDate> = emptySet()
) {
    init {
        require(interval >= 1) { "复现间隔必须 >= 1" }
        if (frequency == Frequency.WEEKLY) {
            require(daysOfWeek.isNotEmpty()) { "每周重复必须指定至少一天" }
        }
    }
}

enum class Frequency { DAILY, WEEKLY, MONTHLY }

/**
 * 学生领域模型
 */
data class Student(
    val id: StudentId,
    val name: String,
    val grade: GradeLevel,
    val enrolledSubjects: List<Subject>,
    val parentName: String?,
    val parentPhone: String?,
    val remainingHours: Map<Subject, Float>,
    val notes: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun remainingHoursOf(subject: Subject): Float =
        remainingHours[subject] ?: 0f

    fun hasHoursFor(subject: Subject, hours: Float): Boolean =
        remainingHoursOf(subject) >= hours
}

/**
 * 教师领域模型
 */
data class Teacher(
    val id: TeacherId,
    val name: String,
    val subjects: List<Subject>,
    val weeklyAvailability: List<DailyAvailability>,
    val maxDailyLessons: Int,
    val uiColorArgb: Int,
    val notes: String? = null
) {
    fun isAvailableAt(dayOfWeek: DayOfWeek, time: kotlinx.datetime.LocalTime): Boolean {
        return weeklyAvailability
            .find { it.dayOfWeek == dayOfWeek }
            ?.timeRanges?.any { timeRange -> time >= timeRange.start && time <= timeRange.end }
            ?: false
    }
}

data class DailyAvailability(
    val dayOfWeek: DayOfWeek,
    val timeRanges: List<TimeRange>
)

data class TimeRange(
    val start: kotlinx.datetime.LocalTime,
    val end: kotlinx.datetime.LocalTime
) {
    init {
        require(start < end) { "时间段开始必须早于结束" }
    }

    fun contains(time: kotlinx.datetime.LocalTime): Boolean =
        time >= start && time <= end

    fun overlaps(other: TimeRange): Boolean =
        start < other.end && end > other.start
}

/**
 * 教室领域模型
 */
data class Classroom(
    val id: RoomId,
    val name: String,
    val capacity: Int = 1,
    val unavailableSlots: List<TimeSlot> = emptyList()
)

data class TimeSlot(
    val start: LocalDateTime,
    val end: LocalDateTime
) {
    init {
        require(start < end) { "时间段开始必须早于结束" }
    }

    fun overlaps(other: TimeSlot): Boolean =
        start < other.end && end > other.start
}

/**
 * 冲突领域模型
 */
data class ScheduleConflict(
    val type: com.tutorschedule.common.ConflictType,
    val message: String,
    val involvedLessonIds: List<LessonId>,
    val involvedTeacherId: TeacherId? = null,
    val involvedRoomId: RoomId? = null
)

/**
 * 课消记录
 */
data class LessonConsumption(
    val id: String,
    val lessonId: LessonId,
    val studentId: StudentId,
    val subject: Subject,
    val consumedHours: Float,
    val consumedAt: Instant,
    val confirmedBy: String? = null,
    val notes: String? = null
)
