package com.tutorschedule.domain.usecase.schedule

import com.tutorschedule.common.LessonId
import com.tutorschedule.common.TutorResult
import com.tutorschedule.common.WeekRange
import com.tutorschedule.common.runCatchingTutor
import com.tutorschedule.domain.model.Lesson
import com.tutorschedule.domain.repository.LessonRepository
import kotlinx.datetime.Instant
import javax.inject.Inject

/**
 * 获取周课表用例
 */
class GetWeeklyScheduleUseCase @Inject constructor(
    private val lessonRepository: LessonRepository
) {
    suspend operator fun invoke(week: WeekRange): TutorResult<List<Lesson>> {
        return lessonRepository.getLessonsForWeek(week)
    }
}

/**
 * 创建课程用例 — 上层负责冲突检测前置，此处仅执行创建
 */
class CreateLessonUseCase @Inject constructor(
    private val lessonRepository: LessonRepository
) {
    suspend operator fun invoke(lesson: Lesson): TutorResult<Lesson> {
        return lessonRepository.createLesson(lesson)
    }
}

/**
 * 移动课程用例
 */
class MoveLessonUseCase @Inject constructor(
    private val lessonRepository: LessonRepository
) {
    suspend operator fun invoke(
        lessonId: LessonId,
        newStart: Instant,
        newEnd: Instant
    ): TutorResult<Lesson> {
        return lessonRepository.moveLesson(lessonId, newStart, newEnd)
    }
}

/**
 * 删除课程用例
 */
class DeleteLessonUseCase @Inject constructor(
    private val lessonRepository: LessonRepository
) {
    suspend operator fun invoke(lessonId: LessonId): TutorResult<Unit> {
        return lessonRepository.deleteLesson(lessonId)
    }
}

/**
 * 获取课程详情用例
 */
class GetLessonDetailUseCase @Inject constructor(
    private val lessonRepository: LessonRepository
) {
    suspend operator fun invoke(lessonId: LessonId): TutorResult<Lesson> {
        return lessonRepository.getLesson(lessonId)
    }
}

/**
 * 冲突检测用例 — 纯业务逻辑，无IO
 */
class CheckScheduleConflictUseCase @Inject constructor(
    private val conflictChecker: com.tutorschedule.domain.repository.ConflictChecker
) {
    operator fun invoke(
        newLesson: Lesson,
        existingLessons: List<Lesson>,
        teachers: List<com.tutorschedule.domain.model.Teacher>
    ): List<com.tutorschedule.domain.model.ScheduleConflict> {
        return conflictChecker.checkConflicts(
            newLesson = newLesson,
            existingLessons = existingLessons,
            teachers = teachers
        )
    }
}
