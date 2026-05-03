package com.tutorschedule.remote.datasource

import com.tutorschedule.common.TutorException
import com.tutorschedule.data.datasource.LessonRemoteDataSource
import com.tutorschedule.data.datasource.SyncChangesResult
import com.tutorschedule.data.model.LessonDataModel
import com.tutorschedule.remote.api.TutorScheduleApi
import com.tutorschedule.remote.dto.ApiResponse
import com.tutorschedule.remote.dto.CreateLessonRequest
import com.tutorschedule.remote.dto.UpdateLessonRequest
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Retrofit 实现的课程远程数据源
 *
 * 职责：将 Retrofit DTO 映射为 DataModel，对上层屏蔽 Retrofit/JSON 细节
 */
@Singleton
class RetrofitLessonDataSource @Inject constructor(
    private val api: TutorScheduleApi
) : LessonRemoteDataSource {

    override suspend fun fetchLessonsForWeek(startIso: String, endIso: String): List<LessonDataModel> {
        val response = api.getLessonsForWeek(startIso, endIso)
        return parseResponse(response).map { it.toDataModel() }
    }

    override suspend fun createLesson(lesson: LessonDataModel): LessonDataModel {
        val request = CreateLessonRequest(
            studentId = lesson.studentId,
            teacherId = lesson.teacherId,
            subjectCode = lesson.subjectCode,
            startTime = millisToIso(lesson.startEpochMillis),
            endTime = millisToIso(lesson.endEpochMillis),
            recurrenceJson = lesson.recurrenceJson,
            roomId = lesson.roomId
        )
        val response = api.createLesson(request)
        return parseResponse(response).toDataModel()
    }

    override suspend fun updateLesson(id: String, lesson: LessonDataModel): LessonDataModel {
        val request = UpdateLessonRequest(
            studentId = lesson.studentId,
            teacherId = lesson.teacherId,
            subjectCode = lesson.subjectCode,
            startTime = millisToIso(lesson.startEpochMillis),
            endTime = millisToIso(lesson.endEpochMillis),
            recurrenceJson = lesson.recurrenceJson,
            roomId = lesson.roomId,
            statusCode = lesson.statusCode
        )
        val response = api.updateLesson(id, request)
        return parseResponse(response).toDataModel()
    }

    override suspend fun deleteLesson(id: String) {
        val response = api.deleteLesson(id)
        parseResponse(response) // Unit response
    }

    override suspend fun getChangesSince(lastSyncTimestamp: Long): SyncChangesResult {
        val response = api.getChangesSince(lastSyncTimestamp)
        val dto = parseResponse(response)
        return SyncChangesResult(
            lessonsCreated = dto.lessonsCreated.map { it.toDataModel() },
            lessonsUpdated = dto.lessonsUpdated.map { it.toDataModel() },
            lessonsDeleted = dto.lessonsDeleted,
            serverTimestamp = dto.serverTimestamp
        )
    }

    // ---- 内部工具 ----

    private fun <T> parseResponse(response: Response<ApiResponse<T>>): T {
        if (!response.isSuccessful) {
            throw TutorException.NetworkError(
                Exception("HTTP ${response.code()}: ${response.errorBody()?.string()}")
            )
        }
        val body = response.body()
            ?: throw TutorException.NetworkError(Exception("Response body is null"))
        if (body.code != 200) {
            throw TutorException.NetworkError(Exception(body.message ?: "API Error ${body.code}"))
        }
        return body.data
    }

    private fun millisToIso(epochMillis: Long): String {
        val instant = Instant.fromEpochMilliseconds(epochMillis)
        val dt = instant.toLocalDateTime(TimeZone.currentSystemDefault())
        return "${dt.date}T${dt.hour.toString().padStart(2, '0')}:${dt.minute.toString().padStart(2, '0')}:00"
    }

    private fun com.tutorschedule.remote.dto.LessonDto.toDataModel(): LessonDataModel {
        return LessonDataModel(
            id = id,
            studentId = studentId,
            teacherId = teacherId,
            subjectCode = subjectCode,
            startEpochMillis = parseIsoToMillis(startTime),
            endEpochMillis = parseIsoToMillis(endTime),
            recurrenceJson = recurrenceJson,
            roomId = roomId,
            statusCode = statusCode,
            syncStatus = LessonDataModel.SyncStatus.SYNCED,
            createdAtMillis = parseIsoToMillis(createdAt),
            updatedAtMillis = parseIsoToMillis(updatedAt)
        )
    }

    private fun parseIsoToMillis(iso: String): Long {
        return try {
            kotlinx.datetime.Instant.parse(iso).toEpochMilliseconds()
        } catch (_: Exception) {
            0L
        }
    }
}
