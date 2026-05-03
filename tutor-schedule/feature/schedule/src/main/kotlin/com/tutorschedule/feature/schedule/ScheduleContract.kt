package com.tutorschedule.feature.schedule

import com.tutorschedule.common.LessonId
import com.tutorschedule.common.LessonStatus
import com.tutorschedule.common.Subject
import com.tutorschedule.common.TutorException
import com.tutorschedule.common.WeekRange
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDateTime

/**
 * 排课模块 MVI 契约 — State + Intent + Effect
 */

// === UI State ===
sealed interface ScheduleUiState {
    data object Loading : ScheduleUiState
    data class Success(
        val currentWeek: WeekRange,
        val lessons: List<LessonUiModel>,
        val selectedDay: DayOfWeek = DayOfWeek.MONDAY,
        val isDragging: Boolean = false,
        val draggedLessonId: String? = null,
        val conflicts: List<ConflictUiModel> = emptyList()
    ) : ScheduleUiState
    data class Error(val exception: TutorException) : ScheduleUiState
}

// === 课程 UI 模型 ===
data class LessonUiModel(
    val id: String,
    val studentName: String,
    val subject: Subject,
    val subjectDisplay: String,
    val startTime: LocalDateTime,
    val endTime: LocalDateTime,
    val dayOfWeek: DayOfWeek,
    val status: LessonStatus,
    val isRecurring: Boolean,
    val colorArgb: Int
)

// === 冲突 UI 模型 ===
data class ConflictUiModel(
    val type: String,
    val message: String,
    val involvedLessonIds: List<String>
)

// === 用户意图（Intent）===
sealed interface ScheduleIntent {
    data class LoadWeek(val week: WeekRange) : ScheduleIntent
    data object LoadPreviousWeek : ScheduleIntent
    data object LoadNextWeek : ScheduleIntent
    data object LoadCurrentWeek : ScheduleIntent
    data class LessonClicked(val lessonId: String) : ScheduleIntent
    data class EmptySlotClicked(val slot: TimeSlotUiModel) : ScheduleIntent
    data class StartDragLesson(val lessonId: String) : ScheduleIntent
    data class MoveLesson(val lessonId: String, val newSlot: TimeSlotUiModel) : ScheduleIntent
    data object EndDrag : ScheduleIntent
    data object Refresh : ScheduleIntent
}

// === 时间段 UI 模型 ===
data class TimeSlotUiModel(
    val dayOfWeek: DayOfWeek,
    val startHour: Int,
    val startMinute: Int,
    val endHour: Int,
    val endMinute: Int
) {
    val startLabel: String
        get() = "${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}"
}

// === 一次性副作用（Effect）===
sealed interface ScheduleEffect {
    data class ShowToast(val message: String) : ScheduleEffect
    data class ShowConflictDialog(val conflicts: List<ConflictUiModel>) : ScheduleEffect
    data class NavigateToLessonDetail(val lessonId: String) : ScheduleEffect
    data class NavigateToCreateLesson(
        val initialDay: DayOfWeek? = null,
        val initialHour: Int? = null
    ) : ScheduleEffect
    data object RequestNotificationPermission : ScheduleEffect
}
