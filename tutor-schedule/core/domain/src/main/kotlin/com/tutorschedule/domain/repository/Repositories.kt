package com.tutorschedule.domain.repository

import com.tutorschedule.common.LessonId
import com.tutorschedule.common.StudentId
import com.tutorschedule.common.TeacherId
import com.tutorschedule.common.TutorResult
import com.tutorschedule.common.WeekRange
import com.tutorschedule.domain.model.Lesson
import com.tutorschedule.domain.model.LessonConsumption
import com.tutorschedule.domain.model.ScheduleConflict
import com.tutorschedule.domain.model.Student
import com.tutorschedule.domain.model.Teacher
import kotlinx.coroutines.flow.Flow
import kotlinx.datetime.Instant

/**
 * 课程仓储接口 — Domain层定义契约，Data层提供实现
 */
interface LessonRepository {
    /**
     * 获取指定周范围内的课程（一次性）
     */
    suspend fun getLessonsForWeek(week: WeekRange): TutorResult<List<Lesson>>

    /**
     * 获取单节课程详情
     */
    suspend fun getLesson(id: LessonId): TutorResult<Lesson>

    /**
     * 创建课程（含冲突检测）
     */
    suspend fun createLesson(lesson: Lesson): TutorResult<Lesson>

    /**
     * 更新课程
     */
    suspend fun updateLesson(lesson: Lesson): TutorResult<Lesson>

    /**
     * 删除课程
     */
    suspend fun deleteLesson(id: LessonId): TutorResult<Unit>

    /**
     * 移动课程到新时间段
     */
    suspend fun moveLesson(
        id: LessonId,
        newStart: Instant,
        newEnd: Instant
    ): TutorResult<Lesson>

    /**
     * 流式监听：指定周的课程变化（Room + Flow）
     */
    fun observeLessonsForWeek(week: WeekRange): Flow<List<Lesson>>

    /**
     * 获取学生的所有课程
     */
    suspend fun getLessonsForStudent(studentId: StudentId): TutorResult<List<Lesson>>

    /**
     * 获取教师的所有课程
     */
    suspend fun getLessonsForTeacher(teacherId: TeacherId): TutorResult<List<Lesson>>
}

/**
 * 学生仓储接口
 */
interface StudentRepository {
    suspend fun getStudents(): TutorResult<List<Student>>
    suspend fun getStudent(id: StudentId): TutorResult<Student>
    suspend fun createStudent(student: Student): TutorResult<Student>
    suspend fun updateStudent(student: Student): TutorResult<Student>
    suspend fun deleteStudent(id: StudentId): TutorResult<Unit>
    fun observeStudents(): Flow<List<Student>>
    fun observeRemainingHours(studentId: StudentId): Flow<Map<com.tutorschedule.common.Subject, Float>>
}

/**
 * 教师仓储接口
 */
interface TeacherRepository {
    suspend fun getTeachers(): TutorResult<List<Teacher>>
    suspend fun getTeacher(id: TeacherId): TutorResult<Teacher>
    fun observeTeachers(): Flow<List<Teacher>>
}

/**
 * 冲突检测服务 — 纯业务逻辑，无IO
 */
interface ConflictChecker {
    /**
     * 检查新课程是否与现有课程冲突
     * @param newLesson 待检查的课程
     * @param excludeLessonId 排除了这些ID的课程（用于移动场景）
     * @return 冲突列表，空表示无冲突
     */
    fun checkConflicts(
        newLesson: Lesson,
        existingLessons: List<Lesson>,
        teachers: List<Teacher>,
        excludeLessonId: LessonId? = null
    ): List<ScheduleConflict>
}
