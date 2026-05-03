package com.tutorschedule.feature.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tutorschedule.common.LessonId
import com.tutorschedule.common.StudentId
import com.tutorschedule.common.Subject
import com.tutorschedule.common.TutorException
import com.tutorschedule.common.TutorResult
import com.tutorschedule.common.WeekRange
import com.tutorschedule.common.runCatchingTutor
import com.tutorschedule.domain.model.Lesson
import com.tutorschedule.domain.model.ScheduleRule
import com.tutorschedule.domain.repository.LessonRepository
import com.tutorschedule.domain.repository.StudentRepository
import com.tutorschedule.domain.usecase.schedule.CheckScheduleConflictUseCase
import com.tutorschedule.domain.usecase.schedule.DeleteLessonUseCase
import com.tutorschedule.domain.usecase.schedule.GetLessonDetailUseCase
import com.tutorschedule.domain.usecase.schedule.GetWeeklyScheduleUseCase
import com.tutorschedule.domain.usecase.schedule.MoveLessonUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import javax.inject.Inject

/**
 * 排课 ViewModel — MVI + Effect 完整实现
 */
@HiltViewModel
class ScheduleViewModel @Inject constructor(
    private val getWeeklySchedule: GetWeeklyScheduleUseCase,
    private val getLessonDetail: GetLessonDetailUseCase,
    private val moveLessonUseCase: MoveLessonUseCase,
    private val deleteLessonUseCase: DeleteLessonUseCase,
    private val checkConflict: CheckScheduleConflictUseCase,
    private val lessonRepository: LessonRepository,
    private val studentRepository: StudentRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ScheduleUiState>(ScheduleUiState.Loading)
    val uiState: StateFlow<ScheduleUiState> = _uiState.asStateFlow()

    // Effect 通道 — 一次性事件（Toast/导航/弹窗）
    private val _effect = Channel<ScheduleEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    // 当前周缓存
    private val _currentWeek = MutableStateFlow(WeekRange.current())

    init {
        loadWeek(WeekRange.current())
    }

    fun onIntent(intent: ScheduleIntent) {
        when (intent) {
            is ScheduleIntent.LoadWeek -> loadWeek(intent.week)
            ScheduleIntent.LoadPreviousWeek -> loadWeek(_currentWeek.value.previous())
            ScheduleIntent.LoadNextWeek -> loadWeek(_currentWeek.value.next())
            ScheduleIntent.LoadCurrentWeek -> loadWeek(WeekRange.current())
            is ScheduleIntent.LessonClicked -> onLessonClicked(intent.lessonId)
            is ScheduleIntent.EmptySlotClicked -> onEmptySlotClicked(intent.slot)
            is ScheduleIntent.StartDragLesson -> onStartDrag(intent.lessonId)
            is ScheduleIntent.MoveLesson -> onMoveLesson(intent.lessonId, intent.newSlot)
            ScheduleIntent.EndDrag -> onEndDrag()
            ScheduleIntent.Refresh -> refreshCurrentWeek()
        }
    }

    private fun loadWeek(week: WeekRange) {
        viewModelScope.launch {
            _uiState.value = ScheduleUiState.Loading
            _currentWeek.value = week

            // 并行加载课程和学生列表
            val lessonsResult = getWeeklySchedule(week)
            val studentsResult = studentRepository.getStudents()

            val studentMap = when (studentsResult) {
                is TutorResult.Success -> studentsResult.data.associateBy { it.id.value }
                else -> emptyMap()
            }

            when (lessonsResult) {
                is TutorResult.Success -> {
                    val lessons = lessonsResult.data.map { lesson ->
                        lesson.toUiModel(
                            studentName = studentMap[lesson.studentId.value]?.name ?: "未知学生"
                        )
                    }
                    _uiState.value = ScheduleUiState.Success(
                        currentWeek = week,
                        lessons = lessons
                    )
                }
                is TutorResult.Error -> {
                    _uiState.value = ScheduleUiState.Error(lessonsResult.exception)
                }
            }
        }
    }

    private fun refreshCurrentWeek() {
        loadWeek(_currentWeek.value)
    }

    private fun onLessonClicked(lessonId: String) {
        viewModelScope.launch {
            _effect.send(ScheduleEffect.NavigateToLessonDetail(lessonId))
        }
    }

    private fun onEmptySlotClicked(slot: TimeSlotUiModel) {
        viewModelScope.launch {
            _effect.send(
                ScheduleEffect.NavigateToCreateLesson(
                    initialDay = slot.dayOfWeek,
                    initialHour = slot.startHour
                )
            )
        }
    }

    private fun onStartDrag(lessonId: String) {
        _uiState.update { state ->
            if (state is ScheduleUiState.Success) {
                state.copy(isDragging = true, draggedLessonId = lessonId)
            } else state
        }
    }

    private fun onMoveLesson(lessonId: String, newSlot: TimeSlotUiModel) {
        viewModelScope.launch {
            val state = _uiState.value
            if (state !is ScheduleUiState.Success) return@launch

            val lesson = state.lessons.find { it.id == lessonId }
                ?: return@launch

            // 构建新的 Instant 时间
            val timeZone = TimeZone.currentSystemDefault()
            val weekStart = state.currentWeek.start.toLocalDateTime(timeZone).date
            val dayOffset = newSlot.dayOfWeek.ordinal // 0=Mon
            val targetDate = weekStart.plus(kotlinx.datetime.DatePeriod(days = dayOffset))

            val newStart = LocalDateTime(
                date = targetDate,
                time = kotlinx.datetime.LocalTime(newSlot.startHour, newSlot.startMinute)
            ).toInstant(timeZone)

            val newEnd = LocalDateTime(
                date = targetDate,
                time = kotlinx.datetime.LocalTime(newSlot.endHour, newSlot.endMinute)
            ).toInstant(timeZone)

            // 执行移动
            when (val result = moveLessonUseCase(LessonId(lessonId), newStart, newEnd)) {
                is TutorResult.Success -> {
                    _effect.send(ScheduleEffect.ShowToast("课程已调整至 ${newSlot.startLabel}"))
                    refreshCurrentWeek()
                }
                is TutorResult.Error -> {
                    handleError(result.exception)
                }
            }

            _uiState.update { s ->
                if (s is ScheduleUiState.Success) s.copy(isDragging = false, draggedLessonId = null)
                else s
            }
        }
    }

    private fun onEndDrag() {
        _uiState.update { state ->
            if (state is ScheduleUiState.Success) {
                state.copy(isDragging = false, draggedLessonId = null)
            } else state
        }
    }

    private suspend fun handleError(exception: TutorException) {
        when (exception) {
            is TutorException.ConflictError -> {
                val conflicts = exception.conflicts.map { conflict ->
                    ConflictUiModel(
                        type = conflict.type.name,
                        message = conflict.message,
                        involvedLessonIds = conflict.involvedLessonIds.map { it.value }
                    )
                }
                _effect.send(ScheduleEffect.ShowConflictDialog(conflicts))
                _uiState.update { state ->
                    if (state is ScheduleUiState.Success) state.copy(conflicts = conflicts)
                    else state
                }
            }
            else -> {
                _effect.send(ScheduleEffect.ShowToast(exception.message ?: "操作失败"))
            }
        }
    }

    // === Domain → UI 模型转换 ===
    private fun Lesson.toUiModel(studentName: String): LessonUiModel {
        val startDt = scheduleRule.start.toLocalDateTime(TimeZone.currentSystemDefault())
        val endDt = scheduleRule.end.toLocalDateTime(TimeZone.currentSystemDefault())

        return LessonUiModel(
            id = id.value,
            studentName = studentName,
            subject = subject,
            subjectDisplay = subject.displayName,
            startTime = startDt,
            endTime = endDt,
            dayOfWeek = startDt.dayOfWeek,
            status = status,
            isRecurring = scheduleRule is ScheduleRule.Recurring,
            colorArgb = subject.colorHex.removePrefix("#").toInt(16) or 0xFF000000.toInt()
        )
    }
}
