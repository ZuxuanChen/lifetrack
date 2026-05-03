package com.tutorschedule.data.datasource

import com.tutorschedule.common.LessonId
import kotlinx.coroutines.flow.Flow
import kotlinx.datetime.Instant

/**
 * 课程本地数据源接口 — 定义在 :core:data，由 :core:local 实现
 *
 * 返回值使用 Data 层内部模型 [LessonDataModel]，而非 Room Entity 或 Domain Model
 * 实现者负责：Entity ↔ DataModel 的映射
 */
interface LessonLocalDataSource {
    suspend fun getLessonsBetween(start: Instant, end: Instant): List<LessonDataModel>
    suspend fun getLesson(id: String): LessonDataModel?
    suspend fun insertLesson(lesson: LessonDataModel)
    suspend fun updateLesson(lesson: LessonDataModel)
    suspend fun deleteLesson(id: String)
    suspend fun deleteAllLessons()

    /** Room + Flow 实时监听 */
    fun observeLessonsBetween(start: Instant, end: Instant): Flow<List<LessonDataModel>>

    /** 按学生查询课程（避免全表扫描） */
    suspend fun getLessonsByStudent(studentId: String): List<LessonDataModel>

    /** 按教师查询课程（避免全表扫描） */
    suspend fun getLessonsByTeacher(teacherId: String): List<LessonDataModel>
}

/**
 * 学生本地数据源接口
 */
interface StudentLocalDataSource {
    suspend fun getAllStudents(): List<StudentDataModel>
    suspend fun getStudent(id: String): StudentDataModel?
    suspend fun insertStudent(student: StudentDataModel)
    suspend fun updateStudent(student: StudentDataModel)
    suspend fun deleteStudent(id: String)
    fun observeAllStudents(): Flow<List<StudentDataModel>>
}

/**
 * 教师本地数据源接口
 */
interface TeacherLocalDataSource {
    suspend fun getAllTeachers(): List<TeacherDataModel>
    suspend fun getTeacher(id: String): TeacherDataModel?
    fun observeAllTeachers(): Flow<List<TeacherDataModel>>
}
