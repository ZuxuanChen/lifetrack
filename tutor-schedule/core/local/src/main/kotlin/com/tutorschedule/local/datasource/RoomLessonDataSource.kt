package com.tutorschedule.local.datasource

import com.tutorschedule.data.datasource.LessonLocalDataSource
import com.tutorschedule.data.model.LessonDataModel
import com.tutorschedule.local.dao.LessonDao
import com.tutorschedule.local.entity.LessonEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Room 实现的课程本地数据源
 *
 * 职责：将 Room Entity 映射为 DataModel，对上层屏蔽 Room 细节
 */
@Singleton
class RoomLessonDataSource @Inject constructor(
    private val lessonDao: LessonDao
) : LessonLocalDataSource {

    override suspend fun getLessonsBetween(start: Instant, end: Instant): List<LessonDataModel> {
        return lessonDao.getLessonsBetween(
            start.toEpochMilliseconds(),
            end.toEpochMilliseconds()
        ).map { it.toDataModel() }
    }

    override suspend fun getLesson(id: String): LessonDataModel? {
        return lessonDao.getLessonById(id)?.toDataModel()
    }

    override suspend fun insertLesson(lesson: LessonDataModel) {
        lessonDao.insertLesson(lesson.toEntity())
    }

    override suspend fun updateLesson(lesson: LessonDataModel) {
        lessonDao.updateLesson(lesson.toEntity())
    }

    override suspend fun deleteLesson(id: String) {
        lessonDao.deleteLesson(id)
    }

    override suspend fun deleteAllLessons() {
        lessonDao.deleteAllLessons()
    }

    override fun observeLessonsBetween(start: Instant, end: Instant): Flow<List<LessonDataModel>> {
        return lessonDao.observeLessonsBetween(
            start.toEpochMilliseconds(),
            end.toEpochMilliseconds()
        ).map { list -> list.map { it.toDataModel() } }
    }

    override suspend fun getLessonsByStudent(studentId: String): List<LessonDataModel> {
        return lessonDao.getLessonsByStudent(studentId).map { it.toDataModel() }
    }

    override suspend fun getLessonsByTeacher(teacherId: String): List<LessonDataModel> {
        return lessonDao.getLessonsByTeacher(teacherId).map { it.toDataModel() }
    }

    // ---- 内部映射 ----

    private fun LessonEntity.toDataModel(): LessonDataModel = LessonDataModel(
        id = id,
        studentId = studentId,
        teacherId = teacherId,
        subjectCode = subjectCode,
        startEpochMillis = startTime,
        endEpochMillis = endTime,
        recurrenceJson = recurrenceJson,
        roomId = roomId,
        statusCode = statusCode,
        createdAtMillis = createdAt,
        updatedAtMillis = updatedAt
    )

    private fun LessonDataModel.toEntity(): LessonEntity = LessonEntity(
        id = id,
        studentId = studentId,
        teacherId = teacherId,
        subjectCode = subjectCode,
        startTime = startEpochMillis,
        endTime = endEpochMillis,
        recurrenceJson = recurrenceJson,
        roomId = roomId,
        statusCode = statusCode,
        createdAt = createdAtMillis,
        updatedAt = updatedAtMillis
    )
}
